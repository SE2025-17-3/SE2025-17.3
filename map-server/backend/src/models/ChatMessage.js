// map-server/backend/src/models/ChatMessage.js

import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  scope: {
    type: String,
    enum: ['global', 'team'],
    default: 'global'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  }
}, { 
  timestamps: true 
});

// Index giúp tìm kiếm nhanh
chatMessageSchema.index({ scope: 1, teamId: 1, _id: -1 });

// --- QUAN TRỌNG: Tự động xóa sau 2 ngày (172800 giây) ---
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;