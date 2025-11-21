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
import Leaderboard from './components/Leaderboard.jsx';
import TeamModal from './components/TeamModal.jsx';
import TeamBadge from './components/TeamBadge.jsx';
// Import các hook và hằng số
import { useAuth } from './context/AuthContext.jsx';
import { useVerification } from './context/VerificationContext.jsx';
import { useTeam } from './context/TeamContext.jsx';
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
    const { isAuthModalOpen, closeAuthModal, openAuthModal, isLoggedIn } = useAuth();
    const { isVerificationRequired } = useVerification(); // <-- BỔ SUNG: Lấy trạng thái yêu cầu xác minh
    const { currentTeam } = useTeam();

    const [selectedColor, setSelectedColor] = useState('#000000');
    const [selectedPixel, setSelectedPixel] = useState(null);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>

            {/* Hiển thị modal đăng nhập khi cần */}
            {isAuthModalOpen && <AuthModal onClose={closeAuthModal} />}

            {/* <-- BỔ SUNG: Hiển thị modal xác minh khi cần --> */}
            {isVerificationRequired && <VerificationModal />}

            {/* Leaderboard Modal */}
            <Leaderboard
                isOpen={isLeaderboardOpen}
                onClose={() => setIsLeaderboardOpen(false)}
            />

            {/* Team Modal */}
            <TeamModal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                mode={currentTeam ? 'details' : 'list'}
            />

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

            {/* Leaderboard Button - positioned under profile */}
            <button
                onClick={() => setIsLeaderboardOpen(true)}
                className="absolute top-20 right-4 z-[900] bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                title="View Leaderboard"
            >
                <span className="text-xl">🏆</span>
                <span>Leaderboard</span>
            </button>

            {/* Team Button - positioned under leaderboard */}
            <button
                onClick={() => isLoggedIn ? setIsTeamModalOpen(true) : openAuthModal()}
                className="absolute top-36 right-4 z-[900] bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                title={currentTeam ? 'Manage Team' : 'Join Team'}
            >
                <span className="text-xl">👥</span>
                <span>{currentTeam ? currentTeam.name : 'Teams'}</span>
                {currentTeam && (
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                        {currentTeam.memberCount || 0}
                    </span>
                )}
            </button>

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