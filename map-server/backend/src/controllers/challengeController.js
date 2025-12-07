// Backend - controllers/challengeController.js
// API endpoints for challenges

import * as challengeService from '../services/challengeService.js';
import Challenge from '../models/Challenge.js';

/**
 * GET /api/challenges
 * Get all active challenges
 */
export const getChallenges = async (req, res) => {
    try {
        const challenges = await Challenge.find({ isActive: true })
            .sort({ order: 1 })
            .select('-__v');

        const timeUntilReset = challengeService.getTimeUntilReset();

        res.json({
            challenges,
            resetIn: timeUntilReset
        });
    } catch (error) {
        console.error('getChallenges error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/challenges/progress
 * Get user's progress on all active challenges
 */
export const getUserProgress = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const challenges = await challengeService.getUserChallengesWithProgress(
            req.session.userId
        );

        const timeUntilReset = challengeService.getTimeUntilReset();

        res.json({
            challenges,
            resetIn: timeUntilReset
        });
    } catch (error) {
        console.error('getUserProgress error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/challenges/:id/claim
 * Claim reward for a completed challenge
 */
export const claimReward = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { id } = req.params;

        const result = await challengeService.claimReward(req.session.userId, id);

        res.json({
            message: 'Reward claimed successfully',
            ...result
        });
    } catch (error) {
        console.error('claimReward error:', error);

        if (error.message === 'Challenge not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Challenge not completed' ||
            error.message === 'Reward already claimed' ||
            error.message === 'Challenge progress not found') {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/challenges/streak
 * Get user's current streak info
 */
export const getStreak = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const streak = await challengeService.getUserStreak(req.session.userId);

        res.json(streak);
    } catch (error) {
        console.error('getStreak error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/challenges/leaderboard
 * Get top challenge point earners
 */
export const getChallengeLeaderboard = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const limitNum = Math.min(parseInt(limit) || 50, 100);

        // Import User here to avoid circular dependency
        const User = (await import('../models/User.js')).default;

        const topUsers = await User.find({ challengePoints: { $gt: 0 } })
            .sort({ challengePoints: -1 })
            .limit(limitNum)
            .select('username displayName challengePoints currentStreak badges')
            .populate('badges', 'name icon');

        res.json({
            count: topUsers.length,
            data: topUsers.map((user, index) => ({
                rank: index + 1,
                userId: user._id,
                username: user.username,
                displayName: user.displayName,
                challengePoints: user.challengePoints,
                currentStreak: user.currentStreak,
                badges: user.badges
            }))
        });
    } catch (error) {
        console.error('getChallengeLeaderboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
