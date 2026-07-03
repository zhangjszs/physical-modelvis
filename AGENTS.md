# PhysVis - 高中物理教学可视化平台

## Project Overview
面向高中物理教学的交互式可视化仿真系统。
双层架构：physics-core 引擎 (TypeScript, 零依赖) → React + Canvas 2D 可视化前端。

旧版架构 (physim + Three.js) 仍保留在仓库中，但已不再主动开发。

## Build & Test
```bash
# 安装依赖
cd physics-core && npm install && npm run build && cd ..
cd visualization && npm install && cd ..

# 运行所有测试
npm test

# 运行新版核心测试
cd physics-core && npm test

# 运行可视化前端测试
cd visualization && npm test

# 运行旧版测试
npm run test:legacy

# Lint
npm run lint

# Format
npm run format

# 启动开发服务器
cd visualization && npm run dev
```

## Architecture
```
physics-core/          — 零依赖 TypeScript 物理引擎 (当前主力)
  src/models/          — 9 个物理模型 (匀速/匀变速/电场/磁场/碰撞/弹簧/斜面/电磁复合场)
  src/math/            — Vec2D 向量运算
  src/types/           — 类型定义 (PhysicsProblem, SimulationResult)
  src/units/           — 单位换算和物理常数
  src/solver/          — 求解器路由 (自动注册模型)
  tests/               — 单元测试

visualization/         — React 可视化前端 (当前主力)
  src/components/      — UI 组件 (Canvas, 图表, 控制面板, OCR)
  src/scenes/          — 9 个场景配置 + buildProblem
  src/rendering/       — Canvas 渲染器
  src/adapters/        — physics-core 适配器
  src/store/           — Zustand 状态管理
  server/              — OCR 后端代理 (Express + Anthropic API)

physim/                — 旧版物理引擎 (Boris 积分器, 3D)
js/                    — 旧版桥接层 (PhysVis 全局命名空间)
templates/             — 旧版场景模板
problems/              — 旧版题目配置
```

## Key Patterns
- physics-core 使用解析解 (除电磁复合场用 Boris 数值积分)
- 物理模型继承 PhysicsModelBase，通过 registerModel 注册到全局注册表
- PhysicsProblem 是引擎输入，SimulationResult 是引擎输出
- Zustand 管理前端状态，场景组件负责构建 PhysicsProblem 并调用 solveProblem
- OCR 代理在后端调用 Anthropic API，避免前端暴露 API Key

## Conventions
- TypeScript strict mode
- React 18 + TypeScript for visualization
- Chinese language for UI text and documentation
- Vitest for testing
