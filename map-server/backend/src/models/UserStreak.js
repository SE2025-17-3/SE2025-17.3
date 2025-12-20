// backend/src/models/UserStreak.js
import mongoose from 'mongoose';

const userStreakSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActivityDate: {
    type: Date
  },
  streakStartDate: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('UserStreak', userStreakSchema);
