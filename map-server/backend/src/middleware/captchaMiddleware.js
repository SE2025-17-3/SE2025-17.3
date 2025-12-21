// D:\Code\SE2025-17.3\map-server\backend\src\middleware\captchaMiddleware.js
import axios from 'axios';

// Đổi tên hàm cho đúng hơn (tùy chọn) và bỏ kiểm tra score
export const verifyRecaptcha = async (req, res, next) => {
    const { recaptchaToken } = req.body;

    // DEV MODE: Skip reCAPTCHA in development
    if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  reCAPTCHA bypassed in development mode');
        delete req.body.recaptchaToken;
        return next();
    }

    if (!recaptchaToken) {
        return res.status(400).json({ message: 'reCAPTCHA token is missing.' });
    }

    try {
        console.log('🔑 Secret Key exists:', !!process.env.RECAPTCHA_V2_SECRET_KEY);
        console.log('🎫 Token received:', recaptchaToken ? 'Yes' : 'No');

        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_V2_SECRET_KEY}&response=${recaptchaToken}`
        );

        console.log('🔍 reCAPTCHA Full Response:', JSON.stringify(response.data, null, 2));

        // reCAPTCHA v2 chỉ cần kiểm tra 'success'
        const { success } = response.data;

        if (!success) {
            // response.data['error-codes'] sẽ cho biết lý do thất bại
            console.error('❌ reCAPTCHA verification failed:', response.data['error-codes']);
            console.error('Full error response:', response.data);
            return res.status(403).json({ message: 'reCAPTCHA verification failed. Please try again.' });
        }

        console.log('✅ reCAPTCHA verification successful!');
        delete req.body.recaptchaToken;
        next();
    } catch (error) {
        console.error("reCAPTCHA error:", error);
        return res.status(500).json({ message: 'Error verifying reCAPTCHA.' });
    }
};
