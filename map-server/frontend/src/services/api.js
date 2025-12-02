// api.js

import axios from 'axios';

// Không cần sử dụng import.meta.env.VITE_API_URL nữa.
// Bằng cách đặt baseURL là '/api', tất cả các request được tạo bằng instance 'api'
// sẽ tự động có tiền tố là '/api'.
// Ví dụ: api.get('/users/me') sẽ gửi một request đến '/api/users/me'.
// Yêu cầu này sẽ được Nginx bắt và chuyển tiếp đến backend.

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // ⚠️ Quan trọng: Gửi cookie kèm theo mọi request
});

export default api;
