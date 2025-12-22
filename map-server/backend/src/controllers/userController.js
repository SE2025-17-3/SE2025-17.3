// map-server/backend/src/controllers/userController.js

import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { calculateEnergy } from './authController.js';
import Appeal from '../models/Appeal.js';

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

export const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        // Cập nhật năng lượng mới nhất trước khi trả về
        await calculateEnergy(user);

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            teamId: user.teamId || null,
            energy: user.energy,
            maxEnergy: user.maxEnergy || 64,
            lastEnergyUpdate: user.lastEnergyUpdate
        });
    } else {
        res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
};

export const updateUserProfile = async (req, res) => {
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
            
            // Trả về cả info năng lượng
            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                displayName: updatedUser.displayName,
                avatarUrl: updatedUser.avatarUrl,
                teamId: updatedUser.teamId || null,
                energy: updatedUser.energy,
                maxEnergy: updatedUser.maxEnergy,
                lastEnergyUpdate: updatedUser.lastEnergyUpdate
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) {
        console.error('Lỗi cập nhật profile:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật profile' });
    }
};

export const submitAppeal = async (req, res) => {
    const { content } = req.body;
    const userId = req.user._id;

    try {
        // 1. Kiểm tra xem user có bị ban không
        if (!req.user.isBanned) {
            return res.status(400).json({ message: 'Tài khoản của bạn không bị khóa.' });
        }

        // 2. Kiểm tra xem đã có đơn đang chờ chưa (tránh spam)
        const existingAppeal = await Appeal.findOne({ user: userId, status: 'pending' });
        if (existingAppeal) {
            return res.status(400).json({ message: 'Bạn đã có một đơn khiếu nại đang chờ xử lý.' });
        }

        // 3. Tạo đơn mới
        await Appeal.create({
            user: userId,
            email: req.user.email,
            content: content
        });

        res.status(201).json({ message: 'Gửi đơn khiếu nại thành công. Vui lòng chờ Admin phản hồi.' });
    } catch (error) {
        console.error("Lỗi gửi đơn:", error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

