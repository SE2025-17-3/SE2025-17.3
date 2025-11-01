import Pixel from '../models/Pixel.js';

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

// Sửa đổi addPixel để nhận và sử dụng 'io'
export const addPixel = async (req, res, io) => { // <-- Nhận io ở đây
  const { gx, gy, color } = req.body;

  // Input Validation (giữ nguyên)
  if (typeof gx !== 'number' || typeof gy !== 'number' || !color) {
    return res.status(400).json({ error: "Thiếu thông tin gx, gy hoặc color." });
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      return res.status(400).json({ error: "Mã màu không hợp lệ (cần dạng #rrggbb)." });
  }

  try {
    // Trường 'updatedAt' sẽ tự động cập nhật nhờ pre-hook trong Model
    const updatedPixel = await Pixel.findOneAndUpdate(
      { gx, gy },
      { color }, // Chỉ cần cập nhật color
      { new: true, upsert: true, select: 'gx gy color' }
    );

    // --- ⭐ Quan trọng: Gửi sự kiện Socket.IO ---
    if (io && updatedPixel) { // Kiểm tra io tồn tại
        io.emit('pixel_placed', { 
            gx: updatedPixel.gx, 
            gy: updatedPixel.gy, 
            color: updatedPixel.color 
        });
        console.log(`📡 Emitted pixel_placed: (${updatedPixel.gx}, ${updatedPixel.gy}) ${updatedPixel.color}`);
    } else if (!io) {
        console.warn("⚠️ Không tìm thấy instance 'io' để emit sự kiện pixel_placed.");
    }
    // ------------------------------------------

    res.status(201).json({ 
        gx: updatedPixel.gx, 
        gy: updatedPixel.gy, 
        color: updatedPixel.color 
    });

  } catch (err) {
    console.error("❌ Lỗi khi đặt pixel:", err);
    if (err.name === 'ValidationError') {
       return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Không thể đặt pixel trên server." });
  }
};