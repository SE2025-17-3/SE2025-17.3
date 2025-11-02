import express from 'express';
import cors from 'cors';
// Import hàm cấu hình routes, không phải router trực tiếp
import configurePixelRoutes from './routes/pixelRoutes.js';
// Import các routes khác bạn đã tạo
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- MIDDLEWARE CỦA EXPRESS NÊN ĐƯỢC ĐẶT Ở ĐÂY ---

// 1. CORS (Phải chạy trước session và routes)
// (Được chuyển từ server.js về)
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true // ⚠️ Quan trọng: Cho phép gửi cookie
}));

// 2. Body Parsers (Lấy từ server.js trả về)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// --------------------------------------------------


// Lưu hàm cấu hình để server.js sử dụng
// (Lưu ý: session middleware sẽ được thêm vào giữa 
// middleware ở trên và routes ở dưới, trong file server.js)
app.configureRoutes = (io) => {
  app.use('/api/pixels', configurePixelRoutes(io)); // Gọi hàm cấu hình ở đây
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/stats', statsRoutes);

  // Xử lý lỗi 404 cho API
  app.use(/\/api\/.*/, (req, res) => {
    res.status(404).json({ message: `API endpoint không tồn tại: ${req.originalUrl}` });
  });
};

export default app;

