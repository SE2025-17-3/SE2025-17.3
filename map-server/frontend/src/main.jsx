// map-server/frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Libraries
import { GoogleOAuthProvider } from '@react-oauth/google';

// Context Providers
import { SocketProvider } from './context/SocketContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { TeamProvider } from './context/TeamContext.jsx';
import { VerificationProvider } from './context/VerificationContext.jsx';
import { OverlayProvider } from './context/OverlayContext.jsx'; // MỚI
import { SoundProvider } from './context/SoundContext.jsx';     // MỚI

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <TeamProvider>
                    <VerificationProvider>
                        {/* Wrap Sound & Overlay here */}
                        <SoundProvider>
                            <OverlayProvider>
                                <SocketProvider>
                                    <App />
                                </SocketProvider>
                            </OverlayProvider>
                        </SoundProvider>
                    </VerificationProvider>
                </TeamProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    </React.StrictMode>,
);