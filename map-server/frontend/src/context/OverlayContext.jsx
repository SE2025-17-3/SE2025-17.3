// frontend/src/context/OverlayContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTeam } from './TeamContext';
import api from '../services/api';

const OverlayContext = createContext();
export const useOverlay = () => useContext(OverlayContext);

export const OverlayProvider = ({ children }) => {
    const { user } = useAuth();
    const { currentTeam } = useTeam(); 

    // State lưu cấu hình overlay
    const [overlayData, setOverlayData] = useState({
        url: '', x: 0, y: 0, width: 50, aspectRatio: 1, opacity: 0.5, visible: false
    });
    
    // State bật/tắt chế độ click để chọn tọa độ trên map
    const [isPickingMode, setIsPickingMode] = useState(false);

    // Khi vào Team mới, tự động load overlay của team đó
    useEffect(() => {
        if (currentTeam && currentTeam.overlay && currentTeam.overlay.url) {
            setOverlayData(currentTeam.overlay);
        } else {
            // Reset nếu team chưa có overlay
            setOverlayData({ url: '', x: 0, y: 0, width: 50, aspectRatio: 1, opacity: 0.5, visible: false });
        }
    }, [currentTeam]);

    // Hàm update (Gửi lên Server nếu là Leader)
    const updateOverlay = async (newData) => {
        const updated = { ...overlayData, ...newData };
        setOverlayData(updated);

        // Chỉ leader mới được lưu lên server
        if (user && currentTeam && user._id === currentTeam.createdBy) {
            try {
                // Gửi request update team (chỉ update field overlay)
                await api.put(`/teams/${currentTeam._id}`, {
                    overlay: updated
                });
            } catch (err) {
                console.error("Lỗi lưu overlay:", err);
            }
        }
    };

    return (
        <OverlayContext.Provider value={{ overlayData, updateOverlay, isPickingMode, setIsPickingMode }}>
            {children}
        </OverlayContext.Provider>
    );
};