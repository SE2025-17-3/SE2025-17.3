import mongoose from 'mongoose';
import Pixel from '../models/Pixel.js';
import Outbox from '../models/Outbox.js';

const CHUNK_SIZE = 256;

// Giữ nguyên logic getChunk
export const getChunk = async (req, res) => {
  try {
    const chunkX = parseInt(req.params.chunkX, 10);
    const chunkY = parseInt(req.params.chunkY, 10);

    if (isNaN(chunkX) || isNaN(chunkY)) {
      return res.status(400).json({ error: "Chunk coordinates phải là số." });
    }

    const gx_min = chunkX * CHUNK_SIZE;
    const gx_max = (chunkX + 1) * CHUNK_SIZE;
    const gy_min = chunkY * CHUNK_SIZE;
    const gy_max = (chunkY + 1) * CHUNK_SIZE;

    const pixels = await Pixel.find({
      gx: { $gte: gx_min, $lt: gx_max },
      gy: { $gte: gy_min, $lt: gy_max },
    }).select('gx gy color -_id');

    res.json(pixels);
  } catch (err) {
    console.error("❌ Lỗi khi lấy chunk:", err); // Log lỗi ra console
    res.status(500).json({ error: "Không thể lấy dữ liệu chunk" });
  }
};

/**
 * Add pixel using Outbox Pattern with MongoDB Transaction
 * Guarantees that pixel is saved AND event is queued for publishing
 */
export const addPixel = async (req, res) => {
  const { gx, gy, color } = req.body;

  // Input Validation
  if (typeof gx !== 'number' || typeof gy !== 'number' || !color) {
    return res.status(400).json({ error: "Thiếu thông tin gx, gy hoặc color." });
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: "Mã màu không hợp lệ (cần dạng #rrggbb)." });
  }

  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    // Execute transaction
    const result = await session.withTransaction(async () => {
      // 1. Save/Update pixel in database
      const updatedPixel = await Pixel.findOneAndUpdate(
        { gx, gy },
        { color },
        { 
          new: true, 
          upsert: true, 
          select: 'gx gy color',
          session // Include session for transaction
        }
      );

      // 2. Save event to outbox (same transaction)
      await Outbox.create([{
        eventType: 'pixel_placed',
        payload: {
          gx: updatedPixel.gx,
          gy: updatedPixel.gy,
          color: updatedPixel.color,
          timestamp: Date.now(),
        },
        published: false,
      }], { session }); // Note: create with array when using session

      console.log(`✅ Pixel saved & event queued: (${updatedPixel.gx}, ${updatedPixel.gy}) ${updatedPixel.color}`);
      
      return updatedPixel;
    });

    // Transaction successful - respond to client
    res.status(201).json({
      gx: result.gx,
      gy: result.gy,
      color: result.color,
    });

  } catch (err) {
    console.error("❌ Transaction failed:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Không thể đặt pixel trên server." });
  } finally {
    // Always end the session
    await session.endSession();
  }
};
