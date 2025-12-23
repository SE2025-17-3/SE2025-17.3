// map-server/frontend/src/components/ZoomToPaintButton.jsx

import React from 'react';
// 1. Import MapControlWrapper
import MapControlWrapper from './MapControlWrapper';

const ZoomToPaintButton = ({ onClick }) => {
    return (
        // 2. Bọc button bằng MapControlWrapper
        // Thay thế thẻ div cũ. MapControlWrapper đã có sẵn position: absolute và z-index cao.
        <MapControlWrapper 
            className="top-8 left-1/2 transform -translate-x-1/2"
            // Style riêng để căn chỉnh nếu cần
            style={{ 
                zIndex: 1000,
                // Không cần pointer-events-auto ở đây nữa vì Wrapper đã xử lý
            }}
        >
            <button
                onClick={onClick}
                className="flex items-center gap-2 px-3 py-1 bg-white text-blue-600 font-bold text-lg rounded-full shadow-2xl hover:bg-blue-50 transition-colors"
                title="Click to zoom in to a level where you can see and paint pixels"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Zoom in to see the pixels
            </button>
        </MapControlWrapper>
    );
};

export default ZoomToPaintButton;