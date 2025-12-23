// map-server/backend/src/routes/statsRoutes.js

import express from 'express';
import { getTopPlayers, getTopTeams, getLeaderboardCombined } from '../controllers/leaderboardController.js';
import { getHeatmapData } from '../controllers/statsController.js'; 

const router = express.Router();

router.get('/top-players', getTopPlayers);
router.get('/top-teams', getTopTeams);
router.get('/leaderboard', getLeaderboardCombined);
router.get('/heatmap', getHeatmapData); 

export default router;
