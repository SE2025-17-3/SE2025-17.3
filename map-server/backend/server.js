// backend/server.js
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

// --- Cấu hình ban đầu ---
dotenv.config();
connectDB();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}


const server = createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 4000;
const SESSION_NAME = process.env.SESSION_NAME || 'connect.sid';

// --- Cấu hình Middleware ---
// CORS và Body Parsers đã được app.js xử lý

// 3. Cấu hình Express Session
// (Phải chạy SAU cors/json trong app.js, và TRƯỚC app.configureRoutes)
if (!process.env.SESSION_SECRET || !process.env.MONGO_URI) {
  console.error("Lỗi: Vui lòng cung cấp SESSION_SECRET và MONGO_URI trong file .env");
  process.exit(1);
}

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false, // Khắc phục cảnh báo
  saveUninitialized: false, // Khắc phục cảnh báo
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 1 ngày
  },
  name: SESSION_NAME
};

// Sử dụng session middleware cho Express
app.use(session(sessionConfig));

// --- Cấu hình Socket.IO ---
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        credentials: true
    }
});

// Gắn session middleware vào Socket.IO
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(session(sessionConfig)));

io.on('connection', (socket) => {
  console.log('🟢 Client đã kết nối:', socket.id);
  // (Nâng cao) Giờ bạn có thể truy cập session:
  // console.log('Session của socket:', socket.request.session?.userId);
  socket.on('disconnect', () => console.log('🔴 Client đã ngắt kết nối:', socket.id));
});

// --- Cấu hình Routes (sau khi đã cài tất cả middleware) ---
app.configureRoutes(io); // Pass io to routes for Socket.IO events

// --- Khởi động Workers (Outbox Pattern) ---
const outboxPublisher = getOutboxPublisher({
  pollInterval: 100, // Poll every 100ms
  batchSize: 50,
});

const streamConsumer = new StreamConsumer(io, {
  consumerName: `consumer-${process.pid}`,
  blockTime: 1000,
  batchSize: 10,
});

// Start workers
(async () => {
  try {
    await outboxPublisher.start();
    await streamConsumer.start();
    console.log('✅ All workers started successfully');
  } catch (err) {
    console.error('❌ Failed to start workers:', err);
    process.exit(1);
  }
})();

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Stop workers
    await outboxPublisher.stop();
    await streamConsumer.stop();
    console.log('✅ Workers stopped');

    // Close Redis connections
    await closeAllRedisConnections();

    // Close Socket.IO
    io.close(() => {
      console.log('✅ Socket.IO closed');
    });

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// --- Khởi động Server ---
server.listen(PORT, () => {
  console.log(`✅ Server đang chạy trên port ${PORT}`);
  console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

