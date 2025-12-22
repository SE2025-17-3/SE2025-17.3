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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-down">
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
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  period === option.value
                    ? 'bg-purple-600 text-white shadow-md'
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
              className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                activeTab === 'players'
                  ? 'bg-blue-500 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👤 Top Players ({players.length})
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                activeTab === 'teams'
                  ? 'bg-purple-500 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👥 Top Teams ({teams.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* --- PLAYERS LIST --- */}
              {activeTab === 'players' && (
                <>
                  {players.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      Chưa có dữ liệu xếp hạng.
                    </div>
                  ) : (
                    players.map((player, index) => (
                      <div
                        key={player._id || player.username || index}
                        className={`flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all hover:scale-[1.01] ${
                          index === 0
                            ? 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-200'
                            : index === 1
                            ? 'bg-gray-50 border-gray-400'
                            : index === 2
                            ? 'bg-orange-50 border-orange-400'
                            : 'bg-white border-gray-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg shadow-sm ${
                              index === 0
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                                : index === 1
                                ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                                : index === 2
                                ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-800 text-lg">{player.username}</p>
                            {player.teamName && (
                              <p className="text-sm text-gray-500">Team: <span className="font-medium text-gray-700">{player.teamName}</span></p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {/* SỬA LỖI TẠI ĐÂY: Dùng player.pixels thay vì player.pixelCount */}
                          <p className="text-xl font-bold text-gray-700">{player.pixels}</p> 
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">pixels</p>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* --- TEAMS LIST --- */}
              {activeTab === 'teams' && (
                <>
                  {teams.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      Chưa có dữ liệu Team.
                    </div>
                  ) : (
                    teams.map((team, index) => (
                      <div
                        key={team._id || team.teamName || index}
                        className={`flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all hover:scale-[1.01] ${
                          index === 0
                            ? 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-200'
                            : index === 1
                            ? 'bg-gray-50 border-gray-400'
                            : index === 2
                            ? 'bg-orange-50 border-orange-400'
                            : 'bg-white border-gray-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg shadow-sm ${
                              index === 0
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                                : index === 1
                                ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                                : index === 2
                                ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-800 text-lg">{team.teamName}</p>
                            {/* Chỉnh sửa hiển thị số thành viên nếu có dữ liệu, hoặc ẩn đi nếu backend chưa trả về */}
                            {team.memberCount && <p className="text-sm text-gray-500">{team.memberCount} members</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          {/* SỬA LỖI TẠI ĐÂY: Dùng team.pixels thay vì team.pixelCount */}
                          <p className="text-xl font-bold text-gray-700">{team.pixels}</p>
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">pixels</p>
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