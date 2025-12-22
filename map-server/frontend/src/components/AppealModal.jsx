// map-server/frontend/src/components/AppealModal.jsx
import React, { useState } from 'react';
import api from '../services/api';

const AppealModal = ({ onClose }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    // --- ĐÂY LÀ ĐOẠN CODE BẠN HỎI ---
    const submitAppeal = async (e) => {
        e.preventDefault();
        if (!content.trim()) return alert("Vui lòng nhập nội dung.");
        
        setLoading(true);
        try {
            await api.post('/users/appeal', { content });
            alert("Đã gửi đơn khiếu nại. Vui lòng chờ Admin xem xét.");
            onClose(); // Đóng modal sau khi gửi xong
        } catch (err) {
            alert(err.response?.data?.message || 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in-down">
                <h3 className="text-xl font-bold text-red-600 mb-2">Đơn Khiếu Nại (Appeal)</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Tài khoản của bạn đang bị khóa. Nếu bạn cho rằng đây là nhầm lẫn, hãy gửi lời nhắn tới Admin.
                </p>
                
                <form onSubmit={submitAppeal}>
                    <textarea 
                        className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                        placeholder="Trình bày lý do hoặc lời xin lỗi..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                    />
                    
                    <div className="flex gap-3 mt-4 justify-end">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 font-bold"
                        >
                            Đóng
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold disabled:opacity-50"
                        >
                            {loading ? 'Đang gửi...' : 'Gửi đơn'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppealModal;