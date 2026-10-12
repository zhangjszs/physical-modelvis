# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮概要

本轮（2026-10-12 · `executor-20261012b` · 执行者）：完成 **#109**（P2，常量门禁扩面：m_e / G / kB 纳入 LITERAL_PATTERNS + 引擎/渲染双面收敛，含 bWien 真源条目与普查补漏 blackBodyRig）。
- 提交：`7b39990`（feat）/ `847dba5`（merge @ main）
- 结论：完成，转 `in-review` 待 Planner 验收；本地 precheck 全绿通过。

## 已完成

- **#109**：常量门禁扩面与全仓收敛 · `7b39990` / `847dba5` · 本地 precheck 全绿 + 红绿反向门禁实跑验证 + CI 观察中 · `in-review` 待验收。
  - **门禁模式扩面与样例配套**：`physics-core/src/units/constantPatterns.ts` 的 `LITERAL_PATTERNS` 增加 `m_e=9.1093837015e-31`、`G=6.6743e-11`、`kB=1.380649e-23` 3 条模式；`PATTERN_SAMPLES` 配齐正负样例（重点覆盖 `6.674e-10`、`16.674e-11`、`9.109e-30` 前缀与指数误伤防护）。
  - **bWien 真源条目落地**：`units/constants.ts` 增加 `bWien: q(2.898e-3, 'm·K', 'b')`（教材口径，与现存取值完全一致，零数值漂移）；并在 `constants.test.ts` 加入测试断言；渲染层 `visualization/src/rendering/constants.ts` 的 `WIEN_B` 同步收敛引用该真源。
  - **引擎全仓收敛**：
    - `electron-diffraction.ts`：`m = 9.109e-31` → `PHYSICS_CONSTANTS.electronMass.value`；
    - `radiation-deflection.ts`：`m = 9.109e-31` → `PHYSICS_CONSTANTS.electronMass.value`；
    - `cavendish.ts`：`G_STANDARD = 6.674e-11` → `PHYSICS_CONSTANTS.G.value`；`cavendish.test.ts` 中 `G_STD` 同步对齐真源；
    - `black-body.ts`：`kB` 与 `bWien` 均收敛至 `PHYSICS_CONSTANTS`；
    - `brownian-motion.ts`：`kB = 1.381e-23` → `PHYSICS_CONSTANTS.kB.value`。
  - **渲染层与 3D Rig 全仓收敛**：
    - `rendering/constants.ts`：导出 `ELECTRON_MASS` 与 `GRAVITATIONAL_CONSTANT`，`WIEN_B` 引用 `PHYSICS_CONSTANTS.bWien.value`；
    - `nuclearRadiationScenes.ts`：`9.109e-31` → `ELECTRON_MASS`；
    - `waveParticleDualityScenes.ts`：`9.10938356e-31` → `ELECTRON_MASS`（消除渲染内部双源）；
    - `chapter6Scenes.ts`：`G = 6.674e-11` → `GRAVITATIONAL_CONSTANT`；
    - `molecularKineticScenes.ts`：`kB = 1.381e-23` → `K_BOLTZMANN`；
    - `blackBodyRig.ts`：`2.898e-3` → `PHYSICS_CONSTANTS.bWien.value`；
    - `cavendishRig.ts`：`6.6743e-11` → `PHYSICS_CONSTANTS.G.value`；
    - `single-source-contract.test.ts`：布朗独立复算期望同步引用 `PHYSICS_CONSTANTS.kB.value`。
  - **红绿反向证据链**：临时在 `electron-diffraction.ts` 注入 `9.109e-31`，门禁单测立即报红并精准报警定位；撤回后立刻转绿 54/54 全过。
  - **计算代码清零扫描**：`grep -rnE "9\.109e-31|9\.10938356e-31|6\.674e-11|1\.381e-23" physics-core/src visualization/src` 结果显示计算代码完全清零（除模式与正负样例自身外无残留）。
  - **测试数**：core 1149 / viz 1633 / total 2782（+24 新门禁正负断言与无内联断言，count:sync 已回写）。

## 未完成 / 进行中（下一棒最优先看这里）

- **无进行中任务**。工作树干净，无遗留分支。
- 待 Planner 验收积压：
  - #111：生产构建首屏 3D 空白修复（in-review）
  - #112：OCR 弹窗 portal 渲染修复（in-review）
  - #109：常量门禁扩面与全仓收敛（in-review）
- 队首下一单：**#113**（P2，条形磁铁 3D 器材组件，按 #94 推荐批）。

## 验证情况

- `npm run precheck` 本地全绿（build:core → typecheck → lint → format:check → sweep:test → test → count:check → build:viz → check:bundle → check:publish → selfcheck 11 层全 PASS；exit 0）。
- 引擎门禁 `constants-single-source.test.ts` 54/54 全绿。
- 渲染门禁 `rendering-constants-single-source.test.ts` 49/49 全绿。
- GitHub Actions CI（run 38245... @ `847dba5`）运行中。

## 风险与注意事项

- 今后若在 `models` 或 `rendering` 中新增科学计数法常量，门禁将强制要求必须引用 `PHYSICS_CONSTANTS` 或 `rendering/constants.ts`。
- 若未来涉及 Rust 模块开发，按用户指令请使用 `mise` 进行工具链安装与管理。

## 给下一棒的第一步建议

- 检查 #111 / #112 / #109 是否已被 Planner 验收关闭。
- 按 PLAN 队列领 **#113**（P2 条形磁铁 3D 器材）。开工前建 LOCK，按契约 1.5 流转标签。

## 给 Planner 的信号

- **in-review 3**：#111（生产构建首屏 3D 空白）+ #112（OCR 弹窗视口溢出）+ #109（常量门禁扩面与全仓收敛）。
- **auto-discovered 0**：本轮未产生新 auto-discovered 单。
- **需要 Planner 介入**：验收 in-review 积压（#111, #112, #109）。
