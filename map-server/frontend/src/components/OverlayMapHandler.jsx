// frontend/src/components/OverlayMapHandler.jsx

import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useOverlay } from '../context/OverlayContext';
import { WORLD_BOUNDS, GRID_WIDTH, GRID_HEIGHT } from '../config/constants';

const OverlayMapHandler = () => {
    const map = useMap();
    // Bỏ setIsPickingMode để cho phép click liên tục
    const { isPickingMode, overlayData, updateOverlay } = useOverlay(); 

    useEffect(() => {
        // Chỉ chạy khi đang bật chế độ chọn
        if (!isPickingMode) return;

        const container = map.getContainer();
        container.style.cursor = 'crosshair';

        const handleMapClick = (e) => {
            // 1. Chặn sự kiện click lan xuống để không bị tô màu
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();

            // 2. Tính toán tọa độ Grid
            const latlng = e.latlng;
            const north = WORLD_BOUNDS.getNorth();
            const south = WORLD_BOUNDS.getSouth();
            const east = WORLD_BOUNDS.getEast();
            const west = WORLD_BOUNDS.getWest();

            const latRange = north - south;
            const lngRange = east - west;

            const clickGx = ((latlng.lng - west) / lngRange) * GRID_WIDTH;
            const clickGy = ((north - latlng.lat) / latRange) * GRID_HEIGHT;

            // 3. Tính toán để Tâm ảnh trùng điểm click
            const imgWidth = overlayData.width;
            const imgHeight = imgWidth * (overlayData.aspectRatio || 1);

            let newX = clickGx - (imgWidth / 2);
            let newY = clickGy - (imgHeight / 2);

            // --- TỰ ĐỘNG LÀM TRÒN (SNAP) ĐỂ KHỚP LƯỚI ---
            newX = Math.round(newX);
            newY = Math.round(newY);
            // ---------------------------------------------

            // 4. Cập nhật vị trí
            updateOverlay({ x: newX, y: newY });
            
            // Đã xóa dòng setIsPickingMode(false) để cho phép click chỉnh liên tục
        };

        map.on('click', handleMapClick);

        return () => {
            map.off('click', handleMapClick);
            container.style.cursor = '';
        };
    }, [map, isPickingMode, overlayData, updateOverlay]);

    return null;
};

export default OverlayMapHandler;