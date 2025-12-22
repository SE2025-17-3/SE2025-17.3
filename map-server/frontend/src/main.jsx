// map-server/frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { GoogleOAuthProvider } from '@react-oauth/google';

import { SocketProvider } from './context/SocketContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { TeamProvider } from './context/TeamContext.jsx';
import { VerificationProvider } from './context/VerificationContext.jsx';
import { OverlayProvider } from './context/OverlayContext.jsx';
import { SoundProvider } from './context/SoundContext.jsx';
import { ChallengeProvider } from './context/ChallengeContext.jsx';
import { WalletProvider } from './context/WalletContext.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <WalletProvider>
                    <TeamProvider>
                        <VerificationProvider>
                            <SoundProvider>
                                <OverlayProvider>
                                    <SocketProvider>
                                        <ChallengeProvider>
                                            <App />
                                        </ChallengeProvider>
                                    </SocketProvider>
                                </OverlayProvider>
                            </SoundProvider>
                        </VerificationProvider>
                    </TeamProvider>
                </WalletProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    </React.StrictMode>
);
