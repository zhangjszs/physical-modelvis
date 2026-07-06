import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // React 核心生态 — 变化频率低，长期缓存
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          // Recharts + d3 依赖 — 图表库体积最大，独立 chunk
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/.pnpm/d3-') ||
              id.includes('node_modules/internmap') ||
              id.includes('node_modules/victory-vendor')) {
            return 'vendor-charts';
          }
          // physics-core 物理引擎 — 独立于 UI 更新
          if (id.includes('physics-core') ||
              id.includes('node_modules/zustand')) {
            return 'vendor-physics';
          }
        },
      },
    },
  },
});
