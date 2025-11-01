import React, { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  WORLD_BOUNDS,
  CHUNK_SIZE,
  MIN_ZOOM_TO_SHOW_PIXELS,
  API_URL,
} from "../config/constants";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx"; 
import api from "../services/api"; 

// --- SỬA ĐỔI: Nhận thêm 'selectedPixel' và 'onPixelSelect' ---
const GlobalCanvasGrid = ({ selectedColor, onLoginRequired, selectedPixel, onPixelSelect }) => { 
  const map = useMap();
  const socket = useSocket();
  const { isLoggedIn } = useAuth(); 
  const [pixels, setPixels] = useState(new Map());
  const canvasRef = useRef(null);
  const loadedChunksRef = useRef(new Set());

  // --- Hàm chuyển đổi tọa độ (giữ nguyên) ---
  const latLngToGrid = useCallback((latlng) => {
    const clampedLat = Math.max(
      WORLD_BOUNDS.getSouth(),
      Math.min(WORLD_BOUNDS.getNorth(), latlng.lat)
    );
    const clampedLng = Math.max(
      WORLD_BOUNDS.getWest(),
      Math.min(WORLD_BOUNDS.getEast(), latlng.lng)
    );
    const gx = Math.floor(
      ((clampedLng - WORLD_BOUNDS.getWest()) /
        (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest())) *
        GRID_WIDTH
    );
    const gy = Math.floor(
      ((WORLD_BOUNDS.getNorth() - clampedLat) /
        (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth())) *
        GRID_HEIGHT
    );
    const finalGx = Math.min(gx, GRID_WIDTH - 1);
    const finalGy = Math.min(gy, GRID_HEIGHT - 1);
    return { gx: finalGx, gy: finalGy };
  }, []);

  // --- Hàm tải chunks (giữ nguyên) ---
  const loadVisibleChunks = useCallback(() => {
     if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;
     const bounds = map.getBounds().pad(0.1); 
     const nw = bounds.getNorthWest();
     const se = bounds.getSouthEast();
     const gridNW = latLngToGrid(nw);
     const gridSE = latLngToGrid(se);
     const chunkX_min = Math.max(0, Math.floor(gridNW.gx / CHUNK_SIZE));
     const chunkX_max = Math.min(Math.ceil(GRID_WIDTH / CHUNK_SIZE) - 1, Math.floor(gridSE.gx / CHUNK_SIZE));
     const chunkY_min = Math.max(0, Math.floor(gridNW.gy / CHUNK_SIZE)); 
     const chunkY_max = Math.min(Math.ceil(GRID_HEIGHT / CHUNK_SIZE) - 1, Math.floor(gridSE.gy / CHUNK_SIZE)); 
     for (let x = chunkX_min; x <= chunkX_max; x++) {
       for (let y = chunkY_min; y <= chunkY_max; y++) {
         const chunkKey = `${x}:${y}`;
         if (!loadedChunksRef.current.has(chunkKey)) {
           loadedChunksRef.current.add(chunkKey);
           api.get(`/pixels/chunk/${x}/${y}`)
             .then((res) => {
               const chunkData = res.data;
               if(Array.isArray(chunkData)) {
                 setPixels((prev) => {
                   const newMap = new Map(prev);
                   chunkData.forEach((p) => newMap.set(`${p.gx}:${p.gy}`, p.color));
                   return newMap;
                 });
               }
             })
             .catch((err) => {
               console.error(`❌ Lỗi tải chunk ${chunkKey}:`, err);
               loadedChunksRef.current.delete(chunkKey);
             });
         }
       }
     }
  }, [map, latLngToGrid]);

  // --- useEffect cho loadVisibleChunks (giữ nguyên) ---
  useEffect(() => {
    map.on("moveend", loadVisibleChunks);
    map.on("zoomend", loadVisibleChunks);
    loadVisibleChunks();
    return () => {
      map.off("moveend", loadVisibleChunks);
      map.off("zoomend", loadVisibleChunks);
    };
  }, [map, loadVisibleChunks]);

  // --- useEffect lắng nghe socket (giữ nguyên) ---
  useEffect(() => {
    const handleNewPixel = (newPixel) => {
      if (newPixel && typeof newPixel.gx === 'number' && typeof newPixel.gy === 'number' && newPixel.color) {
        setPixels((prev) => {
          const newMap = new Map(prev);
          newMap.set(`${newPixel.gx}:${newPixel.gy}`, newPixel.color);
          return newMap;
        });
      }
    };
    socket.on("pixel_placed", handleNewPixel);
    return () => socket.off("pixel_placed", handleNewPixel);
  }, [socket]);

  // --- SỬA ĐỔI: useEffect vẽ canvas (thêm 'selectedPixel' và vẽ ô chọn) ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Hàm tiện ích để tính toán vị trí pixel (giống trong vòng lặp)
    const getPixelGeometry = (gx, gy) => {
        const lat1 = WORLD_BOUNDS.getNorth() - (gy / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
        const lng1 = WORLD_BOUNDS.getWest() + (gx / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
        const latLng1 = L.latLng(lat1, lng1);
        
        const lat2 = WORLD_BOUNDS.getNorth() - ((gy + 1) / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
        const lng2 = WORLD_BOUNDS.getWest() + ((gx + 1) / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
        const latLng2 = L.latLng(lat2, lng2);

        const bounds = L.latLngBounds(latLng1, latLng2);
        
        const screenPoint1 = map.latLngToContainerPoint(latLng1);
        const screenPointBottomRight = map.latLngToContainerPoint(latLng2);
        
        const width = Math.abs(screenPointBottomRight.x - screenPoint1.x);
        const height = Math.abs(screenPointBottomRight.y - screenPoint1.y);

        return { bounds, screenPoint1, width, height };
    };


    const drawCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;
      
      const mapBounds = map.getBounds();

      // 1. Vẽ tất cả các pixel đã tô
      pixels.forEach((color, key) => {
        const [gx, gy] = key.split(":").map(Number);
        const { bounds, screenPoint1, width, height } = getPixelGeometry(gx, gy);

        if (mapBounds.intersects(bounds)) {
          if (width >= 0.5 && height >= 0.5) {
            if (typeof color === 'string' && color.startsWith('#')) {
                ctx.fillStyle = color;
                ctx.fillRect(
                    Math.round(screenPoint1.x),
                    Math.round(screenPoint1.y),
                    Math.ceil(width),
                    Math.ceil(height)
                );
            }
          }
        }
      });

      // 2. Vẽ ô vuông chọn (nếu có)
      if (selectedPixel) {
        const { gx, gy } = selectedPixel;
        const { bounds, screenPoint1, width, height } = getPixelGeometry(gx, gy);

        if (mapBounds.intersects(bounds) && width >= 0.5 && height >= 0.5) {
            ctx.strokeStyle = '#007BFF'; // Màu xanh nổi bật
            ctx.lineWidth = 2; // Độ dày viền
            ctx.strokeRect(
                Math.round(screenPoint1.x) - 1, // Dịch -1 để viền đẹp hơn
                Math.round(screenPoint1.y) - 1,
                Math.ceil(width) + 2, // Thêm 2px cho viền
                Math.ceil(height) + 2
            );
        }
      }
    };
    
    map.on("moveend", drawCanvas);
    map.on("zoomend", drawCanvas);
    drawCanvas(); 
    return () => {
      map.off("moveend", drawCanvas);
      map.off("zoomend", drawCanvas);
    };
  }, [map, pixels, selectedPixel]); // <-- THÊM 'selectedPixel' vào dependency

  // --- SỬA ĐỔI: useEffect xử lý click chuột (chỉ để CHỌN) ---
  useEffect(() => {
    const handleClick = (e) => {
      if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;
      
      // 1. Kiểm tra đăng nhập
      if (!isLoggedIn) {
        alert("Bạn cần đăng nhập để chọn và tô màu!");
        onLoginRequired(); // Mở modal
        return; 
      }

      // 2. Nếu đã đăng nhập, logic click chuột là để CHỌN
      if (WORLD_BOUNDS.contains(e.latlng)) {
        const { gx, gy } = latLngToGrid(e.latlng);
        
        // Cập nhật pixel đang được chọn
        onPixelSelect({ gx, gy });
        console.log(`🖱️ Đã chọn pixel: (${gx}, ${gy})`);
        
        // Không gửi fetch/api.post ở đây nữa
      }
    };
    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [map, latLngToGrid, isLoggedIn, onLoginRequired, onPixelSelect]); // <-- Thêm dependencies

  // --- useEffect xử lý resize (giữ nguyên) ---
  useEffect(() => {
    const updateCanvasSize = () => {
        if (canvasRef.current) {
            const size = map.getSize();
            canvasRef.current.width = size.x;
            canvasRef.current.height = size.y;
            map.fire('moveend'); 
        }
    };
    map.on("resize", updateCanvasSize);
    updateCanvasSize(); 
    return () => map.off("resize", updateCanvasSize);
  }, [map]); 

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", 
        top: 0,
        left: 0,
        zIndex: 400,
        pointerEvents: "auto", 
      }}
    />
  );
};

export default GlobalCanvasGrid;

