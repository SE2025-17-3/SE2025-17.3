// Frontend - components/ChallengePanel.jsx
// Clean, minimal challenge panel

import React, { useState } from 'react';
import { useChallenges } from '../context/ChallengeContext';
import { useAuth } from '../context/AuthContext';
import './ChallengePanel.css';

const ChallengePanel = () => {
    const { isLoggedIn } = useAuth();
    const {
        challenges,
        streak,
        resetIn,
        loading,
        notification,
        claimReward,
        clearNotification
    } = useChallenges();

    const [collapsed, setCollapsed] = useState(false);
    const [claiming, setClaiming] = useState(null);

    if (!isLoggedIn) return null;

    const handleClaim = async (challengeId) => {
        setClaiming(challengeId);
        try {
            await claimReward(challengeId);
        } catch (error) {
            console.error('Failed to claim:', error);
        } finally {
            setClaiming(null);
        }
    };

    const formatResetTime = () => {
        const { hours, minutes } = resetIn;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const getProgressPercent = (challenge) => {
        return Math.min(100, (challenge.progress / challenge.goal.count) * 100);
    };

    // Filter to show only daily challenges
    const dailyChallenges = challenges.filter(c => c.type === 'daily');

    return (
        <>
            {/* Notification Toast */}
            {notification && (
                <div className="challenge-notification" onClick={clearNotification}>
                    <div className="notification-content">
                        <span className="notification-icon">
                            {notification.type === 'challenge_completed' ? '🎉' : '✨'}
                        </span>
                        <div className="notification-text">
                            {notification.type === 'challenge_completed' ? (
                                <>
                                    <h4>Challenge Complete!</h4>
                                    <p>{notification.title}</p>
                                </>
                            ) : (
                                <>
                                    <h4>Reward Claimed</h4>
                                    <p className="points-earned">+{notification.pointsEarned} pts</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Panel */}
            <div className={`challenge-panel ${collapsed ? 'collapsed' : ''}`}>
                <div
                    className="challenge-panel-header"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <div className="header-left">
                        <h3 className="header-title">Daily Challenges</h3>
                        {streak.currentStreak > 0 && (
                            <span className={`streak-badge ${streak.currentStreak >= 3 ? 'active' : ''}`}>
                                🔥 {streak.currentStreak}
                            </span>
                        )}
                    </div>
                    <button className="toggle-btn">
                        {collapsed ? '▼' : '▲'}
                    </button>
                </div>

                {!collapsed && (
                    <div className="challenge-panel-content">
                        <div className="reset-timer">
                            ⏱️ Resets in <span>{formatResetTime()}</span>
                        </div>

                        {loading ? (
                            <div className="loading-state">Loading...</div>
                        ) : dailyChallenges.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📋</div>
                                <p>No challenges available</p>
                            </div>
                        ) : (
                            <div className="challenge-list">
                                {dailyChallenges.map(challenge => (
                                    <div
                                        key={challenge._id}
                                        className={`challenge-item ${challenge.completed ? 'completed' : ''} ${challenge.rewardClaimed ? 'claimed' : ''}`}
                                    >
                                        <div className="challenge-header">
                                            <span className="challenge-icon">{challenge.icon}</span>
                                            <div className="challenge-info">
                                                <h4 className="challenge-title">{challenge.title}</h4>
                                                <p className="challenge-description">{challenge.description}</p>
                                            </div>
                                            <span className={`difficulty-badge ${challenge.difficulty}`}>
                                                {challenge.difficulty}
                                            </span>
                                        </div>

                                        <div className="challenge-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className={`progress-fill ${challenge.completed ? 'completed' : ''}`}
                                                    style={{ width: `${getProgressPercent(challenge)}%` }}
                                                />
                                            </div>
                                            <div className="progress-text">
                                                {challenge.progress} / {challenge.goal.count}
                                            </div>
                                        </div>

                                        <div className="challenge-footer">
                                            <div className="reward-preview">
                                                🎁 <span className="points">+{challenge.reward.points}</span> pts
                                            </div>

                                            {challenge.rewardClaimed ? (
                                                <span className="claimed-badge">✓ Done</span>
                                            ) : challenge.completed ? (
                                                <button
                                                    className="claim-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleClaim(challenge._id);
                                                    }}
                                                    disabled={claiming === challenge._id}
                                                >
                                                    {claiming === challenge._id ? '...' : 'Claim'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default ChallengePanel;
