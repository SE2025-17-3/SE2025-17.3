// frontend/src/components/GlobalCanvasGrid.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
                              isPaletteVisible
                          }) => {
    const map = useMap();
    const socket = useSocket();

    const [pixels, setPixels] = useState(new Map());
    const [hovered, setHovered] = useState(null);

    const canvasRef = useRef(null);
    const loadedChunksRef = useRef(new Set());
    const abortControllerRef = useRef(null); // Quản lý hủy request
    const animationFrameId = useRef(null);

    const maxPendingPixels = 64;

    // --- HELPER: Chuyển LatLng -> Grid Coordinates ---
    // Dùng useCallback để không bị tạo lại mỗi lần render
    const latLngToGrid = useCallback((latlng) => {
        // Xử lý wrap kinh độ (-180 -> 180)
        const wrappedLng = L.Util.wrapNum(latlng.lng, [-180, 180], true);

        // Kẹp vĩ độ trong giới hạn thế giới
        const clampedLat = Math.max(
            WORLD_BOUNDS.getSouth(),
            Math.min(WORLD_BOUNDS.getNorth(), latlng.lat)
        );

        // Tính toán tỷ lệ
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

    // --- 1. XỬ LÝ CLICK/INTERACTION ---
    const handleInteraction = useCallback((e) => {
            // Bỏ qua nếu click ngoài biên giới thế giới
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
                        // Nếu click lại pixel cũ với màu giống hệt -> không làm gì
                        if (prev[existingIndex].color === selectedPixelColor) return prev;
                        // Update màu mới
                        const newPending = [...prev];
                        newPending[existingIndex] = { ...prev[existingIndex], color: selectedPixelColor };
                        return newPending;
                    } else {
                        // Thêm mới
                        if (prev.length < maxPendingPixels) {
                            return [...prev, { gx, gy, color: selectedPixelColor }];
                        } else {
                            alert("Đã đạt giới hạn chọn cùng lúc.");
                            return prev;
                        }
                    }
                });
            } else {
                // Mode xem info
                if (canPaint) {
                    onPixelClickForInfo({ gx, gy });
                } else {
                    if (onZoomWarning) onZoomWarning();
                }
            }
        },
        [canPaint, latLngToGrid, pendingPixels, selectedPixelColor, setPendingPixels, onPixelClickForInfo, onZoomWarning, isPaletteVisible]
    );

    // --- 2. XỬ LÝ HOVER (Mouse Move) ---
    const handleMove = useCallback((e) => {
        if (!canPaint || map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) {
            if (hovered !== null) setHovered(null);
            return;
        }
        const gridPos = latLngToGrid(e.latlng);
        // Chỉ update state nếu tọa độ thực sự thay đổi (giảm render thừa)
        setHovered((prev) => {
            if (prev && prev.gx === gridPos.gx && prev.gy === gridPos.gy) return prev;
            return gridPos;
        });
    }, [canPaint, latLngToGrid, hovered, map]);

    // --- 3. LOAD DATA TỪ API (Đã tối ưu AbortController) ---
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
        const bounds = map.getBounds().pad(0.1); // Load dư ra 1 chút để mượt
        const nw = latLngToGrid(bounds.getNorthWest());
        const se = latLngToGrid(bounds.getSouthEast());

        let startX = Math.floor(nw.gx / CHUNK_SIZE);
        let endX = Math.floor(se.gx / CHUNK_SIZE);
        const chunkY_min = Math.floor(nw.gy / CHUNK_SIZE);
        const chunkY_max = Math.floor(se.gy / CHUNK_SIZE);

        // Xử lý trường hợp map wrap qua kinh tuyến 180
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

        try {
            // Gọi API song song (Concurrent Requests)
            const promises = chunksToLoad.map(({ x, y }) =>
                api.get(`/pixels/chunk/${x}/${y}`, { signal })
                    .then(res => ({ data: res.data }))
                    .catch(err => {
                        if (err.name === 'CanceledError' || err.code === "ERR_CANCELED") return null;
                        loadedChunksRef.current.delete(`${x}:${y}`); // Xóa cache nếu lỗi để thử lại sau
                        return null;
                    })
            );

            const results = await Promise.all(promises);

            // Update state một lần duy nhất để tránh re-render nhiều lần
            const newPixels = new Map();
            let hasNewData = false;

            results.forEach(res => {
                if (res && Array.isArray(res.data)) {
                    hasNewData = true;
                    res.data.forEach(p => {
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

    // --- Effects: Events Map ---
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

    // --- Effects: Socket Realtime ---
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

    // --- 4. RENDER CANVAS (ANTI-LAG & OPTIMIZED) ---
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: true }); // alpha: true mặc định, nhưng ghi rõ cho chắc

        // Hàm vẽ khung bracket (dấu ngoặc bao quanh pixel)
        const drawBracketCursor = (ctx, x, y, w, h, mainColor) => {
            const strokeWidth = Math.max(2, Math.min(w * 0.15, 4)); // Giảm max stroke để đỡ thô
            const cornerLen = Math.max(2, w * 0.3);

            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            // Vẽ viền trắng (shadow)
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = strokeWidth + 2;
            drawPath(ctx, x, y, w, h, cornerLen);
            ctx.stroke();

            // Vẽ màu chính
            ctx.beginPath();
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = strokeWidth;
            drawPath(ctx, x, y, w, h, cornerLen);
            ctx.stroke();
        };

        const drawPath = (ctx, x, y, w, h, L) => {
            ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y); // Top-Left
            ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L); // Top-Right
            ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h); // Bottom-Right
            ctx.moveTo(x, y + h - L); ctx.lineTo(x, y + h); ctx.lineTo(x + L, y + h); // Bottom-Left
        };

        // Hàm tính toán hình học pixel trên màn hình
        const getPixelGeometry = (gx, gy) => {
            // Tính toán Lat/Lng boundary của pixel
            const north = WORLD_BOUNDS.getNorth();
            const south = WORLD_BOUNDS.getSouth();
            const west = WORLD_BOUNDS.getWest();
            const east = WORLD_BOUNDS.getEast();

            const latTL = north - (gy / GRID_HEIGHT) * (north - south);
            const latBR = north - ((gy + 1) / GRID_HEIGHT) * (north - south);

            const lngStep = (east - west) / GRID_WIDTH;
            const lngTL_raw = west + (gx * lngStep);
            const lngBR_raw = west + ((gx + 1) * lngStep);

            // Xử lý wrap kinh độ (để vẽ đúng khi map lặp lại)
            const centerLng = map.getCenter().lng;
            const shift = 360 * Math.round((centerLng - lngTL_raw) / 360);

            const pointTL = map.latLngToContainerPoint(L.latLng(latTL, lngTL_raw + shift));
            const pointBR = map.latLngToContainerPoint(L.latLng(latBR, lngBR_raw + shift));

            const width = Math.abs(pointBR.x - pointTL.x);
            const height = Math.abs(pointBR.y - pointTL.y);

            // Cộng thêm một chút (0.6) để tránh các khe hở nhỏ giữa các pixel (sub-pixel rendering)
            return {
                x: Math.floor(pointTL.x),
                y: Math.floor(pointTL.y),
                w: Math.ceil(width),
                h: Math.ceil(height),
                wFill: Math.ceil(width) + 0.6,
                hFill: Math.ceil(height) + 0.6
            };
        };

        const drawCanvas = () => {
            const zoom = map.getZoom();

            // Clear toàn bộ canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (zoom < MIN_ZOOM_TO_SHOW_PIXELS) return;

            // --- OPTIMIZATION: VIEW CULLING ---
            // Chỉ vẽ những pixel nằm trong viewport hiện tại
            // Chuyển bounds màn hình sang Grid Coordinates
            const bounds = map.getBounds();
            const nw = latLngToGrid(bounds.getNorthWest());
            const se = latLngToGrid(bounds.getSouthEast());

            // Xác định giới hạn vòng lặp
            // Lưu ý: latLngToGrid trả về gx, gy đã clamp trong 0..MAX
            const minGx = nw.gx;
            const maxGx = se.gx; // Cần xử lý wrap nếu map nhìn thấy cả 2 mép (để đơn giản ta lấy min/max)
            const minGy = nw.gy;
            const maxGy = se.gy;

            // 1. Vẽ các pixel đã load (Chỉ vẽ cái nào trong màn hình)
            pixels.forEach((color, key) => {
                if (color === 'transparent') return;

                // Parse key cực nhanh
                const split = key.split(":");
                const gx = parseInt(split[0]);
                const gy = parseInt(split[1]);

                // Culling Check: Nếu pixel nằm ngoài màn hình -> Bỏ qua
                // (Đây là bước giúp tăng FPS cực mạnh)
                // Logic wrap: nếu view bao trùm cả map thì vẽ hết, còn không thì check biên
                // Đơn giản hóa: Vẽ tất nếu zoom nhỏ, check kỹ nếu zoom lớn
                // Ở đây ta check cơ bản:
                // Lưu ý: với leaflet world copy, gx có thể cần vẽ ở nhiều nơi, nhưng ta tạm tính bản chính

                const { x, y, wFill, hFill } = getPixelGeometry(gx, gy);

                // Check lần 2: Tọa độ màn hình có nằm trong canvas không?
                if (x > -wFill && y > -hFill && x < canvas.width && y < canvas.height) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, wFill, hFill);
                }
            });

            // 2. Vẽ Pending Pixels (Luôn vẽ)
            pendingPixels.forEach(({ gx, gy, color }) => {
                const { x, y, w, h, wFill, hFill } = getPixelGeometry(gx, gy);
                if (x > -50 && y > -50 && x < canvas.width + 50 && y < canvas.height + 50) {
                    if (color !== 'transparent') {
                        ctx.fillStyle = color;
                        ctx.fillRect(x, y, wFill, hFill);
                    }
                    if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#007BFF"); // Màu xanh dương
                }
            });

            // 3. Vẽ Pixel Info Highlight
            if (pixelInfo && !pendingPixels.length && canPaint) {
                const { x, y, w, h } = getPixelGeometry(pixelInfo.gx, pixelInfo.gy);
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "#FF0000"); // Màu đỏ
            }

            // 4. Vẽ Hover
            if (hovered) {
                const { x, y, w, h } = getPixelGeometry(hovered.gx, hovered.gy);
                if (w >= 0.5) drawBracketCursor(ctx, x, y, w, h, "rgba(0, 0, 0, 0.8)");
            }
        };

        // Dùng requestAnimationFrame để vẽ mượt theo tần số quét màn hình
        const onMapUpdate = () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = requestAnimationFrame(drawCanvas);
        };

        // Lắng nghe các sự kiện map để vẽ lại
        map.on("move zoom moveend zoomend", onMapUpdate);

        // Vẽ frame đầu tiên
        onMapUpdate();

        return () => {
            map.off("move zoom moveend zoomend", onMapUpdate);
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [map, pixels, pendingPixels, pixelInfo, hovered, canPaint, latLngToGrid]);

    // --- Resize Canvas khi map thay đổi kích thước ---
    useEffect(() => {
        const canvas = canvasRef.current;
        const updateCanvasSize = () => {
            if (canvas) {
                const mapContainer = map.getContainer();
                canvas.width = mapContainer.clientWidth;
                canvas.height = mapContainer.clientHeight;
                // Trigger vẽ lại ngay lập tức sau khi resize
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
                pointerEvents: "none", // Để click xuyên qua canvas xuống map
                imageRendering: "pixelated" // Giúp pixel sắc nét không bị mờ
            }}
        />
    );
};

export default GlobalCanvasGrid;