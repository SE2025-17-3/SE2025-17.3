import React, { useState, useEffect, useCallback } from "react";
import "./PaintControls.css";
import { useAuth } from "../context/AuthContext.jsx";
import { useSound } from "../context/SoundContext"; 
import api from "../services/api";

const CLEAR_COLOR = "transparent";
const RECHARGE_RATE_SECONDS = 30; 
const ALL_COLORS = ["#000000", "#555555", "#888888", "#FFFFFF", "#FF0000", "#FF6B6B", "#FF9F1C", "#FFC857", "#FFE66D", "#00B894", "#00CEC9", "#0984E3", "#8A2BE2", "#FF00FF", CLEAR_COLOR];

const PaintControls = ({ selectedPixelColor, setSelectedPixelColor, pendingPixels, setPendingPixels, onLoginRequired, isPaletteVisible, setIsPaletteVisible, canPaint, isPixelInfoModalOpen }) => {
  const { isLoggedIn, user, refreshUser } = useAuth();
  const { playSound } = useSound(); 
  const [energy, setEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(64);
  const [timerDisplay, setTimerDisplay] = useState("0:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { if (isPaletteVisible && isLoggedIn) refreshUser(); }, [isPaletteVisible, isLoggedIn]);

  useEffect(() => {
    if (!user) return;
    setMaxEnergy(user.maxEnergy || 64);
    const calculateRealtimeEnergy = () => {
      const lastUpdate = new Date(user.lastEnergyUpdate).getTime();
      const now = Date.now();
      if (isNaN(lastUpdate)) { setEnergy(user.maxEnergy || 64); setTimerDisplay("Full"); return; }
      const elapsedMs = now - lastUpdate;
      const gained = Math.floor(elapsedMs / (RECHARGE_RATE_SECONDS * 1000));
      const currentTotal = Math.min(user.maxEnergy || 64, (user.energy || 0) + gained);
      setEnergy(currentTotal);
      if (currentTotal >= (user.maxEnergy || 64)) { setTimerDisplay("Full"); } 
      else {
        const remainderMs = elapsedMs % (RECHARGE_RATE_SECONDS * 1000);
        const secondsLeft = Math.ceil((RECHARGE_RATE_SECONDS * 1000 - remainderMs) / 1000);
        const m = Math.floor(secondsLeft / 60);
        const s = secondsLeft % 60;
        setTimerDisplay(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };
    calculateRealtimeEnergy();
    const interval = setInterval(calculateRealtimeEnergy, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const cancelPainting = useCallback(() => { setPendingPixels([]); setIsPaletteVisible(false); playSound('click'); }, [setPendingPixels, setIsPaletteVisible, playSound]);

  const togglePalette = () => {
    if (!canPaint) { playSound('error'); alert("Vui lòng zoom vào để tô màu."); return; }
    if (!isLoggedIn) { onLoginRequired(); return; }
    playSound('click'); setIsPaletteVisible(true);
  };

  const handleColorSelect = (color) => {
    const finalColor = color === CLEAR_COLOR ? "transparent" : color;
    setSelectedPixelColor(finalColor);
    localStorage.setItem("last_selected_color", finalColor);
    playSound('color'); 
    setPendingPixels((prev) => prev.length === 1 ? prev.map((p) => ({ ...p, color: finalColor })) : prev);
  };

  const handleConfirmPaint = async () => {
    if (isSubmitting) return;
    if (pendingPixels.length === 0) { playSound('error'); alert("Chọn ít nhất 1 pixel."); return; }
    if (pendingPixels.length > energy) { playSound('error'); alert(`Thiếu năng lượng! Cần ${pendingPixels.length}, có ${energy}.`); return; }

    setIsSubmitting(true);
    try {
      // --- TỐI ƯU HÓA: Gửi mảng pixel (Batch Request) ---
      const payload = {
          pixels: pendingPixels.map(p => ({ gx: p.gx, gy: p.gy, color: p.color }))
      };
      await api.post("/pixels", payload);
      
      await refreshUser();
      playSound('place'); 
      cancelPainting();
    } catch (err) {
      console.error(err);
      playSound('error');
      alert(`Lỗi: ${err.response?.data?.error || "Không thể tô màu"}`);
      refreshUser();
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="paint-controls-overlay">
      {isPaletteVisible ? (
        <div className="palette-panel">
          <div className="palette-header">
            <div className="palette-title"><span className="title-main">Tô màu</span><span className="title-sub">Chọn màu & Click bản đồ</span></div>
            <div className={`energy-pill ${energy === 0 ? 'bg-red-100 text-red-600' : ''}`}>{energy}/{maxEnergy} ⚡ ({timerDisplay})</div>
            <button className="icon-button" onClick={cancelPainting}>×</button>
          </div>
          <div className="color-grid">
            {ALL_COLORS.map((c) => {
              const isClear = c === CLEAR_COLOR;
              const active = selectedPixelColor === (isClear ? "transparent" : c);
              return <button key={c} className={`swatch ${active ? "swatch-active" : ""} ${isClear ? "swatch-clear" : ""}`} style={{ background: isClear ? "#fff" : c }} onClick={() => handleColorSelect(c)}>{isClear ? "X" : ""}</button>;
            })}
          </div>
          <button className="paint-button" onClick={handleConfirmPaint} disabled={isSubmitting || pendingPixels.length === 0 || pendingPixels.length > energy} style={{ opacity: (pendingPixels.length > energy) ? 0.5 : 1, cursor: (pendingPixels.length > energy) ? 'not-allowed' : 'pointer' }}>
            {isSubmitting ? "Đang tô..." : pendingPixels.length > energy ? `Thiếu năng lượng (${pendingPixels.length}/${energy})` : `Tô ${pendingPixels.length} Pixel`}
          </button>
        </div>
      ) : ( !isPixelInfoModalOpen && (<button className="paint-fab" onClick={togglePalette} disabled={!canPaint}><span style={{marginRight: 5}}>🖌️</span> Paint ({energy}/{maxEnergy})</button>) )}
    </div>
  );
};
export default PaintControls;