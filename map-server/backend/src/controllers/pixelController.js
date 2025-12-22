import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import Outbox from '../models/Outbox.js';
import User from '../models/User.js';
import { calculateEnergy } from './authController.js';

import { getRedisClient, getPublisher, STREAMS } from '../config/redis.js';
import * as challengeService from '../services/challengeService.js';

const CHUNK_SIZE = 256;

/* ===================== GET CHUNK ===================== */
export const getChunk = async (req, res) => {
    try {
        const chunkX = parseInt(req.params.chunkX, 10);
        const chunkY = parseInt(req.params.chunkY, 10);
        if (isNaN(chunkX) || isNaN(chunkY)) {
            return res.status(400).json({ error: 'Invalid coords' });
        }

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        const cacheKey = `chunk:${chunkX}:${chunkY}`;
        const redis = getRedisClient();

        // Try Redis cache first
        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
        }

        const gxMin = chunkX * CHUNK_SIZE;
        const gxMax = (chunkX + 1) * CHUNK_SIZE;
        const gyMin = chunkY * CHUNK_SIZE;
        const gyMax = (chunkY + 1) * CHUNK_SIZE;

        const pixels = await Pixel.find({
            gx: { $gte: gxMin, $lt: gxMax },
            gy: { $gte: gyMin, $lt: gyMax },
        })
            .select('gx gy color userId -_id')
            .lean();

        // Cache result
        if (redis) {
            const ttl = pixels.length > 0 ? 3600 : 300;
            await redis.set(cacheKey, JSON.stringify(pixels), 'EX', ttl);
        }

        res.json(pixels);
    } catch (err) {
        console.error('GetChunk error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

/* ===================== ADD PIXEL (BATCH) ===================== */
export const addPixel = async (req, res, io) => {
    const payload = req.body.pixels || [req.body];
    const userId = req.session?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!Array.isArray(payload) || payload.length === 0) {
        return res.status(400).json({ error: 'No data' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.isBanned) return res.status(403).json({ error: 'Tài khoản bị khóa.' });

        await calculateEnergy(user);

        const cost = payload.length;
        if (user.energy < cost) {
            return res.status(403).json({
                error: `Thiếu năng lượng. Cần ${cost}, có ${user.energy}`,
            });
        }

        // Deduct energy once
        user.energy -= cost;
        await user.save();

        const bulkOps = [];
        const logs = [];
        const chunksToClear = new Set();

        const redis = getRedisClient();
        const redisPublisher = getPublisher();
        const timestamp = Date.now();

        for (const p of payload) {
            const gx = Number(p.gx);
            const gy = Number(p.gy);
            const color = p.color;

            if (isNaN(gx) || isNaN(gy)) continue;

            logs.push({ gx, gy, color, userId, teamId: user.teamId });

            if (color === 'transparent') {
                bulkOps.push({
                    deleteOne: { filter: { gx, gy } },
                });
            } else {
                bulkOps.push({
                    updateOne: {
                        filter: { gx, gy },
                        update: { $set: { gx, gy, color, userId } },
                        upsert: true,
                    },
                });
            }

            // Publish to Redis Stream
            if (redisPublisher) {
                await redisPublisher.xadd(
                    STREAMS.PIXEL_EVENTS,
                    '*',
                    'eventType',
                    'pixel_placed',
                    'gx',
                    gx,
                    'gy',
                    gy,
                    'color',
                    color,
                    'timestamp',
                    timestamp
                );
            }

            // Mark chunk cache to invalidate
            chunksToClear.add(
                `chunk:${Math.floor(gx / CHUNK_SIZE)}:${Math.floor(gy / CHUNK_SIZE)}`
            );
        }

        if (bulkOps.length > 0) {
            await Pixel.bulkWrite(bulkOps);
            PixelEvent.insertMany(logs).catch((e) =>
                console.error('PixelEvent log error:', e)
            );
        }

        // Invalidate Redis cache
        if (redis && chunksToClear.size > 0) {
            await redis.del([...chunksToClear]);
        }

        // Challenge tracking (non-blocking logic)
        try {
            await challengeService.updateStreak(userId, io);
            await challengeService.trackPixelAction(userId, payload, io);
        } catch (e) {
            console.warn('⚠️ Challenge tracking error:', e?.message);
        }

        res.json({
            message: 'OK',
            count: payload.length,
            userEnergy: user.energy,
        });
    } catch (err) {
        console.error('Add Pixel Error:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

/* ===================== PIXEL DETAIL ===================== */
export const getPixelDetail = async (req, res) => {
    try {
        const { gx, gy } = req.query;
        res.setHeader('Cache-Control', 'no-store, no-cache');

        const pixel = await Pixel.findOne({
            gx: Number(gx),
            gy: Number(gy),
        }).populate({
            path: 'userId',
            select: 'username displayName avatarUrl teamId',
            populate: { path: 'teamId', select: 'name' },
        });

        if (!pixel) {
            return res.json({
                gx: Number(gx),
                gy: Number(gy),
                color: '#FFFFFF',
                user: null,
            });
        }

        res.json({
            gx: pixel.gx,
            gy: pixel.gy,
            color: pixel.color,
            updatedAt: pixel.updatedAt,
            user: pixel.userId?.displayName || pixel.userId?.username,
            avatarUrl: pixel.userId?.avatarUrl,
            teamName: pixel.userId?.teamId?.name,
        });
    } catch (err) {
        res.status(500).json({});
    }
};
