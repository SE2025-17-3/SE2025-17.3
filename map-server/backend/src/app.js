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

import challengeRoutes from './routes/challengeRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',        // Frontend Local
  'http://localhost:4173',        // Frontend Preview
  'https://se2025-17-3.codes',    // Frontend Production
  process.env.FRONTEND_URL
];

app.set('trust proxy', 1); // Cần cho HTTPS + Nginx reverse proxy

/* ===================== CORS ===================== */
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

/* ===================== BODY PARSER ===================== */
// Tăng limit để nhận ảnh Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ===================== STATIC FILES ===================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ===================== ROUTES ===================== */
app.configureRoutes = (io) => {
  // Gắn socket.io vào request
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

  app.use('/api/challenges', challengeRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/store', storeRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/notifications', notificationRoutes);

  // API 404 handler
  app.use(/\/api\/.*/, (req, res) => {
    res.status(404).json({
      message: `API endpoint không tồn tại: ${req.originalUrl}`
    });
  });
};

export default app;
