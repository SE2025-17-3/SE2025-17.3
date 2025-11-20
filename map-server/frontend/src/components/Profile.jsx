// frontend/src/components/Profile.jsx
import React, { useState } from 'react';
import './Profile.css';
import EditProfileModal from './EditProfileModal';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Sửa lỗi: Khai báo biến API_URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const openModal = () => { setIsModalOpen(true); setIsMenuOpen(false); };
    const closeModal = () => setIsModalOpen(false);

    if (!user) return null;

    return (
        <div className="profile-container">
            <div className="profile-header" onClick={toggleMenu}>
                <img
                    src={`${API_URL}${user.avatarUrl}`}
                    alt={user.displayName}
                    className="avatar"
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