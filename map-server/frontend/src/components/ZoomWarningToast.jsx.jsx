// frontend/src/components/ZoomWarningToast.jsx
import React, { useEffect } from 'react';

const ZoomWarningToast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000); // Tự tắt sau 2 giây
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[2000] animate-fade-in-down pointer-events-none">
      <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/20">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        <span className="font-bold text-sm md:text-base whitespace-nowrap">{message}</span>
      </div>
    </div>
  );
};

export default ZoomWarningToast;