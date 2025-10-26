import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import GlobalCanvasGrid from './components/GlobalCanvasGrid';
import { WORLD_BOUNDS } from './config/mapConfig';

const App = () => (
  <MapContainer
    center={[20, 0]}
    zoom={2}
    style={{ height: '100vh', width: '100vw', background: '#f0f0f0' }}
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
    <div className="leaflet-overlay-pane">
      <GlobalCanvasGrid />
    </div>
  </MapContainer>
);

export default App;
