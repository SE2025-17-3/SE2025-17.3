import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import app from './src/app.js'; // app bây giờ có thêm hàm configureRoutes

dotenv.config();
connectDB();

const server = createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, { 
    cors: { 
        origin: FRONTEND_URL, // Sửa lại CORS cho Socket.IO
        methods: ["GET", "POST"] 
    } 
});

// --- ⭐ Quan trọng: Gọi hàm cấu hình routes và truyền io ---
app.configureRoutes(io); 
// --------------------------------------------------------

io.on('connection', (socket) => {
  console.log('🟢 Client đã kết nối:', socket.id);
  // Thêm handler cho các sự kiện socket khác nếu cần

  socket.on('disconnect', () => console.log('🔴 Client đã ngắt kết nối:', socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Server đang chạy trên port ${PORT}`));