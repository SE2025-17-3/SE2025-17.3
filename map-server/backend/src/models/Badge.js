// backend/src/models/Badge.js
import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  requirement: {
    type: String,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('Badge', badgeSchema);
