import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // MOD-TEST-002: Vitest's default pattern matches every *.spec.ts,
  // including the Playwright suite — which imports @playwright/test and
  // cannot run inside Vitest. Two test runners in one repo need an
  // explicit boundary, or `npm run verify` fails on files it should
  // never have opened.
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
  server: { host: true, port: 5173 },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-dexie': ['dexie', 'dexie-react-hooks'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
