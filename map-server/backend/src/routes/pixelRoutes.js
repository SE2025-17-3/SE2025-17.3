import express from 'express';
import { getChunk, addPixel } from '../controllers/pixelController.js';
<<<<<<< HEAD
import { protect } from '../middleware/authMiddleware.js'; // Import middleware

// Export một hàm nhận io
const configurePixelRoutes = (io) => {
  
  // ⭐ LỖI CỦA BẠN NẰM Ở ĐÂY: Bạn đã thiếu dòng này
  const router = express.Router(); 

  // Route GET (Xem pixel) - Công khai cho mọi người
  router.get('/chunk/:chunkX/:chunkY', getChunk);

  // Route POST (Tô màu) - Được bảo vệ
  // Chỉ user đã đăng nhập (đã chạy qua middleware 'protect') mới được tô màu
  router.post('/', protect, (req, res) => {
    // Chuyển io vào hàm controller
    addPixel(req, res, io); 
=======

// Export một hàm nhận io
const configurePixelRoutes = (io) => {
  const router = express.Router();

  // Route GET giữ nguyên, không cần io
  router.get('/chunk/:chunkX/:chunkY', getChunk);

  // Route POST sẽ gọi addPixel và truyền io vào
  router.post('/', (req, res) => {
      // Chuyển io vào hàm controller
      addPixel(req, res, io); 
>>>>>>> develop
  });

  return router;
};

<<<<<<< HEAD
export default configurePixelRoutes;
=======
export default configurePixelRoutes; // Export hàm cấu hình
>>>>>>> develop
