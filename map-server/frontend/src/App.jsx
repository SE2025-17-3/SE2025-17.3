import React, { useState } from 'react'; // Import useState
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Import các component con
import GlobalCanvasGrid from './components/GlobalCanvasGrid.jsx'; 
import PaintControls from './components/PaintControls.jsx'; 
import { WORLD_BOUNDS } from './config/constants'; // Import hằng số từ file config

// COMPONENT APP CHÍNH
const App = () => {
    // Quản lý màu đã chọn ở đây
    const [selectedColor, setSelectedColor] = useState('#000000'); 

    return (
        // Thêm div bao ngoài để Map và Bảng màu có thể xếp chồng lên nhau
        <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
            <MapContainer
                center={[20, 0]} 
                zoom={2} 
                style={{ height: '100%', width: '100%', background: '#f0f0f0' }}
                minZoom={2} 
                maxZoom={20} 
                maxBounds={WORLD_BOUNDS} 
                maxBoundsViscosity={1.0} 
                worldCopyJump={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    noWrap={true}
                />
                
                {/* Truyền màu đã chọn xuống canvas */}
                <GlobalCanvasGrid selectedColor={selectedColor} />
                
            </MapContainer>
            
            {/* Hiển thị bảng màu */}
            <PaintControls 
                selectedColor={selectedColor} 
                onColorSelect={setSelectedColor} // <-- SỬA LỖI Ở DÒNG NÀY
            />
        </div>
    );
};

export default App;