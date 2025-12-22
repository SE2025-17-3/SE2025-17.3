// backend/src/controllers/authController.js

import User from '../models/User.js';
import { validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================================
   HELPER: ENERGY SYSTEM
================================ */
const RECHARGE_RATE_MS = 30 * 1000;

export const calculateEnergy = async (user) => {
  const now = Date.now();
  const lastUpdate = new Date(user.lastEnergyUpdate).getTime();
  const max = user.maxEnergy || 64;

  if (user.energy >= max) {
    user.energy = max;
    user.lastEnergyUpdate = now;
    return;
  }

  const gained = Math.floor((now - lastUpdate) / RECHARGE_RATE_MS);
  if (gained <= 0) return;

  user.energy = Math.min(max, user.energy + gained);
  user.lastEnergyUpdate =
    user.energy < max
      ? new Date(lastUpdate + gained * RECHARGE_RATE_MS)
      : new Date(now);

  await user.save();
};

/* ================================
   PART 1: FORGOT PASSWORD (OTP)
================================ */

// Send OTP
export const forgotPassword = async (req, res) => {
  const { username, email } = req.body;

  try {
    const user = await User.findOne({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({ message: 'Tên đăng nhập và Email không khớp.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordToken = hashedOtp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      email: user.email,
      subject: '[Wplace] Mã đặt lại mật khẩu',
      message: `<h2>Mã OTP: ${otp}</h2><p>Hết hạn sau 10 phút</p>`,
    });

    res.json({ message: 'Đã gửi mã OTP qua email.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await User.findOne({
    email: email.toLowerCase(),
    resetPasswordToken: hashedOtp,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn.' });
  }

  res.json({ message: 'OTP hợp lệ.' });
};

// Reset password
export const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await User.findOne({
    email: email.toLowerCase(),
    resetPasswordToken: hashedOtp,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'OTP không hợp lệ.' });
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ message: 'Đổi mật khẩu thành công.' });
};

/* ================================
   PART 2: REGISTER & VERIFY EMAIL
================================ */

export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });

  const { username, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword)
    return res.status(400).json({ message: 'Mật khẩu không khớp.' });

  const exist = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (exist)
    return res.status(400).json({ message: 'Email hoặc username đã tồn tại.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  const user = new User({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    displayName: username,
    verificationToken: hashedOtp,
    verificationExpire: Date.now() + 10 * 60 * 1000,
    isVerified: false,
  });

  await user.save();

  await sendEmail({
    email: user.email,
    subject: '[Wplace] Xác thực tài khoản',
    message: `<h2>Mã xác thực: ${otp}</h2>`,
  });

  res.status(201).json({ message: 'Đăng ký thành công, kiểm tra email.' });
};

export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await User.findOne({
    email: email.toLowerCase(),
    verificationToken: hashedOtp,
    verificationExpire: { $gt: Date.now() },
  });

  if (!user)
    return res.status(400).json({ message: 'OTP không hợp lệ.' });

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpire = undefined;
  await user.save();

  res.json({ message: 'Xác thực thành công.' });
};

/* ================================
   PART 3: LOGIN / LOGOUT
================================ */

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({
    username: username.toLowerCase(),
  }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Sai thông tin đăng nhập.' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ message: 'Tài khoản chưa kích hoạt.' });
  }

  // SUPER ADMIN
  if (
    user.email === process.env.SUPER_ADMIN_EMAIL &&
    user.role !== 'admin'
  ) {
    user.role = 'admin';
    await user.save();
  }

  await calculateEnergy(user);
  req.session.userId = user._id;

  res.json({
    message: 'Đăng nhập thành công',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      teamId: user.teamId || null,
      energy: user.energy,
      maxEnergy: user.maxEnergy,
      lastEnergyUpdate: user.lastEnergyUpdate,
      role: user.role,
    },
  });
};

export const logoutUser = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(process.env.SESSION_NAME || 'connect.sid');
    res.json({ message: 'Đã đăng xuất.' });
  });
};

/* ================================
   PART 4: GOOGLE LOGIN
================================ */

export const googleLogin = async (req, res) => {
  const { token } = req.body;

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const { email, name, picture, sub } = ticket.getPayload();
  const lowerEmail = email.toLowerCase();

  let user = await User.findOne({
    $or: [{ googleId: sub }, { email: lowerEmail }],
  });

  if (!user) {
    user = new User({
      username: lowerEmail.split('@')[0],
      email: lowerEmail,
      password: crypto.randomBytes(16).toString('hex'),
      displayName: name,
      avatarUrl: picture,
      googleId: sub,
      isVerified: true,
      role:
        lowerEmail === process.env.SUPER_ADMIN_EMAIL
          ? 'admin'
          : 'user',
    });
  } else {
    user.googleId = sub;
    user.isVerified = true;
    if (lowerEmail === process.env.SUPER_ADMIN_EMAIL) {
      user.role = 'admin';
    }
  }

  await user.save();
  await calculateEnergy(user);
  req.session.userId = user._id;

  res.json({
    message: 'Google login thành công',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      energy: user.energy,
      maxEnergy: user.maxEnergy,
      lastEnergyUpdate: user.lastEnergyUpdate,
      role: user.role,
    },
  });
};
