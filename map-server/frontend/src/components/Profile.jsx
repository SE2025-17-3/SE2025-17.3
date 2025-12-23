import React, { useState } from 'react';
import './Profile.css';
import EditProfileModal from './EditProfileModal';
import { useAuth } from '../context/AuthContext';

const Profile = ({ compact = false }) => {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const openModal = () => { setIsModalOpen(true); setIsMenuOpen(false); };
    const closeModal = () => setIsModalOpen(false);

    if (!user) return null;

    // Logic đơn giản: Nếu có ảnh thì hiển thị, không thì dùng ảnh mặc định.
    // Trình duyệt sẽ tự động thêm domain https://se2025-17-3.codes vào trước nếu là đường dẫn tương đối (/uploads/...)
    const getAvatarUrl = () => {
        return user.avatarUrl ? user.avatarUrl : '/default-avatar.png';
    };

    return (
        <div className={`profile-container${compact ? ' compact' : ''}`}>
            <div className="profile-header" onClick={toggleMenu}>
                <img
                    src={getAvatarUrl()}
                    alt={user.displayName}
                    className="avatar"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/default-avatar.png';
                    }}
                />
                {!compact && <span className="username">Chào, {user.displayName}</span>}
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