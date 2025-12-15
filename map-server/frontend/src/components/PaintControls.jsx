import React, { useState, useEffect, useCallback } from "react";
import "./PaintControls.css";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api";

const CLEAR_COLOR = "transparent";
const RECHARGE_RATE = 30; // 30 giây

const ALL_COLORS = [
  "#000000", "#555555", "#888888", "#FFFFFF", "#FF0000", "#FF6B6B", "#FF9F1C", "#FFC857",
  "#FFE66D", "#00B894", "#00CEC9", "#0984E3", "#8A2BE2", "#FF00FF", CLEAR_COLOR
];

const PaintControls = ({
  selectedPixelColor,
  setSelectedPixelColor,
  pendingPixels,
  setPendingPixels,
  onLoginRequired,
  isPaletteVisible,
  setIsPaletteVisible,
  canPaint,
  isPixelInfoModalOpen,
}) => {
  const { isLoggedIn, user, refreshUser } = useAuth();

  const [energy, setEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(64);
  const [nextRecoverSeconds, setNextRecoverSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync năng lượng từ Context
  useEffect(() => {
    if (user) {
      setEnergy(user.energy || 0);
      setMaxEnergy(user.maxEnergy || 64);
    }
  }, [user]);

  // Đếm ngược thời gian hồi phục
  useEffect(() => {
    if (!user) return;

    const calculateTimer = () => {
      if (energy >= maxEnergy) {
        setNextRecoverSeconds(0);
        return;
      }

      const now = Date.now();
      const lastUpdate = new Date(user.lastEnergyUpdate).getTime();
      const elapsedSeconds = (now - lastUpdate) / 1000;
      
      const recovered = Math.floor(elapsedSeconds / RECHARGE_RATE);
      const remainder = elapsedSeconds % RECHARGE_RATE;
      const secondsLeft = Math.max(0, Math.ceil(RECHARGE_RATE - remainder));

      // Update UI giả lập
      const simulatedEnergy = Math.min(maxEnergy, user.energy + recovered);
      if (simulatedEnergy !== energy) {
         setEnergy(simulatedEnergy);
      }
      setNextRecoverSeconds(secondsLeft);
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [user, energy, maxEnergy]);

  const cancelPainting = useCallback(() => {
    setPendingPixels([]);
    setIsPaletteVisible(false);
  }, [setPendingPixels, setIsPaletteVisible]);

  const togglePalette = () => {
    if (!canPaint) {
      alert("Vui lòng zoom vào để tô màu.");
      return;
    }
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    setIsPaletteVisible(true);
  };

  const handleColorSelect = (color) => {
    const finalColor = color === CLEAR_COLOR ? "transparent" : color;
    setSelectedPixelColor(finalColor);
    localStorage.setItem("last_selected_color", finalColor);
    
    // Nếu đang chọn 1 pixel thì đổi màu luôn, nhiều pixel thì không đổi
    setPendingPixels((prev) => {
      if (prev.length === 1) {
        return prev.map((p) => ({ ...p, color: finalColor }));
      }
      return prev;
    });
  };

  const handleConfirmPaint = async () => {
    if (isSubmitting) return;
    if (pendingPixels.length === 0) {
      alert("Chọn ít nhất 1 pixel trên bản đồ để tô.");
      return;
    }
    if (pendingPixels.length > energy) {
      alert(`Không đủ năng lượng (Cần ${pendingPixels.length}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        pendingPixels.map(async (pixel) => {
             await api.post("/pixels", { gx: pixel.gx, gy: pixel.gy, color: pixel.color });
        })
      );
      await refreshUser(); // Lấy năng lượng chuẩn từ server
      alert(`Đã tô thành công!`);
      cancelPainting();
    } catch (err) {
      console.error(err);
      alert(`Lỗi: ${err.response?.data?.error || "Không thể tô màu"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="paint-controls-overlay">
      {isPaletteVisible ? (
        <div className="palette-panel">
          <div className="palette-header">
            <div className="palette-title">
              <span className="title-main">Tô màu</span>
              <span className="title-sub">Chọn màu & Click bản đồ</span>
            </div>
            <div className="energy-pill">
              {energy}/{maxEnergy} ⚡ ({energy < maxEnergy ? formatTime(nextRecoverSeconds) : 'Full'})
            </div>
            <button className="icon-button" onClick={cancelPainting}>×</button>
          </div>

          <div className="color-grid">
            {ALL_COLORS.map((c) => {
              const isClear = c === CLEAR_COLOR;
              const active = selectedPixelColor === (isClear ? "transparent" : c);
              return (
                <button
                  key={c}
                  className={`swatch ${active ? "swatch-active" : ""} ${isClear ? "swatch-clear" : ""}`}
                  style={{ background: isClear ? "#fff" : c }}
                  onClick={() => handleColorSelect(c)}
                >
                  {isClear ? "X" : ""}
                </button>
              );
            })}
          </div>

          <button
            className="paint-button"
            onClick={handleConfirmPaint}
            disabled={isSubmitting || pendingPixels.length === 0 || pendingPixels.length > energy}
          >
            {isSubmitting ? "Đang tô..." : `Tô ${pendingPixels.length} Pixel`}
          </button>
        </div>
      ) : (
        !isPixelInfoModalOpen && (
          <button className="paint-fab" onClick={togglePalette} disabled={!canPaint}>
            <span style={{marginRight: 5}}>🖌️</span> 
            Paint ({energy}/{maxEnergy})
          </button>
        )
      )}
    </div>
  );
};

export default PaintControls;