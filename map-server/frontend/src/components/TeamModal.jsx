// D:\Code\SE2025-17.3\map-server\frontend\src\components\TeamModal.jsx
import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import TeamList from './TeamList';

const TeamModal = ({ isOpen, onClose, mode = 'list', teamId = null }) => {
  const { user } = useAuth();
  const {
    currentTeam,
    teamStats,
    createTeam,
    updateTeam,
    deleteTeam,
    leaveTeam,
    fetchTeamStats,
    loading,
  } = useTeam();

  const [activeView, setActiveView] = useState(mode); // 'list', 'create', 'details', 'stats'
  const [selectedTeamId, setSelectedTeamId] = useState(teamId);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveView(mode);
      setSelectedTeamId(teamId);
      setError('');
    }
  }, [isOpen, mode, teamId]);

  // Update view when currentTeam changes (after creating/joining a team)
  useEffect(() => {
    console.log('TeamModal: useEffect triggered - currentTeam:', currentTeam, 'activeView:', activeView);
    if (isOpen && currentTeam && activeView === 'create') {
      console.log('TeamModal: currentTeam updated, switching to details');
      setActiveView('details');
    }
  }, [currentTeam, isOpen, activeView]);

  // Load team stats when viewing details
  useEffect(() => {
    if (activeView === 'stats' && selectedTeamId) {
      loadStats();
    }
  }, [activeView, selectedTeamId]);

  const loadStats = async () => {
    try {
      const data = await fetchTeamStats(selectedTeamId);
      setStats(data);
    } catch (err) {
      setError('Failed to load team stats');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    if (teamName.length < 3 || teamName.length > 30) {
      setError('Team name must be between 3 and 30 characters');
      return;
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(teamName)) {
      setError('Team name can only contain letters, numbers, spaces, hyphens, and underscores');
      return;
    }

    try {
      console.log('TeamModal: Creating team...');
      await createTeam(teamName);
      console.log('TeamModal: Team created, switching to details view');
      setTeamName('');
      // Switch to details view instead of closing
      setActiveView('details');
    } catch (err) {
      console.error('TeamModal: Error creating team:', err);
      setError(err.message || 'Failed to create team');
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      await updateTeam(currentTeam._id, teamName);
      setTeamName('');
      setActiveView('details');
    } catch (err) {
      setError(err.message || 'Failed to update team');
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteTeam(currentTeam._id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete team');
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) {
      return;
    }

    try {
      await leaveTeam();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to leave team');
    }
  };

  const handleTeamClick = (team) => {
    setSelectedTeamId(team._id);
    setActiveView('details');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  const isCreator = currentTeam && user && currentTeam.createdBy === user._id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {activeView === 'list' && 'Teams'}
            {activeView === 'create' && 'Create New Team'}
            {activeView === 'details' && 'Team Details'}
            {activeView === 'stats' && 'Team Statistics'}
            {activeView === 'edit' && 'Edit Team'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* List View */}
          {activeView === 'list' && (
            <TeamList
              onTeamClick={handleTeamClick}
              onCreateTeam={() => setActiveView('create')}
            />
          )}

          {/* Create Team Form */}
          {activeView === 'create' && (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name (3-30 characters)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={30}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Letters, numbers, spaces, hyphens, and underscores only
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          )}

          {/* Team Details View */}
          {activeView === 'details' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
              ) : !currentTeam ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">No team data found</p>
                  <button
                    onClick={() => setActiveView('list')}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Back to Teams
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{currentTeam.name}</h3>
                    <p className="text-sm text-gray-600">
                      Created {formatDate(currentTeam.createdAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">Members</p>
                      <p className="text-2xl font-bold text-purple-900">{currentTeam.memberCount || 0}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm text-indigo-600 font-medium">Status</p>
                      <p className="text-lg font-semibold text-indigo-900">
                        {isCreator ? 'Creator' : 'Member'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedTeamId(currentTeam._id);
                        setActiveView('stats');
                      }}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      View Statistics
                    </button>
                    {isCreator && (
                      <button
                        onClick={() => {
                          setTeamName(currentTeam.name);
                          setActiveView('edit');
                        }}
                        className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        Edit Team
                      </button>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    {isCreator ? (
                      <button
                        onClick={handleDeleteTeam}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Deleting...' : 'Delete Team'}
                      </button>
                    ) : (
                      <button
                        onClick={handleLeaveTeam}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Leaving...' : 'Leave Team'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Edit Team Form */}
          {activeView === 'edit' && isCreator && (
            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name (3-30 characters)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={30}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('details')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Team'}
                </button>
              </div>
            </form>
          )}

          {/* Team Stats View */}
          {activeView === 'stats' && stats && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Pixel Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPixels}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600">Today</p>
                    <p className="text-2xl font-bold text-green-900">{stats.pixelsToday}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">This Week</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.pixelsThisWeek}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600">Members</p>
                    <p className="text-2xl font-bold text-purple-900">{stats.memberCount}</p>
                  </div>
                </div>
              </div>

              {stats.topContributors && stats.topContributors.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Top Contributors</h4>
                  <div className="space-y-2">
                    {stats.topContributors.map((contributor, index) => (
                      <div
                        key={contributor._id || contributor.username || index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-800">{contributor.username}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-600">
                          {contributor.pixelCount} pixels
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              <button
                onClick={() => setActiveView('details')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamModal;
