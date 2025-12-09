import axios from 'axios';

const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.PROD) return window.location.origin + '/api';
    return 'http://localhost:4000/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 1. Kiểm tra kỹ xem có phải lỗi do hủy request không
        // CanceledError là tên lỗi mới của Axios, ERR_CANCELED là code
        if (axios.isCancel(error) || error.code === "ERR_CANCELED" || error.name === "CanceledError") {
            // Im lặng, không log gì cả
            return Promise.reject(error);
        }

        // 2. Chỉ log khi là lỗi thật sự (có response từ server)
        if (error.response) {
            console.error("❌ API Error:", error.response.status, error.response.data);
        } else if (error.request) {
            // Lỗi không nhận được phản hồi (Network Error)
            console.error("🔥 Network Error (No Response):", error.message);
        } else {
            console.error("⚠️ Error:", error.message);
        }

        return Promise.reject(error);
    }
);

export default api;