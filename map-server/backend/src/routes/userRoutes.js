import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @desc    Lấy thông tin profile của user đang đăng nhập
 * @route   GET /api/users/me
 * @access  Private
 */
const getMe = (req, res) => {
  // Middleware 'protect' đã chạy và gắn req.user
  res.status(200).json(req.user);
};

// Gắn middleware 'protect' vào route /me
router.get('/me', protect, getMe);

export default router;