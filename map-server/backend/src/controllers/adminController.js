// map-server/backend/src/controllers/adminController.js

import User from '../models/User.js';
import Pixel from '../models/Pixel.js';
import Team from '../models/Team.js';
import Appeal from '../models/Appeal.js';
import { redis } from '../config/redis.js';

// Helper: Check Super Admin
const isSuperAdmin = (email) => {
    return email && email.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase();
};

// --- CÁC HÀM CŨ GIỮ NGUYÊN (Get, Ban, Delete User...) ---
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;
        const query = {};
        if (search) {
            query.$or = [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
        }
        const users = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
        const total = await User.countDocuments(query);
        res.json({ users, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
    } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
};

export const toggleAdminRole = async (req, res) => {
    const { targetUserId } = req.body;
    if (!isSuperAdmin(req.user.email)) return res.status(403).json({ message: 'Chỉ Super Admin.' });
    try {
        const user = await User.findById(targetUserId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (isSuperAdmin(user.email)) return res.status(403).json({ message: 'Không thể đổi quyền Super Admin.' });
        user.role = user.role === 'admin' ? 'user' : 'admin';
        await user.save();
        res.json({ message: `Đã đổi quyền thành: ${user.role}` });
    } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
};

export const banUser = async (req, res) => {
    const { userId, type } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Không thể ban Admin' });

        if (type === 'unban') {
            user.isBanned = false;
            user.banExpiresAt = null;
            await Appeal.deleteOne({ user: userId });
        } else if (type === 'permanent') {
            user.isBanned = true;
            user.banExpiresAt = null;
        } else {
            user.isBanned = true;
            user.banExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        }
        await user.save();
        res.json({ message: 'Cập nhật trạng thái Ban thành công' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
};

export const deleteUserFull = async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin' && !isSuperAdmin(req.user.email)) return res.status(403).json({ message: 'Không thể xóa Admin.' });

        await Pixel.deleteMany({ userId: user._id });
        if (user.teamId) {
            const team = await Team.findById(user.teamId);
            if (team) {
                if (team.createdBy.toString() === user._id.toString()) {
                    await User.updateMany({ teamId: team._id }, { teamId: null });
                    await Team.deleteOne({ _id: team._id });
                } else {
                    team.memberCount = Math.max(0, team.memberCount - 1);
                    await team.save();
                }
            }
        }
        await Appeal.deleteOne({ user: user._id });
        await User.deleteOne({ _id: user._id });
        
        const keys = await redis.keys('chunk:*');
        if (keys.length > 0) await redis.del(keys);

        res.json({ message: `Đã xóa user ${user.username}.` });
    } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
};

// --- MỚI: GIẢI TÁN TEAM ---
export const dissolveTeam = async (req, res) => {
    const { teamId } = req.body;
    try {
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team không tồn tại.' });

        // Kick hết thành viên
        await User.updateMany({ teamId: team._id }, { $set: { teamId: null } });
        // Xóa team
        await Team.deleteOne({ _id: team._id });

        res.json({ message: `Đã giải tán team "${team.name}".` });
    } catch (error) {
        console.error("Lỗi giải tán team:", error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

// --- CẬP NHẬT: XÓA VÙNG + SOCKET REALTIME ---
export const wipeArea = async (req, res) => {
    const { x1, y1, x2, y2 } = req.body;
    if (x1 == null || y1 == null || x2 == null || y2 == null) return res.status(400).json({ message: 'Thiếu tọa độ.' });

    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    try {
        // Xóa trong DB
        await Pixel.deleteMany({
            gx: { $gte: minX, $lte: maxX },
            gy: { $gte: minY, $lte: maxY }
        });

        // Xóa Cache Redis
        const keys = await redis.keys('chunk:*');
        if (keys.length > 0) await redis.del(keys);

        // --- GỬI SOCKET ---
        if (req.io) {
            req.io.emit('area_wiped', { minX, maxX, minY, maxY });
        }

        res.json({ message: `Đã xóa vùng và cập nhật realtime.` });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa vùng.' });
    }
};

// --- APPEALS ---
export const getAppeals = async (req, res) => {
    try {
        const appeals = await Appeal.find({ status: 'pending' }).populate('user', 'username email isBanned').sort({ createdAt: 1 });
        res.json(appeals);
    } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
};

export const resolveAppeal = async (req, res) => {
    const { appealId, action, reason } = req.body;
    try {
        const appeal = await Appeal.findById(appealId).populate('user');
        if (!appeal) return res.status(404).json({ message: 'Đơn không tồn tại' });

        if (action === 'approve') {
            appeal.status = 'approved';
            appeal.adminResponse = reason || 'Đã ân xá';
            if (appeal.user) {
                appeal.user.isBanned = false;
                appeal.user.banExpiresAt = null;
                await appeal.user.save();
            }
        } else {
            appeal.status = 'rejected';
            appeal.adminResponse = reason || 'Từ chối';
        }
        appeal.processedBy = req.user._id;
        await appeal.save();
        res.json({ message: 'Đã xử lý đơn.' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
};