// backend/src/models/Team.js
import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  memberCount: {
    type: Number,
    default: 1,
    min: 0,
  },
  // --- THÊM PHẦN NÀY ---
  overlay: {
    url: { type: String, default: '' },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 50 },
    aspectRatio: { type: Number, default: 1 },
    opacity: { type: Number, default: 0.5 },
    visible: { type: Boolean, default: false }
  }
  // ---------------------
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);