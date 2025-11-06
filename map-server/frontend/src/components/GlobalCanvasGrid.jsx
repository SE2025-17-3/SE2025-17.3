// frontend/src/components/GlobalCanvasGrid.jsx

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
import { useAuth } from "../context/AuthContext.jsx";
import { useVerification } from "../context/VerificationContext.jsx";
import api from "../services/api";

const GlobalCanvasGrid = ({ onLoginRequired, selectedPixel, onPixelSelect }) => {
    const map = useMap();
    const socket = useSocket();
    const { isLoggedIn } = useAuth();
    const { isVerificationRequired } = useVerification();

    const [pixels, setPixels] = useState(new Map());
    const canvasRef = useRef(null);
    const loadedChunksRef = useRef(new Set());

    // --- Hàm chuyển đổi tọa độ ---
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

    // --- Hàm tải chunks ---
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

    // --- Các useEffect ---
    useEffect(() => {
        map.on("moveend zoomend", loadVisibleChunks);
        loadVisibleChunks();
        return () => {
            map.off("moveend zoomend", loadVisibleChunks);
        };
    }, [map, loadVisibleChunks]);

    useEffect(() => {
        const handleNewPixel = (newPixel) => {
            if (newPixel && typeof newPixel.gx === 'number' && typeof newPixel.gy === 'number' && newPixel.color) {
                setPixels((prev) => new Map(prev).set(`${newPixel.gx}:${newPixel.gy}`, newPixel.color));
            }
        };
        socket.on("pixel_placed", handleNewPixel);
        return () => socket.off("pixel_placed", handleNewPixel);
    }, [socket]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

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
            pixels.forEach((color, key) => {
                const [gx, gy] = key.split(":").map(Number);
                const { bounds, screenPoint1, width, height } = getPixelGeometry(gx, gy);
                if (mapBounds.intersects(bounds) && width >= 0.5) {
                    ctx.fillStyle = color;
                    ctx.fillRect(Math.round(screenPoint1.x), Math.round(screenPoint1.y), Math.ceil(width), Math.ceil(height));
                }
            });

            if (selectedPixel) {
                const { gx, gy } = selectedPixel;
                const { bounds, screenPoint1, width, height } = getPixelGeometry(gx, gy);
                if (mapBounds.intersects(bounds) && width >= 0.5) {
                    ctx.strokeStyle = '#007BFF';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(Math.round(screenPoint1.x) - 1, Math.round(screenPoint1.y) - 1, Math.ceil(width) + 2, Math.ceil(height) + 2);
                }
            }
        };

        map.on("moveend zoomend", drawCanvas);
        drawCanvas();
        return () => {
            map.off("moveend zoomend", drawCanvas);
        };
    }, [map, pixels, selectedPixel]);

    useEffect(() => {
        const handleClick = (e) => {
            if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;

            if (!isLoggedIn) {
                alert("Bạn cần đăng nhập để chọn và tô màu!");
                onLoginRequired();
                return;
            }

            if (isVerificationRequired) {
                alert('Vui lòng hoàn thành xác minh "Tôi không phải là robot" để tiếp tục.');
                return;
            }

            if (WORLD_BOUNDS.contains(e.latlng)) {
                const { gx, gy } = latLngToGrid(e.latlng);
                onPixelSelect({ gx, gy });
            }
        };
        map.on("click", handleClick);
        return () => map.off("click", handleClick);
    }, [map, latLngToGrid, isLoggedIn, onLoginRequired, onPixelSelect, isVerificationRequired]);

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