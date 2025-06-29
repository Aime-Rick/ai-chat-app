import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', 'lucide-react'],
          supabase: ['@supabase/supabase-js'],
          utils: ['date-fns', 'zustand'],
        },
      },
    },
    // Enable compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    host: true,
    // Enable HTTP/2
    https: false,
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: true,
  },
  // Preload optimization
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
});