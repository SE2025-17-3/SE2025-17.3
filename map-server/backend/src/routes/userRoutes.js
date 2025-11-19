// backend/src/routes/userRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar
} from '../controllers/userController.js';

const router = express.Router();

router.get('/me', protect, getUserProfile);

router.patch(
    '/profile',
    protect,
    uploadUserAvatar,
    updateUserProfile
);

export default router;