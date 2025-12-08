// D:\Code\SE2025-17.3\map-server\frontend\src\components\TeamList.jsx
import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';

const TeamList = ({ onTeamClick, onCreateTeam }) => {
  const { teams, loading, error, totalPages, currentPage, fetchTeams, searchTeams, joinTeam, currentTeam } = useTeam();
  const { isLoggedIn } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [joiningTeamId, setJoiningTeamId] = useState(null);

  // Load teams on mount
  useEffect(() => {
    fetchTeams(1, 20);
  }, []);

  // Handle search with debounce
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      if (query.trim()) {
        searchTeams(query);
      } else {
        fetchTeams(1, 20);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    if (!searchQuery.trim()) {
      fetchTeams(page, 20);
    }
  };

  // Handle join team
  const handleJoinTeam = async (teamId) => {
    if (!isLoggedIn) {
      alert('Please login to join a team');
      return;
    }

    try {
      setJoiningTeamId(teamId);
      await joinTeam(teamId);
      alert('Successfully joined team!');
    } catch (err) {
      alert(err.message || 'Failed to join team');
    } finally {
      setJoiningTeamId(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">Teams</h2>
        {isLoggedIn && !currentTeam && (
          <button
            onClick={onCreateTeam}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            + Create Team
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      )}

      {/* Teams List */}
      {!loading && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {teams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No teams found' : 'No teams yet. Be the first to create one!'}
            </div>
          ) : (
            teams.map((team) => (
              <div
                key={team._id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onTeamClick && onTeamClick(team)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                        {team.memberCount || 0} members
                      </span>
                      <span className="text-xs text-gray-500">
                        Created {formatDate(team.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  {isLoggedIn && currentTeam?._id !== team._id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinTeam(team._id);
                      }}
                      disabled={joiningTeamId === team._id}
                      className="ml-4 px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningTeamId === team._id ? 'Joining...' : 'Join'}
                    </button>
                  )}
                  
                  {currentTeam?._id === team._id && (
                    <span className="ml-4 px-4 py-2 bg-green-100 text-green-700 text-sm rounded-lg font-medium">
                      Your Team
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !searchQuery && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamList;
