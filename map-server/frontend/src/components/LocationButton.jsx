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

const LocationButton = ({ inline = false }) => {
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

  const containerClass = inline ? 'rail-inline' : 'map-location-control';

  return (
    <>
      {/* 1. Nut bam o goc phai duoi */}
      <div className={containerClass}>
        <button
          onClick={handleLocate}
          className="control-button location-button"
          title="Vi tri cua toi"
        >
          {loading ? (
            <div className="spinner"></div>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a10 10 0 0 1 7.07 17.07l-4.24 4.24a2 2 0 0 1-2.83 0l-4.24-4.24A10 10 0 0 1 12 2zm0 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
          )}
        </button>
      </div>

      {/* 2. Marker hien thi vi tri (neu tim thay) */}
      {position && (
        <Marker position={position} icon={locationIcon} />
      )}
    </>
  );
};

export default LocationButton;
