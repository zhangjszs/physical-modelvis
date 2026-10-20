# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮概要

本轮（2026-10-21 · `executor-20261021a` · Execution Agent）完成 **#150 主题色 JS 单一真源（切片 2）**，按 3 个可独立回退的代码批次交付并合入 main，M7 等待 Planner 验收关闭。

| 批次 | 内容 | 提交 |
|---|---|---|
| A | 令牌表扩展 + 颜色纯函数（无消费方迁移） | `3163e89` |
| B | SimulationCanvas 47 处主题分支迁移 | `1f20d19` |
| C | EquipmentStage 3D 背景 token 化 + 双主题探针 | `3becce0` |
| 集成 | `--no-ff` 合入 main | `1bdf60e` |

## 已完成

- **批次 A**：
  - `visualization/src/styles.css`：`:root` / `:root.light` 各新增 33 条 CSS 变量（31 个 `canvas*` / `--stage3d-bg` 颜色键 + 分组注释），已有 token 值零改动（diff 纯新增）。
  - `visualization/src/utils/themeTokens.ts`：新增 31 键双主题表；新增 `parseHexColor` / `hexToRgba` / `hexToThreeColorNumber` / `resolveStage3DBackground` 纯函数。
  - `theme-tokens.test.tsx`：+6 个纯函数用例 +31 行「迁移前字面量回归表」，暗/亮取值逐项锁定。
- **批次 B**：
  - `SimulationCanvas.tsx`：47 处 `isDark ?` 颜色分支 + 1 处 FPS 叠层 `isDarkRef.current ?` 全部迁移至 `getThemeTokens`；`label` / `sub` 复用 `readoutText` / `text3`；主题无关 alpha 用 `hexToRgba` 派生。
  - 守卫测试：源码中 `isDark ?` / `isDarkRef.current ?` 必须为 0，且必须存在 `getThemeTokens(isDark)` 消费点。
- **批次 C**：
  - `EquipmentStage.tsx`：L167/L186 两处 `0x0b1020` / `0xf8fafc` 改为 `resolveStage3DBackground(theme)`，背景与雾效同步。
  - `equipment-stage.test.tsx`：mock `THREE.Scene` 记录实例，断言暗色 `background/fog=0x0b1020`、亮色切换为 `0xf8fafc` 且不重建 Scene。
  - `verify-portal-tokens.mjs`：新增 3D clear color 双主题断言、碰撞场景「2D 板书」双主题非空、全流程 console error 收集。
- **医书**：`.agent/DIARY/2026-10-21.md`（每批症状/诊断/处方/疗效/范围/回滚），Issue #150 留执行摘要。

## 未完成 / 进行中（下一棒最优先看这里）

- **无代码半成品，无未提交改动。** #150 已转 `in-review`，等待 Planner 独立验收关闭；关闭后 M7 3/3 收官。
- **#100/#101 维持 parked**：按 D51，M7 收官后的下一轮规划解冻并重写验收项（顺序 #100 → #101）。
- `.agent/TASKS.md` / `.agent/PLAN.md` 仍是 Planner 四十二次滚动的快照（写着 #150 ready），需下一轮 Planner 整体重写；本棒未越权改规划文件。

## 验证情况

- `npm run precheck` exit 0（build:core → typecheck → lint → format:check → sweep → core+viz test → count:check → build:viz → check:bundle → check:publish → selfcheck）；
  11 层物理自检 **11 PASS / 0 FAIL**。
- 4 个 headless 探针生产 preview（:4173，`SMOKE_BROWSER_CHANNEL=""`）全部 exit 0：
  - `FIRST FRAME SMOKE OK`：连续 3 次通过，平均首帧 791ms，3D/2D 画布非空，零 console error，挂载前必需体积 70.5 kB gzip。
  - `OVERLAY DRAWER SMOKE OK`：1440×900 / 1024×768 双视口全通过。
  - `PORTAL TOKENS OK`：暗色 3D clear `[0.0431,0.0627,0.1255]` ↔ `#0b1020`；亮色 `[0.9725,0.9804,0.9882]` ↔ `#f8fafc`；碰撞 2D 板书亮/暗均 `colors=3`（826×413）；零 console error。
  - `[guidance] SMOKE OK`。
- 定向测试：`theme-tokens.test.tsx` 46 + `equipment-stage.test.tsx` 12 = **58 passed**。
- 静态基线复核：`grep -c "isDark ?" SimulationCanvas.tsx` = **0**；`EquipmentStage.tsx` 无 `0x0b1020` / `0xf8fafc`；`getThemeTokens` 消费点 10 处。
- `count:check` exit 0：core 1169 / viz 1759 / total **2928**。
- CI `39517693080` success；Deploy `39517995535` success。

## 风险与注意事项

1. **main HEAD = `1bdf60e`**（merge）；批次 A/B/C 三个 commit 均已成 main 祖先。
2. **探针口径**：3D clear color 上报的是**归一化 sRGB**（three r185 `WebGLBackground.setClear` 走 `getUnlitUniformColorSpace(renderer)`），不是 `THREE.Color` 内部线性值；后续改探针勿按线性比较。
3. **2D 探针**：所有 123 场景都有 3D rig，`useSceneRig.is3DScene = hasSceneRig(sceneId)`；要探测 `SimulationCanvas` 必须显式点「2D 板书」，否则仍是 WebGL 画布。
4. **暗/亮渲染值零变化**：31 个新键由「迁移前字面量回归表」逐项锁定；暗色无任何语义化调整。后续若改 token 值，该测试会红。
5. **回滚手册**（按逆序执行，避免上下文冲突）：
   - 只回退批次 C：`git revert 3becce0`（3D 恢复写死色、探针回 #149 版）
   - 只回退批次 B：`git revert 1f20d19`（Canvas 恢复 47 处三元，令牌表保留无消费方）
   - 只回退批次 A：`git revert 3163e89`（删除新令牌与纯函数；须先回退 B/C）
   - 全部回退：`git revert -m 1 1bdf60e`
