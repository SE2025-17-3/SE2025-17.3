// D:\Code\SE2025-17.3\map-server\backend\src\app.js

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
// --- 1. IMPORT THÊM SESSION & MONGO STORE ---
import session from 'express-session';
import MongoStore from 'connect-mongo';
// --------------------------------------------

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
const FRONTEND_URL = process.env.FRONTEND_URL ;
const MONGO_URI = process.env.MONGO_URI ; // Fallback nếu chưa config env

// --- QUAN TRỌNG KHI LÊN PRODUCTION (NGINX/HTTPS) ---
app.set('trust proxy', 1);
// ---------------------------------------------------

// 1. CORS
app.use(cors({
  origin: ['https://se2025-17-3.codes', 'https://www.se2025-17-3.codes', 'http://localhost:5173'], // Thêm localhost để test dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// 2. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 3. CẤU HÌNH SESSION (BẮT BUỘC THÊM ĐOẠN NÀY) ---
app.use(session({
  name: process.env.SESSION_NAME || 'connect.sid',
  secret: process.env.SESSION_SECRET || 'secret_key_fallback', // Hãy đảm bảo có biến này trong .env
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions', // Tên collection lưu session trong DB
    ttl: 14 * 24 * 60 * 60 // Session tồn tại 14 ngày
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 ngày
    httpOnly: true, // Chặn JS phía client đọc cookie (Bảo mật)

    // --- CẤU HÌNH FIX LỖI TRACKING PREVENTION / 401 TRÊN CLOUDFLARE ---
    // secure: true -> Bắt buộc khi chạy HTTPS
    // sameSite: 'none' -> Bắt buộc khi Frontend và Backend khác domain hoặc qua proxy
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    // ------------------------------------------------------------------
  }
}));
// -----------------------------------------------------

// 4. Static Files (Avatar)
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