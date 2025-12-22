// map-server/frontend/src/config/constants.js
import L from "leaflet";

// --- CẤU HÌNH URL TỰ ĐỘNG (Auto-detect Environment) ---
// Hàm này giúp xác định URL Backend dựa trên môi trường đang chạy
const getBaseUrl = () => {
    // 1. Nếu có biến môi trường .env (VITE_API_URL) thì ưu tiên dùng
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // 2. Nếu đang chạy bản Build Production (Docker/Server)
    // -> Dùng chính IP/Domain hiện tại (ví dụ: http://136.112.99.88)
    // Nginx sẽ lo việc điều hướng API và Socket
    if (import.meta.env.PROD) return window.location.origin;

    // 3. Mặc định cho môi trường Dev (localhost)
    return "http://localhost:4000";
};

export const API_URL = getBaseUrl();
export const SOCKET_URL = getBaseUrl();
// -------------------------------------------------------

export const ASPECT_RATIO = 360 / 170.1;

// --- TĂNG ĐỘ PHÂN GIẢI LÊN 25,000 ---
export const GRID_HEIGHT = 25000;
export const GRID_WIDTH = Math.round(GRID_HEIGHT * ASPECT_RATIO);

export const WORLD_BOUNDS = L.latLngBounds([-85.05112878, -180], [85.05112878, 180]);
export const VISUAL_BOUNDS = L.latLngBounds([-85.05112878, -Infinity], [85.05112878, Infinity]);

export const CHUNK_SIZE = 256;

// Mức zoom tối thiểu để bắt đầu load/vẽ pixel (giữ mức 4 để nhìn bao quát)
export const MIN_ZOOM_TO_SHOW_PIXELS = 4;
