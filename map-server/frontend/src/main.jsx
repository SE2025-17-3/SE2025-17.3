// frontend/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Import các provider cần thiết
import { SocketProvider } from './context/SocketContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
//import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'; // <-- 1. Import reCAPTCHA Provider
import { VerificationProvider } from './context/VerificationContext.jsx'; // <-- 2. Import Verification Provider

console.log("VITE_RECAPTCHA_V3_SITE_KEY:", import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY);


// Lấy Site Key từ biến môi trường của Vite
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* XÓA THẺ BỌC NÀY */}
        {/* <GoogleReCaptchaProvider ... > */}
        <AuthProvider>
            <VerificationProvider>
                <SocketProvider>
                    <App />
                </SocketProvider>
            </VerificationProvider>
        </AuthProvider>
        {/* </GoogleReCaptchaProvider> */}
    </React.StrictMode>,
);