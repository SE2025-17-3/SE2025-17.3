import express from 'express';
// Thêm getPixelsByChunks vào import
import { getChunk, addPixel, getPixelDetail, getPixelsByChunks } from '../controllers/pixelController.js';
import { protect } from '../middleware/authMiddleware.js';

const configurePixelRoutes = (io) => {
  const router = express.Router();

  // Route GET (Xem pixel) - Công khai
  router.get('/chunk/:chunkX/:chunkY', getChunk);
  router.get('/detail', getPixelDetail);

  // --- THÊM ROUTE MỚI Ở ĐÂY ---
  // Dùng POST vì body chứa mảng ID có thể dài
  router.post('/batch-chunks', getPixelsByChunks);

  // Route POST (Tô màu) - Được bảo vệ
  router.post('/', protect, (req, res) => {
    addPixel(req, res, io);
  });

  return router;
};

export default configurePixelRoutes;