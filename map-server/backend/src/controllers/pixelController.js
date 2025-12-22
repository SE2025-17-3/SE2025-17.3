import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import Outbox from '../models/Outbox.js';
import User from '../models/User.js';
import { calculateEnergy } from './authController.js';
import { redis, getPublisher, STREAMS } from '../config/redis.js';

const CHUNK_SIZE = 256;

export const getChunk = async (req, res) => {
  try {
    const chunkX = parseInt(req.params.chunkX, 10);
    const chunkY = parseInt(req.params.chunkY, 10);
    if (isNaN(chunkX) || isNaN(chunkY)) return res.status(400).json({ error: "Invalid coords" });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const cacheKey = `chunk:${chunkX}:${chunkY}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    const gx_min = chunkX * CHUNK_SIZE;
    const gx_max = (chunkX + 1) * CHUNK_SIZE;
    const gy_min = chunkY * CHUNK_SIZE;
    const gy_max = (chunkY + 1) * CHUNK_SIZE;

    const pixels = await Pixel.find({ gx: { $gte: gx_min, $lt: gx_max }, gy: { $gte: gy_min, $lt: gy_max } })
        .select('gx gy color userId -_id').lean();

    await redis.set(cacheKey, JSON.stringify(pixels), 'EX', 300);
    res.json(pixels);
  } catch (err) { res.status(500).json({ error: "Lỗi server" }); }
};

// --- BATCH ADD PIXEL ---
export const addPixel = async (req, res, io) => {
  // Hỗ trợ cả mảng (batch) và object đơn
  const payload = req.body.pixels || [req.body];
  const userId = req.session?.userId;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!Array.isArray(payload) || payload.length === 0) return res.status(400).json({ error: "No data" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isBanned) return res.status(403).json({ error: "Tài khoản bị khóa." });

    await calculateEnergy(user);
    const cost = payload.length;
    
    if (user.energy < cost) {
      return res.status(403).json({ error: `Thiếu năng lượng. Cần ${cost}, có ${user.energy}` });
    }

    // Trừ năng lượng 1 lần
    user.energy -= cost;
    if (user.energy === (user.maxEnergy - cost)) user.lastEnergyUpdate = new Date();
    await user.save();

    const bulkOps = [];
    const logs = [];
    const chunksToClear = new Set();
    const redisPublisher = getPublisher();
    const timestamp = Date.now();

    for (const p of payload) {
        const gx = Number(p.gx);
        const gy = Number(p.gy);
        const color = p.color;
        if (isNaN(gx) || isNaN(gy)) continue;

        const isClear = color === 'transparent';
        logs.push({ gx, gy, color, userId, teamId: user.teamId });

        if (isClear) {
            bulkOps.push({ deleteOne: { filter: { gx, gy } } });
        } else {
            bulkOps.push({
                updateOne: {
                    filter: { gx, gy },
                    update: { $set: { color, userId, gx, gy } },
                    upsert: true
                }
            });
        }

        // Add to Stream
        await redisPublisher.xadd(STREAMS.PIXEL_EVENTS, '*', 'eventType', 'pixel_placed', 'gx', gx, 'gy', gy, 'color', color, 'timestamp', timestamp);
        
        // Cache Key
        chunksToClear.add(`chunk:${Math.floor(gx / CHUNK_SIZE)}:${Math.floor(gy / CHUNK_SIZE)}`);
    }

    if (bulkOps.length > 0) await Pixel.bulkWrite(bulkOps);
    PixelEvent.insertMany(logs).catch(err => console.error("Log error", err));
    
    if (chunksToClear.size > 0) {
        await redis.del([...chunksToClear]);
    }

    res.status(200).json({ message: "OK", count: payload.length, userEnergy: user.energy });

  } catch (err) {
    console.error("Add Pixel Error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

export const getPixelDetail = async (req, res) => { /* Giữ nguyên hàm cũ */ 
    try {
        const { gx, gy } = req.query;
        res.setHeader('Cache-Control', 'no-store, no-cache');
        const pixel = await Pixel.findOne({ gx: Number(gx), gy: Number(gy) }).populate({ path: 'userId', select: 'username displayName avatarUrl teamId', populate: { path: 'teamId', select: 'name' } });
        if (!pixel) return res.json({ gx: Number(gx), gy: Number(gy), color: '#FFFFFF', user: null });
        res.json({ gx: pixel.gx, gy: pixel.gy, color: pixel.color, updatedAt: pixel.updatedAt, user: pixel.userId?.displayName || pixel.userId?.username, avatarUrl: pixel.userId?.avatarUrl, teamName: pixel.userId?.teamId?.name });
    } catch (err) { res.status(500).json({}); }
};