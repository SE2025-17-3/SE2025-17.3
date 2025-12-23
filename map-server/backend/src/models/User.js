// backend/src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, select: false },
  displayName: { type: String, required: true },
  avatarUrl: { type: String, default: '/avatars/default-avatar.png' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  energy: { type: Number, default: 64 },
  maxEnergy: { type: Number, default: 64 },
  lastEnergyUpdate: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  googleId: String,
  
  // --- ADMIN & BAN SYSTEM ---
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Trạng thái cấm vĩnh viễn (cũ) hoặc tạm thời (mới)
  isBanned: { type: Boolean, default: false }, 
  // Thời điểm được mở khóa (nếu null thì check isBanned vĩnh viễn)
  banExpiresAt: { type: Date, default: null },
  
  // --- QUÊN MẬT KHẨU / VERIFY ---
  verificationToken: String,
  verificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // --- CHALLENGE SYSTEM ---
  challengePoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  challengeStreak: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastChallengeDate: {
    type: Date,
    default: null,
  },
  totalChallengesCompleted: {
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

// ... (Giữ nguyên middleware pre-save và method matchPassword)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);