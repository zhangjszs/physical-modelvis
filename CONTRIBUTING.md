# 贡献指南

感谢你对 PhysVis 的贡献兴趣！本文档说明参与本项目的基本流程。

## 开发环境

- Node.js >= 20（CI 在 Node 24 上验证）
- npm

## 本地搭建

```bash
# 克隆
git clone https://github.com/zhangjszs/physical-modelvis.git
cd physical-modelvis

# 安装根依赖（husky 会自动配置 git hooks）
npm ci

# 构建 physics-core（visualization 依赖其 dist 产物）
cd physics-core && npm ci && npm run build && cd ..

# 安装 visualization 依赖
cd visualization && npm ci && cd ..
```

## 关键约定

1. **改 physics-core 源码后必须重建**：visualization 通过 `file:../physics-core` 引用的是构建产物 `dist/`，不是源码。编辑 `physics-core/src/**` 后必须先 `cd physics-core && npm run build`，否则可视化测试仍用旧 dist。
2. **渲染单一真源**：有引擎数据的场景，渲染层必须消费引擎结果，不得用 `currentTime + 公式` 自算物理。详见 `docs/rendering-physics-audit.md`。
3. **场景新增**：放到 `visualization/src/scenes/scenes/<领域>/` 子目录，并在 `sceneRegistry.ts` 注册。

## 提交前检查

```bash
# 一键全量门禁（与 CI 等价，husky pre-push 也会自动执行）
npm run precheck
```

包括：`build:core` → `typecheck` → `lint` → `format:check` → `test` → `selfcheck`

## 代码审查

每个任务实现完成后，执行一轮代码审查（`/code-review` 或手动 review），维度包括：

- **Correctness** — 物理公式 / 数值计算 / 边界条件 / NaN 处理
- **Type Safety** — strict TS, no `any`
- **API Consistency** — extends `PhysicsModelBase`, modelType 唯一
- **Test Coverage** — 每个 exported 函数至少 1 positive + 1 edge-case 测试
- **Rendering Contract** — scene `parameters[].name` 与 `buildProblem` 配套

## 测试

```bash
npm test             # physics-core + visualization 全部
npm run test:core    # 仅 physics-core
npm run test:viz     # 仅 visualization
```

## License

贡献即表示你同意你的贡献将以 MIT License 发布。
