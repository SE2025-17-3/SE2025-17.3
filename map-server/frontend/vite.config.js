import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Khi frontend (chạy trên port 5173) gửi request đến '/api',
      // Vite dev server sẽ chuyển tiếp nó đến backend (chạy trên port 4000).
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Cấu hình tương tự cho Socket.IO
      '/socket.io': {
        target: 'ws://localhost:4000', // Sử dụng websocket protocol
        ws: true,
      }
    }
  }
})
