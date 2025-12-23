// frontend/src/services/teamApi.js
import api from './api';

/**
 * Team API Service
 * All team-related API calls
 */

// Get all teams with pagination
export const getTeams = async (page = 1, limit = 10) => {
  try {
    const response = await api.get('/teams', {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Search teams by name
export const searchTeams = async (query) => {
  try {
    const response = await api.get('/teams/search', {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get team by ID
export const getTeamById = async (teamId) => {
  try {
    const response = await api.get(`/teams/${teamId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get team statistics
export const getTeamStats = async (teamId) => {
  try {
    const response = await api.get(`/teams/${teamId}/stats`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Create a new team (requires authentication)
export const createTeam = async (name) => {
  try {
    const response = await api.post('/teams', { name });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Update team (creator only)
export const updateTeam = async (teamId, name) => {
  try {
    const response = await api.put(`/teams/${teamId}`, { name });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete team (creator only)
export const deleteTeam = async (teamId) => {
  try {
    const response = await api.delete(`/teams/${teamId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Join a team
export const joinTeam = async (teamId) => {
  try {
    const response = await api.post(`/teams/${teamId}/join`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Leave current team
export const leaveTeam = async (newLeaderId = null) => {
  try {
    const response = await api.post('/teams/leave', newLeaderId ? { newLeaderId } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
