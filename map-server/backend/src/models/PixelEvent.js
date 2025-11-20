import mongoose from 'mongoose';

const pixelEventSchema = new mongoose.Schema({
  gx: { type: Number, required: true },
  gy: { type: Number, required: true },
  color: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Useful indexes
pixelEventSchema.index({ createdAt: -1 });
pixelEventSchema.index({ userId: 1, createdAt: -1 });
pixelEventSchema.index({ teamId: 1, createdAt: -1 });

export default mongoose.model('PixelEvent', pixelEventSchema);
