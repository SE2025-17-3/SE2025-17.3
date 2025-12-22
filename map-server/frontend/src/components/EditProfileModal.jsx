// frontend/src/components/EditProfileModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './EditProfileModal.css';

const EditProfileModal = ({ closeModal }) => {
    const { user, updateUserContext } = useAuth();

    // [FIX 1] Lấy Domain gốc (không kèm /api)
    // Ví dụ: https://se2025-17-3.codes/api -> https://se2025-17-3.codes
    const getDomain = () => {
        // Ưu tiên lấy từ biến môi trường
        const apiUrl = import.meta.env.VITE_API_URL;

        if (apiUrl) {
            // Nếu API_URL có chứa '/api', ta cắt bỏ nó đi để lấy domain gốc
            return apiUrl.replace('/api', '');
        }

        // Fallback nếu chạy local
        if (!import.meta.env.PROD) return 'http://localhost:4000';

        // Fallback production
        return window.location.origin;
    };

    const DOMAIN = getDomain();

    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setPreview(URL.createObjectURL(file));
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

    // [FIX 2] Logic hiển thị ảnh chuẩn xác
    const getAvatarSrc = () => {
        // 1. Ưu tiên ảnh vừa chọn (preview)
        if (preview) return preview;

        // 2. Nếu user có avatar
        if (user.avatarUrl) {
            // Nếu là link Google/Facebook (bắt đầu bằng http) -> Dùng luôn
            if (user.avatarUrl.startsWith('http')) return user.avatarUrl;

            // Nếu là file lưu trên server
            // Lưu ý: Backend cần có dòng: app.use('/public', express.static(...))
            return `${DOMAIN}/public/avatars/${user.avatarUrl}`;
        }

        // 3. Mặc định
        return '/default-avatar.png';
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Chỉnh sửa hồ sơ</h2>
                <form onSubmit={handleSubmit}>
                    <div className="avatar-upload">
                        <label htmlFor="avatar-input">
                            <img
                                src={getAvatarSrc()}
                                alt="Avatar Preview"
                                className="avatar-preview"
                                // [FIX 3] Xử lý nếu ảnh lỗi thì hiện ảnh mặc định
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/default-avatar.png';
                                }}
                            />
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
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-actions">
                        <button type="button" onClick={closeModal} disabled={loading}>Đóng</button>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;