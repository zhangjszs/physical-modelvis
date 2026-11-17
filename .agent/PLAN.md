# PLAN

> Planner 当前快照 · 2026-11-17 · D73。任务权威：GitHub Issues；TASKS.md 为本轮整体重写镜像。

## 当前方向

项目在 2026-11-17 集中录入一批实证物理模型/2D-3D真源/组合台缺陷（`#169–#190` 共 22 单），由纯维护巡检切回 **「先修核心物理真源与沙盒缺陷，再演进沙盒与 UI」**。本轮已完成 `#166` P0 验收（部分通过退回 `in-progress` 收口探针，P1 拆至 `#191`）、D68 正式转正、全量 26 个开放 Issue 分拣与 P1 容量收敛，并设立 **M10（核心力学与沙盒状态，8 单）→ M11（电磁/光学/热学/近代，13 单）**。

## 今日目标（2026-11-17）

1. 完成 `#166` P0 探针闭环（`resetLab()` 重置 `nextId = 1` + 检查器 `sourceDisplayName` + 本机 Chromium 实跑 `verify-composition-interaction.mjs` 全绿）并合入 `main`。
2. 推进 M10 核心力学与沙盒状态 Wave 1：`#169`（斜面）、`#172`（竖直圆周）、`#173`（平抛碰撞）、`#190`（组合台校验失败清旧轨迹，在 `#166` 合入后开工）。

## 当前 Milestone：M10 核心物理真源与沙盒缺陷修复（进度：0 / 8）

> [Milestone 4](https://github.com/zhangjszs/physical-modelvis/milestone/4) · 关联 8 单：Wave 1（`#166/#169/#172/#173/#190`）+ Wave 2（`#174/#175/#177`）。

### 目标与验收

- 组合实验台 P0 选中交互通过真实 WebGL 浏览器端到端探针（零 console error），且校验/求解失败不再残留旧轨迹播放。
- 斜面运动、竖直圆周、平抛碰撞、牛顿管、卫星轨道、牛顿第三定律全部完成「物理公式正确 + 2D/3D 消费引擎单一真源 + 单测/回归覆盖」。

### 完成信号（Success signal）

- M10 全部 8 个关联 Issue 经 Planner 独立验收后 **CLOSED（8/8）**，且 `main` 上 `npm run precheck`、`verify-composition-interaction.mjs`、GitHub CI 与夜间 `QA 场景巡检` 全绿。

### 明确非目标（Non-goals）

- 本 Milestone 不开展 `#191`（#166 P1 可控放置）、`#171`（Sandbox M0 共享器材契约）、`#189`（UI/UX 赛博改版）；不动 `#44`（D44=B 冻结）与 CI/CD 流水线结构（`#167` 守 1.10 红线）。

### 执行队列（2026-11-17，共 5 项 = 1 返工 `in-progress` + 4 `ready-for-agent`，P1 总数 = 5）

1. **#166**（`in-progress` 返工收口 · `priority:P1`）：组合实验台 P0 探针闭环（`resetLab` 重置 `nextId = 1` + `CompositionLab.tsx:251` 改用 `sourceDisplayName` + 实跑 `verify-composition-interaction.mjs` 全过）
2. **#169**（`ready-for-agent` · `priority:P1`）：修复斜面实验上滑初速度、动摩擦符号与有限斜面边界（`v0 > 0` 置底端起滑）
3. **#172**（`ready-for-agent` · `priority:P1`）：修复竖直圆周运动学自洽与杆/绳/环临界及 3D 真源对齐
4. **#173**（`ready-for-agent` · `priority:P1`）：修复平抛碰撞带符号水平位移 `OM_signed`、动量公式与非弹性文案
5. **#190**（`ready-for-agent` · `priority:P1`，**必须在 #166 合入 `main` 后建分支**）：组合台参数校验/求解失败清除旧 `result` 并同步停播

## 已知阻塞与依赖

- **#190 → #166**：串行顺序依赖，避免并行修改 `compositionStore.ts` / `CompositionStage.tsx` 冲突。
- **#179（D69）/ #181（D70）**：`needs-info`（M11），等待用户对参数/预设语义二选一（3 天无答复按默认 A 转正）。
- **#167（D71）**：`needs-info`（P3），修改 `.github/workflows/ci.yml` / `qa-sweep.yml` 邻接 1.10 红线，未获明确批准不进 `ready`。
- **#191 / #171 / #189**：`blocked`，等待物理修复收口与 D72 排程顺序确认；`#171` 需在开工前由 Planner 出阶段 A RFC 设计拆解。
- **#44**：`blocked · parked`（D44=B 冻结，React 19 暂缓）。
- **工作区既有未暂存改动（契约 1.1 / 9）**：`mise.toml`（`node = "22"` → `"24"`）与两远程已合并旧分支（`origin/agent/issue-95-shadow-adaptive`、`origin/agent/issue-96-default-on-grid`）继续保留不动，交用户决定处理。

## 下一阶段

- M10 Wave 2（`#174` 牛顿管、`#175` 卫星轨道、`#177` 牛顿第三定律）接续合入完成 M10 → 转入 **M11（13 单）** 清理电磁/光学/热学/近代物理缺陷 → 按 D72 确认顺序推进 **#191（#166 P1）→ #171（Sandbox M0）→ #189（UI/UX 改版）**。

## 已放弃 / 暂缓的方向

- React 19 自动升级（D44=B 冻结 `#44`）
- `#103` 派生大重构（D31 暂缓）
- 组合台交互探针强制接入 `ci.yml`（D62=A 不接入）

## 给 Executor 的指令

先收口 `#166` P0（`resetLab` 重置 `nextId = 1` 并本机实跑通过 `node scripts/verify-composition-interaction.mjs`）合并进 `main` 后，再按 `#169 → #172 → #173 → #190` 依次推进；每单务必核对最新 Issue 评论里的 Planner 定型约束，勿动 `mise.toml` 既有未暂存改动。
