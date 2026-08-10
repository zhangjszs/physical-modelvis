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
    // 最重的 3 个 chunk (physics / charts / three) 均为懒加载, 不出现在首屏;
    // 此阈值只过滤"懒 chunk 体积"噪音, 首屏体积由 chunks 依赖图保证
    chunkSizeWarningLimit: 600,
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
          // Three.js 3D 实验引擎 — 仅被 lazy 的 EquipmentStage 引用，独立 chunk 避免拖累首屏
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          // physical-modelvis 前端状态管理 — 被首屏引用, 与物理引擎解耦
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          // physics-core 物理引擎 — 只被懒加载的场景/渲染链引用, 独立 chunk 不拖累首屏
          if (id.includes('physics-core')) {
            return 'vendor-physics';
          }
        },
      },
    },
  },
});
