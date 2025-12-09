import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import User from '../models/User.js';
import { calculateEnergy } from './authController.js';
// Import Redis (đảm bảo file config/redis.js đã có "export const redis")
import { redis } from '../config/redis.js';

// 🔥 LƯU Ý: Số này PHẢI GIỐNG HỆT file constants.js ở Frontend
const CHUNK_SIZE = 256;

// --- 1. API LẤY CHUNK (Load bản đồ) ---
export const getChunk = async (req, res) => {
  try {
    const chunkX = parseInt(req.params.chunkX, 10);
    const chunkY = parseInt(req.params.chunkY, 10);

    if (isNaN(chunkX) || isNaN(chunkY)) {
      return res.status(400).json({ error: "Tọa độ không hợp lệ" });
    }

    // 🔥 FIX 1: Cấm trình duyệt cache (Khắc phục lỗi F5 vẫn ra hình cũ)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Key cache Redis
    const cacheKey = `chunk:${chunkX}:${chunkY}`;

    // A. Thử lấy từ Redis trước
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // B. Nếu không có, lấy từ MongoDB
    const gx_min = chunkX * CHUNK_SIZE;
    const gx_max = (chunkX + 1) * CHUNK_SIZE;
    const gy_min = chunkY * CHUNK_SIZE;
    const gy_max = (chunkY + 1) * CHUNK_SIZE;

    // Tìm kiếm (Lưu ý: gx, gy trong DB phải là Number)
    const pixels = await Pixel.find({
      gx: { $gte: gx_min, $lt: gx_max },
      gy: { $gte: gy_min, $lt: gy_max },
    }).select('gx gy color userId -_id').lean(); // .lean() giúp query nhanh hơn

    // C. Lưu kết quả vào Redis
    // Cache 1 tiếng (3600s). Nếu mảng rỗng thì cache 5 phút (300s)
    const ttl = pixels.length > 0 ? 3600 : 300;
    await redis.set(cacheKey, JSON.stringify(pixels), 'EX', ttl);

    res.json(pixels);
  } catch (err) {
    console.error("❌ Lỗi lấy chunk:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// --- 2. API ĐẶT PIXEL (Tô màu) ---
export const addPixel = async (req, res, io) => {
  // 🔥 FIX 2: Ép kiểu Số ngay đầu vào (Khắc phục lỗi lưu String vào DB)
  const gx = Number(req.body.gx);
  const gy = Number(req.body.gy);
  const { color } = req.body;

  // Validate
  if (isNaN(gx) || isNaN(gy) || !color) {
    return res.status(400).json({ error: "Thông tin không hợp lệ." });
  }

  const isClear = color === 'transparent';
  // Validate mã màu (nếu không phải xóa)
  if (!isClear && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: "Mã màu không hợp lệ." });
  }

  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Kiểm tra User & Năng lượng
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    await calculateEnergy(user);
    if (user.energy <= 0) return res.status(403).json({ error: "Hết năng lượng." });

    user.energy -= 1;
    if (user.energy === (user.maxEnergy - 1)) user.lastEnergyUpdate = new Date();
    await user.save();

    // --- LOGIC LƯU DB (QUAN TRỌNG) ---
    if (isClear) {
      await Pixel.findOneAndDelete({ gx, gy });
    } else {
      await Pixel.findOneAndUpdate(
          { gx, gy }, // Tìm theo tọa độ
          {
            color,
            userId,
            // 🔥 FIX 3: Luôn ghi đè gx, gy thành SỐ.
            // Nếu DB cũ đang lưu là String ("100"), dòng này sẽ sửa nó thành Number (100)
            gx: gx,
            gy: gy
          },
          { new: true, upsert: true } // upsert: chưa có thì tạo mới
      );
    }

    // 🔥 FIX 4: XÓA CACHE REDIS (Bắt buộc)
    // Để lần sau getChunk sẽ phải query lại DB và lấy dữ liệu mới nhất
    const chunkX = Math.floor(gx / CHUNK_SIZE);
    const chunkY = Math.floor(gy / CHUNK_SIZE);
    const cacheKey = `chunk:${chunkX}:${chunkY}`;

    await redis.del(cacheKey);
    // console.log(`🗑️ Đã xóa cache chunk: ${cacheKey}`); // Bật lên nếu muốn debug

    // Lưu lịch sử (không await để không chặn response)
    PixelEvent.create({ gx, gy, color, userId, teamId: user.teamId }).catch(() => {});

    // Bắn Socket realtime
    if (io) {
      io.emit('pixel_placed', { gx, gy, color, userId: isClear ? null : userId });
    }

    res.status(201).json({ gx, gy, color, userEnergy: user.energy });

  } catch (err) {
    console.error("❌ Lỗi đặt pixel:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// --- 3. API LẤY CHI TIẾT ---
export const getPixelDetail = async (req, res) => {
  try {
    const { gx, gy } = req.query;

    // Không cache thông tin chi tiết
    res.setHeader('Cache-Control', 'no-store, no-cache');

    const pixel = await Pixel.findOne({ gx: Number(gx), gy: Number(gy) }).populate({
      path: 'userId', select: 'username displayName avatarUrl teamId',
      populate: { path: 'teamId', select: 'name' }
    });

    if (!pixel) return res.json({ gx: Number(gx), gy: Number(gy), color: '#FFFFFF', user: null });

    res.json({
      gx: pixel.gx, gy: pixel.gy, color: pixel.color, updatedAt: pixel.updatedAt,
      user: pixel.userId ? (pixel.userId.displayName || pixel.userId.username) : null,
      avatarUrl: pixel.userId?.avatarUrl,
      teamName: pixel.userId?.teamId?.name
    });
  } catch (err) { res.status(500).json({}); }
};