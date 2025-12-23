// frontend/src/context/ChallengeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import * as challengeApi from '../services/challengeApi';

const ChallengeContext = createContext();

export const useChallenge = () => {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error('useChallenge must be used within ChallengeProvider');
  }
  return context;
};

export const ChallengeProvider = ({ children }) => {
  const { isLoggedIn, user } = useAuth();
  const socket = useSocket();

  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState({
    points: 0,
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    badges: []
  });
  const [loading, setLoading] = useState(false);

  // Fetch challenges and stats when user logs in
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchChallenges();
      fetchStats();
    } else {
      setChallenges([]);
      setStats({
        points: 0,
        totalCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: []
      });
    }
  }, [isLoggedIn, user]);

  // Listen for challenge completion events
  useEffect(() => {
    if (!socket || !isLoggedIn) return;

    const handleChallengeCompleted = (data) => {
      console.log('🎉 Challenge completed:', data);
      // Refresh challenges and stats
      fetchChallenges();
      fetchStats();
    };

    const handleStreakUpdated = (data) => {
      console.log('🔥 Streak updated:', data);
      setStats(prev => ({
        ...prev,
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak
      }));
    };

    socket.on('challenge_completed', handleChallengeCompleted);
    socket.on('streak_updated', handleStreakUpdated);

    return () => {
      socket.off('challenge_completed', handleChallengeCompleted);
      socket.off('streak_updated', handleStreakUpdated);
    };
  }, [socket, isLoggedIn]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const data = await challengeApi.getMyChallenges();
      setChallenges(data);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await challengeApi.getMyStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Update a specific challenge locally (for optimistic updates)
  const updateChallengeLocally = (challengeId, updates) => {
    setChallenges(prev =>
      prev.map(challenge =>
        challenge._id === challengeId
          ? { ...challenge, ...updates }
          : challenge
      )
    );
  };

  const value = {
    challenges,
    stats,
    loading,
    refreshChallenges: fetchChallenges,
    refreshStats: fetchStats,
    updateChallengeLocally
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
};
