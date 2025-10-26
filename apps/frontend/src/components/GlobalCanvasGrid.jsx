import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import io from 'socket.io-client';
import L from 'leaflet';
import { getChunkData, postPixel } from '../services/pixelService';
import {
  SOCKET_URL, GRID_HEIGHT, GRID_WIDTH, WORLD_BOUNDS,
  CHUNK_SIZE, MIN_ZOOM_TO_SHOW_PIXELS
} from '../config/mapConfig';

const socket = io(SOCKET_URL);

const GlobalCanvasGrid = () => {
  const map = useMap();
  const [pixels, setPixels] = useState(new Map());
  const canvasRef = useRef(null);
  const loadedChunksRef = useRef(new Set());

  const latLngToGrid = useCallback((latlng) => {
    const gx = Math.floor(((latlng.lng - WORLD_BOUNDS.getWest()) / (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest())) * GRID_WIDTH);
    const gy = Math.floor(((latlng.lat - WORLD_BOUNDS.getSouth()) / (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth())) * GRID_HEIGHT);
    return { gx, gy };
  }, []);

  const loadVisibleChunks = useCallback(() => {
    if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;

    const bounds = map.getBounds();
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();

    const { gx: gx_min, gy: gy_max } = latLngToGrid(nw);
    const { gx: gx_max, gy: gy_min } = latLngToGrid(se);

    const chunkX_min = Math.floor(gx_min / CHUNK_SIZE);
    const chunkX_max = Math.floor(gx_max / CHUNK_SIZE);
    const chunkY_min = Math.floor(gy_min / CHUNK_SIZE);
    const chunkY_max = Math.floor(gy_max / CHUNK_SIZE);

    for (let x = chunkX_min; x <= chunkX_max; x++) {
      for (let y = chunkY_min; y <= chunkY_max; y++) {
        const chunkKey = `${x}:${y}`;
        if (!loadedChunksRef.current.has(chunkKey)) {
          loadedChunksRef.current.add(chunkKey);
          getChunkData(x, y).then(chunkData => {
            setPixels(prev => {
              const newMap = new Map(prev);
              chunkData.forEach(p => newMap.set(`${p.gx}:${p.gy}`, p.color));
              return newMap;
            });
          });
        }
      }
    }
  }, [map, latLngToGrid]);

  useEffect(() => {
    map.on('moveend', loadVisibleChunks);
    loadVisibleChunks();
    return () => map.off('moveend', loadVisibleChunks);
  }, [map, loadVisibleChunks]);

  useEffect(() => {
    const handleNewPixel = (newPixel) => {
      setPixels(prev => new Map(prev).set(`${newPixel.gx}:${newPixel.gy}`, newPixel.color));
    };
    socket.on('pixel_placed', handleNewPixel);
    return () => socket.off('pixel_placed', handleNewPixel);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;

      const mapBounds = map.getBounds();
      pixels.forEach((color, key) => {
        const [gx, gy] = key.split(':').map(Number);
        const lat1 = WORLD_BOUNDS.getSouth() + (gy / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
        const lng1 = WORLD_BOUNDS.getWest() + (gx / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
        const latLng1 = L.latLng(lat1, lng1);
        if (mapBounds.contains(latLng1)) {
          const lat2 = WORLD_BOUNDS.getSouth() + ((gy + 1) / GRID_HEIGHT) * (WORLD_BOUNDS.getNorth() - WORLD_BOUNDS.getSouth());
          const lng2 = WORLD_BOUNDS.getWest() + ((gx + 1) / GRID_WIDTH) * (WORLD_BOUNDS.getEast() - WORLD_BOUNDS.getWest());
          const latLng2 = L.latLng(lat2, lng2);
          const screenPoint1 = map.latLngToContainerPoint(latLng1);
          const screenPoint2 = map.latLngToContainerPoint(latLng2);
          const pixelWidth = screenPoint2.x - screenPoint1.x;
          const pixelHeight = screenPoint2.y - screenPoint1.y;
          if (pixelWidth > 0.5) {
            ctx.fillStyle = color;
            ctx.fillRect(screenPoint1.x, screenPoint1.y, pixelWidth, pixelHeight);
          }
        }
      });
    };
    map.on('moveend', draw);
    draw();
    return () => map.off('moveend', draw);
  }, [map, pixels]);

  useEffect(() => {
    const handleClick = (e) => {
      if (map.getZoom() < MIN_ZOOM_TO_SHOW_PIXELS) return;
      if (WORLD_BOUNDS.contains(e.latlng)) {
        const { gx, gy } = latLngToGrid(e.latlng);
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        postPixel(gx, gy, randomColor);
      }
    };
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, latLngToGrid]);

  return (
    <canvas
      ref={canvasRef}
      width={map.getSize().x}
      height={map.getSize().y}
      style={{ position: 'relative', zIndex: 400 }}
    />
  );
};

export default GlobalCanvasGrid;
