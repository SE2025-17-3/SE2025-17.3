// map-server/frontend/src/context/AuthContext.jsx
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

  // useEffect để kiểm tra trạng thái đăng nhập khi app khởi động
  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        const { data } = await api.get('/users/me');
        if (isMounted) {
          setUser(data);
          setIsLoggedIn(true);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          setIsLoggedIn(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuthStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const register = async (userData) => {
    await api.post('/auth/register', userData);
  };

  const login = async (userData) => {
    const { data } = await api.post('/auth/login', userData);
    setUser(data.user);
    setIsLoggedIn(true);
    closeAuthModal();
  };

  // --- 1. THÊM MỚI: Hàm xử lý đăng nhập Google ---
  const loginGoogle = async (credential) => {
    try {
      // Gửi token của Google xuống backend
      const { data } = await api.post('/auth/google', { token: credential });

      setUser(data.user);
      setIsLoggedIn(true);
      closeAuthModal();
      return { success: true };
    } catch (error) {
      console.error("Google login error:", error);
      // Ném lỗi ra để component UI (AuthForm) có thể hiển thị thông báo
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Lỗi API khi đăng xuất, nhưng vẫn xóa session phía client:", error);
    } finally {
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const updateUserContext = (newUserData) => {
    setUser(newUserData);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/users/me');
      setUser(data);
      return data;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
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
    loginGoogle, // <-- 2. Export hàm này để các component khác sử dụng
    logout,
    updateUserContext,
    refreshUser,
  };

  return (
      <AuthContext.Provider value={value}>
        {!loading && children}
      </AuthContext.Provider>
  );
};
