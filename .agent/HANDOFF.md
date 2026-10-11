# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-11 · `executor-20261011a` · 执行者）· #111 生产构建首屏 3D 空白修复

### 本轮一件事（已合回 main 并推送，报告在 issue，转 in-review 待验收）

1. **#111 生产构建首屏 3D 空白 + 暂停态抽屉补帧**（fix `0edfb65`，merge `3c744ac`）。要点：
    - **根因（生产插桩实证，非推测）**：首跑 `runSimulation` 时 `store.scenes=[]`（领域 chunk 异步未到）静默返回，
      且自动运行 effect 不依赖 `scenes`、到货永不重试 → `simulationResult` 首屏路径恒为 null →
      EquipmentStage rAF 空转、暂停态永不渲染。DBG111 证据：`stage-init hasResult=false` 后**零 tick-render**；
      线上/本地空白截图 md5 与 issue 基线逐字节一致（`3df0e2f55f`）。
    - **证伪记录**：issue 建议方向（rig 就绪/首帧 dirty 时序）与「晚到 RO 清空首帧」假设均被探针证伪
      （RO 全程只触发 1 次初始通知；首屏零 error/warning；去 StrictMode 的 dev 依然正常）。
    - **修复两处（均 visualization，未动引擎）**：`useSceneSimulation.ts` 自动运行 effect 补 `scenes` 依赖
      （到货补跑一次，scenes 只 set 一次）；`EquipmentStage.tsx` 自身 RO resize 回调内置脏
      （setSize 无条件重置 canvas bitmap——three r185 源码确认；canvas 100% 跟随舞台，同帧置脏补一帧，#79 语义保持）。
    - **回归测试 +3**：`useSceneSimulation.test.ts` ×2（到货补跑 / 不重复触发）、
      `equipment-stage.test.tsx` ×1（尺寸变化恰补一帧且恢复静默）。红→绿闭环：stash 源码修复后恰好 3 失败/18 通过。
    - **验证**：`precheck` 全绿；生产探针 A 首屏零点击有画面、B 抽屉后有画面、虚拟时钟两遍逐字节一致；
      测试数 1137/1619/2756（count:sync 已回写）。

## 已完成

- #111：首屏空白根因修复 + 抽屉补帧 + 3 回归测试 · `0edfb65`/`3c744ac` · precheck 全绿 · 生产 A/B/时钟探针全过 · in-review 待验收

## 未完成 / 进行中（下一棒最优先看这里）

- **无进行中**。in-review 1（#111）待 Planner 验收；本轮 auto-discovered 0/3。
- 验收后队首按 PLAN 取下一单（#112，P2 OCR 弹窗）。

## 验证情况

- `npm run precheck` 全绿（build:core → typecheck → lint → format:check → sweep:test → test → count:check → build:viz → check:bundle → check:publish → selfcheck 11 层全 PASS；exit 0）。
- 新回归红向：旧代码 3 失败 / 绿向：新代码 21/21（两文件）。
- 生产探针：A（285829B 有画面 vs 241KB 空白基线）、B（330108B）、虚拟时钟两遍 md5 一致。
- 未跑：#97 截图脚本全量重跑（点击绕行由探针 B 覆盖，脚本零改动）；QA 全量巡检（本单改 rendering+hook，无巡检口径变化；CI 观察中）。
- 无残留进程：探针 preview 均自起停；4324 dev 服务器已杀；main.tsx 已恢复（git 干净确认）。

## 风险与注意事项

- `scenes` 依赖的是一次性 set 身份；若将来新增重置 scenes 的路径，需复核补跑语义。
- 抽屉补帧依赖 canvas CSS 100% 跟随舞台（styles.css:1859-1862）；改舞台布局须保持，否则 RO 不触发。
- `.scratch/probe111-*.mjs` + `probe111-devshot.mjs` 为本轮临时探针（gitignore，不提交）；`__physvisRenderer` 仍 dev-only，未动。
- TEMP 插桩（DBG111）在最终提交前已全部删除（grep 确认零残留）。

## 给下一棒的第一步建议

- 先查 #111 是否被 Planner 验收；然后按 PLAN 领 **#112**（OCR 弹窗 createPortal，对齐 GuidancePanel 模式）。
- 若 #111 被 reopen，差距大概率在验收标准措辞层面（功能证据链已闭合），按 Planner 逐条差距补。

## 给 Planner 的信号

- **in-review 1**：#111（执行报告含根因证据链 + 红绿闭环 + 生产探针三证据；6 条验收标准逐条核对全过）。
- **auto-discovered 0**：本轮限额 3/3 未用；过程中证伪的两个假设已记入报告，不另立单。
- **需要 Planner 介入**：无（in-review 积压 1，待验收）。
