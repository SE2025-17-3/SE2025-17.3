import axios from 'axios';

// Lấy URL backend từ biến môi trường của Vite
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // ⚠️ Quan trọng: Gửi cookie kèm theo mọi request
});

export default api;
