import express from 'express';
import { getChunk, addPixel } from '../controllers/pixelController.js';
import { protect } from '../middleware/authMiddleware.js'; // Import middleware

const router = express.Router();

// Route GET (Xem pixel) - Công khai cho mọi người
router.get('/chunk/:chunkX/:chunkY', getChunk);

// Route POST (Tô màu) - Được bảo vệ
// Chỉ user đã đăng nhập (đã chạy qua middleware 'protect') mới được tô màu
// addPixel now uses Outbox pattern, no longer needs io parameter
router.post('/', protect, addPixel);

export default router;