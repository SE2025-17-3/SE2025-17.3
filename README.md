# Hệ thống bản đồ pixel (Pixel Map System)

* **Đề tài:** Hệ thống bản đồ pixel
* **Giảng viên:** Bùi Sỹ Nguyên

---

## 1. 🚀 Tổng quan

Dự án này là một hệ thống bản đồ pixel tương tác, lấy cảm hứng từ r/place, cho phép người dùng tô màu lên một canvas toàn cầu. Các thay đổi được cập nhật **real-time** cho tất cả người dùng khác.

### Các tính năng chính

* **Xác thực Stateful:** Sử dụng hệ thống **Session + Cookie**. Khi đăng nhập, server tạo một session (lưu trong MongoDB) và gửi về cookie `connect.sid` (với cờ `httpOnly: true`).
* **Cập nhật Real-time:** Sử dụng phương pháp hybrid:
    * **HTTP:** Dùng để tải dữ liệu pixel (`GET /api/pixels/chuck/...`) và gửi lệnh tô màu (`POST /api/pixels`).
    * **Socket.IO:** Server phát sóng (broadcast) sự kiện `pixels_placed` sau khi một lệnh tô màu được xử lý thành công, giúp mọi client khác cập nhật canvas ngay lập tức.
* **Luồng tô màu (r/place Flow):**
    1.  Người dùng click vào 1 ô pixel để chọn (`selectedPixel`).
    2.  Hộp thông tin (Info Box) hiện ra.
    3.  Click nút "Paint" sẽ bật `paintMode` và hiển thị bảng màu.
    4.  Ô vừa chọn được thêm vào `pendingPixels` (danh sách chờ tô).
    5.  Người dùng có thể chọn thêm các pixel khác vào `pendingPixels`.
    6.  Click nút "Paint (X/64)" ở giữa để gửi toàn bộ `pendingPixels` lên server.
* **Chống Spam:**
    * Sử dụng **Google reCAPTCHA** cho các chức năng đăng ký và đăng nhập.
    * Frontend có bộ đếm `pixelCount` (giới hạn 50 pixel) và `TIME_LIMIT` (15 phút). Nếu vượt quá, người dùng sẽ bị yêu cầu xác thực lại (re-verify).

---

## 2. 🛠️ Cấu trúc Công nghệ

### Backend

* **Server:** Node.js, Express
* **Database:** MongoDB
* **Schema/Models:** Mongoose (`User`, `Pixel`)
* **Xác thực:** `express-session` và `connect-mongo` (để lưu session vào DB)
* **Mã hóa mật khẩu:** `bcrypt`
* **Real-time:** `Socket.IO`
* **Bảo mật:** `CORS`, `reCAPTCHA`

### Frontend

* **Framework:** React
* **Gọi API:** Axios (với `withCredentials: true` để gửi cookie session)
* **Quản lý State:** React Context API (`AuthContext`, `SocketContext`, `VerificationContext`)
* **Real-time:** `socket.io-client`

---

## 3. 📂 Phân tích Cấu trúc (File-by-File)

### Backend

* `server.js`: File khởi động chính. Tải `.env`, kết nối CSDL, tạo server HTTP và Socket.IO, cấu hình `express-session` và `MongoStore`.
* `app.js`: Trái tim của Express. Cấu hình middleware (CORS, JSON) và chứa hàm `configureRoutes` để "tiêm" `io` vào các routes.
* `controllers/`: Nơi chứa logic nghiệp vụ.
    * `authController.js`: Xử lý đăng ký, đăng nhập, logout. Tạo session (`req.session.userId = ...`) và hủy session (`req.session.destroy()`).
    * `pixelController.js`: Xử lý logic tô màu, xóa màu, và lấy pixel theo chunk. Nhận `io` để gọi `io.emit()` sau khi thao tác CSDL thành công.
* `middleware/`: Những "người gác cổng".
    * `authMiddleware.js`: Kiểm tra `req.session.userId` để bảo vệ các API cần đăng nhập.
    * `captchaMiddleware.js`: Xác thực `recaptchaToken` với Google.
* `models/`: Định nghĩa Mongoose Schema.
    * `User.js`: Lưu `username` (unique), `email` (unique), `password` (hashed).
    * `Pixel.js`: Lưu `gx`, `gy` (indexed, unique), `color`, `updatedAt`.
* `routes/`: Ánh xạ các URL (endpoints) tới các hàm controller tương ứng và gắn middleware.

### Frontend

* `main.jsx`: File khởi động React. Bọc `<App />` trong các Provider (Auth, Verification, Socket).
* `services/api.js`: Tạo một `axios instance` duy nhất với `withCredentials: true`.
* `context/`: Quản lý state toàn cục.
    * `AuthContext.jsx`: Quản lý `isLoggedIn`, `user`, và trạng thái của AuthModal. Chạy `checkAuthStatus` (gọi `/api/users/me`) khi tải trang để tự động đăng nhập.
    * `SocketContext.jsx`: Tạo và duy trì một kết nối Socket.IO duy nhất.
    * `VerificationContext.jsx`: Quản lý bộ đếm chống spam.
* `App.jsx`: Bộ điều phối UI chính. Quản lý các state "tạm thời" của luồng tô màu (`paintMode`, `selectedPixel`, `pendingPixels`). Render các component chính và các modal.
* `components/`:
    * `GlobalCanvasGrid.jsx`: Trái tim của ứng dụng. Render `<canvas>`.
        * `loadVisibleChunks`: Tải pixel từ API.
        * `useEffect[socket]`: Lắng nghe sự kiện `pixels_placed` và `pixels_erased` để cập nhật state, kích hoạt vẽ lại.
        * `drawCanvas`: Vẽ 4 lớp: 1. Pixel từ CSDL, 2. Viền chọn (selected), 3. Viền chờ tô (pending), 4. Ô mờ (hover).
        * Xử lý logic `click` (chọn/thêm vào pending) và `mousemove` (cập nhật hover).
    * `PaintControls.jsx`: Thanh công cụ tô màu (bảng màu, tẩy). Xử lý `handleSubmit` để gom `pendingPixels` và gọi API (POST hoặc DELETE).
    * `PixelInfoBox.jsx`: Hộp thông tin ở góc, hiển thị tọa độ pixel và nút "Paint".
    * `VerificationModal.jsx`: Modal CAPTCHA, tự hiện khi `isVerificationRequired` là `true`.

---

## 4. 🌐 API Endpoints

### Auth
* `POST /api/auth/register`: Đăng ký (Bảo vệ bởi reCAPTCHA).
* `POST /api/auth/login`: Đăng nhập (Bảo vệ bởi reCAPTCHA).
* `POST /api/auth/logout`: Đăng xuất (Bảo vệ bởi Session).

### Users
* `GET /api/users/me`: Lấy thông tin user hiện tại (Bảo vệ bởi Session).
* `POST /api/users/re-verify`: Xác thực lại (Bảo vệ bởi reCAPTCHA + Session).

### Pixels
* `GET /api/pixels/chunk/:x/:y`: Lấy dữ liệu pixel cho một chunk (Không bảo vệ).
* `POST /api/pixels`: Tô màu (gửi mảng `pixels`). (Bảo vệ bởi Session).
* `DELETE /api/pixels`: Xóa màu (gửi mảng `pixels`). (Bảo vệ bởi Session).
