// frontend/src/components/PaintControls.jsx

import React, { useState } from 'react';
import './PaintControls.css';
import { useAuth } from '../context/AuthContext.jsx';
import { useVerification } from '../context/VerificationContext.jsx'; // <-- BỔ SUNG: 1. Import hook xác minh
import api from '../services/api';

const PaintControls = ({ selectedColor, onColorSelect, selectedPixel, onPixelSelect, onLoginRequired }) => {
    const [isPaletteVisible, setIsPaletteVisible] = useState(false);
    const { isLoggedIn } = useAuth();
    const { incrementPixelCount, isVerificationRequired } = useVerification(); // <-- BỔ SUNG: 2. Lấy hàm và state từ context

    const colors = [
        '#FFFFFF', '#C2C2C2', '#858585', '#474747', '#000000', '#2E5094', '#3E8AE6',
        '#47D4E6', '#85E685', '#479447', '#3E8A3E', '#F7E63E', '#F7A63E', '#F76B3E',
        '#E63E3E', '#942E2E', '#E68585', '#B54794', '#853E8A'
    ];

    const handleColorSelect = async (color) => {
        onColorSelect(color);

        // <-- BỔ SUNG: 3. Chặn hành động nếu đang cần xác minh -->
        if (isVerificationRequired) {
            alert('Vui lòng hoàn thành xác minh "Tôi không phải là robot" để tiếp tục.');
            return;
        }

        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tô màu!");
            onLoginRequired();
            return;
        }

        if (!selectedPixel) {
            alert("Vui lòng chọn một pixel trên bản đồ trước khi tô màu.");
            setIsPaletteVisible(false);
            return;
        }

        try {
            await api.post('/pixels', {
                gx: selectedPixel.gx,
                gy: selectedPixel.gy,
                color: color
            });

            // <-- BỔ SUNG: 4. GỌI BỘ ĐẾM SAU KHI TÔ MÀU THÀNH CÔNG -->
            incrementPixelCount();
            console.log("Pixel placed successfully. Counter has been incremented.");

        } catch (err) {
            console.error("❌ Lỗi khi gửi pixel:", err.response?.data?.message || err.message);
        }

        onPixelSelect(null);
        setIsPaletteVisible(false);
    };

    const handlePaintButtonClick = () => {
        setIsPaletteVisible(!isPaletteVisible);
    };

    return (
        <div className="paint-controls-container">
            {isPaletteVisible && (
                <div className="color-palette">
                    {colors.map(colorSwatch => (
                        <button
                            key={colorSwatch}
                            className={`color-swatch ${selectedColor === colorSwatch ? 'selected' : ''}`}
                            style={{ backgroundColor: colorSwatch }}
                            onClick={() => handleColorSelect(colorSwatch)}
                            title={colorSwatch}
                        />
                    ))}
                </div>
            )}
            <button className="paint-button" onClick={handlePaintButtonClick} title="Choose Color">
                <div className="current-color-display" style={{ backgroundColor: selectedColor }} />
                Paint
            </button>
        </div>
    );
};

export default PaintControls;