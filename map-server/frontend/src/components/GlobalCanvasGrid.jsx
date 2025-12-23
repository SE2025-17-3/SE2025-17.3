import React, { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { GRID_HEIGHT, GRID_WIDTH, WORLD_BOUNDS, CHUNK_SIZE, MIN_ZOOM_TO_SHOW_PIXELS } from "../config/constants";
import { useSocket } from "../context/SocketContext.jsx";
import api from "../services/api";
import { useSound } from "../context/SoundContext";
import { useOverlay } from "../context/OverlayContext"; 
import { useTeam } from "../context/TeamContext"; 
import { useAuth } from "../context/AuthContext";

const GlobalCanvasGrid = ({ selectedPixelColor, pendingPixels, setPendingPixels, onPixelClickForInfo, pixelInfo, canPaint, onZoomWarning, isPaletteVisible }) => {
    const map = useMap();
    const socket = useSocket();
    const { playSound } = useSound();
    const { isPickingMode } = useOverlay(); 
    const { currentTeam } = useTeam(); 
    const { user } = useAuth();
    
    // --- THAY ĐỔI 1: Thay vì lưu Map phẳng, ta lưu theo Chunk ---
    // Cấu trúc: { "chunkX:chunkY": Map<"gx:gy", color> }
    const chunksRef = useRef({}); 
    
    const hoveredRef = useRef(null);
    const canvasRef = useRef(null);
    
    // Lưu danh sách các chunk đang hiển thị để chỉ vẽ chúng
    const visibleChunkKeysRef = useRef([]);

    const loadedChunksRef = useRef(new Set());
    const abortControllerRef = useRef(null);
    const animationFrameId = useRef(null);
    const maxPendingPixels = 64;

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

    // --- Helper: Lấy Chunk Key từ tọa độ Grid ---
    const getChunkKey = (gx, gy) => {
        const cx = Math.floor(gx / CHUNK_SIZE);
        const cy = Math.floor(gy / CHUNK_SIZE);
        return `${cx}:${cy}`;
    };

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

                const currentEnergy = getCurrentEnergy();
                const isAlreadySelected = pendingPixels.some(p => p.gx === gx && p.gy === gy);

                if (!isAlreadySelected && currentEnergy <= 0) {
                    playSound('error');
                    alert("Hãy chờ hồi năng lượng!");
                    return;
                }

                if (!isAlreadySelected && pendingPixels.length >= currentEnergy) {
                    playSound('error');
                    alert(`Quá số lượng pixel có thể tô! (Năng lượng: ${currentEnergy})`);
                    return;
                }

                playSound('click'); 
                setPendingPixels((prev) => {
                    const existingIndex = prev.findIndex((p) => p.gx === gx && p.gy === gy);
                    if (existingIndex !== -1) {
                        if (prev[existingIndex].color === selectedPixelColor) return prev;
                        const newPending = [...prev];
                        newPending[existingIndex] = { ...prev[existingIndex], color: selectedPixelColor };
                        return newPending;
                    } else {
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
        
        let startChunkX = Math.floor(nw.gx / CHUNK_SIZE);
        let endChunkX = Math.floor(se.gx / CHUNK_SIZE);
        const startChunkY = Math.floor(nw.gy / CHUNK_SIZE);
        const endChunkY = Math.floor(se.gy / CHUNK_SIZE);
        
        const totalChunksX = Math.ceil(GRID_WIDTH / CHUNK_SIZE);
        if (endChunkX < startChunkX) { startChunkX = 0; endChunkX = totalChunksX - 1; }

        // Cập nhật danh sách chunk đang hiển thị để render
        const currentVisibleKeys = [];
        const chunksToLoad = [];

        for (let x = startChunkX; x <= endChunkX; x++) {
            for (let y = startChunkY; y <= endChunkY; y++) {
                const chunkKey = `${x}:${y}`;
                currentVisibleKeys.push(chunkKey); // Chunk này đang nhìn thấy

                if (!loadedChunksRef.current.has(chunkKey)) {
                    chunksToLoad.push({ x, y, key: chunkKey });
                }
            }
        }
        
        visibleChunkKeysRef.current = currentVisibleKeys;

        if (chunksToLoad.length === 0) return;

        const BATCH_SIZE = 5; // Giảm batch size để tránh nghẽn
        
        const processBatch = async (batch) => {
            try {
                const promises = batch.map(({ x, y, key }) =>
                    api.get(`/pixels/chunk/${x}/${y}`, { signal })
                       .then(res => ({ key, data: res.data }))
                       .catch(err => ({ key, error: err }))
                );
                
                const results = await Promise.all(promises);
                let loadedCount = 0;
                const colorCounts = {};
                
                results.forEach(result => {
                    if (!result) return;
                    if (result.error) {
                        loadedChunksRef.current.delete(result.key);
                        return;
                    }
                    const { key, data } = result;
                    if (!Array.isArray(data)) {
                        loadedChunksRef.current.delete(key);
                        return;
                    }
                    loadedChunksRef.current.add(key);
                    if (data.length === 0) return;
                    loadedCount += data.length;

                    // Khởi tạo Map cho chunk nếu chưa có
                    if (!chunksRef.current[key]) chunksRef.current[key] = new Map();

                    // Lưu dữ liệu vào chunk tương ứng
                    data.forEach(p => { 
                         colorCounts[p.color] = (colorCounts[p.color] || 0) + 1;
                         chunksRef.current[key].set(`${p.gx}:${p.gy}`, p.color);
                    });
                });

                if (loadedCount > 0) {
                    const colors = Object.entries(colorCounts)
                        .map(([c, n]) => `${c}:${n}`)
                        .join(', ');
                    console.log(`[pixels] loaded ${loadedCount} pixels; colors: ${colors}`);
                }
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

    // --- Xử lý Socket Realtime ---
    useEffect(() => {
        const updatePixelInChunk = (gx, gy, color) => {
            const chunkKey = getChunkKey(gx, gy);
            if (!chunksRef.current[chunkKey]) chunksRef.current[chunkKey] = new Map();
            
            if (color === 'transparent') {
                chunksRef.current[chunkKey].delete(`${gx}:${gy}`);
            } else {
                chunksRef.current[chunkKey].set(`${gx}:${gy}`, color);
            }
        };

        const handleNewPixel = (newPixel) => {
            if (newPixel && typeof newPixel.gx === "number") {
                updatePixelInChunk(newPixel.gx, newPixel.gy, newPixel.color);
            }
        };

        const handleBatchPixels = (batchData) => {
            if (Array.isArray(batchData)) {
                batchData.forEach(p => {
                    updatePixelInChunk(p.gx, p.gy, p.color);
                });
            }
        };

        const handleAreaWiped = ({ minX, maxX, minY, maxY }) => {
            // Logic xóa này hơi phức tạp với cấu trúc chunk, ta có thể clear cache và reload
            loadedChunksRef.current.clear();
            chunksRef.current = {};
            loadVisibleChunks(); // Reload lại màn hình hiện tại
        };

        socket.on("pixel_placed", handleNewPixel);
        socket.on("pixel_update_batch", handleBatchPixels);
        socket.on("area_wiped", handleAreaWiped);
        
        return () => {
            socket.off("pixel_placed", handleNewPixel);
            socket.off("pixel_update_batch", handleBatchPixels);
            socket.off("area_wiped", handleAreaWiped);
        };
    }, [socket, loadVisibleChunks]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: true });

        // Tối ưu: Tính toán trước các thông số không đổi
        const north = WORLD_BOUNDS.getNorth();
        const south = WORLD_BOUNDS.getSouth();
        const west = WORLD_BOUNDS.getWest();
        const east = WORLD_BOUNDS.getEast();
        const latRange = north - south;
        const lngStep = (east - west) / GRID_WIDTH;

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
            const latTL = north - (gy / GRID_HEIGHT) * latRange;
            const lngTL_raw = west + (gx * lngStep);
            
            // Xử lý wrap (bản đồ lặp lại)
            const centerLng = map.getCenter().lng;
            const shift = 360 * Math.round((centerLng - lngTL_raw) / 360);
            
            const pointTL = map.latLngToContainerPoint(L.latLng(latTL, lngTL_raw + shift));
            const pointBR = map.latLngToContainerPoint(L.latLng(north - ((gy + 1) / GRID_HEIGHT) * latRange, west + ((gx + 1) * lngStep) + shift));
            
            const width = Math.abs(pointBR.x - pointTL.x);
            const height = Math.abs(pointBR.y - pointTL.y);
            return { x: Math.floor(pointTL.x), y: Math.floor(pointTL.y), w: width, h: height, wFill: Math.ceil(width), hFill: Math.ceil(height) };
        };

        const drawCanvas = () => {
            const zoom = map.getZoom();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) {
                animationFrameId.current = requestAnimationFrame(drawCanvas);
                return;
            }

            // --- TỐI ƯU RENDER: CHỈ DUYỆT CÁC CHUNK ĐANG HIỂN THỊ ---
            const visibleKeys = visibleChunkKeysRef.current;
            
            for (const chunkKey of visibleKeys) {
                const chunkMap = chunksRef.current[chunkKey];
                if (!chunkMap) continue;

                for (const [key, color] of chunkMap) {
                    if (color === 'transparent') continue;
                    // key format "gx:gy"
                    const splitIdx = key.indexOf(':');
                    const gx = parseInt(key.substring(0, splitIdx));
                    const gy = parseInt(key.substring(splitIdx + 1));

                    const { x, y, wFill, hFill } = getPixelGeometry(gx, gy);
                    
                    // Culling cấp độ Pixel (kiểm tra xem pixel có nằm trong khung nhìn canvas không)
                    if (x > -wFill && y > -hFill && x < canvas.width && y < canvas.height) {
                        ctx.fillStyle = color;
                        ctx.fillRect(x, y, wFill, hFill);
                    }
                }
            }

            // Vẽ các pixel đang chọn (Pending)
            pendingPixels.forEach(({ gx, gy, color }) => {
                const { x, y, w, h, wFill, hFill } = getPixelGeometry(gx, gy);
                if (color !== 'transparent') { ctx.fillStyle = color; ctx.fillRect(x, y, wFill, hFill); }
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#007BFF");
            });

            // Vẽ pixel đang xem info
            if (pixelInfo && !pendingPixels.length && canPaint) {
                const { x, y, w, h } = getPixelGeometry(pixelInfo.gx, pixelInfo.gy);
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#FF0000");
            }

            // Vẽ con trỏ chuột
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
                // Buộc vẽ lại ngay lập tức
                visibleChunkKeysRef.current = []; 
                loadVisibleChunks();
            }
        };
        updateCanvasSize();
        map.on("resize", updateCanvasSize);
        return () => map.off("resize", updateCanvasSize);
    }, [map, loadVisibleChunks]);

    return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 400, pointerEvents: "none", imageRendering: "pixelated" }} />;
};

export default GlobalCanvasGrid;
