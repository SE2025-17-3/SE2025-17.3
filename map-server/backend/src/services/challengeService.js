// map-server\backend\src\services\challengeService.js
import mongoose from 'mongoose';
import moment from 'moment-timezone'; 
import Challenge from '../models/Challenge.js';
import UserChallenge from '../models/UserChallenge.js';
import UserStreak from '../models/UserStreak.js';
import User from '../models/User.js';
import Badge from '../models/Badge.js';
import * as walletService from './walletService.js';

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
          io.to(`user:${userId}`).emit('challenge_completed', {
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
        io.to(`user:${userId}`).emit('streak_updated', {
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
 */
export const claimChallengeReward = async (userId, userChallengeId) => {
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
      
      // 3. Award droplets
      // Note: walletService.addDroplets might create its own transaction/session inside.
      // If it supports passing session, we should pass it. Assuming it handles its own logic:
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
      user.challengePoints = (user.challengePoints || 0) + points;
      user.totalChallengesCompleted = (user.totalChallengesCompleted || 0) + 1;
      
      // 5. Update streak logic (simplified for claim action)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastDate = user.lastChallengeDate ? new Date(user.lastChallengeDate) : null;
      if (lastDate) lastDate.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Only increment streak if not already done today
      if (!lastDate || lastDate.getTime() === yesterday.getTime()) {
        user.challengeStreak = (user.challengeStreak || 0) + 1;
      } else if (lastDate.getTime() !== today.getTime()) {
        // Reset streak if missed days
        user.challengeStreak = 1;
      }
      
      user.lastChallengeDate = today;
      
      // 6. Check badges
      const newBadges = await checkAndAwardBadges(user, session);
      
      // 7. Save
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

const checkAndAwardBadges = async (user, session) => {
  const newBadges = [];
  const streak = user.challengeStreak || 0;
  
  const badges = await Badge.find({}).session(session);
  const badgeMap = {};
  badges.forEach(b => badgeMap[b.key] = b);
  
  // Logic check badge
  const awardBadge = (key) => {
    if (badgeMap[key] && !user.badges.some(b => b.equals(badgeMap[key]._id))) {
      user.badges.push(badgeMap[key]._id);
      newBadges.push(badgeMap[key]);
    }
  };

  if (streak >= 7) awardBadge('week_warrior');
  if (streak >= 30) awardBadge('month_master');
  
  return newBadges;
};