# --- Stage 1: Build ---
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Khai báo biến môi trường build-time (để Vite nhận diện)
ARG VITE_RECAPTCHA_V2_SITE_KEY
ENV VITE_RECAPTCHA_V2_SITE_KEY=$VITE_RECAPTCHA_V2_SITE_KEY

# Build ra thư mục dist
RUN npm run build

# --- Stage 2: Serve bằng Nginx ---
FROM nginx:alpine

# Copy file build vào Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy file cấu hình Nginx (ta sẽ tạo ở bước sau)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]