// frontend/src/services/leaderboardApi.js
import api from './api';

/**
 * Leaderboard API Service
 * Functions to fetch top players and teams
 */

// Get top players leaderboard
export const getTopPlayers = async (period = 'all', limit = 50) => {
  try {
    const response = await api.get('/leaderboard/players', {
      params: { period, limit }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get top teams leaderboard
export const getTopTeams = async (period = 'all', limit = 50) => {
  try {
    const response = await api.get('/leaderboard/teams', {
      params: { period, limit }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get combined leaderboard (players and teams)
export const getLeaderboard = async (period = 'all', playersLimit = 50, teamsLimit = 50) => {
  try {
    const response = await api.get('/leaderboard', {
      params: { period, playersLimit, teamsLimit }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
