# PhysVis - 高中物理教学可视化平台

## Project Overview
面向高中物理教学的交互式可视化仿真系统。
双层架构：physics-core 引擎 (TypeScript, 零依赖) → React + Canvas 2D 可视化前端。

## Build & Test
```bash
# 安装依赖
cd physics-core && npm install && npm run build && cd ..
cd visualization && npm install && cd ..

# 运行所有测试
npm test

# 运行核心测试
cd physics-core && npm test

# 运行可视化前端测试
cd visualization && npm test

# Lint
npm run lint

# Format
npm run format

# 启动开发服务器
cd visualization && npm run dev
```

## CI/CD

GitHub Actions 流水线，配置文件位于 `.github/workflows/`。

### CI 流水线 (`ci.yml`)
触发：push 到 main、PR 到 main。顺序执行 6 道质量门禁：
1. **TypeScript 类型检查** — `tsc --noEmit`（physics-core + visualization，含 OCR server）
2. **ESLint 静态分析** — typescript-eslint recommended 规则集
3. **Prettier 格式检查** — `format:check`
4. **单元测试** — physics-core + visualization 各自 `vitest run`
5. **8 层物理自检** — `node scripts/self-check.mjs`（L0-L6 + L8 Boris 数值积分；L7 为 CLI 自身）
6. **构建** — physics-core → visualization（带 `VITE_BASE_PATH` 子路径）

### 部署流水线 (`deploy.yml`)
触发：CI 在 main 分支成功完成后自动触发（`workflow_run`）。
- 构建 visualization 并部署到 GitHub Pages
- 访问地址：`https://<user>.github.io/physical_modelvis/`

### 仓库配置要求
- Settings → Pages → Source 设为 **"GitHub Actions"**
- 无需额外 Secrets（OCR 代理不部署，仅做 typecheck + build）

## 代码审查约定 (Code Review Pass)

每个任务实现完成后、commit 之前，必须执行一轮 **代码审查**（使用 `/code-review` 或手动 review）：

### Review 维度
1. **Correctness** — 物理公式 / 数值计算 / 边界条件 / NaN 处理
2. **Type Safety** — strict TS, no `any`, no non-null assertion abuse
3. **API Consistency** — extends `PhysicsModelBase`, modelType 唯一, requiredParameters 完整
4. **Test Coverage** — 每个 exported 函数至少有 1 个 positive + 1 个 edge-case 测试
5. **Doc & Naming** — 中文 JSDoc, 变量名自解释, 无 magic number
6. **Performance** — 无 O(N²) 大循环, 无内存泄漏 (大数组)
7. **Rendering Contract** — scene 的 `parameters[].name` 与 `buildProblem` 配套, unit 正确

### Review 流程
1. `git diff --cached` 查看已暂存改动
2. 对每个新建/修改的 .ts 文件逐一审查
3. 发现问题 → 修复 → 重新 typecheck/test → 重新暂存
4. Review 通过 → 进入 commit 阶段

### 常见问题清单
- [ ] 除零 / 负数开方 (sqrt)
- [ ] 数组越界 (`traj[idx + 1]` 未 clamp)
- [ ] 未处理的 nullable (`problem.bodies[0]!`)
- [ ] console.log 调试残留
- [ ] 未使用的 import / 变量
- [ ] TODO/FIXME 残留
- [ ] 数学符号错 (θ vs ω, v vs V)

## Architecture
```
physics-core/          — 零依赖 TypeScript 物理引擎
  src/models/          — 物理模型 (匀速/匀变速/电场/磁场/碰撞/弹簧/斜面/电磁复合场/圆周运动/第三章力)
  src/math/            — Vec2D 向量运算
  src/types/           — 类型定义 (PhysicsProblem, SimulationResult)
  src/units/           — 单位换算和物理常数
  src/solver/          — 求解器路由 (自动注册模型)
  tests/               — 单元测试

visualization/         — React 可视化前端
  src/components/      — UI 组件 (Canvas, 图表, 控制面板, OCR)
  src/scenes/          — 场景配置 + buildProblem
  src/rendering/       — Canvas 渲染器
  src/adapters/        — physics-core 适配器
  src/store/           — Zustand 状态管理
  server/              — OCR 后端代理 (Express + Anthropic API)

experiments/           — 人教版高中物理实验整理 (176 个实验, 6 册教材)
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
