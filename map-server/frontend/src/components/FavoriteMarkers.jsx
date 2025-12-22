// map-server/frontend/src/components/FavoriteMarkers.jsx

import React from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  WORLD_BOUNDS,
  MIN_ZOOM_TO_SHOW_PIXELS
} from '../config/constants';

// Tạo Icon ngôi sao bằng SVG (dùng DivIcon để nhẹ và sắc nét)
const createStarIcon = () => {
  return L.divIcon({
    className: 'custom-star-icon',
    html: `
      <svg viewBox="0 0 24 24" fill="#FFD700" stroke="#B8860B" stroke-width="2" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `,
    iconSize: [24, 24], // Kích thước icon
    iconAnchor: [12, 12], // Điểm neo nằm chính giữa icon (để ngôi sao đè đúng tâm pixel)
  });
};

const FavoriteMarkers = ({ favorites, onMarkerClick }) => {
  const map = useMap();

  // Hàm chuyển đổi Grid (gx, gy) sang LatLng của Leaflet
  const gridToLatLng = (gx, gy) => {
    // Tính toán vĩ độ (lat)
    const lat = WORLD_BOUNDS.getNorth() - (gy / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
    // Tính toán kinh độ (lng)
    const lng = WORLD_BOUNDS.getWest() + (gx / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
    
    // Cần offset thêm nửa ô pixel để marker nằm chính giữa ô
    const latStep = (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth()) / GRID_HEIGHT;
    const lngStep = (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest()) / GRID_WIDTH;

    return [lat - latStep / 2, lng + lngStep / 2];
  };

  const handleClick = (fav) => {
    const center = gridToLatLng(fav.gx, fav.gy);
    
    // 1. Bay đến vị trí đó
    // Zoom vào mức MIN_ZOOM_TO_SHOW_PIXELS + 2 để nhìn rõ
    map.flyTo(center, Math.max(map.getZoom(), MIN_ZOOM_TO_SHOW_PIXELS + 2), {
      duration: 1.5
    });

    // 2. Gọi hàm mở bảng thông tin (từ App.jsx truyền vào)
    if (onMarkerClick) {
      onMarkerClick(fav);
    }
  };

  return (
    <>
      {favorites.map((fav, index) => (
        <Marker
          key={`${fav.gx}-${fav.gy}-${index}`}
          position={gridToLatLng(fav.gx, fav.gy)}
          icon={createStarIcon()}
          eventHandlers={{
            click: () => handleClick(fav),
          }}
        />
      ))}
    </>
  );
};

export default FavoriteMarkers;
