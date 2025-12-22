// map-server/frontend/src/components/OverlayLayer.jsx
import React, { useMemo } from 'react';
import { ImageOverlay } from 'react-leaflet';
import { useOverlay } from '../context/OverlayContext';
import { WORLD_BOUNDS, GRID_WIDTH, GRID_HEIGHT } from '../config/constants';

const OverlayLayer = () => {
    const { overlayData } = useOverlay();
    const { url, x, y, width, opacity, visible, aspectRatio } = overlayData;

    // Tính toán tọa độ LatLng từ tọa độ Grid (x, y)
    const bounds = useMemo(() => {
        if (!url) return null;

        const getLatLng = (gx, gy) => {
            const north = WORLD_BOUNDS.getNorth();
            const south = WORLD_BOUNDS.getSouth();
            const east = WORLD_BOUNDS.getEast();
            const west = WORLD_BOUNDS.getWest();

            const lat = north - (gy / GRID_HEIGHT) * (north - south);
            const lng = west + (gx / GRID_WIDTH) * (east - west);
            return [lat, lng];
        };

        // Tính chiều cao dựa trên tỷ lệ ảnh
        const ratio = aspectRatio || 1;
        const height = width * ratio;

        const topLeft = getLatLng(x, y);
        const bottomRight = getLatLng(x + width, y + height);

        return [topLeft, bottomRight];
    }, [x, y, width, url, aspectRatio]);

    if (!visible || !url || !bounds) return null;

    return (
        <ImageOverlay
            url={url}
            bounds={bounds}
            opacity={opacity}
            zIndex={10} // Nằm dưới Pixel nhưng trên nền bản đồ
        />
    );
};

export default OverlayLayer;