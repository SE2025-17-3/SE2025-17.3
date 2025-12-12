// backend/src/controllers/authController.js

import User from '../models/User.js';
import { validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- HELPER: Tính toán năng lượng ---
const RECHARGE_RATE_MS = 30 * 1000;

export const calculateEnergy = async (user) => {
  const now = Date.now();
  const lastUpdate = new Date(user.lastEnergyUpdate).getTime();
  const max = user.maxEnergy || 64;

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

    if (newEnergy < max) {
      user.lastEnergyUpdate = new Date(lastUpdate + (gained * RECHARGE_RATE_MS));
    } else {
      user.lastEnergyUpdate = new Date(now);
    }

    await user.save();
  }
};

// ==========================================
// PHẦN 1: QUÊN MẬT KHẨU & ĐỔI MẬT KHẨU (OTP)
// ==========================================

// 1. Gửi mã OTP lấy lại mật khẩu (Kiểm tra Username + Email)
export const forgotPassword = async (req, res) => {
  const { username, email } = req.body;

  try {
    // Kiểm tra User có khớp cả Username và Email không
    const user = await User.findOne({
      email: email.toLowerCase(),
      username: username.toLowerCase()
    });

    if (!user) {
      return res.status(404).json({ message: 'Tên đăng nhập và Email không khớp hoặc không tồn tại.' });
    }

    // Tạo mã OTP 6 số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP để lưu vào DB
    const resetToken = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    // Lưu vào DB (Hết hạn sau 10 phút)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Gửi Email
    const message = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #3498db;">Mã xác thực lấy lại mật khẩu</h2>
        <p>Xin chào <strong>${user.displayName}</strong>,</p>
        <p>Bạn đã yêu cầu lấy lại mật khẩu cho tài khoản <strong>${user.username}</strong>.</p>
        <p>Đây là mã xác thực của bạn:</p>
        <h1 style="letter-spacing: 5px; color: #2c3e50; background: #f8f9fa; padding: 10px; text-align: center; border-radius: 5px;">${otp}</h1>
        <p>Mã này sẽ hết hạn sau 10 phút.</p>
        <p style="color: #e74c3c; font-size: 12px;">Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: '[Wplace] Mã xác thực đặt lại mật khẩu',
        message,
      });

      res.status(200).json({ message: 'Mã xác thực đã được gửi vào email!' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// 2. Kiểm tra mã OTP (Dùng để validate trước khi chuyển UI)
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedOtp,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Mã xác thực không đúng hoặc đã hết hạn.' });
    }

    res.status(200).json({ message: 'Mã xác thực hợp lệ.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// 3. Đặt lại mật khẩu mới
export const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  try {
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedOtp,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Phiên làm việc hết hạn hoặc mã sai, vui lòng thử lại.' });
    }

    // Cập nhật mật khẩu mới (Middleware pre-save trong User model sẽ hash password)
    user.password = password;

    // Xóa token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ==========================================
// PHẦN 2: ĐĂNG KÝ & XÁC THỰC EMAIL
// ==========================================

// 1. Đăng ký tài khoản (Gửi OTP kích hoạt)
export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { username, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) return res.status(400).json({ message: 'Mật khẩu không khớp' });

  try {
    // Check tồn tại
    let user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (user) return res.status(400).json({ message: 'Email hoặc Tên đăng nhập đã tồn tại' });

    // Tạo mã OTP kích hoạt
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Tạo user mới (isVerified: false)
    user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      displayName: username,
      verificationToken: hashedOtp,
      verificationExpire: Date.now() + 10 * 60 * 1000, // 10 phút
      isVerified: false
    });

    await user.save();

    // Gửi Email
    const message = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2ecc71;">Xác thực tài khoản Wplace</h2>
        <p>Chào mừng bạn đến với Wplace!</p>
        <p>Mã xác thực đăng ký của bạn là:</p>
        <h1 style="letter-spacing: 5px; color: #2c3e50; background: #f0fff4; padding: 10px; text-align: center; border-radius: 5px;">${otp}</h1>
        <p>Mã này hết hạn sau 10 phút.</p>
      </div>
    `;

    try {
      await sendEmail({ email: user.email, subject: '[Wplace] Mã xác thực đăng ký', message });
      res.status(201).json({ message: 'Đăng ký thành công! Vui lòng kiểm tra email để lấy mã xác thực.' });
    } catch (err) {
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: 'Không thể gửi email xác thực.' });
    }

  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// 2. Xác thực Email (Kích hoạt tài khoản)
export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationToken: hashedOtp,
      verificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Mã xác thực không đúng hoặc đã hết hạn.' });
    }

    // Kích hoạt tài khoản
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Xác thực thành công! Bạn có thể đăng nhập ngay bây giờ.' });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ==========================================
// PHẦN 3: ĐĂNG NHẬP, ĐĂNG XUẤT, GOOGLE
// ==========================================

export const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    // KIỂM TRA ĐÃ XÁC THỰC EMAIL CHƯA
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email.' });
    }

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

export const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }]
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatarUrl) user.avatarUrl = picture;
        // Nếu đã có tài khoản cũ nhưng chưa verify -> Verify luôn vì đã login qua Google
        if (!user.isVerified) user.isVerified = true;
        await user.save();
      }
    } else {
      // User mới qua Google -> Auto Verified
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      let baseUsername = name.replace(/\s/g, '').toLowerCase();
      let username = baseUsername;
      let counter = 1;

      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = new User({
        username: username,
        email: email.toLowerCase(),
        password: randomPassword,
        displayName: name,
        avatarUrl: picture,
        googleId: googleId,
        isVerified: true // Google user tự động kích hoạt
      });

      await user.save();
    }

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

    res.status(200).json({ message: 'Đăng nhập Google thành công', user: userInfo });

  } catch (error) {
    console.error("Lỗi Google Login:", error);
    res.status(400).json({ message: 'Đăng nhập Google thất bại', error: error.message });
  }
};