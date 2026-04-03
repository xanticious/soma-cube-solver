import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/soma-cube-solver/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
  },
  server: {
    // SPA fallback: serve index.html for /build  and /visualize routes
    middlewareMode: false,
  },
  appType: 'spa',
});
