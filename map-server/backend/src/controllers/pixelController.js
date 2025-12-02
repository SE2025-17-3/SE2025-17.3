import mongoose from 'mongoose';
import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import User from '../models/User.js';
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
    }).select('gx gy color userId -_id');

    res.json(pixels);
  } catch (err) {
    console.error("❌ Lỗi khi lấy chunk:", err); // Log lỗi ra console
    res.status(500).json({ error: "Không thể lấy dữ liệu chunk" });
  }
};

/**
 * Add pixel with userId and teamId tracking
 */
export const addPixel = async (req, res, io) => {
  const { gx, gy, color } = req.body;

  // Input Validation
  if (typeof gx !== 'number' || typeof gy !== 'number' || !color) {
    return res.status(400).json({ error: "Thiếu thông tin gx, gy hoặc color." });
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: "Mã màu không hợp lệ (cần dạng #rrggbb)." });
  }

  // Lấy userId từ session (nếu có)
  const userId = req.session?.userId || null;
  let teamId = null;
  if (userId) {
    const user = await User.findById(userId).select('teamId');
    teamId = user?.teamId || null;
  }

  // Start MongoDB session for transaction (Pixel + Outbox)
  const session = await mongoose.startSession();

  try {
    // Execute transaction: update Pixel + write Outbox event atomically
    const updatedPixel = await session.withTransaction(async () => {
      // 1. Save/Update pixel in database (also tracking userId)
      const pixelDoc = await Pixel.findOneAndUpdate(
        { gx, gy },
        { color, userId },
        {
          new: true,
          upsert: true,
          select: 'gx gy color userId',
          session, // Include session for transaction
        }
      );

      // 2. Save event to outbox (same transaction)
      await Outbox.create(
        [
          {
            eventType: 'pixel_placed',
            payload: {
              gx: pixelDoc.gx,
              gy: pixelDoc.gy,
              color: pixelDoc.color,
              userId: pixelDoc.userId || null,
              teamId: teamId || null,
              timestamp: Date.now(),
            },
            published: false,
          },
        ],
        { session } // Note: create with array when using session
      );

      console.log(
        `✅ Pixel saved & event queued: (${pixelDoc.gx}, ${pixelDoc.gy}) ${pixelDoc.color} by user ${
          pixelDoc.userId || 'anonymous'
        }`
      );

      return pixelDoc;
    });

    // Ghi lại sự kiện vẽ pixel (ngoài transaction, best-effort)
    try {
      await PixelEvent.create({ gx, gy, color, userId, teamId });
    } catch (evtErr) {
      console.warn('⚠️ Không thể lưu PixelEvent:', evtErr?.message);
    }

    // --- ⭐ Quan trọng: Gửi sự kiện Socket.IO ---
    if (io && updatedPixel) {
      io.emit('pixel_placed', {
        gx: updatedPixel.gx,
        gy: updatedPixel.gy,
        color: updatedPixel.color,
        userId: updatedPixel.userId, // Gửi thông tin user để client có thể hiển thị
      });
      console.log(
        `📡 Emitted pixel_placed: (${updatedPixel.gx}, ${updatedPixel.gy}) ${updatedPixel.color} by user ${
          updatedPixel.userId || 'anonymous'
        }`
      );
    } else if (!io) {
      console.warn("⚠️ Không tìm thấy instance 'io' để emit sự kiện pixel_placed.");
    }
    // ------------------------------------------

    // Transaction successful - respond to client
    res.status(201).json({
      gx: updatedPixel.gx,
      gy: updatedPixel.gy,
      color: updatedPixel.color,
      userId: updatedPixel.userId,
      teamId,
    });
  } catch (err) {
    console.error("❌ Lỗi khi đặt pixel:", err);

    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: "Không thể đặt pixel trên server." });
  } finally {
    await session.endSession();
  }
};
