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
  
  // --- STATE MỚI CHO MODAL ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  // -------------------------

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

  // Cập nhật hàm register (4 trường)
  const register = async (username, email, password, confirmPassword) => {
    await api.post('/auth/register', { username, email, password, confirmPassword });
  };

  // Cập nhật hàm login (2 trường)
  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
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
    isAuthModalOpen, // <-- Expose state
    openAuthModal,   // <-- Expose hàm
    closeAuthModal,  // <-- Expose hàm
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

