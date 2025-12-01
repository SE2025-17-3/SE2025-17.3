// frontend/src/components/VerificationModal.jsx

import React , { useState, useRef } from 'react';
// 1. Import ReCAPTCHA của Google thay vì HCaptcha
import ReCAPTCHA from 'react-google-recaptcha';
import { useVerification } from '../context/VerificationContext';
import api from '../services/api';

// 2. Lấy Site Key của Google reCAPTCHA v2 (bạn đã có sẵn trong file .env)
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY;

const VerificationModal = () => {
    const { isVerificationRequired, completeVerification } = useVerification();
    const [error, setError] = useState('');
    const captchaRef = useRef(null);

    const handleVerificationSuccess = async (token) => {
        if (!token) {
            setError('Xác minh đã hết hạn. Vui lòng thử lại.');
            return;
        }

        try {
            // 3. Đổi tên trường gửi đi cho nhất quán (tùy chọn nhưng nên làm)
            await api.post('/users/re-verify', { recaptchaToken: token });

            // Nếu thành công, đóng modal và reset
            completeVerification();
            setError('');

        } catch (err) {
            setError('Xác minh thất bại. Vui lòng thử lại.');
            // Reset captcha nếu có lỗi
            if (captchaRef.current) {
                captchaRef.current.reset();
            }
        }
    };

    if (!isVerificationRequired) {
        return null;
    }

    return (
        // Các lớp CSS cho modal giữ nguyên
        <div className="modal-overlay">
            <div className="modal-content" style={{ padding: '2rem', textAlign: 'center' }}>
                <h3>Vui lòng xác minh bạn không phải là robot</h3>
                <p>Bạn cần hoàn thành bước này để tiếp tục.</p>

                {/* 4. Thay thế HCaptcha bằng ReCAPTCHA */}
                <ReCAPTCHA
                    ref={captchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={handleVerificationSuccess} // Gọi hàm khi xác minh thành công
                    onExpired={() => setError('Captcha đã hết hạn.')} // Xử lý khi hết hạn
                    onError={() => setError('Đã xảy ra lỗi với CAPTCHA.')}
                    style={{ display: 'inline-block', marginTop: '1rem', marginBottom: '1rem' }}
                />

                {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>
        </div>
    );
};

export default VerificationModal;