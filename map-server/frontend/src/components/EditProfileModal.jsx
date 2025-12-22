// map-server/frontend/src/components/EditProfileModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './EditProfileModal.css';

const EditProfileModal = ({ closeModal }) => {
    const { user, updateUserContext } = useAuth();

    // --- SỬA LỖI URL ---
    // Hàm này giúp lấy đúng đường dẫn server chứa ảnh
    // 1. Nếu build production -> Lấy origin hiện tại (http://136.112.99.88)
    // 2. Nếu chạy dev -> Lấy localhost:4000
    const getBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (import.meta.env.PROD) return window.location.origin;
        return 'http://localhost:4000';
    };

    const API_URL = getBaseUrl();
    // -------------------

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
            updateUserContext(data); // Cập nhật state toàn cục
            closeModal();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Cập nhật thất bại.');
        } finally {
            setLoading(false);
        }
    };

    // Helper để hiển thị ảnh: Nếu có preview (vừa chọn) thì dùng preview,
    // nếu không thì dùng ảnh từ server (kèm API_URL)
    const getAvatarSrc = () => {
        if (preview) return preview;
        if (user.avatarUrl) {
            // Kiểm tra xem avatarUrl có phải là link tuyệt đối (http...) hay tương đối
            if (user.avatarUrl.startsWith('http')) return user.avatarUrl;
            return `${API_URL}${user.avatarUrl}`;
        }
        return null; // Hoặc đường dẫn ảnh default nếu muốn
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Chỉnh sửa hồ sơ</h2>
                <form onSubmit={handleSubmit}>
                    <div className="avatar-upload">
                        <label htmlFor="avatar-input">
                            <img
                                src={getAvatarSrc() || '/default-avatar.png'}
                                alt="Avatar Preview"
                                className="avatar-preview"
                                // Thêm xử lý lỗi nếu ảnh không load được
                                onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                            />
                        </label>
                        <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="name">Tên hiển thị</label>
                        <input type="text" id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-actions">
                        <button type="button" onClick={closeModal} disabled={loading}>Đóng</button>
                        <button type="submit" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;
