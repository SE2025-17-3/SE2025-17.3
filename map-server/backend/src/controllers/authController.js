import User from '../models/User.js';
import { validationResult } from 'express-validator';

// --- HELPER: Tính toán năng lượng ---
const RECHARGE_RATE_MS = 30 * 1000; // 30 giây hồi 1 điểm

export const calculateEnergy = async (user) => {
  const now = Date.now();
  const lastUpdate = new Date(user.lastEnergyUpdate).getTime();
  const max = user.maxEnergy || 64;

  // Nếu năng lượng đã đầy hoặc hơn, chỉ cập nhật thời gian
  if (user.energy >= max) {
    if (user.energy > max) user.energy = max;
    user.lastEnergyUpdate = now;
    return;
  }

  const elapsed = now - lastUpdate;
  const gained = Math.floor(elapsed / RECHARGE_RATE_MS);

  if (gained > 0) {
    const newEnergy = Math.min(max, user.energy + gained);
    user.energy = newEnergy;
    
    // Giữ lại phần dư thời gian (VD: 45s trôi qua -> hồi 1 điểm, dư 15s cho lần sau)
    if (newEnergy < max) {
      user.lastEnergyUpdate = new Date(lastUpdate + (gained * RECHARGE_RATE_MS));
    } else {
      user.lastEnergyUpdate = new Date(now);
    }
    
    await user.save();
  }
};

export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { username, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu không khớp' });
  }

  try {
    let user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (user) {
      return res.status(400).json({ message: 'Email hoặc Tên đăng nhập đã tồn tại' });
    }

    user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      displayName: username
    });
    await user.save();

    res.status(201).json({ message: 'Đăng ký thành công. Vui lòng đăng nhập.' });

  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    // Tính toán năng lượng khi đăng nhập
    await calculateEnergy(user);

    req.session.userId = user._id;

    const userInfo = {
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      teamId: user.teamId || null,
      energy: user.energy,
      maxEnergy: user.maxEnergy,
      lastEnergyUpdate: user.lastEnergyUpdate
    };

    res.status(200).json({ message: 'Đăng nhập thành công', user: userInfo });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Không thể đăng xuất' });
    }
    res.clearCookie(process.env.SESSION_NAME || 'connect.sid');
    res.status(200).json({ message: 'Đăng xuất thành công' });
  });
};