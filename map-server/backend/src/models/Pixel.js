import mongoose from 'mongoose';

const pixelSchema = new mongoose.Schema({
  gx: { 
    type: Number, 
    required: true 
  },
  gy: { 
    type: Number, 
    required: true 
  },
  color: { 
    type: String, 
    default: '#FFFFFF', // Đổi thành màu trắng mặc định hoặc màu nền của bạn
    match: [/^#[0-9a-fA-F]{6}$/, 'Mã màu không hợp lệ (#rrggbb)'] 
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Cho phép pixel anonymous (không bắt buộc phải đăng nhập)
    default: null
  },
  updatedAt: { // <-- Thêm trường này
    type: Date,
    default: Date.now,
  }
});

// Index để tìm kiếm nhanh theo tọa độ (quan trọng!)
pixelSchema.index({ gx: 1, gy: 1 }, { unique: true });
// Index theo thời gian (hữu ích sau này)
pixelSchema.index({ updatedAt: -1 }); 
// Index theo userId để track pixels của từng user
pixelSchema.index({ userId: 1 }); 

// Middleware để tự động cập nhật 'updatedAt' trước khi lưu
pixelSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() }); // Cập nhật trường updatedAt
  next();
});

// Lưu ý: findOneAndUpdate sẽ không tự trigger pre('save') hook

export default mongoose.model('Pixel', pixelSchema);