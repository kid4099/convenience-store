import { defineConfig } from 'vite';

export default defineConfig({
  // 相對路徑：同時相容 GitHub Pages 子路徑、Netlify 根目錄、本機
  base: './',
  server: {
    host: true,
    open: false,
  },
});
