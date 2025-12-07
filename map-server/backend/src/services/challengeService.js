// Backend - services/challengeService.js
// Core logic for challenge tracking

import Challenge from '../models/Challenge.js';
import UserChallenge from '../models/UserChallenge.js';
import UserStreak from '../models/UserStreak.js';
import User from '../models/User.js';

/**
 * Get current date key in YYYY-MM-DD format (UTC)
 */
export function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get current week key in YYYY-Www format (ISO week)
 */
export function getWeekKey() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get period key based on challenge type
 */
export function getPeriodKey(type) {
    switch (type) {
        case 'daily':
            return getTodayKey();
        case 'weekly':
            return getWeekKey();
        case 'event':
            return 'event';
        default:
            return getTodayKey();
    }
}

/**
 * Get or create user's challenge progress for a specific challenge
 */
export async function getOrCreateProgress(userId, challenge) {
    const periodKey = getPeriodKey(challenge.type);

    let progress = await UserChallenge.findOne({
        userId,
        challengeId: challenge._id,
        periodKey
    });

    if (!progress) {
        progress = new UserChallenge({
            userId,
            challengeId: challenge._id,
            periodKey,
            progress: 0,
            trackedItems: []
        });
        await progress.save();
    }

    return progress;
}

/**
 * Track pixel placement action for challenges
 * @param {ObjectId} userId - User who placed the pixel
 * @param {Object} pixelData - { gx, gy, color }
 * @param {Object} io - Socket.IO instance for real-time updates
 */
export async function trackPixelAction(userId, pixelData, io = null) {
    const { color } = pixelData;

    // Find all active challenges with place_pixel action
    const challenges = await Challenge.find({
        isActive: true,
        'goal.action': 'place_pixel'
    });

    const updates = [];

    for (const challenge of challenges) {
        const progress = await getOrCreateProgress(userId, challenge);

        // Skip if already completed
        if (progress.completed) continue;

        // Increment progress
        progress.progress += 1;

        // Check if completed
        if (progress.progress >= challenge.goal.count) {
            progress.completed = true;
            progress.completedAt = new Date();
        }

        await progress.save();

        updates.push({
            challengeId: challenge._id,
            progress: progress.progress,
            goal: challenge.goal.count,
            completed: progress.completed
        });

        // Emit real-time update
        if (io) {
            io.to(userId.toString()).emit('challenge_progress', {
                challengeId: challenge._id,
                progress: progress.progress,
                goal: challenge.goal.count,
                completed: progress.completed
            });

            if (progress.completed) {
                io.to(userId.toString()).emit('challenge_completed', {
                    challengeId: challenge._id,
                    title: challenge.title,
                    reward: challenge.reward
                });
            }
        }
    }

    // Also track "use_colors" challenges
    await trackColorAction(userId, color, io);

    return updates;
}

/**
 * Track color usage for color-based challenges
 */
async function trackColorAction(userId, color, io = null) {
    const challenges = await Challenge.find({
        isActive: true,
        'goal.action': 'use_colors'
    });

    for (const challenge of challenges) {
        const progress = await getOrCreateProgress(userId, challenge);

        if (progress.completed) continue;

        // Track unique colors
        if (!progress.trackedItems.includes(color)) {
            progress.trackedItems.push(color);
            progress.progress = progress.trackedItems.length;

            // Check if completed
            if (progress.progress >= challenge.goal.count) {
                progress.completed = true;
                progress.completedAt = new Date();
            }

            await progress.save();

            // Emit real-time update
            if (io) {
                io.to(userId.toString()).emit('challenge_progress', {
                    challengeId: challenge._id,
                    progress: progress.progress,
                    goal: challenge.goal.count,
                    completed: progress.completed
                });

                if (progress.completed) {
                    io.to(userId.toString()).emit('challenge_completed', {
                        challengeId: challenge._id,
                        title: challenge.title,
                        reward: challenge.reward
                    });
                }
            }
        }
    }
}

/**
 * Track login action for login challenges
 */
export async function trackLoginAction(userId, io = null) {
    const challenges = await Challenge.find({
        isActive: true,
        'goal.action': 'login'
    });

    for (const challenge of challenges) {
        const progress = await getOrCreateProgress(userId, challenge);

        if (progress.completed) continue;

        progress.progress = 1;
        progress.completed = true;
        progress.completedAt = new Date();
        await progress.save();

        if (io) {
            io.to(userId.toString()).emit('challenge_completed', {
                challengeId: challenge._id,
                title: challenge.title,
                reward: challenge.reward
            });
        }
    }
}

/**
 * Update user's streak
 * @returns {Object} { streakUpdated, currentStreak, bonusMultiplier }
 */
export async function updateStreak(userId, io = null) {
    const todayKey = getTodayKey();

    let streak = await UserStreak.findOne({ userId });

    if (!streak) {
        streak = new UserStreak({
            userId,
            currentStreak: 1,
            longestStreak: 1,
            lastActivityDate: todayKey,
            bonusMultiplier: 1.0
        });
        await streak.save();

        // Update user's currentStreak field
        await User.findByIdAndUpdate(userId, { currentStreak: 1 });

        return {
            streakUpdated: true,
            currentStreak: 1,
            bonusMultiplier: 1.0
        };
    }

    const updated = streak.updateForToday(todayKey);

    if (updated) {
        await streak.save();

        // Update user's currentStreak field
        await User.findByIdAndUpdate(userId, { currentStreak: streak.currentStreak });

        if (io) {
            io.to(userId.toString()).emit('streak_updated', {
                currentStreak: streak.currentStreak,
                longestStreak: streak.longestStreak,
                bonusMultiplier: streak.bonusMultiplier
            });
        }
    }

    return {
        streakUpdated: updated,
        currentStreak: streak.currentStreak,
        bonusMultiplier: streak.bonusMultiplier
    };
}

/**
 * Get user's active challenges with progress
 */
export async function getUserChallengesWithProgress(userId) {
    const todayKey = getTodayKey();
    const weekKey = getWeekKey();

    // Get all active challenges
    const challenges = await Challenge.find({ isActive: true }).sort({ order: 1 });

    // Get user's progress for current periods
    const progressRecords = await UserChallenge.find({
        userId,
        periodKey: { $in: [todayKey, weekKey, 'event'] }
    });

    // Create a map for quick lookup
    const progressMap = new Map();
    progressRecords.forEach(p => {
        progressMap.set(p.challengeId.toString(), p);
    });

    // Combine challenges with progress
    return challenges.map(challenge => {
        const progress = progressMap.get(challenge._id.toString());
        return {
            _id: challenge._id,
            key: challenge.key,
            title: challenge.title,
            description: challenge.description,
            type: challenge.type,
            goal: challenge.goal,
            reward: challenge.reward,
            difficulty: challenge.difficulty,
            icon: challenge.icon,
            progress: progress?.progress || 0,
            completed: progress?.completed || false,
            completedAt: progress?.completedAt || null,
            rewardClaimed: progress?.rewardClaimed || false
        };
    });
}

/**
 * Claim reward for a completed challenge
 */
export async function claimReward(userId, challengeId) {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
        throw new Error('Challenge not found');
    }

    const periodKey = getPeriodKey(challenge.type);
    const progress = await UserChallenge.findOne({
        userId,
        challengeId,
        periodKey
    });

    if (!progress) {
        throw new Error('Challenge progress not found');
    }

    if (!progress.completed) {
        throw new Error('Challenge not completed');
    }

    if (progress.rewardClaimed) {
        throw new Error('Reward already claimed');
    }

    // Get user's streak for bonus multiplier
    const streak = await UserStreak.findOne({ userId });
    const multiplier = streak?.bonusMultiplier || 1.0;

    // Calculate points with bonus
    const pointsEarned = Math.floor(challenge.reward.points * multiplier);

    // Mark as claimed
    progress.rewardClaimed = true;
    progress.pointsEarned = pointsEarned;
    await progress.save();

    // Update user's challenge points
    const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { challengePoints: pointsEarned } },
        { new: true }
    );

    // Add badge if applicable
    if (challenge.reward.badgeId) {
        await User.findByIdAndUpdate(userId, {
            $addToSet: { badges: challenge.reward.badgeId }
        });
    }

    return {
        pointsEarned,
        multiplier,
        totalPoints: user.challengePoints,
        badgeEarned: challenge.reward.badgeId ? true : false
    };
}

/**
 * Get time remaining until daily reset (midnight UTC)
 */
export function getTimeUntilReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const msRemaining = tomorrow - now;
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, msRemaining };
}

/**
 * Get user's streak info
 */
export async function getUserStreak(userId) {
    const streak = await UserStreak.findOne({ userId });

    if (!streak) {
        return {
            currentStreak: 0,
            longestStreak: 0,
            bonusMultiplier: 1.0,
            lastActivityDate: null
        };
    }

    return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        bonusMultiplier: streak.bonusMultiplier,
        lastActivityDate: streak.lastActivityDate
    };
}
