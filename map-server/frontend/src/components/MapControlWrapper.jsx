// map-server/frontend/src/components/MapControlWrapper.jsx
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const MapControlWrapper = ({ children, className = '', style = {} }) => {
  const wrapperRef = useRef(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (el) {
      // Chặn sự kiện click/scroll lan xuống bản đồ
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ 
        position: 'absolute', 
        zIndex: 1000, // Đảm bảo nổi lên trên map
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...style 
      }}
    >
      {children}
    </div>
  );
};

export default MapControlWrapper;