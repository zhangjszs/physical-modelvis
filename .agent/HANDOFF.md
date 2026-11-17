# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮概要

M10 Wave 1 执行会话（2026-11-17 23:13 ~ 2026-11-18 00:42，Execution Agent）：在 `main` 上连续、串行清空今日队列全部 5 项任务（`#166 P0 返工` → `#169` → `#172` → `#173` → `#190`）。所有代码变更均通过全量 `npm run precheck`（含 `build:core` / `typecheck` / `lint` / `format:check` / `sweep:test` / `test` / `count:check` / `build:viz` / `check:bundle` / `check:publish` / `selfcheck`）、Playwright 组合实验台交互探针与代码审查后合入 `main` 并推送，GitHub Actions CI 5 笔连续 `success`，5 个 Issue 均已提交 §1.7 执行报告并转 `in-review`。

## 已完成

1. **#166 P0 返工收口（合入 `81c3064` · CI `44117730429` success）**：
   - `compositionStore.ts` `resetLab()` 重置 `nextId = 1`；`CompositionLab.tsx` 检查器统一使用 `sourceDisplayName(selected)`；
   - `picking.ts` 与 `CompositionStage.tsx` 将 `raycaster.params.Line.threshold` 收窄至 `PICK_LINE_THRESHOLD_M = 0.03`、抽取 `decidePointerDownPick`（修复已选堆叠物拖不动与同点点击立即切换）并在数据源变化/拖拽后清理 `pickCycle`/`lastPickCount`；
   - 校准 `scripts/verify-composition-interaction.mjs` 第 16/17 步防叠加误命中；本地实跑 `verify-composition-interaction.mjs` 全项（含 A-1/A-2/A-4/A-5/A-7）通过。
2. **#169 斜面实验上滑初速度、动摩擦方向与有限斜面边界（合入 `604fe5c` · CI `44120353889` success）**：
   - `inclined-plane.ts` 实现 `vAlong < 0` 上滑阶段（`a_up = g(sinθ + μcosθ)`）、速度过零静摩擦锁定检查 `staticCanHold`（`tanθ ≤ μ` 驻留，否则切换 `a_down = g(sinθ - μcosθ)`）及 `[0, inclineLength]` 双端截断；
   - `visualization` 场景在 `v0 > 0` 时从底端出发、`inclineRig.ts` 固定按完整 `[0, L]` 锚定斜面板、2D 标题/信息栏消费当前帧瞬时加速度。
3. **#172 竖直圆周运动学自洽与杆/绳/环临界及 3D 真源（合入 `66af132` · CI `44123600779` success）**：
   - 抽取 `vertical-circle-integrator.ts`（221 行）实现细步长 RK4 约束积分（$d\theta/dt=\omega, d\omega/dt=-(g/r)\sin\theta$），绳/环在 $2gr < v_0^2 < 5gr$ 二分定位脱轨点切换自由落体斜抛及回落捕获；
   - `rod` 过顶判据修正为 $v_0 \ge \sqrt{4gr}$（同步更新 `vertical-circle.test.ts` 与 `single-source-contract.test.ts`）；修正 `verticalCircleRig.ts` 中 `ring` 误判与硬编码 `g=9.8`，2D/3D 统一消费引擎帧、正确映射最低点 y 轴并在脱离期间隐藏约束力箭头。
4. **#173 平抛碰撞反弹带符号位移与非弹性文案（合入 `d5db38e` · CI `44125368835` success）**：
   - `projectile-collision.ts` 新增带符号水平位移 `OM_signed = v1After * tFall` / `ON_signed = v2After * tFall`（保留 `OM`/`ON` 非负距离大小），关键帧坐标、`range_diagram`、步骤 4 动量验证 `m1*OP = m1*OM_signed + m2*ON_signed` 与 2D/3D 落点全面消费带符号结果；`e < 1` 区分「非弹性」/「完全非弹性」。
5. **#190 组合实验台校验/求解失败清除旧结果与停播归零（合入 `8a09ec0` · CI `44127860671` success）**：
   - `compositionStore.ts` `recompute` 失败/异常分支统一清 `result: null`，`setDuration` 对非正/非有限时长清 `result: null` 并报错；
   - 抽取 `stageTrajectory.ts` 并接入 `CompositionStage.tsx`，无有效轨迹时隐藏轨迹/粒子球并停播归零、守卫空格快捷键；更新 `compositionStore.test.ts`、`compositionPlayback.test.tsx` 并复测 `verify-composition-interaction.mjs` 通过。

## 未完成 / 进行中（下一棒最优先看这里）

- **今日队列已清空（0 个 `ready-for-agent`，0 个 `in-progress`）**：所有 5 个任务临时分支已删除，当前干净停在 `main @ 8a09ec0`。
- **需要 Planner 优先处理**：
  1. 逐条验收 M10 Wave 1 的 5 个 `in-review` Issue（`#166` / `#169` / `#172` / `#173` / `#190`）并转 `done` / close；
  2. 将 M10 Wave 2（`#174`、`#175`、`#177`）等后续待办做 Planner 4.2 门禁拆解后标 `ready-for-agent` 并刷新 `PLAN.md` / `TASKS.md`。

## 验证情况

- 最终 `npm run precheck`（于 `8a09ec0` 前提交校验 + `pre-push` 复跑）：退出码 `0`
  - `physics-core`：129 files / **1196 tests passed**
  - `visualization`：77 files / **2018 tests passed**（总计 **3214 tests passed**）
  - `typecheck` / `lint` / `format:check` / `sweep:test` / `count:check` / `build:viz` / `check:bundle`（首屏 11.8 kB ≤ 70 kB）/ `check:publish` / `selfcheck`（11/11 PASS）全绿。
- `node scripts/verify-composition-interaction.mjs`（于 `#166` 与 `#190` 均实跑）：退出码 `0` · `COMPOSITION INTERACTION VERIFICATION OK`，0 console error。
- 远端 CI 核对：`81c3064`（`44117730429`）、`604fe5c`（`44120353889`）、`66af132`（`44123600779`）、`d5db38e`（`44125368835`）、`8a09ec0`（`44127860671`）全部 `completed / success`。

## 风险与注意事项

1. **未暂存工作区文件**：`mise.toml`（`node = "22"` → `"24"`）在会话前已存在，按契约保持原样未触碰；因此跨分支合回 `main` 使用 `git fetch origin && git merge --ff-only origin/main && git merge --no-ff`（跳过被脏工作区拦截的 `git pull --rebase`）。
2. **远程遗留分支**：`origin/agent/issue-95-shadow-adaptive` 与 `origin/agent/issue-96-default-on-grid` 仍存在，未代删。
3. **测试数同步**：已通过 `npm run count:sync` 将 `README.md` 与 `docs/plan.md` 同步为 **3214**（1196 + 2018）。

## 给下一棒的第一步建议

- **Planner**：验收并关闭 `#166`、`#169`、`#172`、`#173`、`#190`，确认 Wave 1 清零后启用 M10 Wave 2（`#174` / `#175` / `#177` 等）。
- **Executor**：等待 Planner 批复新一轮 `ready-for-agent` 后领取。

## 今日日报

- 已写入 `.agent/DIARY/2026-11-18.md`（另在 `.agent/DIARY/2026-11-17.md` 末尾以追加方式留存跨日关联）。

## 给 Planner 的信号

- **Wave 1 全部转入 `in-review`**：`#166`、`#169`、`#172`、`#173`、`#190` 均已完成实现、全量本地 `precheck`、`verify-composition-interaction.mjs` 与 GitHub CI 验证，请验收并开启下一批 `ready-for-agent` 队列。
