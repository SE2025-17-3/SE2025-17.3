// D:\Code\SE2025-17.3\map-server\backend\src\routes\teamRoutes.js
import express from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  joinTeam,
  leaveTeam,
  getTeamStats,
  searchTeams,
} from '../controllers/teamController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  validateCreateTeam,
  validateUpdateTeam,
  validateTeamId,
  handleValidationErrors,
} from '../middleware/teamValidation.js';

const router = express.Router();

// Public routes
router.get('/', getTeams);                    // List all teams
router.get('/search', searchTeams);           // Search teams
router.get('/:teamId', validateTeamId, handleValidationErrors, getTeamById);          // Get team details
router.get('/:teamId/stats', validateTeamId, handleValidationErrors, getTeamStats);   // Get team stats

// Protected routes (require authentication)
router.post('/', protect, validateCreateTeam, handleValidationErrors, createTeam);               // Create team
router.put('/:teamId', protect, validateUpdateTeam, handleValidationErrors, updateTeam);         // Update team (creator only)
router.delete('/:teamId', protect, validateTeamId, handleValidationErrors, deleteTeam);          // Delete team (creator only)
router.post('/:teamId/join', protect, validateTeamId, handleValidationErrors, joinTeam);         // Join team
router.post('/leave', protect, leaveTeam);           // Leave team

export default router;
