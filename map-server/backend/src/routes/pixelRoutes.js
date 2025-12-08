import express from 'express';
import { getChunk, addPixel } from '../controllers/pixelController.js';
import { protect } from '../middleware/authMiddleware.js';

// Export a function that accepts io and returns configured router
// Note: io is no longer passed to addPixel since Outbox Pattern handles broadcasting
const configurePixelRoutes = (io) => {
  const router = express.Router();

  // Route GET (Xem pixel) - Công khai cho mọi người
  router.get('/chunk/:chunkX/:chunkY', getChunk);

  // Route POST (Tô màu) - Được bảo vệ
  // Chỉ user đã đăng nhập (đã chạy qua middleware 'protect') mới được tô màu
  // Broadcasting is now handled by Outbox Publisher → Redis Stream → Stream Consumer
  router.post('/', protect, addPixel);

  return router;
};

export default configurePixelRoutes;