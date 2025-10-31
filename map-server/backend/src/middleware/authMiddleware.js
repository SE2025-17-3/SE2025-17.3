import User from '../models/User.js';

/**
 * @desc    Middleware bảo vệ route, kiểm tra session
 * Đây chính là "người gác cổng"
 */
export const protect = async (req, res, next) => {
  // 1. Kiểm tra xem session có tồn tại và có userId không
  if (req.session && req.session.userId) {
    try {
      // 2. Tìm user trong CSDL (để đảm bảo user vẫn tồn tại)
      //    Loại bỏ password ra khỏi kết quả
      const user = await User.findById(req.session.userId).select('-password');
      
      if (user) {
        // 3. Nếu user tồn tại, gắn thông tin user vào request
        req.user = user; 
        next(); // 4. Cho phép request đi tiếp
      } else {
        // User không tồn tại (có thể đã bị xóa)
        req.session.destroy(); // Hủy session hỏng
        res.status(401).json({ message: 'Unauthorized, người dùng không tồn tại' });
      }
    } catch (error) {
      console.error("Lỗi middleware 'protect':", error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  } else {
    // 5. Không có session -> chưa đăng nhập
    res.status(401).json({ message: 'Unauthorized, vui lòng đăng nhập' });
  }
};

