import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import L from 'leaflet';

// ======================================================================
// CÁC HẰNG SỐ CẤU HÌNH (THÊM MỚI)
// ======================================================================
const socket = io('http://localhost:4000');
const ASPECT_RATIO = 360 / 170.1;
const GRID_HEIGHT = 2000;
const GRID_WIDTH = Math.round(GRID_HEIGHT * ASPECT_RATIO);
const WORLD_BOUNDS = L.latLngBounds([-85.05112878, -180], [85.05112878, 180]);

// --- CÁC HẰNG SỐ TỐI ƯU HÓA MỚI ---
const CHUNK_SIZE = 256; // Phải giống với backend
const MIN_ZOOM_TO_SHOW_PIXELS = 8; // Chỉ hiện pixel khi zoom lớn hơn hoặc bằng mức này

// ======================================================================
// COMPONENT GlobalCanvasGrid (ĐƯỢC VIẾT LẠI GẦN NHƯ HOÀN TOÀN)
// ======================================================================
const GlobalCanvasGrid = () => {
    const map = useMap();
    const [pixels, setPixels] = useState(new Map());
    const canvasRef = useRef(null);
    const loadedChunksRef = useRef(new Set()); // Dùng Set để lưu các chunk đã tải

    // Hàm chuyển đổi tọa độ địa lý sang tọa độ lưới
    const latLngToGrid = useCallback((latlng) => {
        const gx = Math.floor(((latlng.lng - WORLD_BOUNDS.getWest()) / (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest())) * GRID_WIDTH);
        const gy = Math.floor(((latlng.lat - WORLD_BOUNDS.getSouth()) / (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth())) * GRID_HEIGHT);
        return { gx, gy };
    }, []);

    // Hàm tải các chunk đang hiển thị
    const loadVisibleChunks = useCallback(() => {
        if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) {
            return;
        }

        const bounds = map.getBounds();
        const nw = bounds.getNorthWest(); // Góc trên-trái
        const se = bounds.getSouthEast(); // Góc dưới-phải

        const { gx: gx_min, gy: gy_max } = latLngToGrid(nw);
        const { gx: gx_max, gy: gy_min } = latLngToGrid(se);

        const chunkX_min = Math.floor(gx_min / CHUNK_SIZE);
        const chunkX_max = Math.floor(gx_max / CHUNK_SIZE);
        const chunkY_min = Math.floor(gy_min / CHUNK_SIZE);
        const chunkY_max = Math.floor(gy_max / CHUNK_SIZE);

        for (let x = chunkX_min; x <= chunkX_max; x++) {
            for (let y = chunkY_min; y <= chunkY_max; y++) {
                const chunkKey = `${x}:${y}`;
                if (!loadedChunksRef.current.has(chunkKey)) {
                    loadedChunksRef.current.add(chunkKey); // Đánh dấu là đang tải
                    fetch(`http://localhost:4000/api/pixels/chunk/${x}/${y}`)
                        .then(res => res.json())
                        .then(chunkData => {
                            setPixels(prev => {
                                const newMap = new Map(prev);
                                chunkData.forEach(p => newMap.set(`${p.gx}:${p.gy}`, p.color));
                                return newMap;
                            });
                        });
                }
            }
        }
    }, [map, latLngToGrid]);

    // Lắng nghe sự kiện di chuyển map để tải chunk
    useEffect(() => {
        map.on('moveend', loadVisibleChunks);
        loadVisibleChunks(); // Tải lần đầu
        return () => {
            map.off('moveend', loadVisibleChunks);
        };
    }, [map, loadVisibleChunks]);

    // Lắng nghe pixel mới từ socket
    useEffect(() => {
        const handleNewPixel = (newPixel) => {
            setPixels(prev => new Map(prev).set(`${newPixel.gx}:${newPixel.gy}`, newPixel.color));
        };
        socket.on('pixel_placed', handleNewPixel);
        return () => socket.off('pixel_placed', handleNewPixel);
    }, []);

    // Hàm vẽ canvas
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Chỉ vẽ khi zoom đủ lớn
            if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) {
                return;
            }
            // ... (logic vẽ pixel-perfect giữ nguyên)
            const mapBounds = map.getBounds();
            pixels.forEach((color, key) => {
                const [gx, gy] = key.split(':').map(Number);
                const lat1 = WORLD_BOUNDS.getSouth() + (gy / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
                const lng1 = WORLD_BOUNDS.getWest() + (gx / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
                const latLng1 = L.latLng(lat1, lng1);
                if (mapBounds.contains(latLng1)) {
                    const lat2 = WORLD_BOUNDS.getSouth() + ((gy + 1) / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
                    const lng2 = WORLD_BOUNDS.getWest() + ((gx + 1) / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
                    const latLng2 = L.latLng(lat2, lng2);
                    const screenPoint1 = map.latLngToContainerPoint(latLng1);
                    const screenPoint2 = map.latLngToContainerPoint(latLng2);
                    const pixelWidth = screenPoint2.x - screenPoint1.x;
                    const pixelHeight = screenPoint2.y - screenPoint1.y;
                    if (pixelWidth > 0.5) { // Tinh chỉnh ngưỡng vẽ
                        ctx.fillStyle = color;
                        ctx.fillRect(screenPoint1.x, screenPoint1.y, pixelWidth, pixelHeight);
                    }
                }
            });
        };
        map.on('moveend', draw);
        draw();
        return () => {
            map.off('moveend', draw);
        };
    }, [map, pixels]);

    // Hàm xử lý click chuột (dùng lại latLngToGrid)
    useEffect(() => {
        const handleClick = (e) => {
            if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return; // Không cho đặt pixel khi zoom xa
            if (WORLD_BOUNDS.contains(e.latlng)) {
                const { gx, gy } = latLngToGrid(e.latlng);
                const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                fetch('http://localhost:4000/api/pixels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gx, gy, color: randomColor })
                });
            }
        };
        map.on('click', handleClick);
        return () => map.off('click', handleClick);
    }, [map, latLngToGrid]);

    return (<canvas ref={canvasRef} width={map.getSize().x} height={map.getSize().y} style={{ position: 'relative', zIndex: 400 }} />);
};


// ======================================================================
// COMPONENT APP CHÍNH (Tăng maxZoom để cho phép zoom sâu hơn)
// ======================================================================
const App = () => {
    return (
        <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: '100vh', width: '100vw', background: '#f0f0f0' }}
            minZoom={2}
            maxZoom={20} // Tăng maxZoom
            maxBounds={WORLD_BOUNDS}
            maxBoundsViscosity={1.0}
            worldCopyJump={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                noWrap={true}
            />
            <div className="leaflet-overlay-pane">
                <GlobalCanvasGrid />
            </div>
        </MapContainer>
    );
};

export default App;