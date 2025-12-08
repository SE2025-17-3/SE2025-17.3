import mongoose from 'mongoose';

const pixelSchema = new mongoose.Schema({
  gx: {
    type: Number,
    required: true,
    index: true
  },
  gy: {
    type: Number,
    required: true,
    index: true
  },
  color: {
    type: String,
    required: true,
    default: '#FFFFFF'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  // Tự động tạo createdAt và updatedAt (Chuẩn Mongoose)
  timestamps: true
});

// Index tìm kiếm nhanh và duy nhất
pixelSchema.index({ gx: 1, gy: 1 }, { unique: true });
// Index phụ
pixelSchema.index({ userId: 1 });

export default mongoose.model('Pixel', pixelSchema);