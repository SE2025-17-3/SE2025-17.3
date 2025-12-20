// D:\Code\SE2025-17.3\map-server\frontend\src\components\ZoomToPaintButton.jsx

import React from 'react';

const ZoomToPaintButton = ({ onClick }) => {
    return (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-none">
            <button
                onClick={onClick}
                className="pointer-events-auto flex items-center gap-2 px-3 py-1 bg-white text-blue-600 font-bold text-lg rounded-full shadow-2xl hover:bg-blue-50 transition-colors"
                title="Click to zoom in to a level where you can see and paint pixels"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Zoom in to see the pixels
            </button>
        </div>
    );
};

export default ZoomToPaintButton;