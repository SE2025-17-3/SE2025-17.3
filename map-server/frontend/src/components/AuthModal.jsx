// frontend/src/components/AuthModal.jsx
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ReCAPTCHA from 'react-google-recaptcha';
import { GoogleLogin } from '@react-oauth/google';
import './AuthModal.css';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY;

const AuthModal = ({ onClose }) => {
  // Mode quản lý các trạng thái của Modal:
  // 'login': Đăng nhập
  // 'register': Đăng ký
  // 'register_verify': Nhập mã OTP để kích hoạt tài khoản (MỚI)
  // 'forgot_request': Nhập Username + Email để lấy mã
  // 'forgot_verify': Nhập mã OTP quên mật khẩu
  // 'forgot_reset': Nhập mật khẩu mới
  const [mode, setMode] = useState('login');

  // State chung
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Recaptcha
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  const { login, loginGoogle } = useAuth(); // Bỏ 'register' từ context, gọi trực tiếp api để dễ control luồng

  // --- HÀM RESET FORM ---
  const resetForm = () => {
    setError(null);
    setMessage(null);
    if (captchaRef.current) captchaRef.current.reset();
    setRecaptchaToken(null);
    setOtp('');
  };

  // --- 1. XỬ LÝ LOGIN / REGISTER ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!recaptchaToken) {
      setError('Vui lòng xác thực "Tôi không phải là robot".');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        // --- LOGIC ĐĂNG NHẬP ---
        await login({ username, password, recaptchaToken });
        onClose();
      } else {
        // --- LOGIC ĐĂNG KÝ ---
        if (password !== confirmPassword) {
          setError('Mật khẩu xác thực không khớp.');
          setIsLoading(false);
          resetForm();
          return;
        }

        // Gọi API Đăng ký
        await api.post('/auth/register', {
          username, email, password, confirmPassword, recaptchaToken
        });

        setMessage('Mã xác thực đã được gửi tới email của bạn.');
        setMode('register_verify'); // Chuyển sang bước nhập OTP kích hoạt

        // Xóa mật khẩu để an toàn, giữ lại email để verify
        setPassword('');
        setConfirmPassword('');
        resetForm();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Lỗi không xác định.';
      setError(errorMsg);
      if (captchaRef.current) captchaRef.current.reset();
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. XỬ LÝ XÁC THỰC EMAIL (SAU KHI ĐĂNG KÝ) ---
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/verify-email', { email, otp });
      alert('Tài khoản đã được kích hoạt thành công! Vui lòng đăng nhập.');
      setMode('login'); // Chuyển về login
      setOtp('');
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Mã xác thực không đúng.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. XỬ LÝ QUÊN MẬT KHẨU: BƯỚC 1 (LẤY MÃ) ---
  const handleGetCode = async (e) => {
    e.preventDefault();
    if (!recaptchaToken) {
      setError('Vui lòng xác thực ReCAPTCHA trước khi lấy mã.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/forgot-password', { username, email });
      setMessage(`Mã xác thực đã được gửi đến ${email}.`);
      setMode('forgot_verify');
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi gửi yêu cầu.');
      if (captchaRef.current) captchaRef.current.reset();
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. XỬ LÝ QUÊN MẬT KHẨU: BƯỚC 2 (CHECK OTP) ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      setMode('forgot_reset'); // Chuyển sang đổi pass
      setMessage(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Mã xác thực không đúng.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. XỬ LÝ QUÊN MẬT KHẨU: BƯỚC 3 (ĐỔI PASS) ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, password });
      alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- XỬ LÝ GOOGLE ---
  const handleGoogleSuccess = async (res) => {
    try {
      await loginGoogle(res.credential);
      onClose();
    } catch (err) {
      setError("Đăng nhập Google thất bại.");
    }
  };

  // --- RENDER GIAO DIỆN ---

  const getTitle = () => {
    if (mode === 'login') return 'Đăng nhập';
    if (mode === 'register') return 'Đăng ký';
    if (mode === 'register_verify') return 'Kích hoạt tài khoản';
    if (mode === 'forgot_request') return 'Lấy lại mật khẩu';
    if (mode === 'forgot_verify') return 'Nhập mã xác thực';
    if (mode === 'forgot_reset') return 'Đặt lại mật khẩu';
  };

  return (
      <div className="auth-modal-overlay" onClick={onClose}>
        <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="auth-modal-close" onClick={onClose}>&times;</button>

          <div className="auth-modal-logo">
            <img src="https://placehold.co/40x40/3498db/ffffff?text=W&font=inter" alt="Logo" style={{borderRadius: '50%', width: '40px', height: '40px'}} />
            <span style={{fontSize: '1.5rem', fontWeight: 700, marginLeft: '0.5rem'}}>wplace</span>
          </div>

          {/* --- TAB HEADER (Chỉ hiện khi ở Login/Register) --- */}
          {(mode === 'login' || mode === 'register') && (
              <div className="auth-modal-tabs">
                <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); resetForm(); }}>Đăng nhập</button>
                <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); resetForm(); }}>Đăng ký</button>
              </div>
          )}

          {/* --- TIÊU ĐỀ CHO CÁC BƯỚC KHÁC --- */}
          {(!['login', 'register'].includes(mode)) && (
              <h3 style={{textAlign: 'center', margin: '10px 0', color: '#333'}}>{getTitle()}</h3>
          )}

          {error && <div className="auth-modal-error">{error}</div>}
          {message && <div className="auth-modal-message">{message}</div>}

          {/* --- FORM 1: LOGIN / REGISTER --- */}
          {(mode === 'login' || mode === 'register') && (
              <form onSubmit={handleAuthSubmit} className="auth-modal-form">
                <label>Tên đăng nhập</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập..." required />

                {mode === 'register' && (
                    <>
                      <label>Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập email..." required />
                    </>
                )}

                <label>Mật khẩu</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu..." required />

                {mode === 'register' && (
                    <>
                      <label>Xác thực mật khẩu</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu..." required />
                    </>
                )}

                {mode === 'login' && (
                    <div style={{textAlign: 'right', marginBottom: '10px'}}>
                      <span style={{fontSize: '13px', color: '#3498db', cursor: 'pointer'}} onClick={() => { setMode('forgot_request'); resetForm(); }}>
                        Quên mật khẩu?
                      </span>
                    </div>
                )}

                <ReCAPTCHA ref={captchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={setRecaptchaToken} onExpired={() => setRecaptchaToken(null)} style={{ marginBottom: '1rem', transform: 'scale(0.95)', transformOrigin: 'center left' }} />

                <button type="submit" className="auth-modal-submit" disabled={isLoading}>
                  {isLoading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
                </button>
              </form>
          )}

          {/* --- FORM 2: XÁC THỰC EMAIL ĐĂNG KÝ (MỚI) --- */}
          {mode === 'register_verify' && (
              <form onSubmit={handleVerifyEmail} className="auth-modal-form">
                <p style={{fontSize: '14px', textAlign: 'center', color: '#666', marginBottom: '15px'}}>
                  Nhập mã 6 số chúng tôi vừa gửi tới <strong>{email}</strong>
                </p>
                <label>Mã xác thực</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required style={{textAlign: 'center', letterSpacing: '5px', fontSize: '1.2rem'}} />

                <button type="submit" className="auth-modal-submit" disabled={isLoading}>
                  {isLoading ? 'Đang kích hoạt...' : 'Kích hoạt tài khoản'}
                </button>
              </form>
          )}

          {/* --- FORM 3: FORGOT STEP 1 - YÊU CẦU MÃ --- */}
          {mode === 'forgot_request' && (
              <form onSubmit={handleGetCode} className="auth-modal-form">
                <label>Tên đăng nhập</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập..." required />

                <label>Email đăng ký</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập email..." required />

                <div style={{marginTop: '15px'}}>
                  <ReCAPTCHA ref={captchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={setRecaptchaToken} onExpired={() => setRecaptchaToken(null)} style={{ marginBottom: '1rem', transform: 'scale(0.95)', transformOrigin: 'center left' }} />
                </div>

                <button type="submit" className="auth-modal-submit" disabled={isLoading}>
                  {isLoading ? 'Đang gửi...' : 'Lấy mã xác thực'}
                </button>
                <div style={{textAlign: 'center', marginTop: '10px'}}><span className="back-link" onClick={() => setMode('login')} style={{color:'#3498db', cursor:'pointer', fontSize:'0.9rem'}}>Quay lại đăng nhập</span></div>
              </form>
          )}

          {/* --- FORM 4: FORGOT STEP 2 - NHẬP MÃ OTP --- */}
          {mode === 'forgot_verify' && (
              <form onSubmit={handleVerifyOtp} className="auth-modal-form">
                <p style={{fontSize: '14px', textAlign: 'center', color: '#666', marginBottom: '15px'}}>
                  Mã xác thực đã được gửi tới <strong>{email}</strong>
                </p>
                <label>Nhập mã xác thực (6 số)</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="VD: 123456" maxLength={6} required style={{textAlign: 'center', letterSpacing: '5px', fontSize: '1.2rem'}} />

                <button type="submit" className="auth-modal-submit" disabled={isLoading}>
                  {isLoading ? 'Đang kiểm tra...' : 'Xác thực mã'}
                </button>
                <div style={{textAlign: 'center', marginTop: '10px'}}><span className="back-link" onClick={() => setMode('forgot_request')} style={{color:'#3498db', cursor:'pointer', fontSize:'0.9rem'}}>Gửi lại mã?</span></div>
              </form>
          )}

          {/* --- FORM 5: FORGOT STEP 3 - ĐỔI MẬT KHẨU --- */}
          {mode === 'forgot_reset' && (
              <form onSubmit={handleResetPassword} className="auth-modal-form">
                <label>Mật khẩu mới</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu mới..." required />

                <label>Nhập lại mật khẩu</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Xác nhận mật khẩu..." required />

                <button type="submit" className="auth-modal-submit" disabled={isLoading || !password || password !== confirmPassword}>
                  {isLoading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
                </button>
              </form>
          )}

          {/* --- GOOGLE LOGIN (Luôn hiện ở Login/Register) --- */}
          {(mode === 'login' || mode === 'register') && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '16px', opacity: 0.6 }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }}></div>
                  <span style={{ padding: '0 10px', fontSize: '13px', color: '#666' }}>Hoặc</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }}></div>
                </div>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.log('Login Failed')} theme="outline" size="large" width="100%" text="signin_with" />
              </div>
          )}

        </div>
      </div>
  );
};

export default AuthModal;