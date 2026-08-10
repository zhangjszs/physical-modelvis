# PhysVis - 高中物理教学可视化平台

## Project Overview
面向高中物理教学的交互式可视化仿真系统。
双层架构：physics-core 引擎 (TypeScript, 零依赖) → React + Canvas 2D 可视化前端。

**变更前先读这些文档**（避免重复踩坑）：
- `plan.md` — 当前工作进展与后续计划（阶段 3 渲染迁移状态、待办项）
- `docs/rendering-physics-audit.md` — 123 个场景渲染源审计表，改渲染前必读
- `DEVELOPMENT_GUIDE.md` — 完整开发指南
- `3D_VERIFICATION_HANDOFF.md` — 3D 实验引擎修复交接文档(已归档到 `docs/archive/`)

## Build & Test
```bash
# 安装依赖
cd physics-core && npm install && npm run build && cd ..
cd visualization && npm install && cd ..

# 一键本地全量门禁 (与 CI 等价, pre-push 钩子会强制执行)
npm run precheck     # build:core → typecheck → lint → format:check → test → selfcheck

# 运行所有测试
npm test

# 运行核心测试
cd physics-core && npm test

# 运行可视化前端测试
cd visualization && npm test

# 运行单个测试文件 (vitest 路径过滤)
cd physics-core && npx.cmd vitest run tests/unit/mechanical-wave.test.ts
cd visualization && npx.cmd vitest run tests/accuracy/single-source-contract.test.ts

# 启动开发服务器
cd visualization && npm run dev
```

### 关键陷阱 (必读)
- **改 physics-core 源码后必须重建**:visualization 通过 `file:../physics-core` 依赖引用的是**构建产物 `dist/`**,不是源码。编辑 `physics-core/src/**` 后,运行可视化测试/typecheck 前必须先 `cd physics-core && npm run build`(或 `npm run precheck` 开头会自动 build)。否则可视化测试仍用旧 dist,引擎修复"看起来没生效"。
- **Windows PowerShell 环境**:`npx` 需写 `npx.cmd`;`rg` 不可用(用 grep 工具);PowerShell 引号转义用反引号。
- **husky pre-push 钩子**会运行完整 `precheck`,任何门禁失败都会阻止 push(跳过:`git push --no-verify`)。
- **引擎 charts 键名与语义名不同**:如 lc-oscillator 返回 `x_t/y_t/ke_t/pe_t`(语义是 q_t/i_t/Ee_t/Em_t);类型定义不含这些键,访问需 `as unknown as Record<string, {points: ...}>` 强转。迁移前先读模型源码确认 charts 键名与单位。
- **场景切换竞态(3D)**:3D 场景切换时需按场景缓存 rig(避免卸载/重建竞态),见 `EquipmentStage.tsx` 的 `rigReady` + `sceneRigCache` 机制。
- **vitest 路径过滤语法**:`npx.cmd vitest run tests/unit/foo.test.ts` (单文件);多个用 `npx.cmd vitest run -t "keyword"` (按测试名筛选)。

## CI/CD

GitHub Actions 流水线，配置文件位于 `.github/workflows/`。

### CI 流水线 (`ci.yml`)
触发：push 到 main、PR 到 main。顺序执行 6 道质量门禁：
1. **TypeScript 类型检查** — `tsc --noEmit`（physics-core + visualization，含 OCR server）
2. **ESLint 静态分析** — typescript-eslint recommended 规则集
3. **Prettier 格式检查** — `format:check`
4. **单元测试** — physics-core + visualization 各自 `vitest run`
5. **9 层物理自检** — `node scripts/self-check.mjs`（LAYERS 数组 = L0-L6 + L8 Boris 数值积分 + L9 跨场景数值鲁棒性；无 L7，CI 步骤名"7 层"是旧称）
6. **构建** — physics-core → visualization（带 `VITE_BASE_PATH` 子路径）

### 部署流水线 (`deploy.yml`)
触发：CI 在 main 分支成功完成后自动触发（`workflow_run`）。
- 构建 visualization 并部署到 GitHub Pages：`https://zhangjszs.github.io/physical-modelvis/`（仓库名连字符，非下划线）
- Settings → Pages → Source 设为 **"GitHub Actions"**；无额外 Secrets（OCR 代理不部署，仅 typecheck + build）

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
  src/models/          — 物理模型 (匀速/抛物线/电场/磁场/碰撞/弹簧/斜面/电磁复合场/圆周运动/第三章力)
  src/math/            — Vec2D 向量运算
  src/types/           — 类型定义 (PhysicsProblem, SimulationResult)
  src/units/           — 单位换算和物理常数
  src/solver/          — 求解器路由 (自动注册模型)
  tests/unit/          — 单元测试
  tests/accuracy/      — L1 差分测试 (differential-analytic.test.ts: 解析模型 vs 独立公式, 固定种子随机参数)

visualization/         — React 可视化前端
  src/components/      — UI 组件
    simulation3d/      — 3D 实验引擎 (EquipmentStage, rigs 场景组装, equipment 仪器, primitives 材质)
    export/            — 数据导出按钮 (ExportDataButton → exportCsv)
    guidance/          — 引导面板 (GuidancePanel)
    ocr/               — OCR 面板与工具函数
  src/scenes/          — 场景配置 + buildProblem (sceneRegistry.ts + guidance.ts 引导映射)
  src/scenes/scenes/   — 场景定义按领域拆分子目录 (mechanics/electromagnetism/modern/optics/thermodynamics, index.ts 聚合) — 新增场景放到对应领域子目录, 并注册到 sceneRegistry.ts
  src/rendering/       — Canvas 2D 渲染器 (按物理领域分文件)
  src/adapters/        — physics-core 适配器 (runSceneSimulation)
  src/store/           — Zustand 状态管理
  src/utils/           — 工具函数 (exportCsv 等)
  server/              — OCR 后端代理 (Express + Anthropic API, ocr-utils.ts)
  tests/accuracy/      — 渲染单一真源契约测试 (single-source-contract.test.ts)
  tests/rendering/     — 渲染单元测试 (rigs-build, equipment-stage)
  tests/guidance/      — 引导系统测试
  tests/ocr/           — OCR 测试

experiments/           — 人教版高中物理实验整理 (176 个实验, 6 册教材)
scripts/               — 验证脚本 (self-check.mjs L0-L9 物理自检, verify-*.cjs 冒烟测试)
```

## Key Patterns
- physics-core 使用解析解 (除电磁复合场用 Boris 数值积分)
- 物理模型继承 PhysicsModelBase，通过 registerModel 注册到全局注册表
- PhysicsProblem 是引擎输入，SimulationResult 是引擎输出
- **渲染单一真源约定 (阶段 3 迁移)**:有引擎数据的场景,渲染层必须消费引擎结果,不得用 `currentTime + 公式` 自算物理——否则引擎改公式时画面漂移。迁移模式:
  - 物体位置/轨迹:`getFrame(simulationResult, currentTime, trajectoryIndex)`(renderingUtils.ts,第三参选多物体轨迹,如 inertia 双球 / mechanical-wave 9 质点)
  - 标量随动值 (摆角/电荷/能量等):读 `simulationResult.charts` 对应序列,二分查找 + 线性插值
  - 无引擎结果时回退原自算公式 (防御空结果)
  - 契约由 `visualization/tests/accuracy/single-source-contract.test.ts` 固化;引擎被改错或渲染回退自算都会被拦截
- 完整场景分类与迁移进展见 `docs/rendering-physics-audit.md`(改渲染前先读)
- Zustand 管理前端状态，场景组件负责构建 PhysicsProblem 并调用 solveProblem
- OCR 代理在后端调用 Anthropic API，避免前端暴露 API Key

## Conventions
- TypeScript strict mode
- React 18 + TypeScript for visualization
- Chinese language for UI text and documentation
- Vitest for testing
- README.md 顶部记录测试数 (core / viz / total),跑完测试后若数量变化需同步更新
