import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();

  if (!user) return null; // Không hiển thị gì nếu không có user

  return (
    <div 
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <p style={{ margin: 0, fontWeight: 500, color: '#333' }}>
        Chào, <span style={{ fontWeight: 700, color: '#3498db' }}>{user.username}</span>!
      </p>
      <button
        onClick={logout}
        style={{
          background: 'none',
          border: 'none',
          color: '#d9534f',
          cursor: 'pointer',
          padding: '0.25rem 0 0 0', // Căn lề
          fontSize: '0.875rem',
          fontWeight: 500
        }}
      >
        Đăng Xuất
      </button>
    </div>
  );
};

export default Profile;

