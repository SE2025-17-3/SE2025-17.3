// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api'; // Import axios instance

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users/me');
      setUser(data);
      setIsLoggedIn(true);
    } catch (error) {
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // --- SỬA LỖI: Cập nhật hàm register để nhận 1 object duy nhất ---
  const register = async (userData) => {
    // Gửi toàn bộ object userData (đã chứa recaptchaToken) đến backend
    await api.post('/auth/register', userData);
  };

  // --- SỬA LỖI: Cập nhật hàm login để nhận 1 object duy nhất ---
  const login = async (userData) => {
    // Gửi toàn bộ object userData (đã chứa recaptchaToken) đến backend
    const { data } = await api.post('/auth/login', userData);
    setUser(data.user);
    setIsLoggedIn(true);
    closeAuthModal(); // Tự động đóng modal sau khi login thành công
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setIsLoggedIn(false);
  };

  const value = {
    user,
    isLoggedIn,
    loading,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    register,
    login,
    logout,
  };

  return (
      <AuthContext.Provider value={value}>
        {!loading && children}
      </AuthContext.Provider>
  );
};