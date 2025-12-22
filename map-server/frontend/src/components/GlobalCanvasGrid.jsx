// map-server/frontend/src/components/GlobalCanvasGrid.jsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { GRID_HEIGHT, GRID_WIDTH, WORLD_BOUNDS, CHUNK_SIZE, MIN_ZOOM_TO_SHOW_PIXELS } from "../config/constants";
import { useSocket } from "../context/SocketContext.jsx";
import api from "../services/api";
import { useSound } from "../context/SoundContext";
import { useOverlay } from "../context/OverlayContext"; 
import { useTeam } from "../context/TeamContext"; 
// --- THÊM IMPORT useAuth ---
import { useAuth } from "../context/AuthContext";

const GlobalCanvasGrid = ({ selectedPixelColor, pendingPixels, setPendingPixels, onPixelClickForInfo, pixelInfo, canPaint, onZoomWarning, isPaletteVisible }) => {
    const map = useMap();
    const socket = useSocket();
    const { playSound } = useSound();
    const { isPickingMode } = useOverlay(); 
    const { currentTeam } = useTeam(); 
    // --- LẤY USER ĐỂ TÍNH NĂNG LƯỢNG ---
    const { user } = useAuth();
    
    const pixelsRef = useRef(new Map());
    const hoveredRef = useRef(null);
    const canvasRef = useRef(null);
    const [, setForceUpdate] = useState(0); 

    const loadedChunksRef = useRef(new Set());
    const abortControllerRef = useRef(null);
    const animationFrameId = useRef(null);
    const maxPendingPixels = 64;

    // Helper tính năng lượng thời gian thực (giống PaintControls)
    const getCurrentEnergy = () => {
        if (!user) return 0;
        const lastUpdate = new Date(user.lastEnergyUpdate).getTime();
        const now = Date.now();
        if (isNaN(lastUpdate)) return user.energy;
        
        const RECHARGE_RATE_MS = 30 * 1000;
        const elapsedMs = now - lastUpdate;
        const gained = Math.floor(elapsedMs / RECHARGE_RATE_MS);
        return Math.min(user.maxEnergy, user.energy + gained);
    };

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

            // Logic khi đang tô màu (đã mở bảng màu hoặc đang chọn)
            if (pendingPixels.length > 0 || isPaletteVisible) {
                if (!canPaint) { playSound('error'); if (onZoomWarning) onZoomWarning(); return; }

                // --- LOGIC KIỂM TRA NĂNG LƯỢNG MỚI ---
                const currentEnergy = getCurrentEnergy();
                
                // Kiểm tra xem pixel này đã được chọn chưa
                const isAlreadySelected = pendingPixels.some(p => p.gx === gx && p.gy === gy);

                // 1. Nếu chưa chọn pixel này, mà năng lượng = 0 -> Báo lỗi
                if (!isAlreadySelected && currentEnergy <= 0) {
                    playSound('error');
                    alert("Hãy chờ hồi năng lượng!");
                    return;
                }

                // 2. Nếu chưa chọn pixel này, mà số lượng đã chọn >= năng lượng hiện có -> Báo lỗi
                if (!isAlreadySelected && pendingPixels.length >= currentEnergy) {
                    playSound('error');
                    alert(`Quá số lượng pixel có thể tô! (Năng lượng: ${currentEnergy})`);
                    return;
                }
                // ----------------------------------------

                playSound('click'); 
                setPendingPixels((prev) => {
                    const existingIndex = prev.findIndex((p) => p.gx === gx && p.gy === gy);
                    if (existingIndex !== -1) {
                        // Nếu click lại vào pixel đã chọn -> cập nhật màu mới
                        if (prev[existingIndex].color === selectedPixelColor) return prev;
                        const newPending = [...prev];
                        newPending[existingIndex] = { ...prev[existingIndex], color: selectedPixelColor };
                        return newPending;
                    } else {
                        // Thêm pixel mới vào danh sách
                        if (prev.length < maxPendingPixels) { 
                            return [...prev, { gx, gy, color: selectedPixelColor }]; 
                        } else { 
                            playSound('error'); 
                            alert("Đạt giới hạn chọn tối đa (64)."); 
                            return prev; 
                        }
                    }
                });
            } else {
                // Xem thông tin pixel
                if (canPaint) { 
                    playSound('click'); 
                    if (onPixelClickForInfo) onPixelClickForInfo({ gx, gy }); 
                } 
                else { playSound('error'); if (onZoomWarning) onZoomWarning(); }
            }
        }, [canPaint, latLngToGrid, pendingPixels, selectedPixelColor, setPendingPixels, onPixelClickForInfo, onZoomWarning, isPaletteVisible, playSound, isPickingMode, currentTeam, socket, user] 
    );

    const handleMove = useCallback((e) => {
        if (!canPaint || map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) { 
            hoveredRef.current = null;
            return; 
        }
        const gridPos = latLngToGrid(e.latlng);
        hoveredRef.current = gridPos;
    }, [canPaint, latLngToGrid, map]);

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
                if (!loadedChunksRef.current.has(chunkKey)) {
                    loadedChunksRef.current.add(chunkKey);
                    chunksToLoad.push({ x, y, key: chunkKey });
                }
            }
        }
        
        if (chunksToLoad.length === 0) return;

        const BATCH_SIZE = 10;
        
        const processBatch = async (batch) => {
            try {
                const promises = batch.map(({ x, y }) =>
                    api.get(`/pixels/chunk/${x}/${y}`, { signal })
                       .then(res => res.data)
                       .catch(err => {
                           if (err.response && err.response.status !== 404 && err.name !== 'CanceledError') {
                               console.warn(`Failed chunk ${x},${y}`);
                           }
                           return null;
                       })
                );
                
                const results = await Promise.all(promises);
                results.forEach(chunkData => {
                    if (Array.isArray(chunkData)) {
                        chunkData.forEach(p => { 
                            pixelsRef.current.set(`${p.gx}:${p.gy}`, p.color);
                        });
                    }
                });
            } catch (err) {}
        };

        for (let i = 0; i < chunksToLoad.length; i += BATCH_SIZE) {
            if (signal.aborted) break;
            const batch = chunksToLoad.slice(i, i + BATCH_SIZE);
            await processBatch(batch);
        }

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

    useEffect(() => {
        const handleNewPixel = (newPixel) => {
            if (newPixel && typeof newPixel.gx === "number" && typeof newPixel.gy === "number") {
                if (newPixel.color === 'transparent') pixelsRef.current.delete(`${newPixel.gx}:${newPixel.gy}`);
                else pixelsRef.current.set(`${newPixel.gx}:${newPixel.gy}`, newPixel.color);
            }
        };

        const handleBatchPixels = (batchData) => {
            if (Array.isArray(batchData)) {
                batchData.forEach(p => {
                    if (p.color === 'transparent') pixelsRef.current.delete(`${p.gx}:${p.gy}`);
                    else pixelsRef.current.set(`${p.gx}:${p.gy}`, p.color);
                });
            }
        };

        const handleAreaWiped = ({ minX, maxX, minY, maxY }) => {
            for (const key of pixelsRef.current.keys()) {
                const [gxStr, gyStr] = key.split(':');
                const gx = parseInt(gxStr);
                const gy = parseInt(gyStr);
                if (gx >= minX && gx <= maxX && gy >= minY && gy <= maxY) {
                    pixelsRef.current.delete(key);
                }
            }
            setForceUpdate(prev => prev + 1);
        };

        socket.on("pixel_placed", handleNewPixel);
        socket.on("pixel_update_batch", handleBatchPixels);
        socket.on("area_wiped", handleAreaWiped);
        
        return () => {
            socket.off("pixel_placed", handleNewPixel);
            socket.off("pixel_update_batch", handleBatchPixels);
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
            
            if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) {
                animationFrameId.current = requestAnimationFrame(drawCanvas);
                return;
            }

            for (const [key, color] of pixelsRef.current) {
                if (color === 'transparent') continue;
                const splitIdx = key.indexOf(':');
                const gx = parseInt(key.substring(0, splitIdx));
                const gy = parseInt(key.substring(splitIdx + 1));

                const { x, y, wFill, hFill } = getPixelGeometry(gx, gy);
                if (x > -100 && y > -100 && x < canvas.width + 100 && y < canvas.height + 100) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, wFill, hFill);
                }
            }

            pendingPixels.forEach(({ gx, gy, color }) => {
                const { x, y, w, h, wFill, hFill } = getPixelGeometry(gx, gy);
                if (color !== 'transparent') { ctx.fillStyle = color; ctx.fillRect(x, y, wFill, hFill); }
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#007BFF");
            });

            if (pixelInfo && !pendingPixels.length && canPaint) {
                const { x, y, w, h } = getPixelGeometry(pixelInfo.gx, pixelInfo.gy);
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#FF0000");
            }

            if (hoveredRef.current) {
                const { gx, gy } = hoveredRef.current;
                const { x, y, w, h } = getPixelGeometry(gx, gy);
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "rgba(0, 0, 0, 0.5)");
            }

            animationFrameId.current = requestAnimationFrame(drawCanvas);
        };

        drawCanvas();
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [map, pendingPixels, pixelInfo, canPaint]);

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

    return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 400, pointerEvents: "none", imageRendering: "pixelated" }} />;
};

export default GlobalCanvasGrid;