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

  // useEffect để kiểm tra trạng thái đăng nhập khi app khởi động
  useEffect(() => {
    // Biến cờ này giúp ngăn việc cập nhật state trên component đã bị unmount
    // rất hữu ích để tránh lỗi trong React 18 Strict Mode
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

    // Cleanup function để ngăn memory leak
    return () => {
      isMounted = false;
    };
  }, []); // Chỉ chạy 1 lần khi component mount

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
    closeAuthModal();
  };

  // Hàm đăng xuất
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

  // --- HÀM QUAN TRỌNG ĐÃ ĐƯỢC KẾT HỢP ---
  // Cập nhật thông tin user trong context sau khi chỉnh sửa profile thành công
  const updateUserContext = (newUserData) => {
    setUser(newUserData);
  };

  // Tạo đối tượng value để cung cấp cho các component con
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
    updateUserContext, // <-- Đã thêm vào
  };

  return (
      <AuthContext.Provider value={value}>
        {!loading && children}
      </AuthContext.Provider>
  );
};