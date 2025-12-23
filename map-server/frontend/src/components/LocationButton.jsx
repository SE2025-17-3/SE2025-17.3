// map-server/frontend/src/components/LocationButton.jsx

import React, { useState } from 'react';
import { useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import { LOCATION_FLYTO_ZOOM } from '../config/constants';

// Tạo Icon chấm xanh nhấp nháy từ CSS
const locationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div class="user-location-pulse"></div>
    <div class="user-location-dot"></div>
  `,
  iconSize: [40, 40], // Kích thước tổng thể
  iconAnchor: [20, 20], // Điểm neo ở chính giữa
});

const LocationButton = () => {
  const map = useMap();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const latlng = [latitude, longitude];

        // 1. Lưu vị trí để hiện chấm xanh
        setPosition(latlng);

        // 2. Bay đến vị trí đó (Zoom level 16 để nhìn rõ)
        map.flyTo(latlng, LOCATION_FLYTO_ZOOM, {
          animate: true,
          duration: 1.5
        });

        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
        // Xử lý các lỗi phổ biến
        if (err.code === 1) alert("Bạn cần cấp quyền truy cập vị trí.");
        else if (err.code === 2) alert("Không thể xác định vị trí hiện tại.");
        else alert("Lỗi định vị.");
      },
      { enableHighAccuracy: true } // Cố gắng lấy vị trí chính xác nhất (GPS)
    );
  };

  return (
    <>
      {/* 1. Nút bấm ở góc phải dưới */}
      <div className="absolute bottom-24 right-4 z-[1000]">
        <button
          onClick={handleLocate}
          className="bg-white hover:bg-gray-100 text-gray-700 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
          title="Vị trí của tôi"
        >
          {loading ? (
            // Icon loading xoay vòng
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          ) : (
            // Icon Location (Target)
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* 2. Marker hiển thị vị trí (nếu đã tìm thấy) */}
      {position && (
        <Marker position={position} icon={locationIcon} />
      )}
    </>
  );
};

export default LocationButton;
