import React, { createContext, useContext, useEffect, useMemo } from 'react';
import io from 'socket.io-client'; // Đảm bảo dòng này vẫn ở đây


const SocketContext = createContext(null); // Khởi tạo với null

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    // Sử dụng useMemo để khởi tạo socket chỉ một lần duy nhất
    const socket = useMemo(() => io({
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    }), []); // Mảng rỗng đảm bảo nó chỉ chạy 1 lần

    useEffect(() => {
        const handleConnect = () => console.log('🔗 Đã kết nối Socket.IO:', socket.id);
        const handleDisconnect = () => console.log('🔌 Đã ngắt kết nối Socket.IO');
        const handleConnectError = (err) => console.error('❌ Lỗi kết nối Socket.IO:', err.message);

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        // Cleanup: Ngắt kết nối khi component bị unmount
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
            socket.disconnect(); // Ngắt kết nối chủ động
        };
    }, [socket]); // Phụ thuộc vào socket

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
