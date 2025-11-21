// backend/src/controllers/userController.js
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// --- Cấu hình Multer để upload ảnh ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'public/avatars';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadUserAvatar = upload.single('avatar');

// --- Các hàm Controller ---
export const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            teamId: user.teamId || null,
        });
    } else {
        res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
};

export const updateUserProfile = async (req, res) => {
    console.log('Backend received data:', { body: req.body, file: req.file });

    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.displayName = req.body.displayName || user.displayName;
            if (req.file) {
                if (user.avatarUrl && !user.avatarUrl.includes('default-avatar.png')) {
                    const oldPath = path.join('public', user.avatarUrl);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                user.avatarUrl = `/avatars/${req.file.filename}`;
            }
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                displayName: updatedUser.displayName,
                avatarUrl: updatedUser.avatarUrl,
                teamId: updatedUser.teamId || null,
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) {
        console.error('Lỗi cập nhật profile:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật profile' });
    }
};