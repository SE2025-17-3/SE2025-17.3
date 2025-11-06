// backend/src/routes/authRoutes.js

import express from 'express';
import { registerUser, loginUser, logoutUser } from '../controllers/authController.js';
import { body } from 'express-validator';

// 1. SỬA LỖI: Dùng 'import' thay cho 'require' và thêm đuôi '.js'
import { verifyRecaptcha } from '../middleware/captchaMiddleware.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Các quy tắc Validate (giữ nguyên) ---
const registerValidation = [
  body('username', 'Tên đăng nhập không được trống').notEmpty().trim(),
  body('email', 'Email không hợp lệ').isEmail(),
  body('password', 'Mật khẩu phải có ít nhất 6 ký tự').isLength({ min: 6 }),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Xác nhận mật khẩu không khớp');
    }
    return true;
  })
];

const loginValidation = [
  body('username', 'Tên đăng nhập không được trống').notEmpty(),
  body('password', 'Mật khẩu không được trống').notEmpty()
];


// --- 2. SỬA LỖI: Kết hợp các middleware vào một chuỗi duy nhất ---
// Thứ tự chạy: reCAPTCHA -> Validation -> Controller
// Nếu reCAPTCHA thất bại, request sẽ dừng lại ngay lập tức.
router.post('/register', verifyRecaptcha, registerValidation, registerUser);

router.post('/login', verifyRecaptcha, loginValidation, loginUser);

// Route logout không thay đổi
router.post('/logout', protect, logoutUser);


// --- 3. SỬA LỖI: Xóa các route bị trùng lặp và sai ---
// Các dòng code bên dưới đã bị xóa vì chúng sai và thừa.
// router.post('/register', registerValidation, registerUser); // Bị dòng dưới ghi đè
// router.post('/login', loginValidation, loginUser); // Bị dòng dưới ghi đè
// router.post('/register', verifyRecaptchaV3, register); // Sai tên controller
// router.post('/login', verifyRecaptchaV3, login); // Sai tên controller

export default router;