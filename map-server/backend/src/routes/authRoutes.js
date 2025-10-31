import express from 'express';
import { registerUser, loginUser, logoutUser } from '../controllers/authController.js';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validate cho Register (4 trường)
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

// Validate cho Login (2 trường)
const loginValidation = [
  body('username', 'Tên đăng nhập không được trống').notEmpty(),
  body('password', 'Mật khẩu không được trống').notEmpty()
];

router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post('/logout', protect, logoutUser);

export default router;

