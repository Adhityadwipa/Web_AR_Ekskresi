import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS=1 npm run dev → HTTPS lokal (WebXR & kamera di ponsel mewajibkan HTTPS)
export default defineConfig({
  base: './', // path relatif → bisa di-hosting di subfolder (GitHub Pages)
  plugins: process.env.HTTPS ? [basicSsl()] : [],
  server: {
    host: true,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: { chunkSizeWarningLimit: 1200 },
});
