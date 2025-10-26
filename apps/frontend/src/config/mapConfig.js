import L from 'leaflet';

export const SOCKET_URL = 'http://localhost:4000';
export const ASPECT_RATIO = 360 / 170.1;
export const GRID_HEIGHT = 2000;
export const GRID_WIDTH = Math.round(GRID_HEIGHT * ASPECT_RATIO);
export const WORLD_BOUNDS = L.latLngBounds([-85.05112878, -180], [85.05112878, 180]);
export const CHUNK_SIZE = 256;
export const MIN_ZOOM_TO_SHOW_PIXELS = 8;
