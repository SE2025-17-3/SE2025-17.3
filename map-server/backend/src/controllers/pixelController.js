// backend/src/controllers/pixelController.js
import mongoose from 'mongoose';
import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import Outbox from '../models/Outbox.js';
import User from '../models/User.js';
import { calculateEnergy } from './authController.js';
import { getRedisClient, isRedisEnabled } from '../config/redis.js';
import * as challengeService from '../services/challengeService.js';

const CHUNK_SIZE = 256;

// --- 1. API GET CHUNK (with Redis caching) ---
export const getChunk = async (req, res) => {
  try {
    const chunkX = parseInt(req.params.chunkX, 10);
    const chunkY = parseInt(req.params.chunkY, 10);

    if (isNaN(chunkX) || isNaN(chunkY)) {
      return res.status(400).json({ error: "Tọa độ không hợp lệ" });
    }

    // Prevent browser caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Redis cache key
    const cacheKey = `chunk:${chunkX}:${chunkY}`;

    // Try Redis cache first (if enabled)
    const redis = getRedisClient();
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
    }

    // Query MongoDB
    const gx_min = chunkX * CHUNK_SIZE;
    const gx_max = (chunkX + 1) * CHUNK_SIZE;
    const gy_min = chunkY * CHUNK_SIZE;
    const gy_max = (chunkY + 1) * CHUNK_SIZE;

    const pixels = await Pixel.find({
      gx: { $gte: gx_min, $lt: gx_max },
      gy: { $gte: gy_min, $lt: gy_max },
    }).select('gx gy color userId -_id').lean();

    // Cache in Redis (1 hour for non-empty, 5 min for empty)
    if (redis) {
      const ttl = pixels.length > 0 ? 3600 : 300;
      await redis.set(cacheKey, JSON.stringify(pixels), 'EX', ttl);
    }

    res.json(pixels);
  } catch (err) {
    console.error("❌ Lỗi lấy chunk:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// --- 2. API ADD PIXEL (Outbox Pattern) ---
export const addPixel = async (req, res, io) => {
  // Type coercion to numbers
  const gx = Number(req.body.gx);
  const gy = Number(req.body.gy);
  const { color } = req.body;

  // Validation
  if (isNaN(gx) || isNaN(gy) || !color) {
    return res.status(400).json({ error: "Thông tin không hợp lệ." });
  }

  const isClear = color === 'transparent';
  if (!isClear && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: "Mã màu không hợp lệ." });
  }

  // Authentication check
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let session = null;

  try {
    // Check user and energy BEFORE transaction
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate and check energy (with save) BEFORE transaction
    await calculateEnergy(user);
    if (user.energy <= 0) {
      return res.status(403).json({ error: "Hết năng lượng." });
    }

    // Start transaction for atomic writes
    session = await mongoose.startSession();

    // Execute atomic transaction: Energy deduction + Pixel + PixelEvent + Outbox
    await session.withTransaction(async () => {
      // Deduct energy inside transaction
      user.energy -= 1;
      if (user.energy === (user.maxEnergy - 1)) {
        user.lastEnergyUpdate = new Date();
      }
      await user.save({ session });

      // 1. Save/Delete pixel
      if (isClear) {
        await Pixel.findOneAndDelete({ gx, gy }, { session });
      } else {
        await Pixel.findOneAndUpdate(
          { gx, gy },
          { color, userId, gx, gy }, // Force number types
          { new: true, upsert: true, session }
        );
      }

      // 2. Save PixelEvent
      await PixelEvent.create(
        [{ gx, gy, color, userId, teamId: user.teamId }],
        { session }
      );

      // 3. Save to Outbox for reliable broadcasting
      await Outbox.create(
        [{
          eventType: 'pixel_placed',
          payload: {
            gx,
            gy,
            color,
            userId: isClear ? null : userId,
            teamId: user.teamId || null,
            timestamp: Date.now(),
          },
          published: false,
        }],
        { session }
      );

      console.log(`✅ Transaction committed: Pixel (${gx}, ${gy}) saved with color ${color}`);
    });

    // Invalidate Redis cache (outside transaction for performance)
    const chunkX = Math.floor(gx / CHUNK_SIZE);
    const chunkY = Math.floor(gy / CHUNK_SIZE);
    const cacheKey = `chunk:${chunkX}:${chunkY}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.del(cacheKey);
    }

    // Track challenge progress
    try {
      await challengeService.updateStreak(userId, io);
      await challengeService.trackPixelAction(userId, { gx, gy, color }, io);
    } catch (challengeErr) {
      console.warn('⚠️ Challenge tracking error:', challengeErr?.message);
    }

    // Response with user energy
    res.status(201).json({ 
      gx, 
      gy, 
      color, 
      userEnergy: user.energy 
    });

  } catch (err) {
    console.error("❌ Transaction failed:", err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Lỗi server" });
  } finally {
    // End session only if it was created
    if (session) {
      await session.endSession();
    }
  }
};

// --- 3. API GET PIXEL DETAIL ---
export const getPixelDetail = async (req, res) => {
  try {
    const { gx, gy } = req.query;

    res.setHeader('Cache-Control', 'no-store, no-cache');

    const pixel = await Pixel.findOne({ 
      gx: Number(gx), 
      gy: Number(gy) 
    }).populate({
      path: 'userId', 
      select: 'username displayName avatarUrl teamId',
      populate: { path: 'teamId', select: 'name' }
    });

    if (!pixel) {
      return res.json({ 
        gx: Number(gx), 
        gy: Number(gy), 
        color: '#FFFFFF', 
        user: null 
      });
    }

    res.json({
      gx: pixel.gx,
      gy: pixel.gy,
      color: pixel.color,
      updatedAt: pixel.updatedAt,
      user: pixel.userId ? (pixel.userId.displayName || pixel.userId.username) : null,
      avatarUrl: pixel.userId?.avatarUrl,
      teamName: pixel.userId?.teamId?.name
    });
  } catch (err) {
    console.error("❌ Lỗi getPixelDetail:", err);
    res.status(500).json({});
  }
};

// --- 4. API GET PIXELS BY CHUNKS (Batch with Redis caching) ---
export const getPixelsByChunks = async (req, res) => {
  try {
    const { chunkIds } = req.body; // Frontend gửi lên: ["1_1", "1_2", "-1_0", ...]

    if (!chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
      return res.json([]);
    }

    // Giới hạn số lượng chunk trong 1 request để tránh quá tải query
    if (chunkIds.length > 1000) {
      return res.status(400).json({ error: "Too many chunks requested" });
    }

    const results = [];
    const missingChunks = [];
    const redis = getRedisClient();

    // BƯỚC 1: Kiểm tra Redis Cache (Sử dụng MGET để lấy nhanh)
    if (redis) {
      const keys = chunkIds.map(id => {
        const [x, y] = id.split('_');
        return `chunk:${x}:${y}`;
      });

      try {
        const cachedValues = await redis.mget(keys);

        cachedValues.forEach((val, index) => {
          if (val) {
            // Nếu có cache, parse và đẩy vào kết quả
            results.push(...JSON.parse(val));
          } else {
            // Nếu chưa có, đánh dấu để query DB
            missingChunks.push(chunkIds[index]);
          }
        });
      } catch (redisErr) {
        console.error("Redis mget error:", redisErr);
        // Nếu redis lỗi, coi như tất cả đều missing
        missingChunks.push(...chunkIds);
      }
    } else {
      missingChunks.push(...chunkIds);
    }

    // BƯỚC 2: Query Database cho các chunk bị thiếu (gom nhóm điều kiện $or)
    if (missingChunks.length > 0) {
      const orConditions = missingChunks.map(id => {
        const [xStr, yStr] = id.split('_');
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);

        if (isNaN(x) || isNaN(y)) return null;

        return {
          gx: { $gte: x * CHUNK_SIZE, $lt: (x + 1) * CHUNK_SIZE },
          gy: { $gte: y * CHUNK_SIZE, $lt: (y + 1) * CHUNK_SIZE }
        };
      }).filter(Boolean); // Loại bỏ null

      if (orConditions.length > 0) {
        // Query MongoDB 1 lần duy nhất cho tất cả missing chunks
        const dbPixels = await Pixel.find({ $or: orConditions })
            .select('gx gy color userId -_id')
            .lean();

        results.push(...dbPixels);

        // (Tùy chọn) Có thể cache ngược lại vào Redis ở đây nếu muốn tối ưu lần sau,
        // nhưng để đơn giản và tránh delay response, ta để lần getChunk lẻ cache sau.
      }
    }

    res.json(results);

  } catch (err) {
    console.error("❌ Lỗi batch chunk:", err);
    res.status(500).json({ error: "Lỗi server khi tải batch" });
  }
};