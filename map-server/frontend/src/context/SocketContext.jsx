import React, { createContext, useContext, useEffect } from 'react';
import io from 'socket.io-client';

// --- LOGIC XÁC ĐỊNH URL BACKEND ---
// 1. Nếu có biến môi trường VITE_BACKEND_URL thì ưu tiên dùng.
// 2. Nếu đang chạy Production (Docker/Server), dùng chính domain hiện tại (window.location.origin).
//    Lý do: Nginx ở port 80 sẽ tự động proxy request socket vào backend port 4000.
// 3. Nếu đang chạy Dev dưới local, dùng localhost:4000.
const getBackendUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
    if (import.meta.env.PROD) return window.location.origin; // Tự động lấy http://136.112.99.88
    return 'http://localhost:4000';
};

const socket = io(getBackendUrl(), {
    // Quan trọng: Đường dẫn này phải khớp với 'location /socket.io/' trong nginx.conf
    path: '/socket.io/',

    // Tùy chọn: Tự động kết nối lại nếu mất mạng
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,

    // Giúp kết nối ổn định hơn qua Nginx Proxy
    transports: ['websocket', 'polling'],

    // Gửi cookie (nếu bạn dùng session cookie)
    withCredentials: true,
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
    useEffect(() => {
        // Log trạng thái để dễ debug
        const handleConnect = () => {
            console.log('✅ Đã kết nối Socket.IO tới:', getBackendUrl());
            console.log('ID:', socket.id);
        };

        const handleDisconnect = (reason) => {
            console.warn('🔌 Đã ngắt kết nối Socket.IO. Lý do:', reason);
        };

        const handleConnectError = (err) => {
            console.error('❌ Lỗi kết nối Socket.IO:', err.message);
        };

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