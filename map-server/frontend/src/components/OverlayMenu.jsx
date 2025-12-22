// frontend/src/components/OverlayMenu.jsx

import React from 'react';
import { useOverlay } from '../context/OverlayContext';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import MapControlWrapper from './MapControlWrapper'; 
import { GRID_HEIGHT, GRID_WIDTH } from '../config/constants';

const OverlayMenu = ({ isOpen, onToggle }) => {
  const { overlayData, updateOverlay, isPickingMode, setIsPickingMode } = useOverlay();
  const { currentTeam } = useTeam();
  const { user } = useAuth();

  const isLeader = user && currentTeam && user._id === currentTeam.createdBy;
  
  if (!isLeader) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' || type === 'range' ? Number(value) : value;
    updateOverlay({ [name]: val });
  };

  const adjustWidth = (delta) => {
    updateOverlay({ width: overlayData.width + delta });
  };

  // --- TÍNH NĂNG: SNAP TO GRID (Làm tròn tọa độ) ---
  const handleSnapToGrid = () => {
    updateOverlay({
        x: Math.round(overlayData.x),
        y: Math.round(overlayData.y)
    });
  };

  // --- TÍNH NĂNG: FORCE 1:1 SCALE ---
  const handleForcePixelPerfect = () => {
    if (!overlayData.url) return;
    const img = new Image();
    img.onload = () => {
        updateOverlay({
            width: img.naturalWidth,
            aspectRatio: img.naturalHeight / img.naturalWidth
        });
    };
    img.src = overlayData.url;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Lấy kích thước thật của ảnh
            const realWidth = img.naturalWidth;
            const realHeight = img.naturalHeight;
            const aspectRatio = realHeight / realWidth;

            // Tính vị trí trung tâm màn hình (Làm tròn)
            const centerX = Math.round(GRID_WIDTH / 2);
            const centerY = Math.round(GRID_HEIGHT / 2);
            
            // Căn tâm ảnh vào giữa và làm tròn
            const startX = Math.round(centerX - (realWidth / 2));
            const startY = Math.round(centerY - (realHeight / 2));

            updateOverlay({ 
                url: event.target.result, 
                // Tự động set 1:1 Pixel Scale
                width: realWidth, 
                x: startX,
                y: startY,
                aspectRatio: aspectRatio, 
                visible: true 
            });
            
            // Tắt chế độ chọn để người dùng xem ảnh trước
            setIsPickingMode(false); 
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <MapControlWrapper className="top-64 right-4 flex flex-col items-end">
      <button
        onClick={onToggle}
        className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-transform active:scale-95 mb-2
          ${isPickingMode ? 'bg-yellow-400 text-black animate-pulse' : (isOpen ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white hover:bg-gray-100')}`}
        title="Team Template Overlay"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-2xl border border-gray-200 w-80 animate-fade-in-down cursor-default">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-sm font-bold text-gray-700">Team Template</h3>
            <button 
                onClick={() => updateOverlay({ visible: !overlayData.visible })} 
                className={`text-xs font-bold px-3 py-1 rounded ${overlayData.visible ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
            >
                {overlayData.visible ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="space-y-4 text-sm">
            {/* Upload */}
            <div>
              <label className="block text-gray-600 mb-1 font-semibold text-xs uppercase tracking-wide">Upload Image</label>
              <label className="flex items-center justify-center w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
                <span className="font-medium text-xs">Choose Image...</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Position Picker & Snap */}
            <div className={`p-3 rounded-lg border transition-colors ${isPickingMode ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-gray-700 text-xs uppercase">Position</label>
                    <div className="flex gap-2">
                        {/* NÚT SNAP */}
                        <button 
                            onClick={handleSnapToGrid}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold hover:bg-indigo-200 transition-colors"
                            title="Làm tròn tọa độ để khớp lưới"
                        >
                            🧲 Snap
                        </button>
                        <button 
                            onClick={() => setIsPickingMode(!isPickingMode)} 
                            className={`px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors ${isPickingMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                        >
                            {isPickingMode ? 'Stop' : 'Pick'}
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <input type="number" name="x" value={Math.round(overlayData.x)} onChange={handleChange} className="w-1/2 p-2 text-center text-gray-500 bg-gray-100 border rounded text-xs font-mono" placeholder="X" />
                    <input type="number" name="y" value={Math.round(overlayData.y)} onChange={handleChange} className="w-1/2 p-2 text-center text-gray-500 bg-gray-100 border rounded text-xs font-mono" placeholder="Y" />
                </div>
            </div>

            {/* Size & Opacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-gray-500 text-[10px] font-bold uppercase">Width (px)</label>
                    {/* NÚT 1:1 */}
                    <button onClick={handleForcePixelPerfect} className="text-[9px] text-blue-500 hover:underline font-bold">⚡ 1:1</button>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => adjustWidth(-1)} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-l font-bold">-</button>
                    <input type="number" name="width" value={Math.round(overlayData.width)} onChange={handleChange} className="w-full border-t border-b p-1 text-xs text-center font-mono" />
                    <button onClick={() => adjustWidth(1)} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-r font-bold">+</button>
                  </div>
              </div>
              <div>
                  <label className="block text-gray-500 mb-1 text-[10px] font-bold uppercase">Opacity</label>
                  <input type="range" name="opacity" min="0" max="1" step="0.1" value={overlayData.opacity} onChange={handleChange} className="w-full h-7 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </MapControlWrapper>
  );
};

export default OverlayMenu;