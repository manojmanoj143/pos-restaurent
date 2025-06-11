import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
      },
      '/static/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    chunkSizeWarningLimit: 1000, // Increased to 1000 kB to suppress the warning
  },
});