// map-server/frontend/src/components/ZoomWarningToast.jsx

import React, { useEffect } from 'react';

const ZoomWarningToast = ({ message, onClose }) => {
  // Tự động tắt sau 3 giây
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="absolute top-20 right-4 z-[2000] animate-fade-in-down">
      {/* Hiệu ứng bóng đổ xếp chồng */}
      <div className="absolute top-1 left-1 w-full h-full bg-blue-200 rounded-lg shadow-sm -z-10 transform translate-y-1"></div>
      
      {/* Card chính */}
      <div className="bg-white border-l-4 border-blue-500 rounded-lg shadow-xl p-4 flex items-center gap-3 min-w-[300px]">
        {/* Icon Info */}
        <div className="text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        {/* Nội dung */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{message}</p>
        </div>

        {/* Nút tắt thủ công */}
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ZoomWarningToast;
