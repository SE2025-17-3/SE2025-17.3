// frontend/src/components/SoundSettings.jsx

import React from 'react';
import { useSound } from '../context/SoundContext';
import MapControlWrapper from './MapControlWrapper';

const SoundSettings = ({ isOpen, onToggle }) => {
    const { bgmMuted, setBgmMuted, bgmVolume, setBgmVolume, sfxMuted, setSfxMuted } = useSound();

    return (
        <MapControlWrapper className="top-52 right-4 flex flex-col items-end">
            <button
                onClick={onToggle}
                className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-transform active:scale-95 mb-2 ${isOpen ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white hover:bg-gray-100'}`}
                title="Sound Settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
            </button>

            {isOpen && (
                <div className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-xl border border-gray-200 w-64 animate-fade-in-down cursor-default">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Âm thanh</h3>
                    
                    {/* Background Music Control */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-600">Nhạc nền ({bgmVolume}%)</span>
                            <button onClick={() => setBgmMuted(!bgmMuted)} className="text-xs text-blue-600 hover:underline">{bgmMuted ? '🔇 Bật lại' : '🔊 Tắt'}</button>
                        </div>
                        <input type="range" min="0" max="100" value={bgmVolume} onChange={(e) => setBgmVolume(Number(e.target.value))} disabled={bgmMuted} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>

                    {/* SFX Control */}
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                        <span className="text-xs font-semibold text-gray-600">Hiệu ứng (SFX)</span>
                        <button onClick={() => setSfxMuted(!sfxMuted)} className={`px-3 py-1 text-xs rounded-full font-bold transition-colors ${sfxMuted ? 'bg-gray-300 text-gray-600' : 'bg-green-500 text-white'}`}>{sfxMuted ? 'Đang Tắt' : 'Đang Bật'}</button>
                    </div>
                </div>
            )}
        </MapControlWrapper>
    );
};

export default SoundSettings;