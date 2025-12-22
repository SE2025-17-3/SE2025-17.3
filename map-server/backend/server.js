// map-server/backend/server.js

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
import { initializeStripe } from './src/config/stripe.js';

// Chat handler
import chatHandler from './src/socket/chatHandler.js';

dotenv.config();
connectDB();
initializeStripe();

const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 4000;
const SESSION_NAME = process.env.SESSION_NAME || 'connect.sid';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET || !process.env.MONGO_URI) {
  console.error('❌ Thiếu SESSION_SECRET hoặc MONGO_URI');
  process.exit(1);
}

/* ===================== SESSION ===================== */
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60
  }),
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24
  },
  name: SESSION_NAME,
  proxy: true
};

app.use(session(sessionConfig));

/* ===================== SOCKET.IO ===================== */
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Share session with socket.io
const wrap = middleware => (socket, next) =>
    middleware(socket.request, {}, next);

io.use(wrap(session(sessionConfig)));

io.on('connection', (socket) => {
  // console.log('🟢 Socket connected:', socket.id);

  /* ===== Personal user room (notifications, payments, wallet) ===== */
  const userId = socket.request.session?.userId;
  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined room user:${userId}`);
  }

  /* ===== Chat realtime ===== */
  chatHandler(io, socket);

  socket.on('disconnect', () => {
    // console.log('🔴 Socket disconnected:', socket.id);
  });
});

// Expose io for routes (webhook, payment, etc.)
app.set('io', io);
app.configureRoutes(io);

/* ===================== WORKERS ===================== */
const outboxPublisher = getOutboxPublisher({
  pollInterval: 100,
  batchSize: 50
});

const streamConsumer = new StreamConsumer(io, {
  consumerName: `consumer-${process.pid}`,
  blockTime: 1000,
  batchSize: 10
});

(async () => {
  try {
    await outboxPublisher.start();
    await streamConsumer.start();
    console.log('✅ All workers started');
  } catch (err) {
    console.error('❌ Failed to start workers:', err);
  }
})();

/* ===================== GRACEFUL SHUTDOWN ===================== */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received`);
  try {
    server.close(() => console.log('✅ HTTP server closed'));
    await outboxPublisher.stop();
    await streamConsumer.stop();
    await closeAllRedisConnections();
    io.close(() => console.log('✅ Socket.io closed'));
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/* ===================== START SERVER ===================== */
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
