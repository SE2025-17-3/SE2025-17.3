import React, { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  WORLD_BOUNDS,
  CHUNK_SIZE,
  MIN_ZOOM_TO_SHOW_PIXELS,
} from "../config/constants";
import { useSocket } from "../context/SocketContext.jsx";
import api from "../services/api";

const GlobalCanvasGrid = ({
  selectedPixelColor,
  pendingPixels,
  setPendingPixels,
  onPixelClickForInfo,
  pixelInfo,
  canPaint,
  onZoomWarning,
  isPaletteVisible
}) => {
  const map = useMap();
  const socket = useSocket();

  // State lưu trữ dữ liệu pixel (Key: "gx:gy", Value: hexColor)
  const [pixels, setPixels] = useState(new Map());
  const [hovered, setHovered] = useState(null);

  // Refs
  const canvasRef = useRef(null);
  const loadedChunksRef = useRef(new Set()); // Lưu danh sách chunk đã tải
  const abortControllerRef = useRef(null);   // Quản lý việc hủy request API
  const animationFrameId = useRef(null);     // Quản lý vòng lặp vẽ Canvas

  const maxPendingPixels = 64;

  // --- 1. HELPER: CHUYỂN ĐỔI LAT/LNG -> GRID ---
  const latLngToGrid = useCallback((latlng) => {
    // Wrap kinh độ (-180 -> 180) để xử lý bản đồ cuộn tròn
    const wrappedLng = L.Util.wrapNum(latlng.lng, [-180, 180], true);
    
    // Kẹp vĩ độ trong giới hạn thế giới
    const clampedLat = Math.max(
      WORLD_BOUNDS.getSouth(),
      Math.min(WORLD_BOUNDS.getNorth(), latlng.lat)
    );

    const latRange = WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth();
    const lngRange = WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest();

    const gx = Math.floor(
      ((wrappedLng - WORLD_BOUNDS.getWest()) / lngRange) * GRID_WIDTH
    );
    const gy = Math.floor(
      ((WORLD_BOUNDS.getNorth() - clampedLat) / latRange) * GRID_HEIGHT
    );

    // Đảm bảo không vượt quá biên giới hạn
    return {
      gx: Math.max(0, Math.min(gx, GRID_WIDTH - 1)),
      gy: Math.max(0, Math.min(gy, GRID_HEIGHT - 1))
    };
  }, []);

  // --- 2. XỬ LÝ CLICK (INTERACTION) ---
  const handleInteraction = useCallback((e) => {
      if (e.latlng.lat > WORLD_BOUNDS.getNorth() || e.latlng.lat < WORLD_BOUNDS.getSouth()) return;

      const { gx, gy } = latLngToGrid(e.latlng);
      
      // Nếu đang mở bảng màu hoặc có pixel đang chờ -> Chế độ tô màu
      if (pendingPixels.length > 0 || isPaletteVisible) {
        if (!canPaint) {
          if (onZoomWarning) onZoomWarning();
          return;
        }

        setPendingPixels((prev) => {
          const existingIndex = prev.findIndex((p) => p.gx === gx && p.gy === gy);
          if (existingIndex !== -1) {
            // Nếu click lại đúng màu cũ thì thôi
            if (prev[existingIndex].color === selectedPixelColor) return prev;
            // Cập nhật màu mới cho vị trí cũ
            const newPending = [...prev];
            newPending[existingIndex] = { ...prev[existingIndex], color: selectedPixelColor };
            return newPending;
          } else {
            // Thêm pixel mới vào danh sách chờ
            if (prev.length < maxPendingPixels) {
              return [...prev, { gx, gy, color: selectedPixelColor }];
            } else {
              alert("Đã đạt giới hạn chọn cùng lúc.");
              return prev;
            }
          }
        });
      } else {
        // Chế độ xem thông tin
        if (canPaint) {
          onPixelClickForInfo({ gx, gy });
        } else {
          if (onZoomWarning) onZoomWarning();
        }
      }
    },
    [canPaint, latLngToGrid, pendingPixels, selectedPixelColor, setPendingPixels, onPixelClickForInfo, onZoomWarning, isPaletteVisible]
  );

  // --- 3. XỬ LÝ HOVER ---
  const handleMove = useCallback((e) => {
      // Chỉ tính toán hover khi zoom đủ gần
      if (!canPaint || map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) {
        if (hovered !== null) setHovered(null);
        return;
      }
      const gridPos = latLngToGrid(e.latlng);
      setHovered((prev) => {
        if (prev && prev.gx === gridPos.gx && prev.gy === gridPos.gy) return prev;
        return gridPos;
      });
    }, [canPaint, latLngToGrid, hovered, map]);

  // --- 4. LOAD DATA TỪ API (TỐI ƯU ABORT CONTROLLER) ---
  const loadVisibleChunks = useCallback(async () => {
    const zoom = map.getZoom();
    if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) return;

    // Hủy các request cũ đang chạy dở
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Tính toán vùng chunk cần tải
    const bounds = map.getBounds().pad(0.1); // Load dư ra 10% vùng nhìn
    const nw = latLngToGrid(bounds.getNorthWest());
    const se = latLngToGrid(bounds.getSouthEast());

    // Tính toán chunk range
    let startX = Math.floor(nw.gx / CHUNK_SIZE);
    let endX = Math.floor(se.gx / CHUNK_SIZE);
    const chunkY_min = Math.floor(nw.gy / CHUNK_SIZE);
    const chunkY_max = Math.floor(se.gy / CHUNK_SIZE);
    
    // Xử lý map wrap (nếu nhìn thấy cả mép trái và phải bản đồ)
    const totalChunksX = Math.ceil(GRID_WIDTH / CHUNK_SIZE);
    if (endX < startX) { startX = 0; endX = totalChunksX - 1; }

    const chunksToLoad = [];

    for (let x = startX; x <= endX; x++) {
      for (let y = chunkY_min; y <= chunkY_max; y++) {
        const chunkKey = `${x}:${y}`;
        // Chỉ tải những chunk chưa tải
        if (!loadedChunksRef.current.has(chunkKey)) {
          loadedChunksRef.current.add(chunkKey);
          chunksToLoad.push({ x, y, key: chunkKey });
        }
      }
    }

    if (chunksToLoad.length === 0) return;

    try {
        // Gọi API song song
        const promises = chunksToLoad.map(({ x, y }) => 
            api.get(`/pixels/chunk/${x}/${y}`, { signal })
               .then(res => res.data)
               .catch(err => {
                   // Nếu lỗi là do Cancel hoặc Network -> Xóa khỏi cache để lần sau tải lại
                   if (err.name !== 'CanceledError' && err.code !== "ERR_CANCELED") {
                       loadedChunksRef.current.delete(`${x}:${y}`);
                   }
                   return null; 
               })
        );

        const results = await Promise.all(promises);

        // Update state pixels
        const newPixels = new Map(); 
        let hasNewData = false;

        results.forEach(chunkData => {
            if (Array.isArray(chunkData)) {
                hasNewData = true;
                chunkData.forEach(p => {
                    newPixels.set(`${p.gx}:${p.gy}`, p.color);
                });
            }
        });

        if (hasNewData) {
            setPixels(prev => {
                const merged = new Map(prev);
                newPixels.forEach((val, key) => merged.set(key, val));
                return merged;
            });
        }

    } catch (error) {
        // Bỏ qua lỗi cancel
    }
  }, [map, latLngToGrid]);

  // --- 5. EFFECTS: EVENT LISTENERS ---
  useEffect(() => {
    map.on("click", handleInteraction);
    map.on("mousemove", handleMove);
    return () => {
      map.off("click", handleInteraction);
      map.off("mousemove", handleMove);
    };
  }, [map, handleInteraction, handleMove]);

  useEffect(() => {
    map.on("moveend zoomend", loadVisibleChunks);
    loadVisibleChunks(); // Load lần đầu
    return () => map.off("moveend zoomend", loadVisibleChunks);
  }, [map, loadVisibleChunks]);

  // --- 6. SOCKET REALTIME ---
  useEffect(() => {
    const handleNewPixel = (newPixel) => {
      if (newPixel && typeof newPixel.gx === "number" && typeof newPixel.gy === "number") {
        setPixels((prev) => {
            const newMap = new Map(prev);
            if (newPixel.color === 'transparent') {
                newMap.delete(`${newPixel.gx}:${newPixel.gy}`);
            } else {
                newMap.set(`${newPixel.gx}:${newPixel.gy}`, newPixel.color);
            }
            return newMap;
        });
      }
    };
    socket.on("pixel_placed", handleNewPixel);
    return () => socket.off("pixel_placed", handleNewPixel);
  }, [socket]);

  // --- 7. RENDER CANVAS (MAIN LOOP) ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    // Helper: Vẽ con trỏ khung (Bracket)
    const drawBracketCursor = (ctx, x, y, w, h, mainColor) => {
        const strokeWidth = Math.max(2, Math.min(w * 0.15, 5)); 
        const cornerLen = Math.max(2, w * 0.3); 
        
        ctx.lineCap = "round"; 
        ctx.lineJoin = "round";

        // Shadow trắng
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"; 
        ctx.lineWidth = strokeWidth + 2; 
        drawPath(ctx, x, y, w, h, cornerLen);
        ctx.stroke();

        // Màu chính
        ctx.beginPath();
        ctx.strokeStyle = mainColor; 
        ctx.lineWidth = strokeWidth;
        drawPath(ctx, x, y, w, h, cornerLen);
        ctx.stroke();
    };

    const drawPath = (ctx, x, y, w, h, L) => {
        ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
        ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
        ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
        ctx.moveTo(x, y + h - L); ctx.lineTo(x, y + h); ctx.lineTo(x + L, y + h);
    };

    // Helper: Tính tọa độ màn hình của pixel
    const getPixelGeometry = (gx, gy) => {
        const north = WORLD_BOUNDS.getNorth();
        const south = WORLD_BOUNDS.getSouth();
        const west = WORLD_BOUNDS.getWest();
        const east = WORLD_BOUNDS.getEast();

        const latTL = north - (gy / GRID_HEIGHT) * (north - south);
        const lngStep = (east - west) / GRID_WIDTH;
        const lngTL_raw = west + (gx * lngStep);
        const lngBR_raw = west + ((gx + 1) * lngStep);

        // Xử lý wrap kinh độ: Tìm bản sao gần nhất với tâm màn hình
        const centerLng = map.getCenter().lng;
        const shift = 360 * Math.round((centerLng - lngTL_raw) / 360);
        
        const pointTL = map.latLngToContainerPoint(L.latLng(latTL, lngTL_raw + shift));
        const pointBR = map.latLngToContainerPoint(L.latLng(
            north - ((gy + 1) / GRID_HEIGHT) * (north - south), 
            lngBR_raw + shift
        ));

        const width = Math.abs(pointBR.x - pointTL.x);
        const height = Math.abs(pointBR.y - pointTL.y);

        return {
            x: Math.floor(pointTL.x),
            y: Math.floor(pointTL.y),
            w: width,
            h: height,
            wFill: Math.ceil(width) + 1, // +1 để lấp khe hở (anti-aliasing gap)
            hFill: Math.ceil(height) + 1
        };
    };

    const drawCanvas = () => {
      const zoom = map.getZoom();
      
      // Xóa toàn bộ canvas để vẽ lại
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Nếu zoom xa quá thì không vẽ gì cả
      if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) return;

      // 1. Vẽ Pixel đã load
      pixels.forEach((color, key) => {
        if (color === 'transparent') return;
        
        const split = key.split(":");
        const gx = parseInt(split[0]);
        const gy = parseInt(split[1]);

        const { x, y, wFill, hFill } = getPixelGeometry(gx, gy);

        // Safe Culling: Chỉ vẽ nếu nằm trong vùng màn hình (+ buffer 100px)
        // Điều kiện này lỏng hơn để đảm bảo pixel ở mép vẫn hiện
        if (x > -100 && y > -100 && x < canvas.width + 100 && y < canvas.height + 100) {
             ctx.fillStyle = color;
             ctx.fillRect(x, y, wFill, hFill);
        }
      });

      // 2. Vẽ Pending Pixels (Đang chọn để tô)
      pendingPixels.forEach(({ gx, gy, color }) => {
        const { x, y, w, h, wFill, hFill } = getPixelGeometry(gx, gy);
        if (color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, wFill, hFill);
        }
        // Chỉ vẽ khung nếu ô đủ lớn để nhìn thấy
        if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#007BFF");
      });

      // 3. Vẽ Highlight Pixel đang xem info
      if (pixelInfo && !pendingPixels.length && canPaint) {
        const { x, y, w, h } = getPixelGeometry(pixelInfo.gx, pixelInfo.gy);
        if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#FF0000");
      }

      // 4. Vẽ Hover
      if (hovered) {
        const { x, y, w, h } = getPixelGeometry(hovered.gx, hovered.gy);
        if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "rgba(0, 0, 0, 0.5)");
      }
    };

    const onMapUpdate = () => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(drawCanvas);
    };

    map.on("move zoom moveend zoomend", onMapUpdate);
    // Vẽ frame đầu tiên
    onMapUpdate();

    return () => {
      map.off("move zoom moveend zoomend", onMapUpdate);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [map, pixels, pendingPixels, pixelInfo, hovered, canPaint]);

  // --- 8. RESIZE CANVAS ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const updateCanvasSize = () => {
      if (canvas) {
        const mapContainer = map.getContainer();
        canvas.width = mapContainer.clientWidth;
        canvas.height = mapContainer.clientHeight;
        // Vẽ lại ngay lập tức
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      }
    };
    updateCanvasSize();
    map.on("resize", updateCanvasSize);
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
            pointerEvents: "none", 
            imageRendering: "pixelated" // Quan trọng: Giữ pixel sắc nét
        }} 
    />
  );
};

export default GlobalCanvasGrid;
