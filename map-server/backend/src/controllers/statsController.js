// map-server/backend/src/controllers/statsController.js
import PixelEvent from '../models/PixelEvent.js';
import { redis } from '../config/redis.js';

export const getHeatmapData = async (req, res) => {
  try {
    // 1. Kiểm tra Cache trước
    const cachedData = await redis.get('heatmap_data');
    if (cachedData) {
        return res.json(JSON.parse(cachedData));
    }

    // 2. Nếu không có cache, tính toán từ DB (Lấy dữ liệu 1 giờ qua)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const BLOCK_SIZE = 10; 

    const heatmapData = await PixelEvent.aggregate([
      { 
        $match: { createdAt: { $gte: oneHourAgo } } 
      },
      {
        $group: {
          _id: {
            gx: { $floor: { $divide: ["$gx", BLOCK_SIZE] } },
            gy: { $floor: { $divide: ["$gy", BLOCK_SIZE] } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 0 } }
      }
    ]);

    const formattedData = heatmapData.map(item => ({
      x: item._id.gx * BLOCK_SIZE,
      y: item._id.gy * BLOCK_SIZE,
      val: item.count
    }));

    // 3. Lưu vào Cache trong 60 giây
    // 'EX', 60 nghĩa là hết hạn sau 60s
    await redis.set('heatmap_data', JSON.stringify(formattedData), 'EX', 60);

    res.json(formattedData);
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ message: 'Lỗi lấy dữ liệu Heatmap' });
  }
};