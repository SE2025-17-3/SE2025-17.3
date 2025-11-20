// frontend/src/App.jsx

import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Import các component
import GlobalCanvasGrid from './components/GlobalCanvasGrid.jsx';
import PaintControls from './components/PaintControls.jsx';
import AuthModal from './components/AuthModal.jsx';
import Profile from './components/Profile.jsx';
import VerificationModal from './components/VerificationModal.jsx';
// Import các hook và hằng số
import { useAuth } from './context/AuthContext.jsx';
import { useVerification } from './context/VerificationContext.jsx';
import { WORLD_BOUNDS } from './config/constants';

// --- SỬA ĐỔI CHÍNH Ở ĐÂY ---
// Component này quyết định hiển thị nút Đăng nhập hay Profile
const AuthControls = () => {
    const { isLoggedIn, user, openAuthModal } = useAuth();

    // Cấu trúc nhất quán: Luôn có một div bao bọc để định vị
    return (
        <div className="absolute top-4 right-4 z-[1000]">
            {isLoggedIn && user ? (
                // Nếu đã đăng nhập, hiển thị Profile bên trong div
                <Profile />
            ) : (
                // Nếu chưa, hiển thị nút Đăng nhập bên trong div
                <button
                    onClick={openAuthModal}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md"
                >
                    Đăng nhập
                </button>
            )}
        </div>
    );
};


// Component App chính (Không cần thay đổi)
const App = () => {
    const { isAuthModalOpen, closeAuthModal, openAuthModal } = useAuth();
    const { isVerificationRequired } = useVerification(); // <-- BỔ SUNG: Lấy trạng thái yêu cầu xác minh

    const [selectedColor, setSelectedColor] = useState('#000000');
    const [selectedPixel, setSelectedPixel] = useState(null);

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>

            {/* Hiển thị modal đăng nhập khi cần */}
            {isAuthModalOpen && <AuthModal onClose={closeAuthModal} />}

            {/* <-- BỔ SUNG: Hiển thị modal xác minh khi cần --> */}
            {isVerificationRequired && <VerificationModal />}

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
                />

                <GlobalCanvasGrid
                    selectedColor={selectedColor}
                    onLoginRequired={openAuthModal}
                    selectedPixel={selectedPixel}
                    onPixelSelect={setSelectedPixel}
                />

            </MapContainer>

            <AuthControls />

            <PaintControls
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
                selectedPixel={selectedPixel}
                onPixelSelect={setSelectedPixel}
                onLoginRequired={openAuthModal}
            />
        </div>
    );
};

export default App;