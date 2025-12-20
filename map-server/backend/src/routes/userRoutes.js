// D:\Code\SE2025-17.3\map-server\backend\src\routes\userRoutes.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar
} from '../controllers/userController.js';

// 1. SỬA LỖI: Import đúng tên hàm là 'verifyRecaptcha'
import { verifyRecaptcha } from '../middleware/captchaMiddleware.js';

const router = express.Router();

router.get('/me', protect, getUserProfile);

router.patch(
    '/profile',
    protect,
    uploadUserAvatar,
    updateUserProfile
);

// Route để xác minh lại người dùng (giữ nguyên)
const reVerifyUser = (req, res) => {
  res.status(200).json({ message: 'User re-verified successfully.' });
};

// 2. SỬA LỖI: Sử dụng đúng tên hàm middleware là 'verifyRecaptcha'
// Logic xác minh lại giờ đây sẽ dùng chung reCAPTCHA v2
router.post('/re-verify', protect, verifyRecaptcha, reVerifyUser);

export default router;