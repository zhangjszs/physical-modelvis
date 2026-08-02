# 高中物理教学可视化平台

> 面向高中物理教学的交互式可视化仿真系统，基于自研物理引擎 + React + Canvas 2D 渲染

## 项目简介

本项目为高中物理教学提供一个可视化仿真平台，支持：

- **176 个实验整理**：覆盖人教版高中物理 6 册 / 27 章 / 176 个实验
- **123 个可视化场景**：3D 实验引擎懒加载渲染，覆盖力学 / 电磁学 / 热学 / 光学 / 近代物理
- **113 个物理模型**：自研零依赖 TypeScript 引擎，解析解为主，电磁复合场用 Boris 数值积分
- **实时动画**：Canvas 2D 渲染，支持轨迹、向量、场线可视化
- **参数调节**：滑块实时调节物理参数，自动重新求解
- **曲线图**：位移-时间、速度-时间、能量-时间等 8 种图表，与动画同步
- **公式说明**：每个场景的核心公式和推导过程
- **诊断报告**：能量守恒误差、动量守恒误差等物理验证
- **OCR 拍照解题**：上传物理题目图片，AI 自动识别并加载仿真

## 项目结构

```
physical_modelvis/
├── physics-core/          # TypeScript 物理引擎（零依赖）
│   ├── src/
│   │   ├── models/        # 113 个物理模型
│   │   ├── math/          # Vec2D 向量运算
│   │   ├── types/         # 类型定义 (PhysicsProblem, SimulationResult)
│   │   ├── units/         # 单位换算和物理常数
│   │   └── solver/        # 求解器路由（自动注册模型）
│   └── tests/             # 单元测试
│
├── visualization/         # React 可视化前端
│   ├── src/
│   │   ├── components/    # UI 组件（Canvas / 图表 / 控制面板 / OCR / 3D 实验引擎）
│   │   ├── scenes/        # 123 个场景配置 (scenes/scenes/ 按章节分组)
│   │   ├── rendering/     # Canvas 渲染器
│   │   ├── adapters/      # physics-core 适配器
│   │   ├── store/         # Zustand 状态管理
│   │   └── utils/         # 工具函数
│   ├── server/            # OCR 后端代理 (Express + Anthropic API)
│   └── tests/            # 单元测试 + 准确性测试
│
├── experiments/           # 人教版高中物理实验整理（176 个实验 / 6 册教材）
├── scripts/              # 自检脚本 (self-check.mjs) 等工具
├── .github/workflows/    # CI / CD 流水线
└── .husky/               # Git pre-push 钩件
```

## 快速开始

### 前置要求

- Node.js >= 20（CI 在 Node 24 上验证）
- npm

### 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd physical_modelvis

# 安装根依赖（含 husky，会自动配置 git hooks）
npm ci

# 安装 physics-core 依赖并构建（visualization 依赖其 dist）
cd physics-core
npm ci
npm run build
cd ..

# 安装 visualization 依赖
cd visualization
npm ci
cd ..
```

### 运行

**启动可视化前端：**

```bash
cd visualization
npm run dev
```

浏览器访问 `http://localhost:5173`

**启动 OCR 后端（可选，拍照解题需要）：**

```bash
cd visualization
ANTHROPIC_BASE_URL="your-api-url" \
ANTHROPIC_AUTH_TOKEN="your-api-key" \
ANTHROPIC_MODEL="your-model" \
npm run server:dev
```

### 运行测试

```bash
# 一次跑全部测试（physics-core + visualization）
npm test

# 仅跑 physics-core
npm run test:core

# 仅跑 visualization
npm run test:viz
```

## 物理模型

physics-core 提供 113 个物理模型，全部通过 `registerModel` 自动注册到全局路由表。下表仅列举代表性模型：

| 模型 | 类型 | 求解方法 | 说明 |
|------|------|----------|------|
| 匀速直线运动 | uniform-linear | 解析解 | v = const |
| 匀变速直线运动 | uniform-accelerated | 解析解 | a = const |
| 匀强电场 | uniform-electric-field | 解析解 | F = qE，抛物线轨迹 |
| 匀强磁场 | uniform-magnetic-field | 解析解 | F = qv×B，圆周运动 |
| 碰撞 | collision | 解析解 | 1D 碰撞，动量守恒 |
| 弹簧振子 | spring-oscillator | 解析解 | F = -kx，支持阻尼 |
| 斜面运动 | inclined-plane | 解析解 | 分解重力，摩擦力 |
| 电磁复合场 | em-combined-field | Boris 数值积分 | F = qE + qv×B |
| LC 振荡电路 | lc-oscillator | 解析解 | 电磁振荡 |
| 玻尔模型 | bohr | 解析解 | 氢原子能级跃迁 |
| α 粒子散射 | alpha-scattering | 解析解 | 卢瑟福散射 |
| 放射性衰变 | radioactive-decay | 解析解 | 衰变统计 |

完整模型列表见 [physics-core/src/models/](physics-core/src/models/)。

## 技术栈

| 层 | 技术 |
|----|------|
| 物理引擎 | TypeScript（零依赖） |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 渲染 | Canvas 2D + 3D 实验引擎 |
| 图表 | Recharts |
| 状态管理 | Zustand |
| 测试 | Vitest |
| Lint / Format | ESLint + Prettier |
| Git Hooks | Husky |
| OCR 后端 | Express + Anthropic API |

## 可视化功能

- **动画播放**：播放/暂停/单步/重置/变速 (0.25x-5x)
- **轨迹显示**：历史运动轨迹
- **向量显示**：速度/加速度/力向量
- **场线显示**：电场线(↑)、磁场符号(⊗)
- **曲线图**：8 种图表，与动画帧同步
- **参数面板**：滑块 + 数字输入，自动重新求解
- **图层开关**：坐标轴/网格/轨迹/向量/标签
- **3D 实验引擎**：123 个场景的器材 + rig 懒加载渲染
- **深色/浅色主题**
- **移动端响应式**

## 高中物理场景

### 平抛/斜抛运动
- 水平速度和竖直速度分量
- 重力加速度向量
- 最大高度、飞行时间、水平射程

### 碰撞实验
- 弹性碰撞和非弹性碰撞
- 动量守恒验证
- 恢复系数可调

### 弹簧振子
- 简谐运动
- 动能、势能、机械能曲线
- 可选阻尼

### 斜面运动
- 重力分解
- 支持力、摩擦力
- 临界角验证

### 带电粒子在电场中
- 电场力 F = qE
- 抛物线轨迹
- 电势能

### 带电粒子在磁场中
- 洛伦兹力 F = qv×B
- 匀速圆周运动
- 回旋半径和周期

### 电磁复合场
- 速度选择器 v = E/B
- 洛伦兹力
- Boris 数值积分

## OCR 拍照解题

1. 点击右上角「📷 拍照解题」
2. 上传物理题目图片
3. AI 自动识别题目内容
4. 自动匹配物理场景
5. 点击「加载仿真」开始可视化

## CI / CD

### CI 流水线（`.github/workflows/ci.yml`）

触发：push 到 main、PR 到 main。顺序执行 6 道质量门禁：

1. **TypeScript 类型检查** — `tsc --noEmit`（physics-core + visualization，含 OCR server）
2. **ESLint 静态分析** — typescript-eslint recommended 规则集
3. **Prettier 格式检查** — `format:check`
4. **单元测试** — physics-core + visualization 各自 `vitest run`
5. **9 层物理自检** — `node scripts/self-check.mjs`（L0-L6 + L8 Boris 数值积分 + L9 跨场景数值鲁棒性；L7 为 CLI 自身）
6. **构建** — physics-core → visualization（带 `VITE_BASE_PATH` 子路径）

### 部署流水线（`.github/workflows/deploy.yml`）

触发：CI 在 main 分支成功完成后自动触发（`workflow_run`）。

- 构建 visualization 并部署到 GitHub Pages
- 访问地址：`https://<user>.github.io/physical-modelvis/`（注意：仓库名为连字符 `physical-modelvis`，非下划线）

仓库配置要求：Settings → Pages → Source 设为 **"GitHub Actions"**。

## 开发工作流

### 本地 pre-push 钩件

项目通过 [husky](https://typicode.github.io/husky/) 在 `git push` 前自动执行与 CI 等价的本地检查（`npm run precheck`），任一步骤失败即阻止 push：

```
build:core → typecheck → lint → format:check → test → selfcheck
```

- 安装依赖时自动激活（`npm ci` 触发 `prepare` 脚本）
- 紧急情况可用 `git push --no-verify` 绕过
- 钩件源码见 [.husky/pre-push](.husky/pre-push)

### 常用脚本

```bash
# 一次跑全部 CI 等价检查（pre-push 钩件内部调用的就是这个）
npm run precheck

# TypeScript 类型检查（physics-core + visualization）
npm run typecheck

# 9 层物理自检
npm run selfcheck

# Lint（含自动修复）
npm run lint
npm run lint:fix

# Prettier（格式化 / 检查）
npm run format
npm run format:check

# 构建生产版本（physics-core + visualization）
npm run build

# 单独构建（visualization 需 VITE_BASE_PATH）
npm run build:core
cd visualization && VITE_BASE_PATH=/physical-modelvis/ npm run build

# 开发模式（watch）
cd physics-core && npm run test:watch    # 测试 watch
cd visualization && npm run dev          # Vite dev server
```

## 测试覆盖

```
physics-core:   917 tests passed (65 files)
visualization:  393 tests passed (18 files)
Total:         1310 tests passed
```

准确性测试矩阵（`*/tests/accuracy/`）：

- **L2-RIG**：全部 123 个场景的 SceneRig 接口契约
- **L9**：跨场景数值鲁棒性 — 全 SCENES `solveProblem` 无 NaN/Inf
- **Boris**：电磁复合场 Boris 数值积分正确性 + 收敛性
- **scene-contract / parameter-ranges / formula-drift**：场景配置 / 参数范围 / 公式漂移

## License

MIT
