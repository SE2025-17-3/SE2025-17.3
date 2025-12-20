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

    // State lưu trữ pixel
    const [pixels, setPixels] = useState(new Map());
    const [hovered, setHovered] = useState(null);

    // Refs quản lý hiệu năng
    const canvasRef = useRef(null);
    const loadedChunksRef = useRef(new Set());
    const abortControllerRef = useRef(null);
    const animationFrameId = useRef(null);

    const maxPendingPixels = 64;

    // --- 1. HELPER: LAT/LNG -> GRID ---
    const latLngToGrid = useCallback((latlng) => {
        const wrappedLng = L.Util.wrapNum(latlng.lng, [-180, 180], true);

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

        return {
            gx: Math.max(0, Math.min(gx, GRID_WIDTH - 1)),
            gy: Math.max(0, Math.min(gy, GRID_HEIGHT - 1))
        };
    }, []);

    // --- 2. XỬ LÝ CLICK ---
    const handleInteraction = useCallback((e) => {
            if (e.latlng.lat > WORLD_BOUNDS.getNorth() || e.latlng.lat < WORLD_BOUNDS.getSouth()) return;

            const { gx, gy } = latLngToGrid(e.latlng);

            if (pendingPixels.length > 0 || isPaletteVisible) {
                if (!canPaint) {
                    if (onZoomWarning) onZoomWarning();
                    return;
                }

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
                            alert("Đã đạt giới hạn chọn cùng lúc.");
                            return prev;
                        }
                    }
                });
            } else {
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

    // --- 4. LOAD DATA TỪ API ---
    // --- 4. LOAD DATA TỪ API (DEBUG VERSION) ---
    // --- LOAD DATA TỪ API (PHIÊN BẢN SIÊU DEBUG) ---
    // --- LOAD DATA TỪ API (PHIÊN BẢN SIÊU DEBUG) ---
    const loadVisibleChunks = useCallback(async () => {
        const zoom = map.getZoom();

        // CHECKPOINT 1: Kiểm tra Zoom
        console.log(`🚀 [1] Hàm loadVisibleChunks đã chạy! Zoom: ${zoom}`);

        if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) {
            console.log(`🛑 Zoom quá nhỏ (cần >= ${MIN_ZOOM_TO_SHOW_PIXELS}), dừng tải.`);
            return;
        }

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const bounds = map.getBounds().pad(0.1);
        const nw = latLngToGrid(bounds.getNorthWest());
        const se = latLngToGrid(bounds.getSouthEast());

        // Tính toán chunk
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
                // TẠM THỜI BỎ QUA CACHE ĐỂ DEBUG (Luôn tải lại)
                // if (!loadedChunksRef.current.has(chunkKey)) {
                loadedChunksRef.current.add(chunkKey);
                chunksToLoad.push({ x, y, key: chunkKey });
                // }
            }
        }

        // CHECKPOINT 2: Kiểm tra số lượng chunk cần tải
        console.log(`📦 [2] Cần tải ${chunksToLoad.length} chunks.`);

        if (chunksToLoad.length === 0) return;

        try {
            const promises = chunksToLoad.map(({ x, y }) =>
                api.get(`/pixels/chunk/${x}/${y}`, { signal })
                    .then(res => {
                        // CHECKPOINT 3: Kiểm tra dữ liệu thô từ API
                        // Quan trọng: Kiểm tra xem nó có phải là mảng không?
                        const isArr = Array.isArray(res.data);
                        console.log(`📡 [3] API Chunk ${x}:${y} -> Status: ${res.status}, Là mảng? ${isArr}, Số lượng: ${isArr ? res.data.length : 'N/A'}`);

                        // Nếu không phải mảng, in ra xem nó là cái quái gì
                        if (!isArr) console.warn("⚠️ API trả về không phải mảng:", res.data);

                        return res.data;
                    })
                    .catch(err => {
                        if (err.name !== 'CanceledError' && err.code !== "ERR_CANCELED") {
                            console.error(`❌ [Lỗi tải] Chunk ${x}:${y}`, err.message);
                        }
                        return null;
                    })
            );

            const results = await Promise.all(promises);

            const newPixels = new Map();
            let pixelCount = 0;

            results.forEach(chunkData => {
                if (Array.isArray(chunkData)) {
                    chunkData.forEach(p => {
                        newPixels.set(`${p.gx}:${p.gy}`, p.color);
                        pixelCount++;
                    });
                }
            });

            // CHECKPOINT 4: Kết quả tổng hợp
            console.log(`📊 [4] Tổng hợp được ${pixelCount} pixels.`);

            if (pixelCount > 0) {
                setPixels(prev => {
                    const merged = new Map(prev);
                    newPixels.forEach((val, key) => merged.set(key, val));
                    console.log(`💾 [5] State updated thành công! Tổng pixel hiển thị: ${merged.size}`);
                    return merged;
                });
            } else {
                console.log("⚠️ [5] Không có pixel nào để update (pixelCount = 0)");
            }

        } catch (error) {
            console.error("🔥 Lỗi nghiêm trọng:", error);
        }
    }, [map, latLngToGrid]);

    // --- 5. EVENTS (QUAN TRỌNG: ĐÃ BỎ SỰ KIỆN SPAM) ---
    useEffect(() => {
        map.on("click", handleInteraction);
        map.on("mousemove", handleMove);
        return () => {
            map.off("click", handleInteraction);
            map.off("mousemove", handleMove);
        };
    }, [map, handleInteraction, handleMove]);

    useEffect(() => {
        // SỬA LỖI: Chỉ load khi DỪNG kéo hoặc DỪNG zoom
        const events = "moveend zoomend";
        map.on(events, loadVisibleChunks);

        // Load lần đầu
        loadVisibleChunks();

        return () => map.off(events, loadVisibleChunks);
    }, [map, loadVisibleChunks]);

    // --- 6. SOCKET ---
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

    // --- 7. RENDER CANVAS (AN TOÀN) ---
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
            const lngBR_raw = west + ((gx + 1) * lngStep);

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
                w: width, h: height,
                wFill: Math.ceil(width) + 1,
                hFill: Math.ceil(height) + 1
            };
        };

        const drawCanvas = () => {
            const zoom = map.getZoom();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) return;

            // 1. Vẽ Pixel đã load
            pixels.forEach((color, key) => {
                if (color === 'transparent') return;
                const [gx, gy] = key.split(":").map(Number);
                const { x, y, wFill, hFill } = getPixelGeometry(gx, gy);


                // Nới lỏng điều kiện vẽ (Buffer 100px) để không bị mất pixel ở mép
                if (x > -100 && y > -100 && x < canvas.width + 100 && y < canvas.height + 100) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, wFill, hFill);
                }
            });

            // 2. Vẽ Pending Pixels
            pendingPixels.forEach(({ gx, gy, color }) => {
                const { x, y, w, h, wFill, hFill } = getPixelGeometry(gx, gy);
                if (color !== 'transparent') {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, wFill, hFill);
                }
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#007BFF");
            });

            // 3. Vẽ Highlight Pixel info
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

        // Vẫn lắng nghe move/zoom để VẼ LẠI canvas liên tục (cho mượt)
        // Nhưng KHÔNG gọi API ở đây
        map.on("move zoom moveend zoomend", onMapUpdate);
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
                position: "absolute", top: 0, left: 0,
                zIndex: 400, pointerEvents: "none",
                imageRendering: "pixelated"
            }}
        />
    );
};

export default GlobalCanvasGrid;
