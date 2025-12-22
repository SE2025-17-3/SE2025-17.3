// map-server/frontend/src/context/TeamContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as teamApi from '../services/teamApi';
import { useAuth } from './AuthContext';

const TeamContext = createContext();

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }) => {
  const { user, isLoggedIn, refreshUser } = useAuth();
  
  // State
  const [currentTeam, setCurrentTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch current user's team
  const fetchCurrentTeam = useCallback(async () => {
    console.log('fetchCurrentTeam called - isLoggedIn:', isLoggedIn, 'user?.teamId:', user?.teamId);
    if (!isLoggedIn || !user?.teamId) {
      console.log('fetchCurrentTeam: No user or teamId, setting currentTeam to null');
      setCurrentTeam(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('fetchCurrentTeam: Fetching team with ID:', user.teamId);
      const data = await teamApi.getTeamById(user.teamId);
      console.log('fetchCurrentTeam: Got team data:', data);
      setCurrentTeam(data.team);
    } catch (err) {
      console.error('Error fetching current team:', err);
      setError(err.message || 'Failed to fetch team');
      setCurrentTeam(null);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user?.teamId]);

  // Fetch all teams with pagination
  const fetchTeams = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamApi.getTeams(page, limit);
      setTeams(data.teams || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err.message || 'Failed to fetch teams');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search teams
  const searchTeams = useCallback(async (query) => {
    if (!query || query.trim() === '') {
      fetchTeams();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await teamApi.searchTeams(query);
      setTeams(data.teams || []);
      setTotalPages(1);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error searching teams:', err);
      setError(err.message || 'Failed to search teams');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [fetchTeams]);

  // Fetch team stats
  const fetchTeamStats = useCallback(async (teamId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamApi.getTeamStats(teamId);
      setTeamStats(data.stats);
      return data.stats;
    } catch (err) {
      console.error('Error fetching team stats:', err);
      setError(err.message || 'Failed to fetch team stats');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create team
  const createTeam = useCallback(async (name) => {
    if (!isLoggedIn) {
      throw new Error('Must be logged in to create a team');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Creating team:', name);
      const data = await teamApi.createTeam(name);
      console.log('Create team response:', data);
      
      // Refresh user data from server to get updated teamId
      console.log('Refreshing user data...');
      const updatedUser = await refreshUser();
      console.log('Updated user after team creation:', updatedUser);
      
      // Explicitly fetch the current team
      if (updatedUser?.teamId) {
        console.log('Fetching current team...');
        await fetchCurrentTeam();
      }
      
      // Refresh teams list
      console.log('Refreshing teams list...');
      await fetchTeams();
      console.log('Team created successfully');
      
      return data;
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.message || 'Failed to create team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, refreshUser, fetchCurrentTeam, fetchTeams]);

  // Update team
  const updateTeam = useCallback(async (teamId, name) => {
    if (!isLoggedIn) {
      throw new Error('Must be logged in to update a team');
    }

    try {
      setLoading(true);
      setError(null);
      const data = await teamApi.updateTeam(teamId, name);
      
      // Update current team if it's the one being updated
      if (currentTeam?._id === teamId) {
        setCurrentTeam(data.team);
      }
      
      // Refresh teams list
      await fetchTeams();
      return data;
    } catch (err) {
      console.error('Error updating team:', err);
      setError(err.message || 'Failed to update team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, currentTeam, fetchTeams]);

  // Delete team
  const deleteTeam = useCallback(async (teamId) => {
    if (!isLoggedIn) {
      throw new Error('Must be logged in to delete a team');
    }

    try {
      setLoading(true);
      setError(null);
      await teamApi.deleteTeam(teamId);
      
      // Refresh user data from server to clear teamId
      await refreshUser();
      
      // Clear current team if it was deleted
      if (currentTeam?._id === teamId) {
        setCurrentTeam(null);
      }
      
      // Refresh teams list
      await fetchTeams();
    } catch (err) {
      console.error('Error deleting team:', err);
      setError(err.message || 'Failed to delete team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, refreshUser, currentTeam, fetchTeams]);

  // Join team
  const joinTeam = useCallback(async (teamId) => {
    if (!isLoggedIn) {
      throw new Error('Must be logged in to join a team');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Joining team:', teamId);
      const data = await teamApi.joinTeam(teamId);
      console.log('Join team response:', data);
      
      // Refresh user data from server to get updated teamId
      console.log('Refreshing user data...');
      const updatedUser = await refreshUser();
      console.log('Updated user:', updatedUser);
      
      // Refresh teams list to update member counts
      console.log('Refreshing teams list...');
      await fetchTeams(currentPage);
      console.log('Teams refreshed');
      
      return data;
    } catch (err) {
      console.error('Error joining team:', err);
      setError(err.message || 'Failed to join team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, refreshUser, fetchTeams, currentPage]);

  // Leave team
  const leaveTeam = useCallback(async () => {
    if (!isLoggedIn) {
      throw new Error('Must be logged in to leave a team');
    }

    try {
      setLoading(true);
      setError(null);
      await teamApi.leaveTeam();
      
      // Refresh user data from server to clear teamId
      await refreshUser();
      
      setCurrentTeam(null);
      
      // Refresh teams list
      await fetchTeams();
    } catch (err) {
      console.error('Error leaving team:', err);
      setError(err.message || 'Failed to leave team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, refreshUser, fetchTeams]);

  // Load current team on user change
  useEffect(() => {
    console.log('TeamContext: useEffect - isLoggedIn:', isLoggedIn, 'user?.teamId:', user?.teamId);
    if (isLoggedIn && user?.teamId) {
      console.log('TeamContext: User has teamId, fetching current team...');
      fetchCurrentTeam();
    } else {
      console.log('TeamContext: No teamId, clearing current team');
      setCurrentTeam(null);
    }
  }, [isLoggedIn, user?.teamId, fetchCurrentTeam]);

  const value = {
    // State
    currentTeam,
    teams,
    teamStats,
    loading,
    error,
    totalPages,
    currentPage,
    
    // Actions
    fetchCurrentTeam,
    fetchTeams,
    searchTeams,
    fetchTeamStats,
    createTeam,
    updateTeam,
    deleteTeam,
    joinTeam,
    leaveTeam,
    setError,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};
