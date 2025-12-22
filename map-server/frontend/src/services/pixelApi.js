// frontend/src/services/pixelApi.js
import api from './api';

export const getPixelDetail = async (gx, gy) => {
  const response = await api.get(`/pixels/detail`, {
    params: { gx, gy }
  });
  return response.data;
};

// --- API LẤY MỘT CHUNK (CŨ - Ít dùng) ---
export const getPixels = async (chunkX, chunkY) => {
  const response = await api.get(`/pixels/chunk/${chunkX}/${chunkY}`);
  return response.data;
};

// --- [NEW] API LẤY NHIỀU CHUNK CÙNG LÚC (BATCHING) ---
export const getPixelsByChunkIds = async (chunkIds) => {
  // chunkIds là mảng string: ["0_0", "0_1", ...]
  const response = await api.post('/pixels/batch-chunks', { chunkIds });
  return response.data; // Trả về mảng pixel
};