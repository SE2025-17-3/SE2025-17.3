// D:\Code\SE2025-17.3\map-server\backend\src\routes\leaderboardRoutes.js
import express from 'express';
import { getTopPlayers, getTopTeams, getLeaderboardCombined } from '../controllers/leaderboardController.js';

const router = express.Router();

// Public leaderboards
router.get('/players', getTopPlayers);
router.get('/teams', getTopTeams);
router.get('/', getLeaderboardCombined); // Root route for combined leaderboard

export default router;
