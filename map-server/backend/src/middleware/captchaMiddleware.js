// backend/src/middleware/captchaMiddleware.js
import axios from 'axios';

// Đổi tên hàm cho đúng hơn (tùy chọn) và bỏ kiểm tra score
export const verifyRecaptcha = async (req, res, next) => {
    const { recaptchaToken } = req.body;

    if (!recaptchaToken) {
        return res.status(400).json({ message: 'reCAPTCHA token is missing.' });
    }

    try {
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_V3_SECRET_KEY}&response=${recaptchaToken}`
        );

        // reCAPTCHA v2 chỉ cần kiểm tra 'success'
        const { success } = response.data;

        if (!success) {
            // response.data['error-codes'] sẽ cho biết lý do thất bại
            console.error('reCAPTCHA verification failed:', response.data['error-codes']);
            return res.status(403).json({ message: 'reCAPTCHA verification failed. Please try again.' });
        }

        delete req.body.recaptchaToken;
        next();
    } catch (error) {
        console.error("reCAPTCHA error:", error);
        return res.status(500).json({ message: 'Error verifying reCAPTCHA.' });
    }
};