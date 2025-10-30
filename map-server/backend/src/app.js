import express from 'express';
import cors from 'cors';
// Import hàm cấu hình routes, không phải router trực tiếp
import configurePixelRoutes from './routes/pixelRoutes.js'; 

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Lưu hàm cấu hình để server.js sử dụng
app.configureRoutes = (io) => {
    app.use('/api/pixels', configurePixelRoutes(io)); // Gọi hàm cấu hình ở đây
};

export default app;