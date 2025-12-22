// D:\Code\SE2025-17.3\map-server\backend\src\app.js

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
import challengeRoutes from './routes/challengeRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();
// Lấy URL từ biến môi trường, fallback về localhost nếu chạy local
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- QUAN TRỌNG KHI LÊN PRODUCTION (NGINX/HTTPS) ---
// Giúp Express nhận diện được giao thức HTTPS từ Nginx chuyển vào
app.set('trust proxy', 1);
// ---------------------------------------------------

// 1. CORS
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] // Khai báo rõ method cho chắc chắn
}));

// 2. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static Files (Avatar)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use( '/public' , express.static(path.join(__dirname, '..', 'public')));

// Configure Routes
app.configureRoutes = (io) => {
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.use('/api/pixels', configurePixelRoutes(io));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/challenges', challengeRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/store', storeRoutes);
  app.use('/api/payments', paymentRoutes);

  app.use(/\/api\/.*/, (req, res) => {
    res.status(404).json({ message: `API endpoint không tồn tại: ${req.originalUrl}` });
  });
};

export default app;