// D:\Code\SE2025-17.3\map-server\frontend\src\config\constants.js

import L from "leaflet";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"; 
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export const ASPECT_RATIO = 360 / 170.1;

// --- TĂNG ĐỘ PHÂN GIẢI LÊN 25,000 ---
export const GRID_HEIGHT = 25000; 
export const GRID_WIDTH = Math.round(GRID_HEIGHT * ASPECT_RATIO);

export const WORLD_BOUNDS = L.latLngBounds([-85.05112878, -180], [85.05112878, 180]);
export const VISUAL_BOUNDS = L.latLngBounds([-85.05112878, -Infinity], [85.05112878, Infinity]);

export const CHUNK_SIZE = 256; 

// Mức zoom tối thiểu để bắt đầu load/vẽ pixel (giữ mức 4 để nhìn bao quát)
export const MIN_ZOOM_TO_SHOW_PIXELS = 4;