import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import User from '../models/User.js';
import { calculateEnergy } from './authController.js';
// Import Redis đã sửa lỗi export
import { redis } from '../config/redis.js';

const CHUNK_SIZE = 256;

// --- 1. LẤY CHUNK (CÓ CACHE CONTROL & REDIS) ---
export const getChunk = async (req, res) => {
  try {
    const chunkX = parseInt(req.params.chunkX, 10);
    const chunkY = parseInt(req.params.chunkY, 10);

    if (isNaN(chunkX) || isNaN(chunkY)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // 🔥 QUAN TRỌNG: Cấm trình duyệt cache kết quả này
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Key cache trong Redis
    const cacheKey = `chunk:${chunkX}:${chunkY}`;

    // A. Thử lấy từ Redis
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // B. Nếu không có, lấy từ MongoDB
    const gx_min = chunkX * CHUNK_SIZE;
    const gx_max = (chunkX + 1) * CHUNK_SIZE;
    const gy_min = chunkY * CHUNK_SIZE;
    const gy_max = (chunkY + 1) * CHUNK_SIZE;

    // Tìm kiếm với điều kiện tọa độ là SỐ
    const pixels = await Pixel.find({
      gx: { $gte: gx_min, $lt: gx_max },
      gy: { $gte: gy_min, $lt: gy_max },
    }).select('gx gy color userId -_id').lean();

    // C. Lưu vào Redis
    // Cache kể cả mảng rỗng (thời gian ngắn 5p) để tránh query DB liên tục
    const ttl = pixels.length > 0 ? 3600 : 300; 
    await redis.set(cacheKey, JSON.stringify(pixels), 'EX', ttl);

    res.json(pixels);
  } catch (err) {
    console.error("❌ Lỗi lấy chunk:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// --- 2. ĐẶT PIXEL (CÓ XÓA CACHE & TỰ SỬA DỮ LIỆU) ---
export const addPixel = async (req, res, io) => {
  // 🔥 FIX 1: Ép kiểu Số ngay lập tức (Chống lỗi String/Number)
  const gx = Number(req.body.gx);
  const gy = Number(req.body.gy);
  const { color } = req.body;

  // Validate kỹ
  if (isNaN(gx) || isNaN(gy) || !color) {
    return res.status(400).json({ error: "Tọa độ hoặc màu không hợp lệ." });
  }

  const isClear = color === 'transparent';
  if (!isClear && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: "Mã màu không hợp lệ." });
  }

  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Check User & Energy
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    await calculateEnergy(user);
    if (user.energy <= 0) return res.status(403).json({ error: "Hết năng lượng." });

    user.energy -= 1;
    if (user.energy === (user.maxEnergy - 1)) user.lastEnergyUpdate = new Date();
    await user.save();

    // Lưu Pixel vào DB
    if (isClear) {
      await Pixel.findOneAndDelete({ gx, gy });
    } else {
      await Pixel.findOneAndUpdate(
          { gx, gy }, // Điều kiện tìm kiếm
          { 
            color, 
            userId,
            // 🔥 FIX 2: ÉP GHI ĐÈ TỌA ĐỘ THÀNH SỐ
            // Nếu DB cũ đang lưu dạng String, dòng này sẽ sửa nó thành Number
            gx: gx, 
            gy: gy
          },
          { new: true, upsert: true } 
      );
    }

    // 🔥 QUAN TRỌNG: XÓA CACHE REDIS
    const chunkX = Math.floor(gx / CHUNK_SIZE);
    const chunkY = Math.floor(gy / CHUNK_SIZE);
    const cacheKey = `chunk:${chunkX}:${chunkY}`;

    await redis.del(cacheKey);
    console.log(`🎨 Pixel [${gx},${gy}] updated. Cache cleared: ${cacheKey}`);

    // Lưu lịch sử
    try {
      await PixelEvent.create({ gx, gy, color, userId, teamId: user.teamId });
    } catch (e) {}

    // Bắn Socket
    if (io) {
      io.emit('pixel_placed', { gx, gy, color, userId: isClear ? null : userId });
    }

    res.status(201).json({ gx, gy, color, userEnergy: user.energy });

  } catch (err) {
    console.error("❌ Lỗi đặt pixel:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// --- 3. DETAIL (GIỮ NGUYÊN) ---
export const getPixelDetail = async (req, res) => {
  try {
    const { gx, gy } = req.query;
    
    // Validate đầu vào detail
    if (gx === undefined || gy === undefined) return res.status(400).json({});

    res.setHeader('Cache-Control', 'no-store, no-cache'); // Không cache

    // Ép kiểu số khi query
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
