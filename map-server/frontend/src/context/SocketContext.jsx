// D:\Code\SE2025-17.3\map-server\frontend\src\context\SocketContext.jsx

import React, { createContext, useContext, useEffect } from 'react';
import io from 'socket.io-client';

// Địa chỉ backend của bạn (có thể lấy từ .env của Vite)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const socket = io(BACKEND_URL, {
  // Tùy chọn: Tự động kết nối lại nếu mất mạng
  reconnectionAttempts: 5, 
  reconnectionDelay: 1000,
}); 
const SocketContext = createContext(socket);

/**
 * Hook tùy chỉnh để lấy instance socket từ context.
 */
export const useSocket = () => {
    return useContext(SocketContext);
};

/**
 * Component Provider để bọc ứng dụng của bạn (trong main.jsx).
 */
export const SocketProvider = ({ children }) => {
    // (Tùy chọn) Thêm log để biết kết nối thành công hay thất bại
    useEffect(() => {
        const handleConnect = () => console.log('🔗 Đã kết nối Socket.IO:', socket.id);
        const handleDisconnect = () => console.log('🔌 Đã ngắt kết nối Socket.IO');
        const handleConnectError = (err) => console.error('❌ Lỗi kết nối Socket.IO:', err);

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        // Cleanup on unmount
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};