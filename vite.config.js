import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 4173, // 使用未占用的常规端口，避免与现有服务冲突
    open: true
  }
})
