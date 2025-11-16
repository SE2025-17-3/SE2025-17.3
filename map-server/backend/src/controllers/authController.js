// backend/src/controllers/authController.js
import User from '../models/User.js';
import { validationResult } from 'express-validator';

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

    // Sửa lỗi validation: Gán displayName ngay khi tạo user
    user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      displayName: username // Gán giá trị ban đầu để vượt qua validation
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

    req.session.userId = user._id;

    // Trả về đầy đủ thông tin cần thiết cho frontend
    const userInfo = {
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
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
