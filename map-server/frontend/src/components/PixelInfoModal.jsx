// D:\Code\SE2025-17.3\map-server\frontend\src\components\PixelInfoModal.jsx
import React from 'react';
import './PixelInfoModal.css';

const PixelInfoModal = ({
  pixel,
  onClose,
  onStartMultiPaint,
  onToggleFavorite,
  isFavorite,
  onShare,
}) => {
  if (!pixel) return null;

  // Lấy thêm teamName
  const { gx, gy, user, teamName } = pixel;

  // --- LOGIC HIỂN THỊ ---
  let paintedByText;
  let statusColor;

  if (user === 'Loading...') {
    paintedByText = 'Đang tải thông tin...';
    statusColor = '#6b7280'; 
  } else if (user) {
    // Hiển thị: User (Team)
    const teamStr = teamName ? ` (${teamName})` : '';
    paintedByText = `Painted by: ${user}${teamStr}`;
    statusColor = '#ef4444';
  } else {
    paintedByText = 'Not painted';
    statusColor = '#10b981';
  }

  const safeOnToggleFavorite = onToggleFavorite || (() => {});
  const safeOnShare = onShare || (() => {});

  const handleShare = () => {
    const url = `${window.location.origin}?gx=${gx}&gy=${gy}`;
    safeOnShare({ gx, gy, url });
  };

  return (
    <div className="pixel-info-modal">
      <div className="pixel-info-header">
        <div className="pixel-coords">
          Pixel: {gx}, {gy}
        </div>
        <button className="close-btn" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      <div className="pixel-status" style={{ color: statusColor }}>
        {paintedByText}
      </div>

      <div className="pixel-actions">
        <button className="pill-button primary" onClick={onStartMultiPaint}>Paint</button> 
        
        <button
          className={`pill-button ${isFavorite ? 'active' : ''}`}
          onClick={() => safeOnToggleFavorite(gx, gy)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.591.905-.728 1.25-.098l3.125 6.25 6.942 1.008c.633.09.886.877.428 1.345l-5.027 4.896 1.187 6.917c.106.619-.553 1.096-1.107.808L12 18.068l-6.25 3.286c-.554.288-1.213-.189-1.107-.808l1.187-6.917-5.027-4.896c-.458-.468-.205-1.255.428-1.345l6.942-1.008 3.125-6.25z"/></svg> Favorite
        </button>
        
        <button className="pill-button" onClick={handleShare}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7C20.268 16.057 16.478 19 12 19c-4.478 0-8.268-2.943-9.542-7z"/></svg> Share
        </button>
      </div>
    </div>
  );
};

export default PixelInfoModal;