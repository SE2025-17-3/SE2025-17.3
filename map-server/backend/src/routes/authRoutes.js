// D:\Code\SE2025-17.3\map-server\backend\src\routes\authRoutes.js

import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  googleLogin,
  forgotPassword,
  verifyOTP,
  verifyEmail,
  resetPassword
} from '../controllers/authController.js';

import { body } from 'express-validator';
import { verifyRecaptcha } from '../middleware/captchaMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Validation Arrays (Giữ nguyên) ---
const registerValidation = [
  body('username', 'Tên đăng nhập không được trống').notEmpty().trim(),
  body('email', 'Email không hợp lệ').isEmail(),
  body('password', 'Mật khẩu phải có ít nhất 6 ký tự').isLength({ min: 6 }),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Xác nhận mật khẩu không khớp');
    return true;
  })
];

const loginValidation = [
  body('username', 'Tên đăng nhập không được trống').notEmpty(),
  body('password', 'Mật khẩu không được trống').notEmpty()
];

// --- ROUTES ---

router.post('/register', verifyRecaptcha, registerValidation, registerUser);
router.post('/login', verifyRecaptcha, loginValidation, loginUser);
router.post('/google', googleLogin);
router.post('/logout', protect, logoutUser);

// --- PHẦN QUAN TRỌNG: LOGIC QUÊN MẬT KHẨU (OTP) ---

// 1. Gửi mã OTP (POST)
router.post('/forgot-password', forgotPassword);

// 2. Kiểm tra mã OTP (POST) - Route này mới thêm
router.post('/verify-otp', verifyOTP);

// 3. Đặt lại mật khẩu (POST) - Lưu ý: Dùng POST và KHÔNG có :token
router.post('/reset-password', resetPassword);

router.post('/verify-email', verifyEmail);


export default router;