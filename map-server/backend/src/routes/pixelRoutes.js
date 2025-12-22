// map-server/backend/src/routes/pixelRoutes.js

import express from 'express';
import { getChunk, addPixel, getPixelDetail } from '../controllers/pixelController.js';
import { protect } from '../middleware/authMiddleware.js';

// Export a function that accepts io and returns configured router
const configurePixelRoutes = (io) => {
  const router = express.Router();

  // Route GET (Xem pixel) - Công khai cho mọi người
  router.get('/chunk/:chunkX/:chunkY', getChunk);

  router.get('/detail', getPixelDetail); 

  // Route POST (Tô màu) - Được bảo vệ
  router.post('/', protect, (req, res) => {
    // Chuyển io vào hàm controller
    addPixel(req, res, io);
  });

  return router;
};

export default configurePixelRoutes;
