// backend/src/models/Challenge.js
import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'achievement'],
    default: 'daily',
    index: true
  },
  goal: {
    action: {
      type: String,
      required: true,
      enum: ['login', 'place_pixels', 'use_colors', 'team_pixels']
    },
    count: {
      type: Number,
      required: true,
      min: 1
    },
    conditions: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  reward: {
    points: {
      type: Number,
      required: true,
      min: 0
    },
    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge'
    }
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  icon: {
    type: String,
    default: '🎯'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
challengeSchema.index({ type: 1, isActive: 1 });

export default mongoose.model('Challenge', challengeSchema);
