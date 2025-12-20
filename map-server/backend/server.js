// D:\Code\SE2025-17.3\map-server\backend\server.js
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { connectDB } from './src/config/db.js';
import app from './src/app.js';
import { getOutboxPublisher } from './src/workers/outboxPublisher.js';
import StreamConsumer from './src/workers/streamConsumer.js';
import { closeAllRedisConnections } from './src/config/redis.js';

dotenv.config();
connectDB();

const server = createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 4000;
const SESSION_NAME = process.env.SESSION_NAME || 'connect.sid';
// Kiểm tra xem có đang chạy trên môi trường Production không
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET || !process.env.MONGO_URI) {
  console.error("Lỗi: Vui lòng cung cấp SESSION_SECRET và MONGO_URI trong file .env");
  process.exit(1);
}

// --- CẤU HÌNH SESSION CHO PRODUCTION ---
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60 // Session tồn tại 14 ngày trong DB
  }),
  cookie: {
    httpOnly: true, // Chặn JS client đọc cookie (chống XSS)

    // QUAN TRỌNG: Trên web thật (HTTPS) phải là true, Localhost là false
    secure: IS_PRODUCTION,

    // Nếu Frontend và Backend cùng domain (se2025...codes) dùng 'lax'
    // Nếu khác domain (api.se2025... và www.se2025...) dùng 'none'
    sameSite: IS_PRODUCTION ? 'lax' : 'lax',

    maxAge: 1000 * 60 * 60 * 24 // 1 ngày
  },
  name: SESSION_NAME,
  proxy: true // Bắt buộc khi dùng secure: true sau Nginx
};

app.use(session(sessionConfig));

// --- Cấu hình Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST"]
  },
  // Cấu hình thêm cho Socket.IO sau Nginx
  transports: ['websocket', 'polling']
});

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(session(sessionConfig)));

io.on('connection', (socket) => {
  // console.log('🟢 Client đã kết nối:', socket.id);
  socket.on('disconnect', () => {
    // console.log('🔴 Client đã ngắt kết nối:', socket.id)
  });
});

app.configureRoutes(io);

// ... (Phần Workers và Shutdown giữ nguyên như code cũ của bạn) ...
const outboxPublisher = getOutboxPublisher({ pollInterval: 100, batchSize: 50 });
const streamConsumer = new StreamConsumer(io, { consumerName: `consumer-${process.pid}`, blockTime: 1000, batchSize: 10 });

(async () => {
  try {
    await outboxPublisher.start();
    await streamConsumer.start();
    console.log('✅ All workers started successfully');
  } catch (err) {
    console.error('❌ Failed to start workers:', err);
  }
})();

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  try {
    server.close(() => console.log('✅ HTTP server closed'));
    await outboxPublisher.stop();
    await streamConsumer.stop();
    await closeAllRedisConnections();
    io.close(() => console.log('✅ Socket.IO closed'));
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, () => {
  console.log(`✅ Server đang chạy trên port ${PORT}`);
  console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔧 Mode: ${IS_PRODUCTION ? 'PRODUCTION (HTTPS)' : 'DEVELOPMENT'}`);
});