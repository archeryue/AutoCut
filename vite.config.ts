import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Base path for GitHub Pages deployment
  // Use '/AutoCut/' for https://archeryue.github.io/AutoCut/
  // Use '/' for local development (override with --base flag if needed)
  base: process.env.NODE_ENV === 'production' ? '/AutoCut/' : '/',

  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8000,
    open: true,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'test-results/**'],
  },
});
