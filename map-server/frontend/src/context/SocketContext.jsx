// SocketContext.jsx

import React, { createContext, useContext, useEffect } from 'react';
import io from 'socket.io-client';

// Khởi tạo context với giá trị null ban đầu.
const SocketContext = createContext(null);

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
    // Use a ref to create socket only once and avoid StrictMode issues
    const socketRef = React.useRef(null);

    // Create socket only once
    if (!socketRef.current) {
        socketRef.current = io({
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: true,
        });
    }

    const socket = socketRef.current;

    useEffect(() => {
        const handleConnect = () => console.log('🔗 Đã kết nối Socket.IO:', socket.id);
        const handleDisconnect = () => console.log('🔌 Đã ngắt kết nối Socket.IO');
        const handleConnectError = (err) => console.error('❌ Lỗi kết nối Socket.IO:', err.message);

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        // Cleanup: Remove listeners but DON'T disconnect socket
        // This prevents React StrictMode double-mount from killing the connection
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
