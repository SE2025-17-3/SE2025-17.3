// frontend/src/components/HeatmapLayer.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import api from '../services/api';
import { WORLD_BOUNDS, GRID_WIDTH, GRID_HEIGHT } from '../config/constants';

const HeatmapLayer = ({ visible }) => {
    const map = useMap();
    const canvasRef = useRef(null);
    const [points, setPoints] = useState([]);

    // 1. Tải dữ liệu khi bật Heatmap
    useEffect(() => {
        if (!visible) return;

        const fetchHeatmap = async () => {
            try {
                const { data } = await api.get('/stats/heatmap');
                setPoints(data);
                console.log(`🔥 Loaded ${data.length} heatmap points`);
            } catch (err) {
                console.error("Lỗi tải heatmap:", err);
            }
        };

        fetchHeatmap();
        
        // (Tùy chọn) Tự động làm mới mỗi 60 giây
        const interval = setInterval(fetchHeatmap, 60000);
        return () => clearInterval(interval);
    }, [visible]);

    // 2. Vẽ lên Canvas
    useEffect(() => {
        if (!visible || !canvasRef.current || points.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            // Resize canvas khớp với kích thước màn hình map hiện tại
            const size = map.getSize();
            if (canvas.width !== size.x || canvas.height !== size.y) {
                canvas.width = size.x;
                canvas.height = size.y;
            }
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Tính toán bán kính đốm nhiệt dựa theo Zoom
            // Zoom càng to -> Đốm càng to để nhìn rõ
            const zoom = map.getZoom();
            const radius = Math.max(5, Math.pow(zoom, 1.4)); 

            // Lấy các thông số hằng số để tính toán tọa độ
            const north = WORLD_BOUNDS.getNorth();
            const west = WORLD_BOUNDS.getWest();
            const latRange = north - WORLD_BOUNDS.getSouth();
            const lngRange = WORLD_BOUNDS.getEast() - west;

            points.forEach(p => {
                // Chuyển đổi: Grid (x,y) -> Vĩ độ/Kinh độ (Lat/Lng)
                const lat = north - (p.y / GRID_HEIGHT) * latRange;
                const lng = west + (p.x / GRID_WIDTH) * lngRange;

                // Chuyển đổi: Lat/Lng -> Tọa độ màn hình (Pixel)
                const point = map.latLngToContainerPoint([lat, lng]);

                // Tối ưu: Chỉ vẽ những điểm đang nằm trong màn hình
                if (point.x < -50 || point.y < -50 || point.x > size.x + 50 || point.y > size.y + 50) return;

                // Tính độ đậm nhạt (Intensity): Giả sử 5 lượt click là đỏ nhất
                const intensity = Math.min(p.val / 5, 1); 

                // Vẽ vòng tròn Gradient
                ctx.beginPath();
                ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
                
                // Tạo màu Gradient: Tâm đỏ -> Ngoài trong suốt
                const gradient = ctx.createRadialGradient(point.x, point.y, radius * 0.1, point.x, point.y, radius);
                gradient.addColorStop(0, `rgba(255, 50, 0, ${intensity})`);       // Đỏ cam
                gradient.addColorStop(0.5, `rgba(255, 165, 0, ${intensity * 0.6})`); // Vàng cam
                gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');                 // Trong suốt

                ctx.fillStyle = gradient;
                ctx.fill();
            });
        };

        draw();

        // Vẽ lại khi người dùng di chuyển hoặc zoom bản đồ
        map.on('moveend zoomend', draw);
        return () => map.off('moveend zoomend', draw);

    }, [visible, points, map]);

    if (!visible) return null;

    // Render Canvas đè lên map nhưng không chặn chuột (pointer-events: none)
    return (
        <canvas 
            ref={canvasRef} 
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                zIndex: 450, // Nằm trên Grid nhưng dưới UI
                pointerEvents: 'none' 
            }} 
        />
    );
};

export default HeatmapLayer;