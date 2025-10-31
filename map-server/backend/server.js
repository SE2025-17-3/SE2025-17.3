import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
// import cors from 'cors'; // <-- Không cần import ở đây nữa, đã ở app.js
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { connectDB } from './src/config/db.js';
import app from './src/app.js'; // app đã import express, cors, và json/urlencoded

// --- Cấu hình ban đầu ---
dotenv.config();
connectDB();

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
app.configureRoutes(io); 

// --- Khởi động Server ---
server.listen(PORT, () => console.log(`✅ Server đang chạy trên port ${PORT}`));

