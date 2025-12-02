import React, { createContext, useContext, useEffect } from 'react';
import io from 'socket.io-client';

// === BƯỚC 1: Xóa hoặc comment dòng lấy BACKEND_URL ===
// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// === BƯỚC 2: Khởi tạo io() mà không có tham số URL ===
// Khi để trống, nó sẽ tự động cố gắng kết nối đến cùng một host đã phục vụ trang web.
// Ví dụ: Nếu bạn ở trang http://136.112.99.88, nó sẽ kết nối đến http://136.112.99.88.
// Nginx sẽ bắt các request này và chuyển tiếp chúng đến backend.
const socket = io({
    // Các tùy chọn khác của bạn có thể giữ nguyên
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
    useEffect(() => {
        const handleConnect = () => console.log('🔗 Đã kết nối Socket.IO:', socket.id);
        const handleDisconnect = () => console.log('🔌 Đã ngắt kết nối Socket.IO');
        const handleConnectError = (err) => console.error('❌ Lỗi kết nối Socket.IO:', err.message); // In ra err.message cho gọn

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
