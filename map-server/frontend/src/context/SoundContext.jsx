// map-server/frontend/src/context/SoundContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const SoundContext = createContext();

export const useSound = () => useContext(SoundContext);

export const SoundProvider = ({ children }) => {
    // --- SỬA Ở ĐÂY (CÁCH 2) ---
    // Luôn đặt là true (Mute) khi mới vào trang.
    // Người dùng muốn nghe thì phải tự bấm nút bật trong Menu Âm thanh.
    const [bgmMuted, setBgmMuted] = useState(true);

    // Các state khác vẫn lấy từ localStorage bình thường
    const [bgmVolume, setBgmVolume] = useState(() => parseFloat(localStorage.getItem('bgm_volume') || '40')); 
    const [sfxMuted, setSfxMuted] = useState(() => localStorage.getItem('sfx_muted') === 'true');

    const bgmRef = useRef(null);
    const sfxRef = useRef({});

    // 1. Khởi tạo file âm thanh
    useEffect(() => {
        const bgm = new Audio('/sounds/bgm.mp3');
        bgm.loop = true;
        bgmRef.current = bgm;

        sfxRef.current = {
            place: new Audio('/sounds/place.mp3'),
            color: new Audio('/sounds/color.mp3'),
            click: new Audio('/sounds/click.mp3'),
            error: new Audio('/sounds/error.mp3'),
        };

        return () => {
            bgm.pause();
            bgmRef.current = null;
        };
    }, []);

    // 2. Xử lý logic Phát/Dừng nhạc nền
    useEffect(() => {
        const bgm = bgmRef.current;
        if (!bgm) return;

        bgm.volume = bgmVolume / 100;

        if (bgmMuted) {
            bgm.pause();
        } else {
            // Khi người dùng đã bấm nút bật (bgmMuted = false), 
            // thì lúc đó đã có tương tác click, nên play() sẽ thành công.
            bgm.play().catch(error => {
                console.log("Không thể phát nhạc:", error);
                setBgmMuted(true); // Nếu vẫn lỗi thì tắt lại
            });
        }

        // Vẫn lưu vào localStorage để tham khảo (nếu sau này muốn dùng lại)
        localStorage.setItem('bgm_muted', bgmMuted);
        localStorage.setItem('bgm_volume', bgmVolume);
    }, [bgmMuted, bgmVolume]);

    // 3. Xử lý SFX
    useEffect(() => {
        localStorage.setItem('sfx_muted', sfxMuted);
    }, [sfxMuted]);

    const playSound = useCallback((type) => {
        if (sfxMuted) return; 
        const audio = sfxRef.current[type];
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 1.0; 
            audio.play().catch(() => {});
        }
    }, [sfxMuted]);

    return (
        <SoundContext.Provider value={{ 
            bgmMuted, setBgmMuted, 
            bgmVolume, setBgmVolume, 
            sfxMuted, setSfxMuted, 
            playSound 
        }}>
            {children}
        </SoundContext.Provider>
    );
};