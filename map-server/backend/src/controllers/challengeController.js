// backend/src/controllers/challengeController.js
import * as challengeService from '../services/challengeService.js';

/**
 * Get today's challenges for the logged-in user
 */
export const getMyChallenges = async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const challenges = await challengeService.getTodayChallenges(userId);
    res.json(challenges);
  } catch (error) {
    console.error('❌ Error getting challenges:', error);
    res.status(500).json({ error: 'Failed to get challenges' });
  }
};

/**
 * Get user's challenge statistics
 */
export const getMyStats = async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await challengeService.getUserChallengeStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error getting challenge stats:', error);
    res.status(500).json({ error: 'Failed to get challenge stats' });
  }
};

/**
 * Get user's streak information
 */
export const getMyStreak = async (req, res) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const streak = await challengeService.getUserStreak(userId);
    res.json(streak);
  } catch (error) {
    console.error('❌ Error getting streak:', error);
    res.status(500).json({ error: 'Failed to get streak' });
  }
};
