# frontend/Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Nhận biến môi trường từ lệnh build
ARG VITE_RECAPTCHA_V2_SITE_KEY
ENV VITE_RECAPTCHA_V2_SITE_KEY=$VITE_RECAPTCHA_V2_SITE_KEY
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy file cấu hình Nginx mới
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
