// frontend/src/components/ChallengePanel.jsx
import React, { useState } from 'react';
import { useChallenge } from '../context/ChallengeContext';
import { useAuth } from '../context/AuthContext';
import './ChallengePanel.css';

const ChallengePanel = () => {
  const { challenges, stats, loading } = useChallenge();
  const { isLoggedIn } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isLoggedIn) {
    return null; // Don't show panel if not logged in
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isCollapsed) {
    return (
      <div className="challenge-panel collapsed" onClick={toggleCollapse}>
        <div className="challenge-icon-collapsed">
          🎯
        </div>
      </div>
    );
  }

  return (
    <div className="challenge-panel">
      <div className="challenge-header">
        <h3>
          🎯 Daily Challenges
        </h3>
        <button className="collapse-btn" onClick={toggleCollapse}>
          ›
        </button>
      </div>

      <div className="challenge-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.currentStreak}</span>
          <span className="stat-label">🔥 Streak</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.points}</span>
          <span className="stat-label">⭐ Points</span>
        </div>
      </div>

      <div className="challenge-content">
        {loading ? (
          <div className="loading">Loading challenges...</div>
        ) : challenges.length === 0 ? (
          <div className="no-challenges">
            No challenges available today
          </div>
        ) : (
          challenges.map((item) => {
            const progress = Math.min(item.progress, item.goal);
            const percentage = (progress / item.goal) * 100;

            return (
              <div 
                key={item._id} 
                className={`challenge-item ${item.completed ? 'completed' : ''}`}
              >
                <div className="challenge-title">
                  <span className="challenge-icon">{item.challenge.icon}</span>
                  <h4>{item.challenge.title}</h4>
                  {item.completed && <span>✅</span>}
                </div>
                
                <p className="challenge-desc">{item.challenge.description}</p>
                
                <div className="challenge-progress-container">
                  <div className="progress-text">
                    {progress}/{item.goal}
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <span className="challenge-points">
                  +{item.challenge.reward.points} points
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChallengePanel;
