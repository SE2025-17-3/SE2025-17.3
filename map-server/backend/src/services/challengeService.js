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
          periodKey: null // For daily challenges
        },
        {
          $setOnInsert: {
            userId,
            challengeId: challenge._id,
            progress: 0,
            completed: false,
            date: today,
            periodKey: null
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
