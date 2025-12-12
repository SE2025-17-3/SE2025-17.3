// frontend/src/components/EditProfileModal.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './EditProfileModal.css';

const EditProfileModal = ({ closeModal }) => {
    const { user, updateUserContext } = useAuth();

    // --- GIỮ NGUYÊN HÀM getBaseUrl NHƯ YÊU CẦU ---
    const getBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (import.meta.env.PROD) return window.location.origin;
        return 'http://localhost:4000';
    };

    const API_URL = getBaseUrl();
    // ----------------------------------------------

    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Dọn dẹp URL preview khi component unmount hoặc khi ảnh thay đổi
    // (Giúp tránh rò rỉ bộ nhớ và giảm giật)
    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            // Tạo URL mới
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('displayName', displayName);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        try {
            // Lưu ý: Endpoint là /users/profile hay /users/me tuỳ vào backend của bạn
            // Ở đây tôi giữ nguyên theo code cũ của bạn là /users/profile
            const { data } = await api.patch('/users/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            updateUserContext(data);
            closeModal();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Cập nhật thất bại.');
        } finally {
            setLoading(false);
        }
    };

    // Helper hiển thị ảnh an toàn, không bị lỗi đường dẫn
    const getAvatarSrc = () => {
        // 1. Ưu tiên ảnh vừa chọn (Preview)
        if (preview) return preview;

        // 2. Nếu không có ảnh trong DB, dùng ảnh mặc định local
        if (!user.avatarUrl) return '/default-avatar.png';

        // 3. Nếu là ảnh Google (http...)
        if (user.avatarUrl.startsWith('http')) return user.avatarUrl;

        // 4. Nếu là ảnh server, nối API_URL vào
        // Xử lý kỹ để tránh bị 2 dấu gạch chéo (//)
        const cleanBase = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
        const cleanPath = user.avatarUrl.startsWith('/') ? user.avatarUrl : `/${user.avatarUrl}`;

        return `${cleanBase}${cleanPath}`;
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Chỉnh sửa hồ sơ</h2>
                <form onSubmit={handleSubmit}>
                    <div className="avatar-upload">
                        <label htmlFor="avatar-input" style={{ cursor: 'pointer', display: 'block' }}>
                            <img
                                src={getAvatarSrc()}
                                alt="Avatar Preview"
                                className="avatar-preview"
                                // Thêm style này để tránh nhấp nháy chữ Alt Text khi đang load
                                style={{
                                    objectFit: 'cover',
                                    backgroundColor: '#f0f0f0',
                                    minHeight: '100px',
                                    minWidth: '100px',
                                    display: 'block'
                                }}
                                // Fallback nếu ảnh lỗi
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/default-avatar.png'; // Đảm bảo file này có trong public folder
                                }}
                            />
                            <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#007bff' }}>
                                Thay đổi ảnh
                            </div>
                        </label>
                        <input
                            id="avatar-input"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="name">Tên hiển thị</label>
                        <input
                            type="text"
                            id="name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <div className="form-actions">
                        <button type="button" onClick={closeModal} disabled={loading} className="btn-cancel">
                            Đóng
                        </button>
                        <button type="submit" disabled={loading} className="btn-save">
                            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;