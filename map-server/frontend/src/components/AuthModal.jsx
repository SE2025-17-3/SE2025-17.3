// frontend/src/components/AuthModal.jsx

import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import ReCAPTCHA from 'react-google-recaptcha';
import './AuthModal.css';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY;

const AuthModal = ({ onClose }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!recaptchaToken) {
      setError('Vui lòng xác thực "Tôi không phải là robot".');
      return;
    }

    setIsLoading(true);
    try {
      const userData = isLoginMode
          ? { username, password, recaptchaToken }
          : { username, email, password, confirmPassword, recaptchaToken };

      if (isLoginMode) {
        await login(userData);
        onClose();
      } else {
        if (password !== confirmPassword) {
          setError('Mật khẩu xác thực không khớp.');
          setIsLoading(false);
          captchaRef.current.reset();
          setRecaptchaToken(null);
          return;
        }
        await register(userData);
        setMessage('Đăng ký thành công! Vui lòng chuyển sang tab đăng nhập.');
        // Reset form
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        captchaRef.current.reset();
        setRecaptchaToken(null);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Đã xảy ra lỗi không xác định.';
      setError(errorMsg);
      captchaRef.current.reset();
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (mode) => {
    setIsLoginMode(mode);
    setError(null);
    setMessage(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    // Reset captcha khi chuyển tab nếu cần
    if (captchaRef.current) {
      captchaRef.current.reset();
      setRecaptchaToken(null);
    }
  };

  return (
      <div className="auth-modal-overlay" onClick={onClose}>
        <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>

          <button className="auth-modal-close" onClick={onClose}>&times;</button>

          <div className="auth-modal-logo">
            <img src="https://placehold.co/40x40/3498db/ffffff?text=W&font=inter" alt="Wplace Logo" style={{borderRadius: '50%', width: '40px', height: '40px'}} />
            <span style={{fontSize: '1.5rem', fontWeight: 700, marginLeft: '0.5rem'}}>wplace</span>
          </div>

          <div className="auth-modal-tabs">
            <button className={`tab ${isLoginMode ? 'active' : ''}`} onClick={() => switchMode(true)}>
              Đăng nhập
            </button>
            <button className={`tab ${!isLoginMode ? 'active' : ''}`} onClick={() => switchMode(false)}>
              Đăng ký
            </button>
          </div>

          {error && <div className="auth-modal-error">{error}</div>}
          {message && <div className="auth-modal-message">{message}</div>}

          <form onSubmit={handleSubmit} className="auth-modal-form">
            {/* --- BỔ SUNG LẠI CÁC Ô INPUT ĐÃ MẤT --- */}
            <label htmlFor="username">Tên đăng nhập</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập..." required />

            {!isLoginMode && (
                <>
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập email..." required={!isLoginMode} />
                </>
            )}

            <label htmlFor="password">Mật khẩu</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu..." required />

            {!isLoginMode && (
                <>
                  <label htmlFor="confirmPassword">Xác thực mật khẩu</label>
                  <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu..." required={!isLoginMode} />
                </>
            )}
            {/* --- KẾT THÚC PHẦN BỔ SUNG --- */}

            <ReCAPTCHA
                ref={captchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setRecaptchaToken(token)}
                onExpired={() => setRecaptchaToken(null)}
                style={{ marginBottom: '1rem', transform: 'scale(0.95)', transformOrigin: 'center left' }}
            />

            <button type="submit" className="auth-modal-submit" disabled={isLoading}>
              {isLoading ? 'Đang xử lý...' : (isLoginMode ? 'Đăng nhập' : 'Tạo tài khoản')}
            </button>
          </form>

        </div>
      </div>
  );
};

export default AuthModal;