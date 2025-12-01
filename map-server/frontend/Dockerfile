# frontend/Dockerfile

# --- GIAI ĐOẠN 1: BUILD ---
# Sử dụng Node.js để build ứng dụng React
FROM node:18-alpine as builder

WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Sao chép toàn bộ source code
COPY . .

# Build ứng dụng, tạo ra thư mục 'dist'
RUN npm run build

# --- GIAI ĐOẠN 2: SERVE ---
# Sử dụng Nginx, một web server nhẹ và hiệu năng cao
FROM nginx:stable-alpine

# Sao chép các file static đã được build từ giai đoạn 'builder'
# vào thư mục mặc định của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html


# Và bỏ comment dòng dưới đây:
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Mở port 80
EXPOSE 80

# Lệnh để khởi chạy Nginx
CMD ["nginx", "-g", "daemon off;"]