import React, { useState } from 'react';
import './PaintControls.css'; // Đảm bảo bạn đã tạo file CSS này

// Component Bảng điều khiển màu sắc
const PaintControls = ({ selectedColor, onColorSelect }) => { // <-- Nhận 'onColorSelect'
    const [isPaletteVisible, setIsPaletteVisible] = useState(false);
    const colors = [
        '#FFFFFF', '#C2C2C2', '#858585', '#474747', '#000000', '#2E5094', '#3E8AE6',
        '#47D4E6', '#85E685', '#479447', '#3E8A3E', '#F7E63E', '#F7A63E', '#F76B3E',
        '#E63E3E', '#942E2E', '#E68585', '#B54794', '#853E8A'
    ];
    
    const handleColorSelect = (color) => {
        // Gọi hàm 'onColorSelect' đã nhận từ props
        if (typeof onColorSelect === 'function') {
             onColorSelect(color); 
        } else {
            console.error("Lỗi: prop 'onColorSelect' không phải là một hàm!");
        }
        setIsPaletteVisible(false);
    };

    return (
        <div className="paint-controls-container">
            {isPaletteVisible && (
                <div className="color-palette">
                    {colors.map(color => (
                        <button 
                            key={color} 
                            className="color-swatch" 
                            style={{ backgroundColor: color }} 
                            onClick={() => handleColorSelect(color)} 
                            title={color}
                        />
                    ))}
                </div>
            )}
            <button className="paint-button" onClick={() => setIsPaletteVisible(!isPaletteVisible)} title="Choose Color">
                <div className="current-color-display" style={{ backgroundColor: selectedColor }} />
                Paint
            </button>
        </div>
    );
};

export default PaintControls;