import L from "leaflet";

// URL của backend API và Socket server (nên giống nhau)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"; 
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000"; // Dùng cho SocketContext

// Cấu hình lưới và bản đồ
export const ASPECT_RATIO = 360 / 170.1;
export const GRID_HEIGHT = 5000;
export const GRID_WIDTH = Math.round(GRID_HEIGHT * ASPECT_RATIO);
export const WORLD_BOUNDS = L.latLngBounds([-85.05112878, -180], [85.05112878, 180]);

// Cấu hình chunk và hiển thị
export const CHUNK_SIZE = 256; 
export const MIN_ZOOM_TO_SHOW_PIXELS = 10; // <-- Giảm giá trị này xuống (vd: 10 hoặc 15)