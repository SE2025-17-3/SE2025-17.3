import mongoose from 'mongoose';
import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import User from '../models/User.js';
import { calculateEnergy } from './authController.js';
// --- THÊM: Import Redis ---
import { redis } from '../config/redis.js'; 

const CHUNK_SIZE = 256;

export const getChunk = async (req, res) => {
  try {
    const chunkX = parseInt(req.params.chunkX, 10);
    const chunkY = parseInt(req.params.chunkY, 10);

    if (isNaN(chunkX) || isNaN(chunkY)) {
      return res.status(400).json({ error: "Chunk coordinates phải là số." });
    }

    // --- 1. CHỐNG BROWSER CACHE (Quan trọng để fix lỗi F5 mất hình) ---
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // --- 2. LOGIC REDIS CACHING ---
    const cacheKey = `chunk:${chunkX}:${chunkY}`;

    // Kiểm tra Redis trước
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        // Nếu có trong Redis, trả về ngay (Rất nhanh)
        return res.json(JSON.parse(cachedData));
    }

    // Nếu không có, gọi MongoDB
    const gx_min = chunkX * CHUNK_SIZE;
    const gx_max = (chunkX + 1) * CHUNK_SIZE;
    const gy_min = chunkY * CHUNK_SIZE;
    const gy_max = (chunkY + 1) * CHUNK_SIZE;

    const pixels = await Pixel.find({
      gx: { $gte: gx_min, $lt: gx_max },
      gy: { $gte: gy_min, $lt: gy_max },
    }).select('gx gy color userId -_id'); // userId cần để hiện info, nếu không cần có thể bỏ

    // Lưu vào Redis (Hết hạn sau 1 giờ nếu không có ai động vào)
    // EX = expire seconds
    await redis.set(cacheKey, JSON.stringify(pixels), 'EX', 3600);

    res.json(pixels);
  } catch (err) {
    console.error("❌ Lỗi khi lấy chunk:", err);
    res.status(500).json({ error: "Không thể lấy dữ liệu chunk" });
  }
};

export const addPixel = async (req, res, io) => {
  const { gx, gy, color } = req.body;

  if (typeof gx !== 'number' || typeof gy !== 'number' || !color) {
    return res.status(400).json({ error: "Thiếu thông tin gx, gy hoặc color." });
  }

  const isClear = color === 'transparent';
  if (!isClear && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: "Mã màu không hợp lệ." });
  }

  try {
    const userId = req.session?.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    
    // 1. Kiểm tra và Trừ năng lượng
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    await calculateEnergy(user); 

    if (user.energy <= 0) {
        return res.status(403).json({ error: "Hết năng lượng." });
    }

    user.energy -= 1;
    if (user.energy === (user.maxEnergy - 1)) {
        user.lastEnergyUpdate = new Date();
    }
    await user.save();
    
    // 2. Logic Vẽ hoặc Xóa
    let updatedPixel;
    let teamId = user.teamId || null;

    if (isClear) {
        await Pixel.findOneAndDelete({ gx, gy });
        updatedPixel = { gx, gy, color: 'transparent', userId: null };
    } else {
        updatedPixel = await Pixel.findOneAndUpdate(
            { gx, gy },
            { color, userId }, 
            { new: true, upsert: true, select: 'gx gy color userId' }
        );
    }

    // --- 3. XÓA CACHE REDIS (BẮT BUỘC) ---
    // Để lần sau getChunk lấy dữ liệu mới nhất từ MongoDB
    const chunkX = Math.floor(gx / CHUNK_SIZE);
    const chunkY = Math.floor(gy / CHUNK_SIZE);
    const cacheKey = `chunk:${chunkX}:${chunkY}`;
    
    // Xóa key này đi
    await redis.del(cacheKey);
    // ------------------------------------

    // 4. Lưu lịch sử
    try {
      await PixelEvent.create({ gx, gy, color, userId, teamId });
    } catch (evtErr) {}

    // 5. Bắn Socket
    if (io) {
      io.emit('pixel_placed', { 
        gx, gy, 
        color: isClear ? 'transparent' : updatedPixel.color,
        userId: isClear ? null : userId 
      });
    }

    res.status(201).json({ 
      gx, gy, color, userId,
      userEnergy: user.energy
    });

  } catch (err) {
    console.error("❌ Lỗi khi đặt pixel:", err);
    res.status(500).json({ error: "Không thể đặt pixel trên server." });
  }
};

export const getPixelDetail = async (req, res) => {
  try {
    const { gx, gy } = req.query;

    if (gx === undefined || gy === undefined) {
      return res.status(400).json({ error: "Thiếu tọa độ gx, gy" });
    }

    // Thêm no-cache cho api detail luôn cho chắc
    res.setHeader('Cache-Control', 'no-store, no-cache');

    const pixel = await Pixel.findOne({ gx: Number(gx), gy: Number(gy) })
      .populate({
        path: 'userId',
        select: 'username displayName avatarUrl teamId',
        populate: { path: 'teamId', select: 'name' } 
      });

    if (!pixel) {
      return res.json({
        gx: Number(gx),
        gy: Number(gy),
        color: '#FFFFFF',
        user: null,
        teamName: null
      });
    }

    const teamName = pixel.userId?.teamId?.name || null;

    res.json({
      gx: pixel.gx,
      gy: pixel.gy,
      color: pixel.color,
      updatedAt: pixel.updatedAt,
      user: pixel.userId ? pixel.userId.displayName || pixel.userId.username : null,
      avatarUrl: pixel.userId ? pixel.userId.avatarUrl : null,
      teamName: teamName
    });

  } catch (err) {
    console.error("Lỗi lấy chi tiết pixel:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};
