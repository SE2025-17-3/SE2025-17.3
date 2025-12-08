// D:\Code\SE2025-17.3\map-server\frontend\src\components\ShareModal.jsx
import React, { useState } from 'react';
import './ShareModal.css';

const ShareModal = ({ data, onClose }) => {
  if (!data) return null;
  const { gx, gy, url, imageDataUrl } = data;
  const [copyStatus, setCopyStatus] = useState('Copy');

  // Hàm Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopyStatus('Copied!');
    setTimeout(() => setCopyStatus('Copy'), 2000);
  };

  // Hàm Download Ảnh
  const handleDownloadImage = () => {
    if (!imageDataUrl) return;
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `wplace-snapshot-${gx}-${gy}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Hàm Copy Ảnh vào Clipboard (Chỉ hoạt động trên HTTPS hoặc Localhost)
  const handleCopyImageToClipboard = async () => {
    if (!imageDataUrl) return;
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('Đã copy ảnh vào bộ nhớ tạm!');
    } catch (err) {
      console.error('Lỗi copy ảnh:', err);
      alert('Trình duyệt không hỗ trợ copy ảnh trực tiếp.');
    }
  };

  return (
    <div className="share-backdrop" onClick={onClose}>
      <div className="share-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="share-header">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            <span>Share place</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* URL Section */}
        <div className="share-body">
          <div className="url-container">
            <input type="text" value={url} readOnly className="url-input" />
            <button className="btn-copy-link" onClick={handleCopyLink}>
              {copyStatus}
            </button>
          </div>
          <div className="coords-text">
            Coordinates: {gx}, {gy}
          </div>

          {/* Image Section */}
          <div className="image-section-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Image
          </div>
          
          <div className="snapshot-container">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="Map Snapshot" />
            ) : (
              <div className="loading-placeholder">Đang tạo ảnh...</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn-action btn-copy-img" onClick={handleCopyImageToClipboard}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy Image
            </button>
            <button className="btn-action btn-download" onClick={handleDownloadImage}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;