//frontend/src/components/AuthForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export const AuthForm = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);

  const { login, register, loginGoogle } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLoginMode) {
        // Login: gửi username (hoặc email) và password
        await login({ username: formData.email, password: formData.password });
      } else {
        // Register
        await register(formData);
        setIsLoginMode(true);
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Đã xảy ra lỗi');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginGoogle(credentialResponse.credential);
    } catch (err) {
      setError('Đăng nhập Google thất bại');
    }
  };

  return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {isLoginMode ? 'Đăng Nhập' : 'Đăng Ký'}
        </h2>

        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-sm">
              {error}
            </div>
        )}

        {/* --- FORM CHÍNH --- */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="username">Username</label>
                <input
                    type="text" id="username"
                    value={formData.username} onChange={handleChange}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!isLoginMode}
                />
              </div>
          )}

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="email">
              {isLoginMode ? 'Username / Email' : 'Email'}
            </label>
            <input
                type="text" id="email"
                value={formData.email} onChange={handleChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="password">Password</label>
            <input
                type="password" id="password"
                value={formData.password} onChange={handleChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />
          </div>

          <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            {isLoginMode ? 'Đăng Nhập' : 'Đăng Ký'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
              type="button"
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-sm text-blue-500 hover:underline"
          >
            {isLoginMode ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>

        {/* --- PHẦN GOOGLE LOGIN --- */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
            </div>
          </div>

          <div className="mt-4 flex justify-center w-full">
            {/* Nút Google Login */}
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Đăng nhập Google không thành công')}
                useOneTap
                shape="pill"
                theme="outline"
                size="large"
                width="100%"
            />
          </div>
          {/* Helper text kiểm tra Client ID */}
          <p className="text-xs text-center text-gray-400 mt-2">
            Nếu không thấy nút trên, hãy kiểm tra file .env
          </p>
        </div>
      </div>
  );
};
