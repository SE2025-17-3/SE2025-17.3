// map-server/backend/src/app.js

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import configurePixelRoutes from './routes/pixelRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',       // Frontend chạy Local
  'http://localhost:4173',       // Frontend chạy Preview
  'https://se2025-17-3.codes',   // Frontend Production
  process.env.FRONTEND_URL
];

app.set('trust proxy', 1); // Cần thiết cho HTTPS sau Nginx

// 1. CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// 2. Body Parsers (SỬA Ở ĐÂY: Chỉ giữ lại 1 lần khai báo có limit)
// Tăng giới hạn lên 50MB để nhận được ảnh Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Static Files (Avatar)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configure Routes
app.configureRoutes = (io) => {
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.use('/api/pixels', configurePixelRoutes(io));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/teams', teamRoutes);

  app.use(/\/api\/.*/, (req, res) => {
    res.status(404).json({ message: `API endpoint không tồn tại: ${req.originalUrl}` });
  });
};

export default app;