// D:\Code\SE2025-17.3\map-server\frontend\src\main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 1. IMPORT THƯ VIỆN GOOGLE OAUTH
import { GoogleOAuthProvider } from '@react-oauth/google';

// Import các provider cần thiết
import { SocketProvider } from './context/SocketContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { TeamProvider } from './context/TeamContext.jsx';
import { VerificationProvider } from './context/VerificationContext.jsx';
import { ChallengeProvider } from './context/ChallengeContext.jsx';
import { WalletProvider } from './context/WalletContext.jsx';

// Lấy Key từ biến môi trường
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID; // Lấy Client ID

console.log("VITE_RECAPTCHA_V2_SITE_KEY:", RECAPTCHA_SITE_KEY);
console.log("VITE_GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID); // Bật lên để debug nếu cần

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* 2. BỌC ỨNG DỤNG BẰNG GOOGLE PROVIDER */}
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <WalletProvider>
                    <TeamProvider>
                        <VerificationProvider>
                            <SocketProvider>
                                <ChallengeProvider>
                                    <App />
                                </ChallengeProvider>
                            </SocketProvider>
                        </VerificationProvider>
                    </TeamProvider>
                </WalletProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    </React.StrictMode>,
);