// map-server/frontend/src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';

// Components
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
import OverlayLayer from './components/OverlayLayer.jsx';
import OverlayMenu from './components/OverlayMenu.jsx';
import SoundSettings from './components/SoundSettings.jsx';
import OverlayMapHandler from './components/OverlayMapHandler.jsx'; 
import PingLayer from './components/PingLayer.jsx';
import ChatBox from './components/ChatBox.jsx'; 
import HeatmapLayer from './components/HeatmapLayer.jsx';
import AdminManager from './components/AdminManager.jsx';
import AppealModal from './components/AppealModal.jsx';
import AdminAreaSelector from './components/AdminAreaSelector.jsx';

// Services & Contexts
import { useAuth } from './context/AuthContext.jsx';
import { useVerification } from './context/VerificationContext.jsx';
import { useTeam } from './context/TeamContext.jsx';
import { getPixelDetail } from './services/pixelApi';

// Config
import {
  WORLD_BOUNDS,
  MIN_ZOOM_TO_SHOW_PIXELS,
  GRID_WIDTH,
  GRID_HEIGHT
} from './config/constants';

// --- HELPER FUNCTIONS & SUB-COMPONENTS ---
const gridToLatLng = (gx, gy) => {
  const north = WORLD_BOUNDS.getNorth();
  const south = WORLD_BOUNDS.getSouth();
  const east = WORLD_BOUNDS.getEast();
  const west = WORLD_BOUNDS.getWest();

  const latStep = (north - south) / GRID_HEIGHT;
  const lngStep = (east - west) / GRID_WIDTH;

  const latTop = north - (gy / GRID_HEIGHT) * (north - south);
  const lngLeft = west + (gx / GRID_WIDTH) * (east - west);

  const latCenter = latTop - latStep / 2;
  const lngCenter = lngLeft + lngStep / 2;

  return [latCenter, lngCenter];
};

const MapUrlHandler = () => {
  const map = useMap();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const gx = params.get('gx');
    const gy = params.get('gy');
    if (gx && gy) {
      const center = gridToLatLng(Number(gx), Number(gy));
      map.setView(center, 18, { animate: false });
      processedRef.current = true;
    }
  }, [map]);
  return null;
};

const MapInitializer = () => {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const hasCoords = params.get('gx') && params.get('gy');
    const adjustMinZoom = () => {
      const targetZoom = map.getBoundsZoom(WORLD_BOUNDS, false);
      map.setMinZoom(targetZoom);
      if (!initializedRef.current && !hasCoords) {
        map.fitBounds(WORLD_BOUNDS, { animate: false });
      }
      initializedRef.current = true;
    };
    adjustMinZoom();
    map.on('resize', () => {
      const targetZoom = map.getBoundsZoom(WORLD_BOUNDS, false);
      map.setMinZoom(targetZoom);
    });
    return () => { map.off('resize'); };
  }, [map]);
  return null;
};

const MapZoomController = ({ setCanPaint, onLoginRequired }) => {
  const map = useMap();
  const [showZoomTip, setShowZoomTip] = useState(false);

  useEffect(() => {
    const checkZoom = () => {
      const currentZoom = map.getZoom();
      const isZoomedIn = currentZoom >= MIN_ZOOM_TO_SHOW_PIXELS;
      setShowZoomTip(!isZoomedIn);
      setCanPaint(isZoomedIn);
    };
    map.on('zoomend moveend', checkZoom);
    checkZoom();
    return () => { map.off('zoomend moveend', checkZoom); };
  }, [map, setCanPaint]);

  const handleZoomInToPaint = () => {
    map.flyTo(map.getCenter(), MIN_ZOOM_TO_SHOW_PIXELS + 1, { duration: 1.5 });
  };

  if (!showZoomTip) return null;
  return <ZoomToPaintButton onClick={handleZoomInToPaint} />;
};

const AuthControls = () => {
  const { isLoggedIn, user, openAuthModal } = useAuth();
  return (
      <div className="absolute top-4 right-4 z-[1200] auth-controls-ignore">
        {isLoggedIn && user ? (
            <Profile />
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

const AuxiliaryButtons = ({ openLeaderboard, openTeamModal, currentTeam, isHeatmapOn, setIsHeatmapOn }) => {
  return (
      <div className="absolute top-16 right-4 z-[1000] flex flex-col gap-3 items-end aux-buttons-ignore">
        <button
            onClick={() => setIsHeatmapOn(!isHeatmapOn)}
            className={`px-4 py-2 font-bold rounded-lg shadow-md transition-colors ${
                isHeatmapOn ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            title="Toggle Heatmap"
        >
          {isHeatmapOn ? '🔥 Tắt Nhiệt' : '🌡️ Bản đồ nhiệt'}
        </button>

        {currentTeam ? (
            <TeamBadge onClick={openTeamModal} currentTeam={currentTeam} />
        ) : (
            <button
                onClick={() => openTeamModal()}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg shadow-md transition-colors"
            >
              Mở Teams
            </button>
        )}

        <button
            onClick={openLeaderboard}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg shadow-md transition-colors"
            title="Open Leaderboard"
        >
          Leaderboard
        </button>
      </div>
  );
};

// --- APP COMPONENT ---
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
  const [shareData, setShareData] = useState(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamModalMode, setTeamModalMode] = useState('list');
  const [zoomWarning, setZoomWarning] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [isHeatmapOn, setIsHeatmapOn] = useState(false);
  
  const [isOverlayMenuOpen, setIsOverlayMenuOpen] = useState(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [isWipeMode, setIsWipeMode] = useState(false); // <--- STATE MỚI: CHẾ ĐỘ XÓA

  // Load Favorites
  const getStorageKey = () => (user && user._id) ? `favorite_pixels_${user._id}` : 'favorite_pixels_guest';
  useEffect(() => {
    const key = getStorageKey();
    try {
      const raw = localStorage.getItem(key);
      setFavorites(raw ? JSON.parse(raw) : []);
    } catch { setFavorites([]); }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(favorites));
  }, [favorites, user]);

  // Handlers
  const handlePixelClickForInfo = async (coords) => {
    if (isWipeMode) return; // Không hiện info khi đang xóa
    setPixelInfo({ gx: coords.gx, gy: coords.gy, color: '#FFFFFF', user: 'Loading...' });
    setIsPixelInfoModalOpen(true);
    try {
      const detail = await getPixelDetail(coords.gx, coords.gy);
      setPixelInfo(detail);
    } catch (error) {
      console.error("Failed to fetch pixel detail", error);
      setPixelInfo((prev) => ({ ...prev, user: null }));
    }
  };

  const handleStartMultiPaint = () => {
    if (!pixelInfo) return;
    setPendingPixels([{ gx: pixelInfo.gx, gy: pixelInfo.gy, color: selectedPixelColor }]);
    setIsPaletteVisible(true);
    setIsPixelInfoModalOpen(false);
  };

  const handleToggleFavorite = (gx, gy) => {
    const key = `${gx}:${gy}`;
    setFavorites((prev) =>
        prev.some((p) => `${p.gx}:${p.gy}` === key)
            ? prev.filter((p) => `${p.gx}:${p.gy}` !== key)
            : [...prev, { gx, gy }]
    );
  };

  const handleShare = async ({ gx, gy }) => {
    try {
      const mapElement = document.getElementById('map-capture-area');
      if (!mapElement) return;

      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#AAD3DF',
        ignoreElements: (element) => {
          if (element.classList.contains('leaflet-control-container')) return true;
          if (element.classList.contains('auth-controls-ignore')) return true;
          if (element.classList.contains('aux-buttons-ignore')) return true;
          if (element.classList.contains('paint-controls-overlay')) return true;
          if (element.classList.contains('pixel-info-modal')) return true;
          return false;
        }
      });
      const imageDataUrl = canvas.toDataURL('image/png');
      const url = `${window.location.origin}?gx=${gx}&gy=${gy}`;
      setShareData({ gx, gy, url, imageDataUrl });
    } catch (error) {
      console.error("Lỗi khi chụp màn hình:", error);
      alert("Không thể tạo ảnh chụp bản đồ.");
    }
  };

  const openTeamModalDetails = () => {
    if (!isLoggedIn) { openAuthModal(); return; }
    setTeamModalMode(currentTeam ? 'details' : 'list');
    setIsTeamModalOpen(true);
  };

  const openLeaderboard = () => setIsLeaderboardOpen(true);
  const handleShowZoomWarning = () => setZoomWarning("Bạn cần phóng to (Zoom in) để chọn Pixel.");

  return (
      <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
        {isAuthModalOpen && <AuthModal onClose={closeAuthModal} />}
        {isVerificationRequired && <VerificationModal />}
        {isAppealModalOpen && <AppealModal onClose={() => setIsAppealModalOpen(false)} />}

        {zoomWarning && (
            <ZoomWarningToast message={zoomWarning} onClose={() => setZoomWarning(null)} />
        )}

        {isPixelInfoModalOpen && !isWipeMode && (
            <PixelInfoModal
                pixel={pixelInfo}
                onClose={() => setIsPixelInfoModalOpen(false)}
                onStartMultiPaint={handleStartMultiPaint}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={favorites.some((p) => p.gx === pixelInfo?.gx && p.gy === pixelInfo?.gy)}
                onShare={handleShare}
            />
        )}

        {shareData && <ShareModal data={shareData} onClose={() => setShareData(null)} />}
        {isLeaderboardOpen && <Leaderboard isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />}
        {isTeamModalOpen && <TeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} mode={teamModalMode} />}

        {/* MAP */}
        <div id="map-capture-area" style={{ width: '100%', height: '100%' }}>
          <MapContainer
              center={[0, 0]} zoom={2} maxZoom={20} zoomSnap={0} zoomDelta={1}
              style={{ height: '100%', width: '100%', background: '#AAD3DF' }}
              maxBounds={[[-85.05112878, -Infinity], [85.05112878, Infinity]]}
              maxBoundsViscosity={1.0} worldCopyJump={true} inertia={true} preferCanvas={true}
          >
            <TileLayer noWrap={false} url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" attribution='&copy; Google Maps' />
            <MapUrlHandler />
            <MapInitializer />
            <LocationButton />
            <MapZoomController setCanPaint={setCanPaint} onLoginRequired={openAuthModal} />

            <OverlayLayer />
            <OverlayMapHandler /> 
            
            <PingLayer currentTeamId={currentTeam?._id} />
            <HeatmapLayer visible={isHeatmapOn} />

            {/* COMPONENT CHỌN VÙNG CHO ADMIN */}
            <AdminAreaSelector 
                isActive={isWipeMode}
                onComplete={() => setIsWipeMode(false)}
                onCancel={() => setIsWipeMode(false)}
            />

            <GlobalCanvasGrid
                onLoginRequired={openAuthModal}
                selectedPixelColor={selectedPixelColor}
                pendingPixels={pendingPixels}
                setPendingPixels={setPendingPixels}
                onPixelClickForInfo={handlePixelClickForInfo}
                pixelInfo={pixelInfo}
                canPaint={canPaint}
                onZoomWarning={handleShowZoomWarning}
                isPaletteVisible={isPaletteVisible}
            />
            <FavoriteMarkers favorites={favorites} onMarkerClick={handlePixelClickForInfo} />
          </MapContainer>
        </div>

        <ChatBox /> 

        {/* ADMIN MANAGER - Ẩn khi đang chọn vùng */}
        {!isWipeMode && (
            <AdminManager onStartWipe={() => setIsWipeMode(true)} />
        )}

        {/* UI KHI ĐANG Ở CHẾ ĐỘ XÓA */}
        {isWipeMode && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] bg-white p-4 rounded-lg shadow-xl border-l-4 border-red-600 animate-bounce flex flex-col items-center gap-2">
                <h3 className="font-bold text-red-600 uppercase text-sm">⚠️ Đang chọn vùng để xóa</h3>
                <p className="text-xs text-gray-600">Click điểm đầu → Kéo chuột → Click điểm cuối</p>
                <button 
                    onClick={() => setIsWipeMode(false)}
                    className="bg-gray-500 text-white px-6 py-1 rounded hover:bg-gray-600 font-bold text-xs shadow"
                >
                    Hủy (ESC)
                </button>
            </div>
        )}
        
        <AuthControls />

        <AuxiliaryButtons
            openLeaderboard={openLeaderboard}
            openTeamModal={openTeamModalDetails}
            currentTeam={currentTeam}
            isHeatmapOn={isHeatmapOn}
            setIsHeatmapOn={setIsHeatmapOn}
        />

        <OverlayMenu 
            isOpen={isOverlayMenuOpen} 
            onToggle={() => {
                setIsOverlayMenuOpen(!isOverlayMenuOpen);
                setIsSoundSettingsOpen(false);
            }} 
        />
        
        <SoundSettings 
            isOpen={isSoundSettingsOpen} 
            onToggle={() => {
                setIsSoundSettingsOpen(!isSoundSettingsOpen);
                setIsOverlayMenuOpen(false);
            }} 
        />

        {user && user.isBanned && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[1500] bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex gap-4 items-center animate-bounce">
                <span className="font-bold text-sm">⛔ Tài khoản bị khóa</span>
                <button 
                    onClick={() => setIsAppealModalOpen(true)}
                    className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-100 shadow-sm"
                >
                    Khiếu nại
                </button>
            </div>
        )}

        {(!isPixelInfoModalOpen || isPaletteVisible) && !isWipeMode && (
            <PaintControls
                selectedPixelColor={selectedPixelColor}
                setSelectedPixelColor={setSelectedPixelColor}
                pendingPixels={pendingPixels}
                setPendingPixels={setPendingPixels}
                onLoginRequired={openAuthModal}
                isPaletteVisible={isPaletteVisible}
                setIsPaletteVisible={setIsPaletteVisible}
                canPaint={canPaint}
                isPixelInfoModalOpen={isPixelInfoModalOpen}
            />
        )}
      </div>
  );
};

export default App;