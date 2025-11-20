// frontend/src/context/VerificationContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const VerificationContext = createContext();

export const useVerification = () => useContext(VerificationContext);

export const VerificationProvider = ({ children }) => {
    const [pixelCount, setPixelCount] = useState(0);
    const [isVerificationRequired, setVerificationRequired] = useState(false);
    const PIXEL_LIMIT = 50; // Giới hạn số pixel
    const TIME_LIMIT = 15 * 60 * 1000; // 15 phút

    // Đếm thời gian
    useEffect(() => {
        const timer = setTimeout(() => {
            setVerificationRequired(true);
        }, TIME_LIMIT);

        return () => clearTimeout(timer); // Reset timer nếu component unmount
    }, [pixelCount]); // Reset timer sau mỗi lần đặt pixel

    const incrementPixelCount = () => {
        const newCount = pixelCount + 1;
        setPixelCount(newCount);
        if (newCount >= PIXEL_LIMIT) {
            setVerificationRequired(true);
        }
    };

    const completeVerification = () => {
        setPixelCount(0); // Reset bộ đếm
        setVerificationRequired(false);
    };

    const value = {
        isVerificationRequired,
        incrementPixelCount,
        completeVerification,
    };

    return (
        <VerificationContext.Provider value={value}>
            {children}
        </VerificationContext.Provider>
    );
};