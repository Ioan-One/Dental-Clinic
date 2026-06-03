import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    proxy: {
      '/api': { target: 'https://localhost:3001', changeOrigin: true, secure: false, cookieDomainRewrite: 'localhost' },
      '/ws':  { target: 'wss://localhost:3001',   ws: true,           secure: false },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**']
  }
})
