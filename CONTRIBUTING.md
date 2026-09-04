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

## 参与贡献流程

1. **查阅文档**：在开始前，请先通读 [docs/README.md](file:///home/kerwin/coding/physical_modelvis/docs/README.md) 和 [docs/DEVELOPMENT_GUIDE.md](file:///home/kerwin/coding/physical_modelvis/docs/DEVELOPMENT_GUIDE.md)。
2. **提出 Issue**：发现 Bug 或有新功能提议，请使用 [.github/ISSUE_TEMPLATE/](file:///home/kerwin/coding/physical_modelvis/.github/ISSUE_TEMPLATE/) 对应的规范模板提交。
3. **拉取分支**：基于 `main` 分支创建特性分支（`feat/...` 或 `fix/...`）。
4. **提交 PR**：完成开发并通过本地门禁后发起 Pull Request，填写 [.github/PULL_REQUEST_TEMPLATE.md](file:///home/kerwin/coding/physical_modelvis/.github/PULL_REQUEST_TEMPLATE.md) 检查清单。

## 测试与验证

```bash
npm test                 # physics-core + visualization 全部测试 (2115+ 用例)
npm run test:core        # 仅 physics-core 单元测试
npm run test:viz         # 仅 visualization 测试
npm run selfcheck        # 运行 9 层物理引擎自检 (L0-L9)
npm run test:smoke:3d    # 3D 实验仪器冒烟测试 (需 Dev Server 启动)
```

## License

贡献即表示你同意你的贡献将以 MIT License 发布。

