import express from 'express';
import { getChunk, addPixel } from '../controllers/pixelController.js';
import { protect } from '../middleware/authMiddleware.js';

// Export a function that accepts io and returns configured router
const configurePixelRoutes = (io) => {
  const router = express.Router();

  // Route GET (Xem pixel) - Công khai cho mọi người
  router.get('/chunk/:chunkX/:chunkY', getChunk);

  // Route POST (Tô màu) - Được bảo vệ
  // Chỉ user đã đăng nhập (đã chạy qua middleware 'protect') mới được tô màu
  router.post('/', protect, (req, res) => {
    // Chuyển io vào hàm controller
    addPixel(req, res, io);
  });

  return router;
};

export default configurePixelRoutes;