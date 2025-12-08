// frontend/src/components/EditProfileModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './EditProfileModal.css';

const EditProfileModal = ({ closeModal }) => {
    const { user, updateUserContext } = useAuth();

    const [displayName, setDisplayName] = useState(user.displayName);
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
            // Lệnh gọi API này đã đúng vì nó sử dụng instance 'api'
            // đã được cấu hình với baseURL tương đối ('/api')
            const { data } = await api.patch('/users/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            updateUserContext(data);
            closeModal();
        } catch (err) {
            setError(err.response?.data?.message || 'Cập nhật thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Chỉnh sửa hồ sơ</h2>
                <form onSubmit={handleSubmit}>
                    <div className="avatar-upload">
                        <label htmlFor="avatar-input">
                            {/* user.avatarUrl đã là một đường dẫn tương đối (ví dụ: '/avatars/...'),
                                trình duyệt sẽ tự động nối nó vào domain hiện tại. */}
                            <img src={preview || user.avatarUrl} alt="Avatar Preview" className="avatar-preview" />
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