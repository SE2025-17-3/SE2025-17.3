// backend/src/app.js
import express from 'express';
import cors from 'cors';
import path from 'path'; // <-- DÒNG 1: Import module 'path'
import { fileURLToPath } from 'url'; // <-- DÒNG 2: Import module 'fileURLToPath'

// Import hàm cấu hình routes, không phải router trực tiếp
import configurePixelRoutes from './routes/pixelRoutes.js';
// Import các routes khác bạn đã tạo
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- MIDDLEWARE CỦA EXPRESS NÊN ĐƯỢỢC ĐẶT Ở ĐÂY ---

// 1. CORS (Phải chạy trước session và routes)
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// 2. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DÒNG 3: BỔ SUNG ĐOẠN CODE NÀY ĐỂ PHỤC VỤ ẢNH ĐẠI DIỆN ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'public')));
// -----------------------------------------------------------------


// Lưu hàm cấu hình để server.js sử dụng
app.configureRoutes = (io) => {
  // Gắn io vào mỗi request để các controller có thể sử dụng nếu cần
  // (Đây là một cách thực hành tốt)
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.use('/api/pixels', configurePixelRoutes(io));
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