import React, { useState } from 'react';
<<<<<<< HEAD
import './PaintControls.css';
import { useAuth } from '../context/AuthContext.jsx'; // <-- Import useAuth
import api from '../services/api'; // <-- Import api service

// --- SỬA ĐỔI: Nhận thêm props 'selectedPixel' và 'onPixelSelect' ---
const PaintControls = ({ selectedColor, onColorSelect, selectedPixel, onPixelSelect, onLoginRequired }) => {
    const [isPaletteVisible, setIsPaletteVisible] = useState(false);
    const { isLoggedIn } = useAuth(); // Lấy trạng thái đăng nhập

=======
import './PaintControls.css'; // Đảm bảo bạn đã tạo file CSS này

// Component Bảng điều khiển màu sắc
const PaintControls = ({ selectedColor, onColorSelect }) => { // <-- Nhận 'onColorSelect'
    const [isPaletteVisible, setIsPaletteVisible] = useState(false);
>>>>>>> develop
    const colors = [
        '#FFFFFF', '#C2C2C2', '#858585', '#474747', '#000000', '#2E5094', '#3E8AE6',
        '#47D4E6', '#85E685', '#479447', '#3E8A3E', '#F7E63E', '#F7A63E', '#F76B3E',
        '#E63E3E', '#942E2E', '#E68585', '#B54794', '#853E8A'
    ];
    
<<<<<<< HEAD
    // --- SỬA ĐỔI: Logic khi click vào một màu (XÁC NHẬN TÔ MÀU) ---
    const handleColorSelect = async (color) => {
        // 1. Cập nhật màu được chọn (UI)
        onColorSelect(color); 
        
        // 2. Kiểm tra xem đã đăng nhập chưa
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tô màu!");
            onLoginRequired();
            return;
        }

        // 3. Kiểm tra xem đã chọn pixel chưa
        if (!selectedPixel) {
            alert("Vui lòng chọn một pixel trên bản đồ trước khi tô màu.");
            setIsPaletteVisible(false); // Đóng bảng màu
            return;
        }

        // 4. Gửi request tô màu lên server
        try {
            console.log(`⬆️ Gửi pixel: (${selectedPixel.gx}, ${selectedPixel.gy}) - ${color}`);
            await api.post('/pixels', { 
                gx: selectedPixel.gx, 
                gy: selectedPixel.gy, 
                color: color // Gửi màu vừa click
            });
            // (Socket.IO event sẽ tự động cập nhật canvas)
        } catch (err) {
            console.error("❌ Lỗi khi gửi pixel:", err.response?.data?.message || err.message);
        }

        // 5. Reset lựa chọn và đóng bảng màu
        onPixelSelect(null); // Xóa pixel đã chọn
        setIsPaletteVisible(false); // Đóng bảng màu
    };

    // --- SỬA ĐỔI: Logic của nút "Paint" chính ---
    // Giờ đây nó chỉ bật/tắt bảng màu
    const handlePaintButtonClick = () => {
        setIsPaletteVisible(!isPaletteVisible);
=======
    const handleColorSelect = (color) => {
        // Gọi hàm 'onColorSelect' đã nhận từ props
        if (typeof onColorSelect === 'function') {
             onColorSelect(color); 
        } else {
            console.error("Lỗi: prop 'onColorSelect' không phải là một hàm!");
        }
        setIsPaletteVisible(false);
>>>>>>> develop
    };

    return (
        <div className="paint-controls-container">
            {isPaletteVisible && (
                <div className="color-palette">
<<<<<<< HEAD
                    {colors.map(colorSwatch => (
                        <button 
                            key={colorSwatch} 
                            className={`color-swatch ${selectedColor === colorSwatch ? 'selected' : ''}`} // Thêm class 'selected'
                            style={{ backgroundColor: colorSwatch }} 
                            onClick={() => handleColorSelect(colorSwatch)} 
                            title={colorSwatch}
=======
                    {colors.map(color => (
                        <button 
                            key={color} 
                            className="color-swatch" 
                            style={{ backgroundColor: color }} 
                            onClick={() => handleColorSelect(color)} 
                            title={color}
>>>>>>> develop
                        />
                    ))}
                </div>
            )}
<<<<<<< HEAD
            <button className="paint-button" onClick={handlePaintButtonClick} title="Choose Color">
=======
            <button className="paint-button" onClick={() => setIsPaletteVisible(!isPaletteVisible)} title="Choose Color">
>>>>>>> develop
                <div className="current-color-display" style={{ backgroundColor: selectedColor }} />
                Paint
            </button>
        </div>
    );
};

<<<<<<< HEAD
export default PaintControls;
=======
export default PaintControls;
>>>>>>> develop
