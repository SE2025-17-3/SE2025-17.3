// Frontend - context/ChallengeContext.jsx
// Challenge state management

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import * as challengeApi from '../services/challengeApi';

const ChallengeContext = createContext(null);

export const useChallenges = () => {
    const context = useContext(ChallengeContext);
    if (!context) {
        throw new Error('useChallenges must be used within a ChallengeProvider');
    }
    return context;
};

export const ChallengeProvider = ({ children }) => {
    const { isLoggedIn } = useAuth();
    const socket = useSocket();

    const [challenges, setChallenges] = useState([]);
    const [streak, setStreak] = useState({
        currentStreak: 0,
        longestStreak: 0,
        bonusMultiplier: 1.0
    });
    const [resetIn, setResetIn] = useState({ hours: 0, minutes: 0 });
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // Fetch challenges
    const refreshChallenges = useCallback(async () => {
        if (!isLoggedIn) {
            setChallenges([]);
            return;
        }

        setLoading(true);
        try {
            const data = await challengeApi.getUserProgress();
            setChallenges(data.challenges || []);
            setResetIn(data.resetIn || { hours: 0, minutes: 0 });
        } catch (error) {
            console.error('Failed to fetch challenges:', error);
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn]);

    // Fetch streak
    const refreshStreak = useCallback(async () => {
        if (!isLoggedIn) {
            setStreak({ currentStreak: 0, longestStreak: 0, bonusMultiplier: 1.0 });
            return;
        }

        try {
            const data = await challengeApi.getStreak();
            setStreak(data);
        } catch (error) {
            console.error('Failed to fetch streak:', error);
        }
    }, [isLoggedIn]);

    // Claim reward
    const claimReward = useCallback(async (challengeId) => {
        try {
            const result = await challengeApi.claimReward(challengeId);

            // Update local state
            setChallenges(prev => prev.map(c =>
                c._id === challengeId
                    ? { ...c, rewardClaimed: true }
                    : c
            ));

            // Show notification
            setNotification({
                type: 'reward_claimed',
                pointsEarned: result.pointsEarned,
                multiplier: result.multiplier,
                totalPoints: result.totalPoints
            });

            // Clear notification after 5 seconds
            setTimeout(() => setNotification(null), 5000);

            return result;
        } catch (error) {
            console.error('Failed to claim reward:', error);
            throw error;
        }
    }, []);

    // Update progress locally (from socket event)
    const updateProgress = useCallback((challengeId, progress, completed) => {
        setChallenges(prev => prev.map(c =>
            c._id === challengeId
                ? { ...c, progress, completed }
                : c
        ));
    }, []);

    // Socket event handlers
    useEffect(() => {
        if (!socket || !isLoggedIn) return;

        const handleProgress = (data) => {
            updateProgress(data.challengeId, data.progress, data.completed);
        };

        const handleCompleted = (data) => {
            setNotification({
                type: 'challenge_completed',
                title: data.title,
                reward: data.reward
            });

            // Clear notification after 5 seconds
            setTimeout(() => setNotification(null), 5000);
        };

        const handleStreakUpdated = (data) => {
            setStreak(prev => ({
                ...prev,
                currentStreak: data.currentStreak,
                longestStreak: data.longestStreak,
                bonusMultiplier: data.bonusMultiplier
            }));
        };

        socket.on('challenge_progress', handleProgress);
        socket.on('challenge_completed', handleCompleted);
        socket.on('streak_updated', handleStreakUpdated);

        return () => {
            socket.off('challenge_progress', handleProgress);
            socket.off('challenge_completed', handleCompleted);
            socket.off('streak_updated', handleStreakUpdated);
        };
    }, [socket, isLoggedIn, updateProgress]);

    // Initial fetch
    useEffect(() => {
        if (isLoggedIn) {
            refreshChallenges();
            refreshStreak();
        }
    }, [isLoggedIn, refreshChallenges, refreshStreak]);

    // Countdown timer for reset
    useEffect(() => {
        const interval = setInterval(() => {
            setResetIn(prev => {
                if (prev.minutes > 0) {
                    return { ...prev, minutes: prev.minutes - 1 };
                } else if (prev.hours > 0) {
                    return { hours: prev.hours - 1, minutes: 59 };
                }
                // Time's up, refresh challenges
                refreshChallenges();
                return prev;
            });
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [refreshChallenges]);

    const value = {
        challenges,
        streak,
        resetIn,
        loading,
        notification,
        refreshChallenges,
        refreshStreak,
        claimReward,
        clearNotification: () => setNotification(null)
    };

    return (
        <ChallengeContext.Provider value={value}>
            {children}
        </ChallengeContext.Provider>
    );
};
