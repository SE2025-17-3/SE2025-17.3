// backend/src/models/Appeal.js
import mongoose from 'mongoose';

const appealSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Mỗi người chỉ được 1 đơn đang chờ xử lý
  },
  email: { type: String, required: true },
  content: { type: String, required: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminResponse: { type: String }, // Lý do từ chối hoặc chấp nhận
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Appeal', appealSchema);