// map-server/frontend/src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/* ================= COMPONENTS ================= */
import GlobalCanvasGrid from './components/GlobalCanvasGrid.jsx';
import PaintControls from './components/PaintControls.jsx';
import AuthModal from './components/AuthModal.jsx';
import Profile from './components/Profile.jsx';
import VerificationModal from './components/VerificationModal.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import TeamModal from './components/TeamModal.jsx';
import PixelInfoModal from './components/PixelInfoModal.jsx';
import ShareModal from './components/ShareModal.jsx';
import ZoomToPaintButton from './components/ZoomToPaintButton.jsx';
import TeamBadge from './components/TeamBadge.jsx';
import ZoomWarningToast from './components/ZoomWarningToast.jsx';
import FavoriteMarkers from './components/FavoriteMarkers.jsx';
import LocationButton from './components/LocationButton.jsx';

/* Admin / Advanced */
import OverlayLayer from './components/OverlayLayer.jsx';
import OverlayMenu from './components/OverlayMenu.jsx';
import SoundSettings from './components/SoundSettings.jsx';
import OverlayMapHandler from './components/OverlayMapHandler.jsx';
import PingLayer from './components/PingLayer.jsx';
import ChatBox from './components/ChatBox.jsx';
import HeatmapLayer from './components/HeatmapLayer.jsx';
import AdminAreaSelector from './components/AdminAreaSelector.jsx';
import AdminManager from './components/AdminManager.jsx'; 
import AppealModal from './components/AppealModal.jsx';

/* Store & Challenge */
import ChallengePanel from './components/ChallengePanel.jsx';
import Store from './components/Store.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import NotificationToast from './components/NotificationToast.jsx';

/* ================= CONTEXTS & SERVICES ================= */
import { useAuth } from './context/AuthContext.jsx';
import { useVerification } from './context/VerificationContext.jsx';
import { useTeam } from './context/TeamContext.jsx';
import { getPixelDetail } from './services/pixelApi';

/* ================= CONFIG ================= */
import {
  WORLD_BOUNDS,
  VISUAL_BOUNDS,
  MIN_ZOOM_TO_SHOW_PIXELS,
  GRID_WIDTH,
  GRID_HEIGHT,
  DEFAULT_ZOOM,
  PIXEL_DETAIL_ZOOM,
  ZOOM_TO_PAINT
} from './config/constants';

/* ================= HELPERS ================= */
const gridToLatLng = (gx, gy) => {
  const north = WORLD_BOUNDS.getNorth();
  const south = WORLD_BOUNDS.getSouth();
  const east = WORLD_BOUNDS.getEast();
  const west = WORLD_BOUNDS.getWest();

  const latStep = (north - south) / GRID_HEIGHT;
  const lngStep = (east - west) / GRID_WIDTH;

  const latTop = north - (gy / GRID_HEIGHT) * (north - south);
  const lngLeft = west + (gx / GRID_WIDTH) * (east - west);

  return [latTop - latStep / 2, lngLeft + lngStep / 2];
};

const MapUrlHandler = () => {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const params = new URLSearchParams(window.location.search);
    const gx = params.get('gx');
    const gy = params.get('gy');
    if (gx && gy) {
      map.setView(gridToLatLng(+gx, +gy), PIXEL_DETAIL_ZOOM, { animate: false });
      done.current = true;
    }
  }, [map]);

  return null;
};

const MapInitializer = () => {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const fit = () => {
      const z = map.getBoundsZoom(WORLD_BOUNDS, true);
      map.setMinZoom(z);
      map.setMaxBounds(VISUAL_BOUNDS);
      if (map.getZoom() < z) {
          map.setView([0, 0], z, { animate: false });
      }
      initialized.current = true;
    };

    fit();
    map.on('resize', fit);
    return () => map.off('resize', fit);
  }, [map]);

  return null;
};

const MapZoomController = ({ setCanPaint }) => {
  const map = useMap();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      const ok = map.getZoom() >= MIN_ZOOM_TO_SHOW_PIXELS;
      setCanPaint(ok);
      setShow(!ok);
    };
    map.on('zoomend moveend', check);
    check();
    return () => map.off('zoomend moveend', check);
  }, [map, setCanPaint]);

  if (!show) return null;
  return <ZoomToPaintButton onClick={() => map.flyTo(map.getCenter(), ZOOM_TO_PAINT)} />;
};

/* ================= UI ================= */
const AuthControls = () => {
  const { isLoggedIn, user, openAuthModal } = useAuth();
  return (
    <div className="absolute top-4 right-4 z-[1200] auth-controls-ignore flex items-center gap-3">
      {isLoggedIn && user ? (
        <>
          <NotificationBell />
          <Profile />
        </>
      ) : (
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

const AuxiliaryButtons = ({ openLeaderboard, openTeamModal, currentTeam, openStore, isHeatmapOn, setIsHeatmapOn }) => (
    <div className="absolute top-16 right-4 z-[1000] flex flex-col gap-3 items-end aux-buttons-ignore">
      <button onClick={() => setIsHeatmapOn(!isHeatmapOn)} className={`px-4 py-2 rounded-lg font-bold ${isHeatmapOn ? 'bg-red-500 text-white' : 'bg-white text-gray-700'}`}>
        {isHeatmapOn ? '🔥 Tắt nhiệt' : '🌡️ Bản đồ nhiệt'}
      </button>
      {currentTeam ? <TeamBadge currentTeam={currentTeam} onClick={openTeamModal} /> : <button onClick={openTeamModal} className="px-4 py-2 bg-purple-500 text-white rounded-lg">Team</button>}
      <button onClick={openLeaderboard} className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Leaderboard</button>
      <button onClick={openStore} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">💧 Store</button>
    </div>
);

/* ================= MAIN APP ================= */
const App = () => {
  const { isAuthModalOpen, closeAuthModal, openAuthModal, isLoggedIn, user } = useAuth();
  const { isVerificationRequired } = useVerification();
  const { currentTeam } = useTeam();

  const [canPaint, setCanPaint] = useState(false);
  const [selectedPixelColor, setSelectedPixelColor] = useState('#000000');
  const [pendingPixels, setPendingPixels] = useState([]);
  const [isPaletteVisible, setIsPaletteVisible] = useState(false);
  
  const [pixelInfo, setPixelInfo] = useState(null);
  const [isPixelInfoModalOpen, setIsPixelInfoModalOpen] = useState(false);
  
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [isHeatmapOn, setIsHeatmapOn] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isWipeMode, setIsWipeMode] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);

  const [isSoundOpen, setIsSoundOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [showZoomWarning, setShowZoomWarning] = useState(false);

  // --- STATE ĐỂ QUẢN LÝ XEM CHI TIẾT TEAM ---
  const [viewingTeamId, setViewingTeamId] = useState(null);

  const handlePixelClick = async ({ gx, gy }) => {
    try {
      const detail = await getPixelDetail(gx, gy);
      setPixelInfo(detail);
      setIsPixelInfoModalOpen(true);
    } catch (err) { console.error("Lỗi lấy thông tin pixel:", err); }
  };

  const handleStartPaint = () => {
    if (!pixelInfo) return;
    setPendingPixels(prev => {
        const exists = prev.some(p => p.gx === pixelInfo.gx && p.gy === pixelInfo.gy);
        if (exists) return prev;
        return [...prev, { gx: pixelInfo.gx, gy: pixelInfo.gy, color: selectedPixelColor }];
    });
    setIsPixelInfoModalOpen(false);
    setIsPaletteVisible(true);
  };

  // --- HÀM XỬ LÝ KHI CLICK TEAM TRÊN LEADERBOARD ---
  const handleViewTeamDetails = (teamId) => {
    setViewingTeamId(teamId); // Lưu ID team cần xem
    setIsLeaderboardOpen(false); // Đóng leaderboard
    setIsTeamModalOpen(true); // Mở modal team
  };

  // --- HÀM ĐÓNG TEAM MODAL ---
  const handleCloseTeamModal = () => {
    setIsTeamModalOpen(false);
    setViewingTeamId(null); // Reset lại trạng thái
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      {/* Notification Toasts */}
      <NotificationToast />
      
      {isAuthModalOpen && <AuthModal onClose={closeAuthModal} />}
      {isVerificationRequired && <VerificationModal />}

      {zoomWarning && (
        <ZoomWarningToast
          message={zoomWarning}
          onClose={() => setZoomWarning(null)}
        />
      )}

      {isPixelInfoModalOpen && (
        <PixelInfoModal
          pixel={pixelInfo}
          onClose={() => setIsPixelInfoModalOpen(false)}
          onStartMultiPaint={handleStartMultiPaint}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={favorites.some((p) => p.gx === pixelInfo?.gx && p.gy === pixelInfo?.gy)}
          onShare={handleShare}
        />

        <SoundSettings isOpen={isSoundOpen} onToggle={() => setIsSoundOpen(!isSoundOpen)} />
        <OverlayMenu isOpen={isOverlayOpen} onToggle={() => setIsOverlayOpen(!isOverlayOpen)} />

        {/* --- CẬP NHẬT LEADERBOARD & TEAM MODAL --- */}
        {isLeaderboardOpen && (
            <Leaderboard 
                isOpen={isLeaderboardOpen} 
                onClose={() => setIsLeaderboardOpen(false)} 
                onTeamClick={handleViewTeamDetails} // Truyền hàm xử lý
            />
        )}
        
        {isTeamModalOpen && (
            <TeamModal 
                isOpen={isTeamModalOpen} 
                onClose={handleCloseTeamModal} // Dùng hàm đóng mới
                teamId={viewingTeamId} // Truyền ID team cần xem
                mode={viewingTeamId ? 'details' : 'list'} // Nếu có ID thì mở thẳng vào chi tiết
            />
        )}

        <ChallengePanel />
        <Store isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />

        {!isPixelInfoModalOpen && (
            <PaintControls
                selectedPixelColor={selectedPixelColor}
                setSelectedPixelColor={setSelectedPixelColor}
                pendingPixels={pendingPixels}
                setPendingPixels={setPendingPixels}
                canPaint={canPaint}
                onLoginRequired={openAuthModal}
                isPaletteVisible={isPaletteVisible}
                setIsPaletteVisible={setIsPaletteVisible}
                isPixelInfoModalOpen={isPixelInfoModalOpen}
            />
        )}
      </div>
  );
};

export default App;
