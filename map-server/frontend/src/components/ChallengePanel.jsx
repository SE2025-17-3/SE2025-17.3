import React, { useState } from 'react';
import { useChallenge } from '../context/ChallengeContext';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import './ChallengePanel.css';

const ChallengePanel = () => {
  const { challenges, stats, loading, refreshChallenges } = useChallenge();
  const { isLoggedIn, user, refreshUser } = useAuth();
  const { refreshWallet } = useWallet();
  const [isOpen, setIsOpen] = useState(false); // Trạng thái mở/đóng
  const [claiming, setClaiming] = useState(null);

  if (!isLoggedIn) {
    return null;
  }

  const handleClaimReward = async (userChallengeId, points) => {
    try {
      setClaiming(userChallengeId);
      const response = await fetch(`/api/challenges/${userChallengeId}/claim`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Claimed ${data.dropletsAwarded} droplets!`);
        if (data.newBadges && data.newBadges.length > 0) {
          data.newBadges.forEach(badge => {
            alert(`🏆 New Badge Earned: ${badge.name} ${badge.icon}`);
          });
        }
        await refreshChallenges();
        await refreshUser();
        await refreshWallet();
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  // Nếu chưa mở -> Hiện nút bấm nhỏ
  if (!isOpen) {
    return (
      <button 
        className="challenge-toggle-btn" 
        onClick={() => setIsOpen(true)}
        title="Daily Challenges"
      >
        🎯
      </button>
    );
  }

  // Nếu mở -> Hiện Modal Backdrop + Panel
  return (
    <div className="challenge-backdrop" onClick={() => setIsOpen(false)}>
      <div className="challenge-panel" onClick={(e) => e.stopPropagation()}>
        <div className="challenge-header">
          <h3>🎯 Daily Challenges</h3>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="challenge-stats">
          <div className="stat-item">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{user?.challengeStreak || stats.currentStreak || 0}</span>
            <span className="stat-label">Streak</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⭐</span>
            <span className="stat-value">{user?.challengePoints || stats.points || 0}</span>
            <span className="stat-label">Points</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🏆</span>
            <span className="stat-value">{user?.badges?.length || 0}</span>
            <span className="stat-label">Badges</span>
          </div>
        </div>

        <div className="challenge-content">
          {loading ? (
            <div className="loading">Loading challenges...</div>
          ) : challenges.length === 0 ? (
            <div className="no-challenges">No challenges available today</div>
          ) : (
            challenges.map((item) => {
              const progress = Math.min(item.progress, item.goal);
              const percentage = (progress / item.goal) * 100;

              return (
                <div key={item._id} className={`challenge-item ${item.completed ? 'completed' : ''}`}>
                  <div className="challenge-title">
                    <span className="challenge-icon">{item.challenge.icon}</span>
                    <h4>{item.challenge.title}</h4>
                    {item.completed && <span>✅</span>}
                  </div>
                  <p className="challenge-desc">{item.challenge.description}</p>
                  <div className="challenge-progress-container">
                    <div className="progress-text">{progress}/{item.goal}</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  <div className="challenge-footer">
                    <span className="challenge-points">+{item.challenge.reward.points} pts</span>
                    {item.completed && !item.rewardClaimed && (
                      <button
                        onClick={() => handleClaimReward(item._id, item.challenge.reward.points)}
                        disabled={claiming === item._id}
                        className="claim-reward-button"
                      >
                        {claiming === item._id ? '...' : 'Claim'}
                      </button>
                    )}
                    {item.rewardClaimed && <span className="claimed-badge">Claimed</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengePanel;