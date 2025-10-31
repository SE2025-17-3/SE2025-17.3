import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css'; // File CSS cho modal

/**
 * Modal Đăng nhập / Đăng ký
 * @param {object} props
 * @param {function} props.onClose - Hàm để đóng modal
 */
const AuthModal = ({ onClose }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // State cho cả 2 form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // Thêm state cho email
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); 
  
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (isLoginMode) {
        // --- Logic Đăng nhập (username, password) ---
        if (!username || !password) {
          setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
          return;
        }
        await login(username, password);
        onClose(); // Đăng nhập thành công, đóng modal
      } else {
        // --- Logic Đăng ký (username, email, password, confirmPassword) ---
        if (!username || !email || !password || !confirmPassword) {
            setError('Vui lòng nhập đủ các trường.');
            return;
        }
        if (password !== confirmPassword) {
          setError('Mật khẩu xác thực không khớp.');
          return;
        }
        
        await register(username, email, password, confirmPassword);
        setMessage('Đăng ký thành công! Vui lòng chuyển sang tab đăng nhập.');
        // Xóa form
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      // Lấy lỗi từ response của axios
      const errorMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Đã xảy ra lỗi không xác định.';
      setError(errorMsg);
      console.error(err);
    }
  };

  // Hàm reset state khi chuyển tab
  const switchMode = (mode) => {
    setIsLoginMode(mode);
    setError(null);
    setMessage(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    // Lớp mờ (overlay)
    <div className="auth-modal-overlay" onClick={onClose}>
      {/* Nội dung Modal (ngăn click xuyên qua) */}
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <button className="auth-modal-close" onClick={onClose}>&times;</button>
        
        <div className="auth-modal-logo">
          {/* Bạn có thể thay bằng logo thật */}
          <img src="https://placehold.co/40x40/3498db/ffffff?text=W&font=inter" alt="Wplace Logo" style={{borderRadius: '50%', width: '40px', height: '40px'}} />
          <span style={{fontSize: '1.5rem', fontWeight: 700, marginLeft: '0.5rem'}}>wplace</span>
        </div>

        {/* Tab chuyển đổi */}
        <div className="auth-modal-tabs">
          <button 
            className={`tab ${isLoginMode ? 'active' : ''}`}
            onClick={() => switchMode(true)}
          >
            Đăng nhập
          </button>
          <button 
            className={`tab ${!isLoginMode ? 'active' : ''}`}
            onClick={() => switchMode(false)}
          >
            Đăng ký
          </button>
        </div>

        {/* Thông báo lỗi/thành công */}
        {error && <div className="auth-modal-error">{error}</div>}
        {message && <div className="auth-modal-message">{message}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-modal-form">
          {/* Tên đăng nhập (luôn hiển thị) */}
          <label htmlFor="username">Tên đăng nhập</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập..."
            required
          />

          {/* Email (chỉ hiển thị khi Đăng ký) */}
          {!isLoginMode && (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email..."
                required={!isLoginMode}
              />
            </>
          )}

          {/* Mật khẩu (luôn hiển thị) */}
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu..."
            required
          />

          {/* Xác thực Mật khẩu (chỉ hiển thị khi Đăng ký) */}
          {!isLoginMode && (
            <>
              <label htmlFor="confirmPassword">Xác thực mật khẩu</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu..."
                required={!isLoginMode}
              />
            </>
          )}

          <button type="submit" className="auth-modal-submit">
            {isLoginMode ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default AuthModal;

