import React, { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  GRID_HEIGHT, GRID_WIDTH, WORLD_BOUNDS, CHUNK_SIZE, MIN_ZOOM_TO_SHOW_PIXELS,
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
  isPaletteVisible // Nhận prop này từ App
}) => {
  const map = useMap();
  const socket = useSocket();

  const [pixels, setPixels] = useState(new Map());
  const [hovered, setHovered] = useState(null);
  const canvasRef = useRef(null);
  const loadedChunksRef = useRef(new Set());
  const maxPendingPixels = 64;
  const animationFrameId = useRef(null); // Để tối ưu render

  const latLngToGrid = useCallback((latlng) => {
    const wrappedLng = L.Util.wrapNum(latlng.lng, [-180, 180], true);
    const clampedLat = Math.max(
      WORLD_BOUNDS.getSouth(),
      Math.min(WORLD_BOUNDS.getNorth(), latlng.lat)
    );
    const gx = Math.floor(
      ((wrappedLng - WORLD_BOUNDS.getWest()) /
        (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest())) *
        GRID_WIDTH
    );
    const gy = Math.floor(
      ((WORLD_BOUNDS.getNorth() - clampedLat) /
        (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth())) *
        GRID_HEIGHT
    );
    const finalGx = Math.max(0, Math.min(gx, GRID_WIDTH - 1));
    const finalGy = Math.max(0, Math.min(gy, GRID_HEIGHT - 1));
    return { gx: finalGx, gy: finalGy };
  }, []);

  const handleInteraction = useCallback((e) => {
      if (e.latlng.lat > WORLD_BOUNDS.getNorth() || e.latlng.lat < WORLD_BOUNDS.getSouth()) return;

      const { gx, gy } = latLngToGrid(e.latlng);
      
      // LOGIC MỚI: Nếu có pixel đang chờ HOẶC bảng màu đang mở -> Click là chọn pixel
      if (pendingPixels.length > 0 || isPaletteVisible) {
        if (!canPaint) {
          if (onZoomWarning) onZoomWarning();
          return;
        }

        setPendingPixels((prev) => {
          const existingIndex = prev.findIndex((p) => p.gx === gx && p.gy === gy);
          if (existingIndex !== -1) {
            const existingPixel = prev[existingIndex];
            if (existingPixel.color === selectedPixelColor) return prev;
            const newPending = [...prev];
            newPending[existingIndex] = { ...existingPixel, color: selectedPixelColor };
            return newPending;
          } else {
            if (prev.length < maxPendingPixels) {
              return [...prev, { gx, gy, color: selectedPixelColor }];
            } else {
              alert("Đã đạt giới hạn chọn cùng lúc.");
              return prev;
            }
          }
        });
      } else {
        // Nếu không mở bảng màu -> Xem thông tin
        if (canPaint) {
          onPixelClickForInfo({ gx, gy });
        } else {
          if (onZoomWarning) onZoomWarning();
        }
      }
    },
    [canPaint, latLngToGrid, pendingPixels, selectedPixelColor, setPendingPixels, onPixelClickForInfo, onZoomWarning, isPaletteVisible]
  );

  const handleMove = useCallback((e) => {
      if (!canPaint) {
        if (hovered !== null) setHovered(null);
        return;
      }
      const gridPos = latLngToGrid(e.latlng);
      setHovered((prev) => {
        if (prev && prev.gx === gridPos.gx && prev.gy === gridPos.gy) return prev;
        return gridPos;
      });
    }, [canPaint, latLngToGrid, hovered]);

  const loadVisibleChunks = useCallback(() => {
    if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;
    const bounds = map.getBounds().pad(0.1);
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();
    const gridNW = latLngToGrid(nw);
    const gridSE = latLngToGrid(se);
    let startX = Math.floor(gridNW.gx / CHUNK_SIZE);
    let endX = Math.floor(gridSE.gx / CHUNK_SIZE);
    const totalChunksX = Math.ceil(GRID_WIDTH / CHUNK_SIZE);
    if (endX < startX) { startX = 0; endX = totalChunksX - 1; }
    const chunkY_min = Math.max(0, Math.floor(gridNW.gy / CHUNK_SIZE));
    const chunkY_max = Math.min(Math.ceil(GRID_HEIGHT / CHUNK_SIZE) - 1, Math.floor(gridSE.gy / CHUNK_SIZE));

    for (let x = startX; x <= endX; x++) {
      for (let y = chunkY_min; y <= chunkY_max; y++) {
        const chunkKey = `${x}:${y}`;
        if (!loadedChunksRef.current.has(chunkKey)) {
          loadedChunksRef.current.add(chunkKey);
          api.get(`/pixels/chunk/${x}/${y}`)
            .then((res) => {
              const chunkData = res.data;
              if (Array.isArray(chunkData)) {
                setPixels((prev) => {
                  const newMap = new Map(prev);
                  chunkData.forEach((p) => newMap.set(`${p.gx}:${p.gy}`, p.color));
                  return newMap;
                });
              }
            })
            .catch(() => loadedChunksRef.current.delete(chunkKey));
        }
      }
    }
  }, [map, latLngToGrid]);

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
    loadVisibleChunks();
    return () => map.off("moveend zoomend", loadVisibleChunks);
  }, [map, loadVisibleChunks]);

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

  // --- RENDER CANVAS (ANTI-LAG) ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const drawBracketCursor = (ctx, x, y, w, h, mainColor) => {
        const strokeWidth = Math.max(2, Math.min(w * 0.15, 6)); 
        const cornerLen = Math.max(2, w * 0.25); 
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"; ctx.lineWidth = strokeWidth + 2; 
        drawPath(ctx, x, y, w, h, cornerLen);
        ctx.strokeStyle = mainColor; ctx.lineWidth = strokeWidth;
        drawPath(ctx, x, y, w, h, cornerLen);
    };
    const drawPath = (ctx, x, y, w, h, L) => {
        ctx.beginPath();
        ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
        ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
        ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
        ctx.moveTo(x, y + h - L); ctx.lineTo(x, y + h); ctx.lineTo(x + L, y + h);
        ctx.stroke();
    };
    const getPixelGeometry = (gx, gy) => {
        const latTL = WORLD_BOUNDS.getNorth() - (gy / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
        const lngTL_raw = WORLD_BOUNDS.getWest() + (gx / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
        const latBR = WORLD_BOUNDS.getNorth() - ((gy + 1) / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
        const lngBR_raw = WORLD_BOUNDS.getWest() + ((gx + 1) / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
        const centerLng = map.getCenter().lng;
        let closestLngTL = lngTL_raw;
        while (closestLngTL - centerLng > 180) closestLngTL -= 360;
        while (closestLngTL - centerLng < -180) closestLngTL += 360;
        let closestLngBR = lngBR_raw;
        while (closestLngBR - centerLng > 180) closestLngBR -= 360;
        while (closestLngBR - centerLng < -180) closestLngBR += 360;
        const pointTL = map.latLngToContainerPoint(L.latLng(latTL, closestLngTL));
        const pointBR = map.latLngToContainerPoint(L.latLng(latBR, closestLngBR));
        const width = Math.abs(pointBR.x - pointTL.x);
        const height = Math.abs(pointBR.y - pointTL.y);
        return {
            x: Math.floor(pointTL.x), y: Math.floor(pointTL.y),
            w: Math.ceil(width), h: Math.ceil(height),
            wFill: Math.ceil(width) + 0.6, hFill: Math.ceil(height) + 0.6
        };
    };

    const drawCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;

      pixels.forEach((color, key) => {
        if (color === 'transparent') return;
        const [gx, gy] = key.split(":").map(Number);
        const { x, y, wFill, hFill } = getPixelGeometry(gx, gy);
        if (x > -wFill && y > -hFill && x < canvas.width && y < canvas.height) {
             ctx.fillStyle = color;
             ctx.fillRect(x, y, wFill, hFill);
        }
      });

      pendingPixels.forEach(({ gx, gy, color }) => {
        const { x, y, w, h, wFill, hFill } = getPixelGeometry(gx, gy);
        if (w >= 0.5) {
          if (color !== 'transparent') {
             ctx.fillStyle = color;
             ctx.fillRect(x, y, wFill, hFill);
          }
          drawBracketCursor(ctx, x, y, w, h, "#007BFF");
        }
      });

      if (pixelInfo && !pendingPixels.length && canPaint) {
        const { x, y, w, h } = getPixelGeometry(pixelInfo.gx, pixelInfo.gy);
        if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#FF0000");
      }
      if (hovered) {
        const { x, y, w, h } = getPixelGeometry(hovered.gx, hovered.gy);
        if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "rgba(0, 0, 0, 0.8)");
      }
    };

    // requestAnimationFrame Loop để tránh lag khi kéo map
    const onMapUpdate = () => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(drawCanvas);
    };

    map.on("move zoom moveend zoomend", onMapUpdate);
    drawCanvas();

    return () => {
      map.off("move zoom moveend zoomend", onMapUpdate);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [map, pixels, pendingPixels, pixelInfo, hovered, canPaint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const updateCanvasSize = () => {
      if (canvas) {
        const mapContainer = map.getContainer();
        canvas.width = mapContainer.clientWidth;
        canvas.height = mapContainer.clientHeight;
      }
    };
    updateCanvasSize();
    map.on("resize", updateCanvasSize);
    return () => map.off("resize", updateCanvasSize);
  }, [map]);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 400, pointerEvents: "none" }} />;
};
export default GlobalCanvasGrid;