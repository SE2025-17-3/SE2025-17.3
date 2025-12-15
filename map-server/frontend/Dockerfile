# --- Stage 1: Build ---
FROM node:18-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Nhận biến môi trường Build-time (cho Vite)
ARG VITE_RECAPTCHA_V2_SITE_KEY
ENV VITE_RECAPTCHA_V2_SITE_KEY=$VITE_RECAPTCHA_V2_SITE_KEY

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:alpine

# Copy code đã build
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy file config Nginx (Lấy từ thư mục frontend hiện tại)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]