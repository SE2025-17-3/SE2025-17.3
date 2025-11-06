// backend/src/routes/userRoutes.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

// 1. SỬA LỖI: Import đúng tên hàm là 'verifyRecaptcha'
import { verifyRecaptcha } from '../middleware/captchaMiddleware.js';

const router = express.Router();

// Route lấy thông tin người dùng (giữ nguyên)
const getMe = (req, res) => {
  res.status(200).json(req.user);
};
router.get('/me', protect, getMe);

// Route để xác minh lại người dùng (giữ nguyên)
const reVerifyUser = (req, res) => {
  res.status(200).json({ message: 'User re-verified successfully.' });
};

// 2. SỬA LỖI: Sử dụng đúng tên hàm middleware là 'verifyRecaptcha'
// Logic xác minh lại giờ đây sẽ dùng chung reCAPTCHA v2
router.post('/re-verify', protect, verifyRecaptcha, reVerifyUser);

export default router;