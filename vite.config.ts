import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/coho-growth-model/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    cacheDir: path.join(process.env.LOCALAPPDATA || __dirname, 'vite-cache', 'coho-growth-model'),
    server: {
      hmr: true,
    },
  };
});
