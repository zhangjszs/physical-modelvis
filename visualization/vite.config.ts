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
          // 图表生态走默认分包: Rolldown (vite 8) 下宽 bucket 会把整块 recharts
          // 拖进首屏 (159.5kB), 而默认分包下首屏无图表代码 (62.3kB);
          // recharts 现归入其唯一消费者 GraphPanel 懒 chunk, three/physics 保持独立 (见 #44)
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
