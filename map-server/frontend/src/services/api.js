import axios from 'axios';

// Hàm xác định URL Backend tự động
const getBaseUrl = () => {
  // 1. Ưu tiên biến môi trường (nếu có)
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  // 2. Môi trường Production (Docker/Server)
  // Lấy chính domain hiện tại (http://136.112.99.88)
  // Nginx sẽ tự điều hướng các path như /auth, /users vào backend
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  // 3. Môi trường Dev (Localhost)
  // Lưu ý: Nếu server local của bạn không dùng prefix /api, hãy xóa đuôi /api đi
  // Dựa vào server.js bạn gửi lúc đầu, có vẻ bạn không dùng prefix /api global.
  return 'http://localhost:4000';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true, // ⚠️ Quan trọng: Gửi cookie session kèm theo request
});

// Thêm interceptor để log lỗi (tùy chọn, giúp debug dễ hơn trên server)
api.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error("API Error:", error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
);

export default api;