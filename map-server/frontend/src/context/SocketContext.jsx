// SocketContext.jsx

import React, { createContext, useContext, useEffect, useMemo } from 'react';
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
    // Sử dụng useMemo để đảm bảo instance socket chỉ được tạo một lần
    // duy nhất trong vòng đời của component.
    const socket = useMemo(() => 
        // Khởi tạo io() mà không có URL.
        // Nó sẽ tự động kết nối đến server đã phục vụ trang web này.
        // Ví dụ: http://136.112.99.88
        // Nginx sẽ bắt các request tới đường dẫn /socket.io/ và chuyển tiếp chúng.
        io({
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        }),
    []); // Mảng rỗng đảm bảo useMemo chỉ chạy một lần.

    useEffect(() => {
        const handleConnect = () => console.log('🔗 Đã kết nối Socket.IO:', socket.id);
        const handleDisconnect = () => console.log('🔌 Đã ngắt kết nối Socket.IO');
        const handleConnectError = (err) => console.error('❌ Lỗi kết nối Socket.IO:', err.message);

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        // Cleanup: Ngắt kết nối khi component bị unmount để tránh rò rỉ bộ nhớ.
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
            socket.disconnect(); // Chủ động ngắt kết nối.
        };
    }, [socket]); // useEffect sẽ chạy lại nếu instance socket thay đổi (dù trong trường hợp này là không bao giờ).

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
