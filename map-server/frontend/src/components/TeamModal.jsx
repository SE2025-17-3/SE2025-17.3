// map-server/frontend/src/components/TeamModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import TeamList from './TeamList';
import './TeamModal.css';

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
  const [activePeriod, setActivePeriod] = useState('today');
  const [newLeaderId, setNewLeaderId] = useState('');
  const [showTransferPrompt, setShowTransferPrompt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveView(mode);
      setSelectedTeamId(teamId);
      setError('');
    }
  }, [isOpen, mode, teamId]);

  // Update view when currentTeam changes (after creating/joining a team)
  useEffect(() => {
    if (isOpen && currentTeam && (activeView === 'create' || activeView === 'list')) {
      setActiveView('details');
      setSelectedTeamId(currentTeam._id);
    }
  }, [currentTeam, isOpen, activeView]);

  // Load team stats when viewing details
  useEffect(() => {
    if (activeView === 'details' && (selectedTeamId || currentTeam?._id)) {
      loadStats();
    }
  }, [activeView, selectedTeamId, currentTeam?._id]);

  const loadStats = async () => {
    try {
      const id = selectedTeamId || currentTeam?._id;
      if (!id) return;
      const data = await fetchTeamStats(id);
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
      if (isCreator) {
        const members = currentTeam?.members || [];
        const otherMembers = members.filter((m) => m._id !== user?._id);
        if (otherMembers.length > 0 && !newLeaderId) {
          setShowTransferPrompt(true);
          return;
        }
      }
      await leaveTeam(newLeaderId || null);
      onClose();
    } catch (err) {
      if (err?.requiresTransfer) {
        setShowTransferPrompt(true);
        return;
      }
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
  const members = currentTeam?.members || [];
  const otherMembers = useMemo(
    () => members.filter((m) => m._id !== user?._id),
    [members, user?._id]
  );
  const pixelsPainted = stats?.totalPixels || 0;
  const headquarters = currentTeam?.overlay
    ? `${currentTeam.overlay.x}, ${currentTeam.overlay.y}`
    : 'N/A';

  return (
    <div className="team-modal-overlay">
      <div className="team-modal-shell">
        <div className="team-modal-header">
          <div className="team-modal-title">
            <span className="team-modal-kicker">Alliance</span>
            <h2>
              {activeView === 'list' && 'Teams'}
              {activeView === 'create' && 'Create Team'}
              {activeView === 'details' && (currentTeam?.name || 'Team')}
              {activeView === 'stats' && 'Team Statistics'}
              {activeView === 'edit' && 'Edit Team'}
            </h2>
          </div>
          <div className="team-modal-actions">
            <button className="team-modal-icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="team-modal-body">
          {error && (
            <div className="team-error">
              {error}
            </div>
          )}

          {/* List View */}
          {activeView === 'list' && (
            <TeamList
              onTeamClick={handleTeamClick}
              onCreateTeam={() => setActiveView('create')}
              onJoinedTeam={(id) => {
                setSelectedTeamId(id);
                setActiveView('details');
              }}
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
                <div className="team-loading">
                  <div className="team-spinner" />
                </div>
              ) : !currentTeam ? (
                <div className="team-empty">
                  <p>No team data found</p>
                  <button onClick={() => setActiveView('list')}>Back to Teams</button>
                </div>
              ) : (
                <div className="team-details-layout">
                  <div className="team-header-row">
                    <div className="team-avatar">
                      <span>■</span>
                    </div>
                    <div className="team-header-info">
                      <p className="team-kicker">Alliance</p>
                      <h3>{currentTeam.name}</h3>
                      <p className="team-sub">No description</p>
                    </div>
                    <div className="team-header-actions">
                      {isCreator && (
                        <button
                          className="team-pill-btn"
                          onClick={() => {
                            setTeamName(currentTeam.name);
                            setActiveView('edit');
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="team-metrics">
                    <div>
                      <span>Pixels painted</span>
                      <strong>{pixelsPainted}</strong>
                    </div>
                    <div>
                      <span>Members</span>
                      <strong>{currentTeam.memberCount || members.length}</strong>
                    </div>
                    <div>
                      <span>Headquarters</span>
                      <strong>{headquarters}</strong>
                    </div>
                  </div>

                  <div className="team-leaderboard-block">
                    <div className="team-leaderboard-header">
                      <h4>Leaderboard</h4>
                      <div className="team-tabs">
                        <button className={activePeriod === 'today' ? 'is-active' : ''} onClick={() => setActivePeriod('today')}>Today</button>
                        <button className={activePeriod === 'week' ? 'is-active' : ''} onClick={() => setActivePeriod('week')}>Week</button>
                        <button className={activePeriod === 'month' ? 'is-active' : ''} onClick={() => setActivePeriod('month')}>Month</button>
                        <button className={activePeriod === 'all' ? 'is-active' : ''} onClick={() => setActivePeriod('all')}>All time</button>
                      </div>
                    </div>

                    <div className="team-table">
                      <div className="team-table-head">
                        <span>Player</span>
                        <span>Pixels painted</span>
                      </div>
                      {(stats?.topContributors || []).map((contributor, index) => (
                        <div className="team-table-row" key={contributor._id || index}>
                          <div>
                            <span className="team-rank">{index + 1}</span>
                            <span className="team-player">{contributor.username}</span>
                          </div>
                          <span>{contributor.pixelCount}</span>
                        </div>
                      ))}
                      {(!stats?.topContributors || stats.topContributors.length === 0) && (
                        <div className="team-table-empty">No data yet</div>
                      )}
                    </div>
                  </div>

                  {showTransferPrompt && isCreator && otherMembers.length > 0 && (
                    <div className="team-transfer">
                      <p>Chon nguoi lam leader truoc khi roi team.</p>
                      <select value={newLeaderId} onChange={(e) => setNewLeaderId(e.target.value)}>
                        <option value="">-- Chon thanh vien --</option>
                        {otherMembers.map((member) => (
                          <option key={member._id} value={member._id}>{member.username}</option>
                        ))}
                      </select>
                      <button className="team-primary" onClick={handleLeaveTeam}>
                        Xac nhan chuyen quyen va roi
                      </button>
                    </div>
                  )}
                  <div className="team-actions">
                    {isCreator ? (
                      <>
                        <button className="team-secondary" onClick={handleDeleteTeam}>
                          Delete Team
                        </button>
                        <button className="team-primary" onClick={handleLeaveTeam}>
                          Leave Team
                        </button>
                      </>
                    ) : (
                      <button className="team-primary" onClick={handleLeaveTeam}>
                        Leave Team
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
