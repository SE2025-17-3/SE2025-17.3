// backend/src/models/UserChallenge.js
import mongoose from 'mongoose';

const userChallengeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0
  },
  completed: {
    type: Boolean,
    default: false,
    index: true
  },
  completedAt: {
    type: Date
  },
  rewardClaimed: {
    type: Boolean,
    default: false,
    index: true
  },
  claimedAt: {
    type: Date,
    default: null
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Compound index for efficient queries
userChallengeSchema.index({ userId: 1, challengeId: 1, date: 1 });
userChallengeSchema.index({ userId: 1, completed: 1 });

export default mongoose.model('UserChallenge', userChallengeSchema);
