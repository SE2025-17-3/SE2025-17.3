// D:\Code\SE2025-17.3\map-server\frontend\src\services\pixelApi.js
import api from './api';

export const getPixelDetail = async (gx, gy) => {
  // Gọi API: /pixels/detail?gx=10&gy=20
  const response = await api.get(`/pixels/detail`, {
    params: { gx, gy }
  });
  return response.data;
};