import Pixel from '../models/Pixel.js';
import PixelEvent from '../models/PixelEvent.js';
import User from '../models/User.js';
import Team from '../models/Team.js';

// Helpers
const getDateRange = (period) => {
  const now = new Date();
  switch ((period || 'all').toLowerCase()) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case 'week': {
      // Start of ISO week (Monday)
      const start = new Date(now);
      const day = (start.getDay() + 6) % 7; // 0..6 with Monday=0
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    case 'all':
    default:
      return { start: null, end: null };
  }
};

const limitNumber = (n, def = 50, max = 100) => {
  const num = parseInt(n, 10);
  if (Number.isNaN(num) || num <= 0) return def;
  return Math.min(num, max);
};

// GET /api/leaderboard/players?period=today|week|month|all&limit=50
export const getTopPlayers = async (req, res) => {
  try {
    const { period = 'all', limit = '50' } = req.query;
    const { start, end } = getDateRange(period);
    const match = {};
    if (start) match.createdAt = { $gte: start, $lte: end || new Date() };
    match.userId = { $ne: null };

    const top = await PixelEvent.aggregate([
      { $match: match },
      { $group: { _id: '$userId', pixels: { $sum: 1 }, lastActivity: { $max: '$createdAt' } } },
      { $sort: { pixels: -1, lastActivity: -1 } },
      { $limit: limitNumber(limit) },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 0, userId: '$_id', username: '$user.username', teamId: '$user.teamId', pixels: 1, lastActivity: 1 } },
    ]);

    res.json({ period, count: top.length, data: top });
  } catch (e) {
    console.error('getTopPlayers error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/leaderboard/teams?period=today|week|month|all&limit=50
export const getTopTeams = async (req, res) => {
  try {
    const { period = 'all', limit = '50' } = req.query;
    const { start, end } = getDateRange(period);
    const match = {};
  if (start) match.createdAt = { $gte: start, $lte: end || new Date() };

    // We only count pixels that have a user with a teamId
    const pipeline = [
      { $match: match },
      // Join user to get teamId
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      // Filter to only those with a non-null teamId
      { $match: { 'user.teamId': { $ne: null } } },
      { $group: { _id: '$user.teamId', pixels: { $sum: 1 }, lastActivity: { $max: '$createdAt' } } },
      { $sort: { pixels: -1, lastActivity: -1 } },
      { $limit: limitNumber(limit) },
      { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
      { $unwind: '$team' },
      { $project: { _id: 0, teamId: '$_id', teamName: '$team.name', pixels: 1, lastActivity: 1 } },
    ];

    const top = await PixelEvent.aggregate(pipeline);
    res.json({ period, count: top.length, data: top });
  } catch (e) {
    console.error('getTopTeams error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/leaderboard/leaderboard (combined) or /api/stats/leaderboard
export const getLeaderboardCombined = async (req, res) => {
  try {
    const { period = 'all', limit = '10' } = req.query;
    const { start, end } = getDateRange(period);
    const matchBase = {};
  if (start) matchBase.createdAt = { $gte: start, $lte: end || new Date() };

    const limitVal = limitNumber(limit, 10, 50);

    // Players
    const playersPromise = PixelEvent.aggregate([
      { $match: { ...matchBase, userId: { $ne: null } } },
      { $group: { _id: '$userId', pixels: { $sum: 1 }, lastActivity: { $max: '$createdAt' } } },
      { $sort: { pixels: -1, lastActivity: -1 } },
      { $limit: limitVal },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $lookup: { from: 'teams', localField: 'user.teamId', foreignField: '_id', as: 'team' } },
      { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, userId: '$_id', username: '$user.username', teamName: '$team.name', pixels: 1, lastActivity: 1 } },
    ]);

    // Teams
    const teamsPromise = PixelEvent.aggregate([
      { $match: matchBase },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.teamId': { $ne: null } } },
      { $group: { _id: '$user.teamId', pixels: { $sum: 1 }, lastActivity: { $max: '$createdAt' } } },
      { $sort: { pixels: -1, lastActivity: -1 } },
      { $limit: limitVal },
      { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
      { $unwind: '$team' },
      { $project: { _id: 0, teamId: '$_id', teamName: '$team.name', pixels: 1, lastActivity: 1 } },
    ]);

    const [players, teams] = await Promise.all([playersPromise, teamsPromise]);
    res.json({ period, players, teams });
  } catch (e) {
    console.error('getLeaderboardCombined error', e);
    res.status(500).json({ message: 'Server error' });
  }
};
