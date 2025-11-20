import express from 'express';
import { getTopPlayers, getTopTeams, getLeaderboardCombined } from '../controllers/leaderboardController.js';

const router = express.Router();

// Public leaderboards
router.get('/players', getTopPlayers);
router.get('/teams', getTopTeams);
router.get('/leaderboard', getLeaderboardCombined);

export default router;
