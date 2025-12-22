// frontend/src/components/PingLayer.jsx

import React, { useEffect, useState } from 'react';
import { useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useSocket } from '../context/SocketContext';
import { WORLD_BOUNDS, GRID_WIDTH, GRID_HEIGHT } from '../config/constants';
import './PingLayer.css';

const PingLayer = ({ currentTeamId }) => {
    const map = useMap();
    const socket = useSocket();
    const [pings, setPings] = useState([]);

    // --- LOGIC JOIN ROOM ---
    useEffect(() => {
        if (!socket || !currentTeamId) return;
        socket.emit('chat:join', { scope: 'team', teamId: currentTeamId });
    }, [socket, currentTeamId]);

    // Helper: Tính tọa độ chính xác của tâm ô Pixel
    const gridToLatLng = (gx, gy) => {
        const north = WORLD_BOUNDS.getNorth();
        const south = WORLD_BOUNDS.getSouth();
        const east = WORLD_BOUNDS.getEast();
        const west = WORLD_BOUNDS.getWest();

        const latRange = north - south;
        const lngRange = east - west;

        // Tính cạnh trên và cạnh trái của ô
        const latTop = north - (gy / GRID_HEIGHT) * latRange;
        const lngLeft = west + (gx / GRID_WIDTH) * lngRange;
        
        // Kích thước 1 ô
        const latStep = latRange / GRID_HEIGHT;
        const lngStep = lngRange / GRID_WIDTH;
        
        // Trả về tâm ô (Cộng thêm nửa bước)
        return [latTop - latStep/2, lngLeft + lngStep/2];
    };

    // --- HÀM XỬ LÝ KHI CLICK VÀO PING ---
    const handlePingClick = (ping, e) => {
        // 1. Chặn sự kiện lan xuống map (để không bị mở bảng tô màu)
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);

        // 2. Bay đến đúng vị trí
        // Zoom mức 20 để nhìn rõ pixel
        map.flyTo(ping.position, 20, {
            duration: 1.5 // Bay từ từ trong 1.5 giây
        });
    };

    useEffect(() => {
        if (!socket) return;

        const handlePing = (data) => {
            const newPing = {
                id: Date.now() + Math.random(),
                position: gridToLatLng(data.gx, data.gy),
                gx: data.gx,
                gy: data.gy,
                userId: data.userId
            };

            setPings(prev => [...prev, newPing]);

            setTimeout(() => {
                setPings(prev => prev.filter(p => p.id !== newPing.id));
            }, 3000); 
        };

        socket.on('team:ping', handlePing);
        return () => socket.off('team:ping', handlePing);
    }, [socket]);

    if (!currentTeamId) return null;

    const createPingIcon = () => L.divIcon({
        className: 'ping-marker',
        html: '<div class="ping-ring"></div><div class="ping-dot"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    return (
        <>
            {pings.map(ping => (
                <Marker 
                    key={ping.id} 
                    position={ping.position} 
                    icon={createPingIcon()} 
                    
                    // --- SỬA Ở ĐÂY ---
                    interactive={true} // Cho phép click
                    eventHandlers={{
                        click: (e) => handlePingClick(ping, e)
                    }}
                    // ----------------
                    
                    zIndexOffset={1000}
                />
            ))}
        </>
    );
};

export default PingLayer;