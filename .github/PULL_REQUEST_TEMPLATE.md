## 变更说明 (Summary)

简要描述本次 PR 的目标与实现方案：

## 变更类型 (Type of Change)

- [ ] 🐛 Bug 修复 (Fix)
- [ ] ✨ 新功能 / 新物理场景 (Feature)
- [ ] 📐 物理模型 / 守恒律 / 求解器优化 (Physics Model)
- [ ] 🎨 渲染层优化 / 单一真源契约迁移 (Rendering)
- [ ] 📝 文档更新 (Docs)
- [ ] 🛠️ 工程化 / 构建 / CI / 脚本整理 (Engineering)

## 关联 Issue (Related Issue)

Closes #

## 质量核对清单 (Checklist)

提交 PR 前请确认已在本地完成以下核对：

- [ ] **物理引擎重建**：若修改了 `physics-core/src/**`，已在本地执行 `cd physics-core && npm run build`
- [ ] **全量门禁**：本地运行 `npm run precheck` 全部通过
  - [ ] `build:core` (物理引擎构建)
  - [ ] `typecheck` (严格类型检查无报错)
  - [ ] `lint` (ESLint 静态分析通过)
  - [ ] `format:check` (Prettier 格式检查通过)
  - [ ] `test` (全量单元测试与准确性测试通过)
  - [ ] `selfcheck` (9 层物理自检 L0-L9 全部 PASS)
- [ ] **渲染单一真源契约**：涉及渲染修改时，已确保消费 `simulationResult`，无公式脱靶漂移
- [ ] **测试覆盖**：新增或修改的核心函数具备正向与边界测试用例
- [ ] **无调试残留**：无未使用的 import、未清理的 `console.log` 或临时注释放行
