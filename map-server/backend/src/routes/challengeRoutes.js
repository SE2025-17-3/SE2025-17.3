// backend/src/routes/challengeRoutes.js
import express from 'express';
import * as challengeController from '../controllers/challengeController.js';

const router = express.Router();

// Get today's challenges for the logged-in user
router.get('/my', challengeController.getMyChallenges);

// Get user's challenge statistics
router.get('/my/stats', challengeController.getMyStats);

// Get user's streak information
router.get('/my/streak', challengeController.getMyStreak);

export default router;
