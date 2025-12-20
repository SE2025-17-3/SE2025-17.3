// frontend/src/services/challengeApi.js
import api from './api';

export const getMyChallenges = async () => {
  try {
    const response = await api.get('/challenges/my');
    return response.data;
  } catch (error) {
    console.error('Error fetching challenges:', error);
    throw error;
  }
};

export const getMyStats = async () => {
  try {
    const response = await api.get('/challenges/my/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching challenge stats:', error);
    throw error;
  }
};

export const getMyStreak = async () => {
  try {
    const response = await api.get('/challenges/my/streak');
    return response.data;
  } catch (error) {
    console.error('Error fetching streak:', error);
    throw error;
  }
};
