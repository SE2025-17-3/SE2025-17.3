// map-server/backend/src/routes/authRoutes.js

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

// --- Validation Arrays ---
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

// SỬA Ở ĐÂY: Bỏ 'protect' middleware để tránh lỗi 401 khi session đã hết hạn
router.post('/logout', logoutUser);

// --- PASSWORD RESET & VERIFY ---
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

export default router;