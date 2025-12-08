import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import User from '../models/User.js';
import { calculateEnergy } from './authController.js';
import { redis } from '../config/redis.js';

// --- QUAN TRỌNG: SỐ NÀY PHẢI KHỚP VỚI FRONTEND ---
const CHUNK_SIZE = 256; 

export const getChunk = async (req, res) => {
  try {
    const chunkX = parseInt(req.params.chunkX, 10);
    const chunkY = parseInt(req.params.chunkY, 10);
    const cacheKey = `chunk:${chunkX}:${chunkY}`;

    // 1. Chặn trình duyệt cache (Bắt buộc)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 2. Thử lấy từ Redis
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        // console.log(`⚡ Hit Cache: ${cacheKey}`); // Uncomment nếu muốn debug
        return res.json(JSON.parse(cachedData));
    }

    // 3. Nếu không có, lấy từ MongoDB
    const gx_min = chunkX * CHUNK_SIZE;
    const gx_max = (chunkX + 1) * CHUNK_SIZE;
    const gy_min = chunkY * CHUNK_SIZE;
    const gy_max = (chunkY + 1) * CHUNK_SIZE;

    const pixels = await Pixel.find({
      gx: { $gte: gx_min, $lt: gx_max },
      gy: { $gte: gy_min, $lt: gy_max },
    }).select('gx gy color userId -_id').lean(); // Dùng .lean() cho nhanh

    // 4. Lưu vào Redis
    if (pixels.length > 0) {
        await redis.set(cacheKey, JSON.stringify(pixels), 'EX', 3600);
    } else {
        // Cache cả mảng rỗng để đỡ query DB liên tục, nhưng hết hạn nhanh hơn (ví dụ 5 phút)
        await redis.set(cacheKey, JSON.stringify([]), 'EX', 300);
    }

    res.json(pixels);
  } catch (err) {
    console.error("❌ Lỗi lấy chunk:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

export const addPixel = async (req, res, io) => {
  // Ép kiểu số để tránh lỗi tính toán
  const gx = Number(req.body.gx);
  const gy = Number(req.body.gy);
  const { color } = req.body;

  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ... (Đoạn code trừ năng lượng giữ nguyên) ...
    user.energy -= 1;
    await user.save();

    // LƯU DB
    const isClear = color === 'transparent';
    if (isClear) {
        await Pixel.findOneAndDelete({ gx, gy });
    } else {
        await Pixel.findOneAndUpdate(
            { gx, gy },
            { color, userId }, 
            { new: true, upsert: true }
        );
    }

    // --- FIX CACHE: TÍNH TOÁN & XÓA ---
    const chunkX = Math.floor(gx / CHUNK_SIZE);
    const chunkY = Math.floor(gy / CHUNK_SIZE);
    const cacheKey = `chunk:${chunkX}:${chunkY}`;
    
    // In log để kiểm tra
    console.log(`🎨 Pixel placed at [${gx}, ${gy}] -> Deleting Cache Key: ${cacheKey}`);
    
    await redis.del(cacheKey);
    // ---------------------------------

    if (io) {
      io.emit('pixel_placed', { gx, gy, color, userId });
    }

    res.status(201).json({ success: true, userEnergy: user.energy });

  } catch (err) {
    console.error("❌ Lỗi đặt pixel:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// ... giữ nguyên getPixelDetail ...
export const getPixelDetail = async (req, res) => {
    try {
        const { gx, gy } = req.query;
        res.setHeader('Cache-Control', 'no-store, no-cache'); // Không cache detail
        const pixel = await Pixel.findOne({ gx, gy }).populate('userId', 'displayName');
        res.json(pixel || {});
    } catch (e) { res.status(500).json({}); }
};
