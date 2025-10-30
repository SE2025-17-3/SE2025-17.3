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

const GlobalCanvasGrid = ({ selectedColor }) => { 
  const map = useMap();
  const socket = useSocket(); 
  const [pixels, setPixels] = useState(new Map());
  const canvasRef = useRef(null);
  const loadedChunksRef = useRef(new Set());

  // --- Hàm chuyển đổi tọa độ (Đã sửa lỗi lệch) ---
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
           fetch(`${API_URL}/api/pixels/chunk/${x}/${y}`)
             .then((res) => {
               if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
               return res.json();
             })
             .then((chunkData) => {
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

  // --- useEffect vẽ canvas (SỬA LỖI Ở ĐÂY) ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const drawCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;
      const mapBounds = map.getBounds();
      pixels.forEach((color, key) => {
        const [gx, gy] = key.split(":").map(Number);
        const lat1 = WORLD_BOUNDS.getNorth() - (gy / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
        const lng1 = WORLD_BOUNDS.getWest() + (gx / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
        const latLng1 = L.latLng(lat1, lng1);
        const lat2 = WORLD_BOUNDS.getNorth() - ((gy + 1) / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
        const lng2 = WORLD_BOUNDS.getWest() + ((gx + 1) / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
        const latLng2 = L.latLng(lat2, lng2);
        if (mapBounds.intersects(L.latLngBounds(latLng1, latLng2))) {
          const screenPoint1 = map.latLngToContainerPoint(latLng1);
          const screenPointBottomRight = map.latLngToContainerPoint(L.latLng(lat2, lng2));
          const pixelWidthOnScreen = Math.abs(screenPointBottomRight.x - screenPoint1.x);
          const pixelHeightOnScreen = Math.abs(screenPointBottomRight.y - screenPoint1.y);
          if (pixelWidthOnScreen >= 0.5 && pixelHeightOnScreen >= 0.5) {
            if (typeof color === 'string' && color.startsWith('#')) {
                ctx.fillStyle = color;
                ctx.fillRect(
                    Math.round(screenPoint1.x),
                    Math.round(screenPoint1.y),
                    Math.ceil(pixelWidthOnScreen),
                    Math.ceil(pixelHeightOnScreen)
                );
            }
          }
        }
      });
    };
    
    // ⭐ SỬA LỖI: Chỉ vẽ lại KHI KÉO XONG, không phải TRONG KHI KÉO
    // map.on("move", drawCanvas); // <-- XÓA DÒNG NÀY
    map.on("moveend", drawCanvas); // <-- THAY BẰNG DÒNG NÀY
    map.on("zoomend", drawCanvas);
    
    drawCanvas(); // Vẽ khi state 'pixels' thay đổi

    return () => {
      // map.off("move", drawCanvas); // <-- XÓA DÒNG NÀY
      map.off("moveend", drawCanvas); // <-- THAY BẰNG DÒNG NÀY
      map.off("zoomend", drawCanvas);
    };
  }, [map, pixels]); // Dependency giữ nguyên

  // --- useEffect xử lý click chuột (giữ nguyên) ---
  useEffect(() => {
    const handleClick = (e) => {
      if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) {
        console.log("Zoom gần hơn để đặt pixel.");
        return;
      }
      if (WORLD_BOUNDS.contains(e.latlng)) {
        const { gx, gy } = latLngToGrid(e.latlng);
        const colorToSend = selectedColor; 
        
        console.log(`⬆️ Gửi pixel: (${gx}, ${gy}) - ${colorToSend}`);
        fetch(`${API_URL}/api/pixels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gx, gy, color: colorToSend }), 
        })
          .then((res) => { 
            if (!res.ok) return res.json().then((err) => { throw new Error(err.error || `HTTP ${res.status}`) });
            return res.json();
           })
          .then((placedPixel) =>
            console.log("✅ Đặt pixel thành công:", placedPixel)
          )
          .catch((err) => console.error("❌ Lỗi khi gửi pixel:", err.message));
      }
    };
    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [map, latLngToGrid, selectedColor]);

  // --- useEffect xử lý resize (Sửa đổi để vẽ lại) ---
  useEffect(() => {
    const updateCanvasSize = () => {
        if (canvasRef.current) {
            const size = map.getSize();
            canvasRef.current.width = size.x;
            canvasRef.current.height = size.y;
            
            // ⭐ THÊM DÒNG NÀY:
            // Yêu cầu vẽ lại ngay sau khi resize,
            // nếu không canvas sẽ bị trống cho đến lần kéo tiếp theo.
            map.fire('moveend'); // Kích hoạt sự kiện 'moveend' để trigger 'drawCanvas'
        }
    };
    map.on("resize", updateCanvasSize);
    updateCanvasSize(); 
    return () => map.off("resize", updateCanvasSize);
  }, [map]); // Dependency chỉ là map

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