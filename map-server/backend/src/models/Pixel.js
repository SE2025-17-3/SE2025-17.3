import mongoose from 'mongoose';

const pixelSchema = new mongoose.Schema({
  gx: { 
    type: Number, 
    required: true,
    index: true // Index đơn để query nhanh
  },
  gy: { 
    type: Number, 
    required: true,
    index: true 
  },
  color: { 
    type: String, 
    required: true,
    // Bỏ validation Regex quá chặt ở đây để tránh lỗi lưu DB.
    // Việc validate màu nên để Controller lo.
    default: '#FFFFFF'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { 
  // Tự động tạo createdAt và updatedAt
  timestamps: true 
});

// --- INDEX KÉP QUAN TRỌNG NHẤT ---
// Giúp tìm kiếm chính xác tọa độ và đảm bảo 1 tọa độ chỉ có 1 pixel
pixelSchema.index({ gx: 1, gy: 1 }, { unique: true });

// Index phụ trợ
pixelSchema.index({ updatedAt: -1 }); 
pixelSchema.index({ userId: 1 }); 

const Pixel = mongoose.model('Pixel', pixelSchema);
export default Pixel;
