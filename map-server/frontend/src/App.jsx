// map-server/frontend/src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

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
import ZoomWarningToast from './components/ZoomWarningToast.jsx';
import FavoriteMarkers from './components/FavoriteMarkers.jsx';
import LocationButton from './components/LocationButton.jsx';
import MapControlWrapper from './components/MapControlWrapper.jsx';

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
const IconGrid = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
  </svg>
);

const IconCart = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 .001 3.999A2 2 0 0 0 17 18zM6.2 6h13.6l-1.4 7.2a2 2 0 0 1-2 1.6H8.1a2 2 0 0 1-2-1.6L4.4 2H2V0h3.6l.6 3z" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.5 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7 2a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zM2 22v-1.5A6.5 6.5 0 0 1 8.5 14h0A6.5 6.5 0 0 1 15 20.5V22H2zm13 0v-1.2a6.9 6.9 0 0 0-2.3-5 6.4 6.4 0 0 1 8.3 6.2V22h-6z" />
  </svg>
);

const IconChart = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3h2v18H3V3zm6 8h2v10H9V11zm6-5h2v15h-2V6zm6 9h2v6h-2v-6z" />
  </svg>
);

const IconHeat = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2s4 3.5 4 7.5A4 4 0 1 1 8 9.5C8 5.5 12 2 12 2zm0 8.5c-1.1 1-2 2.4-2 3.8a2 2 0 1 0 4 0c0-1.4-.9-2.8-2-3.8z" />
  </svg>
);

const IconLogin = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm1 5h-2v4H7v2h4v4h2v-4h4v-2h-4V8z" />
  </svg>
);

const RailButton = ({ onClick, title, badge, active, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`control-button${active ? ' is-active' : ''}`}
    title={title}
  >
    {children}
    {badge ? <span className="control-badge">{badge}</span> : null}
  </button>
);
const AuthControls = () => {
  const { isLoggedIn, user, openAuthModal } = useAuth();
  return (
    <div className="rail-section">
      {isLoggedIn && user ? (
        <Profile compact />
      ) : (
        <RailButton onClick={openAuthModal} title="Dang nhap">
          <IconLogin />
        </RailButton>
      )}
    </div>
  );
};

const AuxiliaryButtons = ({
  openLeaderboard,
  openTeamModal,
  openStore,
  isHeatmapOn,
  setIsHeatmapOn,
  pendingCount
}) => (
  <div className="rail-section">
    <RailButton
      onClick={() => setIsHeatmapOn(!isHeatmapOn)}
      title={isHeatmapOn ? 'Tat nhiet' : 'Bat nhiet'}
      active={isHeatmapOn}
    >
      <IconHeat />
    </RailButton>
    <RailButton onClick={openTeamModal} title="Team">
      <IconUsers />
    </RailButton>
    <RailButton onClick={openLeaderboard} title="Leaderboard">
      <IconChart />
    </RailButton>
    <RailButton onClick={openStore} title="Store" badge={pendingCount > 0 ? pendingCount : null}>
      <IconCart />
    </RailButton>
    <RailButton onClick={openStore} title="Market">
      <IconGrid />
    </RailButton>
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
      <div className="app-shell">
        {isAuthModalOpen && <AuthModal onClose={closeAuthModal} />}
        {isVerificationRequired && <VerificationModal />}
        {isAppealModalOpen && <AppealModal onClose={() => setIsAppealModalOpen(false)} />}

        {isPixelInfoModalOpen && pixelInfo && (
            <PixelInfoModal pixel={pixelInfo} onClose={() => setIsPixelInfoModalOpen(false)} onStartMultiPaint={handleStartPaint} />
        )}

        {showZoomWarning && (
            <ZoomWarningToast message="🔍 Phóng to thêm để tô màu!" onClose={() => setShowZoomWarning(false)} />
        )}

        <div id="map-capture-area" style={{ height: '100%' }}>
          <MapContainer
              center={[0, 0]}
              zoom={DEFAULT_ZOOM}
              maxZoom={20}
              style={{ height: '100%', backgroundColor: '#aad3df' }}
              worldCopyJump={true}
              preferCanvas
              maxBounds={VISUAL_BOUNDS} 
              maxBoundsViscosity={1.0}
          >
            <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
            
            <MapUrlHandler />
            <MapInitializer />
            <MapZoomController setCanPaint={setCanPaint} />

            <OverlayLayer />
            <OverlayMapHandler />
            <PingLayer currentTeamId={currentTeam?._id} />
            <HeatmapLayer visible={isHeatmapOn} />
            <AdminAreaSelector isActive={isWipeMode} onComplete={() => setIsWipeMode(false)} onCancel={() => setIsWipeMode(false)} />

            <GlobalCanvasGrid
                selectedPixelColor={selectedPixelColor}
                pendingPixels={pendingPixels}
                setPendingPixels={setPendingPixels}
                canPaint={canPaint}
                onZoomWarning={() => setShowZoomWarning(true)}
                isPaletteVisible={isPaletteVisible}
                onPixelClickForInfo={handlePixelClick}
                pixelInfo={pixelInfo}
            />
            <FavoriteMarkers favorites={favorites} />
        <MapControlWrapper className="right-rail" style={{ zIndex: 1200 }}>
          <AuthControls />
          <AuxiliaryButtons
            openLeaderboard={() => setIsLeaderboardOpen(true)}
            openTeamModal={() => setIsTeamModalOpen(true)}
            openStore={() => setIsStoreOpen(true)}
            isHeatmapOn={isHeatmapOn}
            setIsHeatmapOn={setIsHeatmapOn}
            pendingCount={pendingPixels.length}
          />
          <ChallengePanel inline />
          <SoundSettings isOpen={isSoundOpen} onToggle={() => setIsSoundOpen(!isSoundOpen)} inline />
          <OverlayMenu isOpen={isOverlayOpen} onToggle={() => setIsOverlayOpen(!isOverlayOpen)} inline />
          <LocationButton inline />
        </MapControlWrapper>

          </MapContainer>
        </div>

        <ChatBox />
        <AdminManager onStartWipe={() => setIsWipeMode(true)} />



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
