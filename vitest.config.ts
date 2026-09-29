import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dedicated Vitest config, separate from vite.config.ts, because the app's
// vite config requires PORT/BASE_PATH env vars supplied by the dev/build/serve
// workflows. Tests should run standalone without those.
export default defineConfig({
  root: path.resolve(import.meta.dirname),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
