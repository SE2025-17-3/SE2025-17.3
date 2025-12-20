# Sử dụng Node 18 Alpine
FROM node:18-alpine

# Cài đặt thư viện hệ thống cần thiết cho bcrypt và Prisma (OpenSSL)
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Copy package.json để cài dependencies trước (tối ưu cache docker)
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci --only=production

# Copy toàn bộ code
COPY . .


ENV DATABASE_URL="mongodb+srv://admin:12345678aA@cluster0.w7yigwi.mongodb.net/pixel-canvas?retryWrites=true&w=majority&appName=Cluster0"

# Generate Prisma Client (Bắt buộc vì schema.prisma thay đổi)
RUN npx prisma generate

# Mở port 4000 (khớp với server.js)
EXPOSE 4000

# Lệnh khởi động
CMD ["npm", "start"]