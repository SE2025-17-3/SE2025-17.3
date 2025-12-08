// D:\Code\SE2025-17.3\map-server\frontend\src\components\TeamBadge.jsx
import React from 'react';
import { useTeam } from '../context/TeamContext';

const TeamBadge = ({ onClick, className = '' }) => {
  const { currentTeam, loading } = useTeam();

  if (loading || !currentTeam) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all cursor-pointer ${className}`}
      onClick={onClick}
      title="Click to view team details"
    >
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
      </svg>
      <span className="font-semibold">{currentTeam.name}</span>
      <span className="text-xs opacity-90">({currentTeam.memberCount || 0})</span>
    </div>
  );
};

export default TeamBadge;
