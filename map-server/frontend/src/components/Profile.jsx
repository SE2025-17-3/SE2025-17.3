// map-server/frontend/src/components/Profile.jsx
import React, { useState } from 'react';
import './Profile.css';
import EditProfileModal from './EditProfileModal';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- SỬA LỖI TẠI ĐÂY ---
    // Hàm lấy URL tự động:
    // 1. Nếu chạy Production (Docker) -> Lấy http://136.112.99.88 (qua Nginx)
    // 2. Nếu chạy Dev -> Lấy http://localhost:4000
    const getApiUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (import.meta.env.PROD) return window.location.origin;
        return 'http://localhost:4000';
    };

    const API_URL = getApiUrl();
    // -----------------------

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const openModal = () => { setIsModalOpen(true); setIsMenuOpen(false); };
    const closeModal = () => setIsModalOpen(false);

    if (!user) return null;

    // Helper xử lý đường dẫn ảnh (đề phòng backend trả về full url)
    const getAvatarUrl = () => {
        if (!user.avatarUrl) return '/default-avatar.png'; // Ảnh mặc định trong folder public frontend
        if (user.avatarUrl.startsWith('http')) return user.avatarUrl;
        return `${API_URL}${user.avatarUrl}`;
    };

    return (
        <div className="profile-container">
            <div className="profile-header" onClick={toggleMenu}>
                <img
                    src={getAvatarUrl()}
                    alt={user.displayName}
                    className="avatar"
                    // Thêm fallback: Nếu ảnh lỗi thì hiện ảnh mặc định
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/default-avatar.png';
                    }}
                />
                <span className="username">Chào, {user.displayName}</span>
            </div>
            {isMenuOpen && (
                <div className="profile-menu">
                    <button onClick={openModal}>Chỉnh sửa hồ sơ</button>
                    <button onClick={logout}>Đăng xuất</button>
                </div>
            )}
            {isModalOpen && <EditProfileModal closeModal={closeModal} />}
        </div>
    );
};

export default Profile;
