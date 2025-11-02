import express from 'express';
import cors from 'cors';
// Import routes
import pixelRoutes from './routes/pixelRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- MIDDLEWARE CỦA EXPRESS NÊN ĐƯỢC ĐẶT Ở ĐÂY ---

// 1. CORS (Phải chạy trước session và routes)
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true // ⚠️ Quan trọng: Cho phép gửi cookie
}));

// 2. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// --------------------------------------------------

// Configure routes (session middleware will be added before this in server.js)
app.configureRoutes = () => {
  app.use('/api/pixels', pixelRoutes); // No longer needs io parameter
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);

  // Xử lý lỗi 404 cho API
  app.use(/\/api\/.*/, (req, res) => {
    res.status(404).json({ message: `API endpoint không tồn tại: ${req.originalUrl}` });
  });
};

export default app;

