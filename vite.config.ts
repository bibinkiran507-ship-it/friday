import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        proxyTimeout: 5000,
        timeout: 5000,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Suppress startup race-condition errors (backend not ready yet)
            if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED' ||
                (err as NodeJS.ErrnoException).code === 'ECONNRESET') {
              return;
            }
            console.error('[proxy error]', err);
          });
        },
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Suppress WebSocket startup errors
            if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED' ||
                (err as NodeJS.ErrnoException).code === 'ECONNRESET') {
              return;
            }
            console.error('[ws proxy error]', err);
          });
        },
      },
    },
  },
});
