// map-server/backend/src/middleware/captchaMiddleware.js
import axios from 'axios';

// Middleware xác thực Google reCAPTCHA v2
export const verifyRecaptcha = async (req, res, next) => {
    const { recaptchaToken } = req.body;

    // DEV MODE: Bỏ qua reCAPTCHA khi phát triển
    if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  reCAPTCHA bypassed in development mode');
        delete req.body.recaptchaToken;
        return next();
    }

    if (!recaptchaToken) {
        return res.status(400).json({
            message: 'reCAPTCHA token is missing.',
        });
    }

    try {
        if (!process.env.RECAPTCHA_V2_SECRET_KEY) {
            console.error('❌ Missing RECAPTCHA_V2_SECRET_KEY');
            return res.status(500).json({
                message: 'Server misconfiguration.',
            });
        }

        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_V2_SECRET_KEY,
                    response: recaptchaToken,
                },
                timeout: 5000,
            }
        );

        const { success, 'error-codes': errorCodes } = response.data;

        // reCAPTCHA v2: chỉ cần success = true
        if (!success) {
            console.error('❌ reCAPTCHA verification failed:', errorCodes);
            return res.status(403).json({
                message: 'reCAPTCHA verification failed. Please try again.',
            });
        }

        // Xóa token trước khi sang middleware tiếp theo
        delete req.body.recaptchaToken;
        next();
    } catch (error) {
        console.error('❌ reCAPTCHA error:', error?.message || error);
        return res.status(500).json({
            message: 'Error verifying reCAPTCHA.',
        });
    }
};
