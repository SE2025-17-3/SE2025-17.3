# map-server/backend/Dockerfile

# Sử dụng image Node.js 18-alpine, nhẹ và hiệu quả
FROM node:18-alpine

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Sao chép package.json và package-lock.json để tận dụng Docker cache
# Chỉ khi các file này thay đổi, Docker mới chạy lại 'npm install'
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm cả devDependencies để chạy Prisma)
RUN npm install

# Sao chép toàn bộ source code của backend vào container
COPY . .

# Chạy Prisma Generate để tạo client dựa trên schema của bạn
RUN npx prisma generate

# Mở port 4000, là port mà server của bạn đang lắng nghe
EXPOSE 4000

# Lệnh để khởi chạy ứng dụng khi container bắt đầu
# Sử dụng script "start" từ package.json
CMD ["npm", "start"]