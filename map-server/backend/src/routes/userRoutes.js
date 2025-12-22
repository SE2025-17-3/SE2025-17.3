// map-server/backend/src/routes/userRoutes.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  submitAppeal // <--- Import hàm mới thêm
} from '../controllers/userController.js';
import { verifyRecaptcha } from '../middleware/captchaMiddleware.js';

const router = express.Router();

router.get('/me', protect, getUserProfile);
router.patch('/profile', protect, uploadUserAvatar, updateUserProfile);
router.post('/re-verify', protect, verifyRecaptcha, (req, res) => res.json({message: 'OK'}));
router.post('/appeal', protect, submitAppeal); 

export default router;