import express from 'express';
import { getChunk, addPixel } from '../controllers/pixelController.js';

// Export một hàm nhận io
const configurePixelRoutes = (io) => {
  const router = express.Router();

  // Route GET giữ nguyên, không cần io
  router.get('/chunk/:chunkX/:chunkY', getChunk);

  // Route POST sẽ gọi addPixel và truyền io vào
  router.post('/', (req, res) => {
      // Chuyển io vào hàm controller
      addPixel(req, res, io); 
  });

  return router;
};

export default configurePixelRoutes; // Export hàm cấu hình