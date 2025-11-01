import User from '../models/User.js';
import { validationResult } from 'express-validator';

/**
 * @desc    Đăng ký người dùng mới (username, email, password, confirmPassword)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  // 1. Validate input (từ middleware)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Lấy lỗi đầu tiên
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { username, email, password, confirmPassword } = req.body;

  // 2. Kiểm tra mật khẩu khớp
  if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu không khớp' });
  }

  try {
    // 3. Kiểm tra trùng lặp
    let user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (user) {
      if (user.email === email.toLowerCase()) {
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }
      if (user.username === username.toLowerCase()) {
        return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
      }
    }

    // 4. Tạo và lưu user (password tự động hash)
    user = new User({ 
        username: username.toLowerCase(), 
        email: email.toLowerCase(), 
        password 
    });
    await user.save();

    res.status(201).json({ message: 'Đăng ký thành công. Vui lòng đăng nhập.' });

  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * @desc    Đăng nhập người dùng (username, password)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  
  const { username, password } = req.body;

  try {
    // 1. Tìm user bằng username (và lấy cả password)
    const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    // 2. So sánh mật khẩu
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    // 3. Tạo Session
    req.session.userId = user._id;

    // 4. Trả về thông tin user (loại bỏ password)
    const userInfo = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };
    
    res.status(200).json({ message: 'Đăng nhập thành công', user: userInfo });

  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * @desc    Đăng xuất người dùng
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logoutUser = (req, res) => {
  const sessionName = process.env.SESSION_NAME || 'connect.sid';
  
  req.session.destroy((err) => {
    if (err) {
      console.error("Lỗi khi hủy session:", err);
      return res.status(500).json({ message: 'Không thể đăng xuất' });
    }
    
    res.clearCookie(sessionName);
    res.status(200).json({ message: 'Đăng xuất thành công' });
  });
};

