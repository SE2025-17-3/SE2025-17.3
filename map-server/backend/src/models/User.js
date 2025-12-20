// backend/src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Vui lòng nhập tên đăng nhập'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: [true, 'Vui lòng nhập email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Vui lòng nhập email hợp lệ'],
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    // SỬA: Bỏ 'required: true' để tránh lỗi validation khi tạo user từ Google
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    select: false,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },

  avatarUrl: {
    type: String,
    default: '/avatars/default-avatar.png',
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
  },
  // --- NĂNG LƯỢNG ---
  energy: {
    type: Number,
    default: 64
  },
  maxEnergy: {
    type: Number,
    default: 64
  },
  lastEnergyUpdate: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false,
  },

  verificationToken: String,
  verificationExpire: Date,

  // --- QUÊN MẬT KHẨU ---
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // --- CHALLENGE SYSTEM ---
  challengePoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  badges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge',
  }],

  // --- PAYMENT SYSTEM ---
  stripeCustomerId: {
    type: String,
    sparse: true,
    index: true,
  },
}, { timestamps: true });

// Middleware mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function (next) {
  // Chỉ hash nếu mật khẩu được thay đổi (hoặc tạo mới)
  if (!this.isModified('password')) return next();

  // Nếu password rỗng (trường hợp Google Login không set pass), bỏ qua
  if (!this.password) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Phương thức kiểm tra mật khẩu
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Nếu user này không có password (chỉ dùng Google), luôn trả về false
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);