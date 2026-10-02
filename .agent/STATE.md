# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261002T042500Z`（**执行者**·浏览器 QA 巡检第 2 轮）
- 会话开始: 2026-10-02T04:25:00Z (UTC)
- 本轮代码 commit: `8984fc9`（fix #70 参数不随动）+ `5700693`（fix(ci) 超时 30→45）· pre-push 全量 precheck 绿
- **巡检流水线首跑已确认绿**：run `37002178007`（workflow_dispatch、全量 123 场景）**completed success**，实测耗时 **27 分钟**
- 脉络：…→ `qoder-20261002T032000Z`(#69 舞台永久空白) → 本棒 T042500Z（#70 handles 错配 + 巡检接入 CI）。
- **阶段任务**：按用户指令用内置浏览器逐场景巡检 123 个实验，一轮修一个明确问题，修完立刻浏览器复验。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。规划文档 PLAN.md / DECISIONS.md 由规划者维护（现至 D12）。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261002T042500Z | 浏览器 QA 巡检第 2 轮 | 2026-10-02T04:25:00Z |

## 巡检战果（跨棒累计，同一脚本同一判定口径）

| 指标 | 初始（#69 前） | #69 后 | **#70 后（本轮）** |
|---|---|---|---|
| 舞台空白（0 canvas）场景 | **101** | 0 | **0** |
| console / pageerror 场景 | 0（被空白掩盖） | 55 | **0** |
| ERROR 级场景合计 | 101 | 55 | **0** |
| 完全无异常场景 | 9 | 34 | **69** |
| 剩余 WARN | 114 | 54 | **54**（播放按钮类，见下） |

## 当前活跃
**无**（#70 已 CLOSED）。开放 issue：

| # | 状态 | 说明 |
|---|---|---|
| **#61** | P1 · ready-for-agent · 可执行 | M3 前置守卫（B 类单源快照豁免表 + 差集自动化） |
| #60 | P2 · ready-for-agent · 可执行 | 引擎单位记号统一 + 门禁 |
| #68 | P2 · ready-for-agent · 可执行 | lint/format 门禁盲区收口 |
| #62–#66 | P2 · blocked（← #61） | M3 五批单源迁移 |
| #44 | P2 · 人类持有 | react19/vite8/express5/TS7，勿动 |

## 本轮已做（#70，CLOSED）
3D 场景切换后「**拖参数器材不动**」（55/123 场景，错误被 try-catch 吞成一条 console.error，页面看不出异常）：
1. 根因：`useSceneRig` 的 `rig` state **不记录它属于哪个场景**。切场景那一帧 `currentScene` 已是新值而
   `rig` 仍是旧的；`SceneStage` 用 `key={currentScene}` 重挂 → `EquipmentStage`（mount effect 依赖 `[]`）
   **用旧 rig 建 handles** → 新 rig 到位后 `updateEquipment(旧 handles)` → 55 个场景报了 **9 种不同属性**的
   `Cannot read properties of undefined`。属 `docs/plan.md` 阶段 D2"场景切换竞态"家族的残留形态。
2. 修复：`rig`/`error` 与 `sceneId` 绑成一个 `RigEntry` state，派生前先按 sceneId 过滤 →
   切换那一帧 `rig` 必为 `null`，不可能用旧 rig 挂载；`rigLoading` 改由 `!rig && !rigError` 派生。
3. **巡检接入 CI**（用户批准）：新增 `.github/workflows/qa-sweep.yml`
   —— PR 跑前 12 场景 + `QA_STRICT=canvas`（只拦"舞台未渲染"，console 降级 WARN 不卡正常 PR）；
   nightly/手动跑全量 123 场景 + 严格口径；报告上传 artifact 14 天。
   脚本相应新增 `QA_STRICT` 开关。已 `workflow_dispatch` 实跑验证（run `37002178007` → **success**）。
   **CI 全量结果（含逐参数 min/max 边界扫描，比本地那次更宽）：123 场景 ERROR 0 / WARN 54 / OK 69，
   边界异常 0 项** —— 即全场景参数拉到上下限时都没有 NaN/Infinity/undefined 泄漏到页面。
4. 验证：巡检 console finding **55 → 0**、ERROR 场景 **55 → 0**、无异常场景 **34 → 69**；
   内置浏览器实测 自由落体 h0 / 胡克定律 k / 单摆 L 拉到 max·min **器材均可见随动**，全程 0 error 0 warning；
   `useSceneRig.test.ts` 7 例绿；`npm run precheck` 全绿；测试数 **core 1107 / viz 1305 / total 2412**。

## 已完成（最近，≤20 条）
- **#70** 3D 切场景旧 rig 泄漏 → updateEquipment 消费错配 handles（55 场景参数不随动）+ 巡检接入 CI — `8984fc9`，**本轮 CLOSED**
- **#69** 3D 场景切换舞台永久空白（101/123）— `71573d5`
- **#67** L5 组合实验台场线渲染收尾 — `83fa03e` + 验证收口
- **#58** σ_水 三方取值统一到单一真源 0.0728 — 51ccaa7 · **#59** 幻影 double-slit 计数 61→60 — abc4a72
- **#55** B3 清单与 61 场景单位核对 — 2a0e312/8eda01b · **#56** 3D 基础层收口 — 2e9ccf1
- **#54** 跨包双源消除 — 3ea8ced · **#53** 渲染层常量门禁 — 04241b2 · **#52** 24 处内联收敛 — 5ec7122 · **#51** 电荷门禁加严 — 89910d1
- **#57** Deploy 修复 — 89b7dcc/d45cd39
- README/plan.md 测试数 **core 1107 / viz 1305(42 files) / total 2412**（本棒 count:sync 已回写）

## 阻塞项 / 风险
- **无脏树**，全量 `precheck` / `count:sync` 正常。
- **jsdom 单测复现不出这类挂载时序 bug**：本轮新用例在旧实现下**也通过**（React passive effect 是"子先父后"，
  `renderHook` 不涉及子组件）。所以 3D 舞台类改动的判据是**浏览器巡检**，不是单测 —— 已在测试注释与 #70 正文写明。
- **巡检流水线已实跑验证通过**（run `37002178007` success）：npm ci → 构建 core → Playwright Chromium 安装
  → 起 dev server → 等待就绪 → 全量巡检 → 上传 artifact 全部可用。全量耗时 27 分钟，
  因此 `timeout-minutes` 已调为 45（`5700693`）—— 下一棒改脚本时如果再变慢请同步调这个值。
- **#44**：人类 assignee，勿重试 React19 / 勿上调 70 kB bundle 预算。
- **自检维持 11 层**（#61 接入方式 = 追加到 `scripts/self-check.mjs` 的 L11 `test` 数组）。

## 环境备注
- 本机无 msedge → 新脚本用 Playwright 自带 chromium；现有 `verify-*.cjs` 硬编 `channel:'msedge'` 在 Linux 跑不了。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 别用 `pkill -f "vite..."`**：命令行里只要含 "vite" 字样（包括同条命令的其它参数）就会连沙箱包装进程一起自杀。
- **`gh issue close` 不支持 `--comment-file`**（静默不关闭）→ 先 comment，再 close，最后 view 复核 state。
- **跑巡检期间不要编辑 `visualization/src/**`**（HMR 会污染基线）；改 `scripts/` 与 `.github/` 是安全的。
- 巡检产物在 `.scratch/`（gitignore）：`qa-sweep-{before,after,r2}.json`、`sweep-*.log`、`probe-*.cjs`、`verify*.png`、`fix-*.png`。
