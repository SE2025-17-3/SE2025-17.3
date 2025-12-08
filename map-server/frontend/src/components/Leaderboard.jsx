// D:\Code\SE2025-17.3\map-server\frontend\src\components\Leaderboard.jsx
import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/leaderboardApi';

const Leaderboard = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('players'); // 'players' or 'teams'
  const [period, setPeriod] = useState('all'); // 'today', 'week', 'month', 'all'
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen, period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLeaderboard(period, 50, 50);
      setPlayers(data.topPlayers || []);
      setTeams(data.topTeams || []);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">🏆 Leaderboard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Period Filter */}
          <div className="flex gap-2 mb-4">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  period === option.value
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('players')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'players'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👤 Top Players ({players.length})
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'teams'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👥 Top Teams ({teams.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTab === 'players' && (
                <>
                  {players.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No players found for this period
                    </div>
                  ) : (
                    players.map((player, index) => (
                      <div
                        key={player._id || player.username || index}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          index === 0
                            ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400'
                            : index === 1
                            ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-2 border-gray-400'
                            : index === 2
                            ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-2 border-orange-400'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                              index === 0
                                ? 'bg-yellow-500 text-white'
                                : index === 1
                                ? 'bg-gray-400 text-white'
                                : index === 2
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-300 text-gray-700'
                            }`}
                          >
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">{player.username}</p>
                            {player.teamName && (
                              <p className="text-sm text-gray-600">Team: {player.teamName}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-purple-600">{player.pixelCount}</p>
                          <p className="text-xs text-gray-500">pixels</p>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {activeTab === 'teams' && (
                <>
                  {teams.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No teams found for this period
                    </div>
                  ) : (
                    teams.map((team, index) => (
                      <div
                        key={team._id || team.teamName || index}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          index === 0
                            ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400'
                            : index === 1
                            ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-2 border-gray-400'
                            : index === 2
                            ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-2 border-orange-400'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                              index === 0
                                ? 'bg-yellow-500 text-white'
                                : index === 1
                                ? 'bg-gray-400 text-white'
                                : index === 2
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-300 text-gray-700'
                            }`}
                          >
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">{team.teamName}</p>
                            <p className="text-sm text-gray-600">{team.memberCount} members</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-purple-600">{team.pixelCount}</p>
                          <p className="text-xs text-gray-500">pixels</p>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
