import axios from 'axios';

// Lấy URL backend từ biến môi trường của Vite
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const socket = io({
    // Tùy chọn này quan trọng để nó không cố gắng kết nối ngay lập tức
    // đến một đường dẫn con /socket.io, mà sẽ kết nối đến gốc.
    path: '/socket.io/' 
});

export default api;
