import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS=1 npm run dev → HTTPS lokal (WebXR & kamera di ponsel mewajibkan HTTPS)
export default defineConfig({
  plugins: process.env.HTTPS ? [basicSsl()] : [],
  server: {
    host: true,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: { chunkSizeWarningLimit: 1200 },
});
