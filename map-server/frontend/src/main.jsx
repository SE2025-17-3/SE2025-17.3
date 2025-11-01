<<<<<<< HEAD
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { SocketProvider } from './context/SocketContext.jsx'; // Context cho Wplace
import { AuthProvider } from './context/AuthContext.jsx'; // <-- Context cho Auth

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider> {/* Bọc AuthProvider ngoài cùng */}
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>,
);
=======
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
>>>>>>> develop
