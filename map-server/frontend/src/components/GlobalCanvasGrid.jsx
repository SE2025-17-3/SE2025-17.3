import React, { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { GRID_HEIGHT, GRID_WIDTH, WORLD_BOUNDS, CHUNK_SIZE, MIN_ZOOM_TO_SHOW_PIXELS } from "../config/constants";
import { useSocket } from "../context/SocketContext.jsx";
import api from "../services/api";
import { useSound } from "../context/SoundContext";
import { useOverlay } from "../context/OverlayContext"; 
import { useTeam } from "../context/TeamContext"; 

const GlobalCanvasGrid = ({ selectedPixelColor, pendingPixels, setPendingPixels, onPixelClickForInfo, pixelInfo, canPaint, onZoomWarning, isPaletteVisible }) => {
    const map = useMap();
    const socket = useSocket();
    const { playSound } = useSound();
    const { isPickingMode } = useOverlay(); 
    const { currentTeam } = useTeam(); 
    
    const [pixels, setPixels] = useState(new Map());
    const [hovered, setHovered] = useState(null);
    const canvasRef = useRef(null);
    const loadedChunksRef = useRef(new Set());
    const abortControllerRef = useRef(null);
    const animationFrameId = useRef(null);
    const maxPendingPixels = 64;

    const latLngToGrid = useCallback((latlng) => {
        const wrappedLng = L.Util.wrapNum(latlng.lng, [-180, 180], true);
        const clampedLat = Math.max(WORLD_BOUNDS.getSouth(), Math.min(WORLD_BOUNDS.getNorth(), latlng.lat));
        const latRange = WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth();
        const lngRange = WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest();
        const gx = Math.floor(((wrappedLng - WORLD_BOUNDS.getWest()) / lngRange) * GRID_WIDTH);
        const gy = Math.floor(((WORLD_BOUNDS.getNorth() - clampedLat) / latRange) * GRID_HEIGHT);
        return { gx: Math.max(0, Math.min(gx, GRID_WIDTH - 1)), gy: Math.max(0, Math.min(gy, GRID_HEIGHT - 1)) };
    }, []);

    const handleInteraction = useCallback((e) => {
            if (isPickingMode) return; 
            if (e.latlng.lat > WORLD_BOUNDS.getNorth() || e.latlng.lat < WORLD_BOUNDS.getSouth()) return;
            const { gx, gy } = latLngToGrid(e.latlng);

            if (e.originalEvent.shiftKey) {
                if (currentTeam) { playSound('click'); socket.emit('team:ping', { gx, gy, teamId: currentTeam._id }); } 
                else { playSound('error'); alert("Cần gia nhập Team để Ping!"); }
                return;
            }

            if (pendingPixels.length > 0 || isPaletteVisible) {
                if (!canPaint) { playSound('error'); if (onZoomWarning) onZoomWarning(); return; }
                playSound('click'); 
                setPendingPixels((prev) => {
                    const existingIndex = prev.findIndex((p) => p.gx === gx && p.gy === gy);
                    if (existingIndex !== -1) {
                        if (prev[existingIndex].color === selectedPixelColor) return prev;
                        const newPending = [...prev];
                        newPending[existingIndex] = { ...prev[existingIndex], color: selectedPixelColor };
                        return newPending;
                    } else {
                        if (prev.length < maxPendingPixels) { return [...prev, { gx, gy, color: selectedPixelColor }]; } 
                        else { playSound('error'); alert("Đạt giới hạn chọn."); return prev; }
                    }
                });
            } else {
                if (canPaint) { playSound('click'); onPixelClickForInfo({ gx, gy }); } 
                else { playSound('error'); if (onZoomWarning) onZoomWarning(); }
            }
        }, [canPaint, latLngToGrid, pendingPixels, selectedPixelColor, setPendingPixels, onPixelClickForInfo, onZoomWarning, isPaletteVisible, playSound, isPickingMode, currentTeam, socket]
    );

    const handleMove = useCallback((e) => {
        if (!canPaint || map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) { if (hovered !== null) setHovered(null); return; }
        const gridPos = latLngToGrid(e.latlng);
        setHovered((prev) => { if (prev && prev.gx === gridPos.gx && prev.gy === gridPos.gy) return prev; return gridPos; });
    }, [canPaint, latLngToGrid, hovered, map]);

    const loadVisibleChunks = useCallback(async () => {
        const zoom = map.getZoom();
        if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const bounds = map.getBounds().pad(0.1);
        const nw = latLngToGrid(bounds.getNorthWest());
        const se = latLngToGrid(bounds.getSouthEast());
        let startX = Math.floor(nw.gx / CHUNK_SIZE);
        let endX = Math.floor(se.gx / CHUNK_SIZE);
        const chunkY_min = Math.floor(nw.gy / CHUNK_SIZE);
        const chunkY_max = Math.floor(se.gy / CHUNK_SIZE);
        const totalChunksX = Math.ceil(GRID_WIDTH / CHUNK_SIZE);
        if (endX < startX) { startX = 0; endX = totalChunksX - 1; }

        const chunksToLoad = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = chunkY_min; y <= chunkY_max; y++) {
                const chunkKey = `${x}:${y}`;
                loadedChunksRef.current.add(chunkKey);
                chunksToLoad.push({ x, y, key: chunkKey });
            }
        }
        if (chunksToLoad.length === 0) return;

        try {
            const promises = chunksToLoad.map(({ x, y }) =>
                api.get(`/pixels/chunk/${x}/${y}`, { signal }).then(res => res.data).catch(err => null)
            );
            const results = await Promise.all(promises);
            const newPixels = new Map();
            let pixelCount = 0;
            results.forEach(chunkData => {
                if (Array.isArray(chunkData)) {
                    chunkData.forEach(p => { newPixels.set(`${p.gx}:${p.gy}`, p.color); pixelCount++; });
                }
            });
            if (pixelCount > 0) {
                setPixels(prev => {
                    const merged = new Map(prev);
                    newPixels.forEach((val, key) => merged.set(key, val));
                    return merged;
                });
            }
        } catch (error) { console.error("Error loading chunks:", error); }
    }, [map, latLngToGrid]);

    useEffect(() => {
        map.on("click", handleInteraction);
        map.on("mousemove", handleMove);
        const loadEvents = "moveend zoomend";
        map.on(loadEvents, loadVisibleChunks);
        loadVisibleChunks();
        return () => {
            map.off("click", handleInteraction);
            map.off("mousemove", handleMove);
            map.off(loadEvents, loadVisibleChunks);
        };
    }, [map, handleInteraction, handleMove, loadVisibleChunks]);

    // --- SOCKET LOGIC (CẬP NHẬT MỚI: NGHE LỆNH AREA_WIPED) ---
    useEffect(() => {
        const handleNewPixel = (newPixel) => {
            if (newPixel && typeof newPixel.gx === "number" && typeof newPixel.gy === "number") {
                setPixels((prev) => {
                    const newMap = new Map(prev);
                    if (newPixel.color === 'transparent') { newMap.delete(`${newPixel.gx}:${newPixel.gy}`); } 
                    else { newMap.set(`${newPixel.gx}:${newPixel.gy}`, newPixel.color); }
                    return newMap;
                });
            }
        };

        const handleAreaWiped = ({ minX, maxX, minY, maxY }) => {
            console.log("🧹 Area wiped:", { minX, maxX, minY, maxY });
            setPixels((prev) => {
                const newMap = new Map(prev);
                for (const key of prev.keys()) {
                    const [gxStr, gyStr] = key.split(':');
                    const gx = parseInt(gxStr);
                    const gy = parseInt(gyStr);
                    // Xóa nếu nằm trong vùng wipe
                    if (gx >= minX && gx <= maxX && gy >= minY && gy <= maxY) {
                        newMap.delete(key);
                    }
                }
                return newMap;
            });
        };

        socket.on("pixel_placed", handleNewPixel);
        socket.on("area_wiped", handleAreaWiped); // <-- Listener mới
        return () => {
            socket.off("pixel_placed", handleNewPixel);
            socket.off("area_wiped", handleAreaWiped);
        };
    }, [socket]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: true });

        const drawBracketCursor = (ctx, x, y, w, h, mainColor) => {
            const strokeWidth = Math.max(2, Math.min(w * 0.15, 5));
            const cornerLen = Math.max(2, w * 0.3);
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.beginPath(); ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"; ctx.lineWidth = strokeWidth + 2;
            drawPath(ctx, x, y, w, h, cornerLen); ctx.stroke();
            ctx.beginPath(); ctx.strokeStyle = mainColor; ctx.lineWidth = strokeWidth;
            drawPath(ctx, x, y, w, h, cornerLen); ctx.stroke();
        };
        const drawPath = (ctx, x, y, w, h, L) => {
            ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
            ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
            ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
            ctx.moveTo(x, y + h - L); ctx.lineTo(x, y + h); ctx.lineTo(x + L, y + h);
        };
        const getPixelGeometry = (gx, gy) => {
            const north = WORLD_BOUNDS.getNorth();
            const south = WORLD_BOUNDS.getSouth();
            const west = WORLD_BOUNDS.getWest();
            const east = WORLD_BOUNDS.getEast();
            const latTL = north - (gy / GRID_HEIGHT) * (north - south);
            const lngStep = (east - west) / GRID_WIDTH;
            const lngTL_raw = west + (gx * lngStep);
            const centerLng = map.getCenter().lng;
            const shift = 360 * Math.round((centerLng - lngTL_raw) / 360);
            const pointTL = map.latLngToContainerPoint(L.latLng(latTL, lngTL_raw + shift));
            const pointBR = map.latLngToContainerPoint(L.latLng(north - ((gy + 1) / GRID_HEIGHT) * (north - south), west + ((gx + 1) * lngStep) + shift));
            const width = Math.abs(pointBR.x - pointTL.x);
            const height = Math.abs(pointBR.y - pointTL.y);
            return { x: Math.floor(pointTL.x), y: Math.floor(pointTL.y), w: width, h: height, wFill: Math.ceil(width) + 1, hFill: Math.ceil(height) + 1 };
        };

        const drawCanvas = () => {
            const zoom = map.getZoom();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) return;

            pixels.forEach((color, key) => {
                if (color === 'transparent') return;
                const [gx, gy] = key.split(":").map(Number);
                const { x, y, wFill, hFill } = getPixelGeometry(gx, gy);
                if (x > -100 && y > -100 && x < canvas.width + 100 && y < canvas.height + 100) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, wFill, hFill);
                }
            });
            pendingPixels.forEach(({ gx, gy, color }) => {
                const { x, y, w, h, wFill, hFill } = getPixelGeometry(gx, gy);
                if (color !== 'transparent') { ctx.fillStyle = color; ctx.fillRect(x, y, wFill, hFill); }
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#007BFF");
            });
            if (pixelInfo && !pendingPixels.length && canPaint) {
                const { x, y, w, h } = getPixelGeometry(pixelInfo.gx, pixelInfo.gy);
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#FF0000");
            }
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
        onMapUpdate();
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
                if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            }
        };
        updateCanvasSize();
        map.on("resize", updateCanvasSize);
        return () => map.off("resize", updateCanvasSize);
    }, [map]);

    return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 400, pointerEvents: "none", imageRendering: "pixelated" }} />;
};

export default GlobalCanvasGrid;