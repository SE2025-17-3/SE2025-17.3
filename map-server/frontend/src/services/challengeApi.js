// Frontend - services/challengeApi.js
// API calls for challenges

import api from './api';

/**
 * Get all active challenges (public)
 */
export const getChallenges = async () => {
    const response = await api.get('/challenges');
    return response.data;
};

/**
 * Get user's progress on all active challenges (requires auth)
 */
export const getUserProgress = async () => {
    const response = await api.get('/challenges/progress');
    return response.data;
};

/**
 * Claim reward for a completed challenge
 */
export const claimReward = async (challengeId) => {
    const response = await api.post(`/challenges/${challengeId}/claim`);
    return response.data;
};

/**
 * Get user's streak info
 */
export const getStreak = async () => {
    const response = await api.get('/challenges/streak');
    return response.data;
};

/**
 * Get challenge leaderboard
 */
export const getChallengeLeaderboard = async (limit = 50) => {
    const response = await api.get(`/challenges/leaderboard?limit=${limit}`);
    return response.data;
};
