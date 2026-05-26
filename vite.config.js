import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Must match the GitHub Pages repository sub-path
  base: '/trip-planner/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor libs into separate cached chunks
          'vendor-react':    ['react', 'react-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-lucide':   ['lucide-react'],
        },
      },
    },
  },
});
