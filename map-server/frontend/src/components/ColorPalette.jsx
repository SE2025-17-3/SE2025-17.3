import React from 'react';
import './ColorPalette.css'; // File CSS để tạo kiểu dáng

// Danh sách các màu bạn muốn hiển thị
const COLORS = [
  '#FFFFFF', '#C1C1C1', '#EF130B', '#FF7100', '#FFE400', '#00CC00',
  '#00B2FF', '#231FD3', '#A300BA', '#D37CAA', '#A0522D', '#000000',
  // Thêm các màu khác nếu muốn
];

/**
 * Component bảng màu.
 * @param {object} props
 * @param {string} props.selectedColor - Màu hiện đang được chọn.
 * @param {function(string): void} props.onColorSelect - Hàm callback khi một màu được chọn.
 */
const ColorPalette = ({ selectedColor, onColorSelect }) => {
  return (
    <div className="color-palette">
      {COLORS.map((color) => (
        <div
          key={color}
          className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onColorSelect(color)}
          title={color} // Hiển thị mã màu khi hover
        />
      ))}
    </div>
  );
};

export default ColorPalette;