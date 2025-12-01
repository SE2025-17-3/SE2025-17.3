import express from 'express';
import { getTopPlayers, getTopTeams, getLeaderboardCombined } from '../controllers/leaderboardController.js';

const router = express.Router();

router.get('/top-players', getTopPlayers);
router.get('/top-teams', getTopTeams);
router.get('/leaderboard', getLeaderboardCombined);

export default router;
