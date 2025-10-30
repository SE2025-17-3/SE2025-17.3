import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { SocketProvider } from './context/SocketContext.jsx'; // <-- Import Provider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Bọc App bằng Provider */}
    <SocketProvider>
      <App />
    </SocketProvider>
  </StrictMode>,
);