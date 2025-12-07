// Backend - routes/challengeRoutes.js
// Challenge API routes

import express from 'express';
import {
    getChallenges,
    getUserProgress,
    claimReward,
    getStreak,
    getChallengeLeaderboard
} from '../controllers/challengeController.js';

const router = express.Router();

// Public routes
router.get('/', getChallenges);
router.get('/leaderboard', getChallengeLeaderboard);

// Protected routes (require authentication)
router.get('/progress', getUserProgress);
router.get('/streak', getStreak);
router.post('/:id/claim', claimReward);

export default router;
