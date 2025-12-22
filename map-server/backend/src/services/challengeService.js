// backend/src/services/challengeService.js
import Challenge from '../models/Challenge.js';
import UserChallenge from '../models/UserChallenge.js';
import UserStreak from '../models/UserStreak.js';
import User from '../models/User.js';
import moment from 'moment-timezone';

/**
 * Get or create today's challenges for a user
 */
export const getTodayChallenges = async (userId) => {
  const today = moment().startOf('day').toDate();
  const tomorrow = moment().add(1, 'day').startOf('day').toDate();

  // Get all active daily challenges
  const dailyChallenges = await Challenge.find({
    type: 'daily',
    isActive: true
  }).sort({ order: 1 });

  // Get user's progress for today
  const userChallenges = await UserChallenge.find({
    userId,
    date: { $gte: today, $lt: tomorrow }
  }).populate('challengeId');

  // Create map of existing user challenges
  const userChallengeMap = new Map();
  userChallenges.forEach(uc => {
    if (uc.challengeId) {
      userChallengeMap.set(uc.challengeId._id.toString(), uc);
    }
  });

  // Ensure all daily challenges exist for this user today
  const result = [];
  for (const challenge of dailyChallenges) {
    let userChallenge = userChallengeMap.get(challenge._id.toString());

    if (!userChallenge) {
      // Create or update user challenge for today using upsert to avoid duplicates
      userChallenge = await UserChallenge.findOneAndUpdate(
        {
          userId,
          challengeId: challenge._id,
          date: { $gte: today, $lt: tomorrow }
        },
        {
          $setOnInsert: {
            userId,
            challengeId: challenge._id,
            progress: 0,
            completed: false,
            date: today
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
      userChallenge.challengeId = challenge;
    }

    result.push({
      _id: userChallenge._id,
      challenge: challenge,
      progress: userChallenge.progress,
      completed: userChallenge.completed,
      completedAt: userChallenge.completedAt,
      goal: challenge.goal.count
    });
  }

  return result;
};

/**
 * Track pixel placement action
 */
export const trackPixelAction = async (userId, pixelData, io) => {
  const today = moment().startOf('day').toDate();
  const tomorrow = moment().add(1, 'day').startOf('day').toDate();

  // Find pixel placement challenges
  const challenges = await Challenge.find({
    type: 'daily',
    isActive: true,
    'goal.action': 'place_pixels'
  });

  for (const challenge of challenges) {
    const userChallenge = await UserChallenge.findOne({
      userId,
      challengeId: challenge._id,
      date: { $gte: today, $lt: tomorrow },
      completed: false
    });

    if (userChallenge) {
      userChallenge.progress += 1;

      // Check if challenge is completed
      if (userChallenge.progress >= challenge.goal.count && !userChallenge.completed) {
        userChallenge.completed = true;
        userChallenge.completedAt = new Date();

        // Award points
        await User.findByIdAndUpdate(userId, {
          $inc: { challengePoints: challenge.reward.points }
        });

        // Emit event to user
        if (io) {
          io.to(userId.toString()).emit('challenge_completed', {
            challengeId: challenge._id,
            title: challenge.title,
            points: challenge.reward.points
          });
        }
      }

      await userChallenge.save();
    }
  }
};

/**
 * Update user streak
 */
export const updateStreak = async (userId, io) => {
  const today = moment().startOf('day');
  const yesterday = moment().subtract(1, 'day').startOf('day');

  let userStreak = await UserStreak.findOne({ userId });

  if (!userStreak) {
    // Create new streak
    userStreak = await UserStreak.create({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today.toDate(),
      streakStartDate: today.toDate()
    });
  } else {
    const lastActivity = moment(userStreak.lastActivityDate).startOf('day');

    if (lastActivity.isSame(yesterday)) {
      // Continue streak
      userStreak.currentStreak += 1;
      userStreak.lastActivityDate = today.toDate();

      if (userStreak.currentStreak > userStreak.longestStreak) {
        userStreak.longestStreak = userStreak.currentStreak;
      }

      await userStreak.save();

      // Emit streak update
      if (io) {
        io.to(userId.toString()).emit('streak_updated', {
          currentStreak: userStreak.currentStreak,
          longestStreak: userStreak.longestStreak
        });
      }
    } else if (!lastActivity.isSame(today)) {
      // Streak broken, reset
      userStreak.currentStreak = 1;
      userStreak.lastActivityDate = today.toDate();
      userStreak.streakStartDate = today.toDate();
      await userStreak.save();
    }
    // If lastActivity is today, do nothing
  }

  return userStreak;
};

/**
 * Get user's streak info
 */
export const getUserStreak = async (userId) => {
  let userStreak = await UserStreak.findOne({ userId });

  if (!userStreak) {
    return {
      currentStreak: 0,
      longestStreak: 0
    };
  }

  // Check if streak is still valid (activity was yesterday or today)
  const today = moment().startOf('day');
  const yesterday = moment().subtract(1, 'day').startOf('day');
  const lastActivity = moment(userStreak.lastActivityDate).startOf('day');

  if (!lastActivity.isSame(today) && !lastActivity.isSame(yesterday)) {
    // Streak is broken
    return {
      currentStreak: 0,
      longestStreak: userStreak.longestStreak
    };
  }

  return {
    currentStreak: userStreak.currentStreak,
    longestStreak: userStreak.longestStreak
  };
};

/**
 * Get user's challenge stats
 */
export const getUserChallengeStats = async (userId) => {
  const user = await User.findById(userId).select('challengePoints badges');
  const streak = await getUserStreak(userId);

  const totalCompleted = await UserChallenge.countDocuments({
    userId,
    completed: true
  });

  return {
    points: user?.challengePoints || 0,
    badges: user?.badges || [],
    totalCompleted,
    ...streak
  };
};

/**
 * Claim reward for completed challenge
 * Converts points to droplets (1 point = 1 droplet)
 * Updates streak and awards badges
 */
export const claimChallengeReward = async (userId, userChallengeId) => {
  const mongoose = (await import('mongoose')).default;
  const walletService = await import('./walletService.js');
  const Badge = (await import('../models/Badge.js')).default;
  
  const session = await mongoose.startSession();
  
  try {
    let result;
    
    await session.withTransaction(async () => {
      // 1. Get user challenge
      const userChallenge = await UserChallenge.findById(userChallengeId)
        .populate('challengeId')
        .session(session);
      
      if (!userChallenge || userChallenge.userId.toString() !== userId.toString()) {
        throw new Error('Challenge not found or unauthorized');
      }
      
      if (!userChallenge.completed) {
        throw new Error('Challenge not completed yet');
      }
      
      if (userChallenge.rewardClaimed) {
        throw new Error('Reward already claimed');
      }
      
      // 2. Get user
      const user = await User.findById(userId).session(session);
      const challenge = userChallenge.challengeId;
      const points = challenge.reward.points;
      
      // 3. Award droplets (1 point = 1 droplet)
      await walletService.addDroplets(
        userId,
        points,
        'challenge_reward',
        {
          challengeId: challenge._id,
          challengeTitle: challenge.title,
          points
        }
      );
      
      // 4. Update user challenge points and total
      user.challengePoints += points;
      user.totalChallengesCompleted += 1;
      
      // 5. Update streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastDate = user.lastChallengeDate ? new Date(user.lastChallengeDate) : null;
      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
      }
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (!lastDate || lastDate.getTime() === yesterday.getTime()) {
        // Continue streak
        user.challengeStreak += 1;
      } else if (lastDate.getTime() === today.getTime()) {
        // Already completed today, don't increment
      } else {
        // Streak broken, reset to 1
        user.challengeStreak = 1;
      }
      
      user.lastChallengeDate = today;
      
      // 6. Check and award badges
      const newBadges = await checkAndAwardBadges(user, session, Badge);
      
      // 7. Mark reward as claimed
      userChallenge.rewardClaimed = true;
      userChallenge.claimedAt = new Date();
      await userChallenge.save({ session });
      await user.save({ session });
      
      result = {
        success: true,
        dropletsAwarded: points,
        totalPoints: user.challengePoints,
        currentStreak: user.challengeStreak,
        newBadges
      };
    });
    
    return result;
  } catch (error) {
    throw new Error(`Failed to claim reward: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Check and award badges based on streak
 */
const checkAndAwardBadges = async (user, session, Badge) => {
  const newBadges = [];
  const streak = user.challengeStreak;
  
  // Get all badges
  const badges = await Badge.find({}).session(session);
  const badgeMap = {};
  badges.forEach(b => badgeMap[b.key] = b);
  
  // Check 7-day streak
  if (streak >= 7 && badgeMap['week_warrior'] && !user.badges.some(b => b.equals(badgeMap['week_warrior']._id))) {
    user.badges.push(badgeMap['week_warrior']._id);
    newBadges.push(badgeMap['week_warrior']);
  }
  
  // Check 30-day streak
  if (streak >= 30 && badgeMap['month_master'] && !user.badges.some(b => b.equals(badgeMap['month_master']._id))) {
    user.badges.push(badgeMap['month_master']._id);
    newBadges.push(badgeMap['month_master']);
  }
  
  return newBadges;
};
