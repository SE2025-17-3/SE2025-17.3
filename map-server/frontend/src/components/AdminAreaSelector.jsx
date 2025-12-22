// frontend/src/components/AdminAreaSelector.jsx
import React, { useState, useEffect } from 'react';
import { useMap, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import { WORLD_BOUNDS, GRID_WIDTH, GRID_HEIGHT } from '../config/constants';
import api from '../services/api';

const AdminAreaSelector = ({ isActive, onComplete, onCancel }) => {
    const map = useMap();
    const [startPoint, setStartPoint] = useState(null); // Điểm click đầu tiên (LatLng)
    const [endPoint, setEndPoint] = useState(null);     // Điểm di chuột hiện tại (LatLng)

    // Helper: Chuyển LatLng sang Grid (GX, GY)
    const latLngToGrid = (latlng) => {
        const north = WORLD_BOUNDS.getNorth();
        const south = WORLD_BOUNDS.getSouth();
        const east = WORLD_BOUNDS.getEast();
        const west = WORLD_BOUNDS.getWest();

        const latRange = north - south;
        const lngRange = east - west;

        const gx = Math.floor(((latlng.lng - west) / lngRange) * GRID_WIDTH);
        const gy = Math.floor(((north - latlng.lat) / latRange) * GRID_HEIGHT);

        return { gx, gy };
    };

    useEffect(() => {
        if (!isActive) return;

        // Tắt chế độ kéo bản đồ khi đang chọn
        map.dragging.disable();
        const container = map.getContainer();
        container.style.cursor = 'crosshair';

        const handleClick = (e) => {
            // Chặn sự kiện lan ra ngoài
            L.DomEvent.stopPropagation(e.originalEvent);
            
            if (!startPoint) {
                // Click lần 1: Chọn điểm bắt đầu
                setStartPoint(e.latlng);
                setEndPoint(e.latlng); 
            } else {
                // Click lần 2: Kết thúc chọn -> Thực hiện xóa
                handleFinishSelection(startPoint, e.latlng);
            }
        };

        const handleMouseMove = (e) => {
            if (startPoint) {
                setEndPoint(e.latlng); // Cập nhật hình chữ nhật
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                resetSelection();
                onCancel();
            }
        };

        map.on('click', handleClick);
        map.on('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            map.dragging.enable();
            container.style.cursor = '';
            map.off('click', handleClick);
            map.off('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive, map, startPoint, onCancel]);

    const handleFinishSelection = async (start, end) => {
        const p1 = latLngToGrid(start);
        const p2 = latLngToGrid(end);

        const payload = {
            x1: Math.min(p1.gx, p2.gx),
            y1: Math.min(p1.gy, p2.gy),
            x2: Math.max(p1.gx, p2.gx),
            y2: Math.max(p1.gy, p2.gy)
        };

        // Tính số lượng pixel ước lượng (chỉ để tham khảo)
        const width = payload.x2 - payload.x1;
        const height = payload.y2 - payload.y1;
        
        const confirmMsg = `⚠️ CẢNH BÁO ADMIN ⚠️\n\nBạn đang yêu cầu xóa vùng:\n- Từ: (${payload.x1}, ${payload.y1})\n- Đến: (${payload.x2}, ${payload.y2})\n- Kích thước: ${width}x${height}\n\nHành động này KHÔNG THỂ hoàn tác. Tiếp tục?`;
        
        if (window.confirm(confirmMsg)) {
            try {
                const res = await api.post('/admin/wipe-area', payload);
                alert(`✅ ${res.data.message}`);
                onComplete(); 
            } catch (err) {
                alert(`❌ Lỗi: ${err.response?.data?.message || 'Lỗi server'}`);
                onCancel();
            }
        } else {
            resetSelection();
        }
        
        resetSelection();
    };

    const resetSelection = () => {
        setStartPoint(null);
        setEndPoint(null);
    };

    if (!isActive || !startPoint || !endPoint) return null;

    return (
        <Rectangle
            bounds={[startPoint, endPoint]}
            pathOptions={{ color: 'red', weight: 2, fillOpacity: 0.4, dashArray: '5, 10' }}
        />
    );
};

export default AdminAreaSelector;