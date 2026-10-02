# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261002T032000Z`（**执行者**·浏览器 QA 巡检第 1 轮）
- 会话开始: 2026-10-02T03:20:00Z (UTC)
- 本轮代码 commit: `71573d5`（fix #69 舞台永久空白）· CI `36963542504` 触发中 · pre-push 全量 precheck 绿
- 脉络：…→ `qoder-20261002T024607Z`(#67 验证收口) → 本棒 T032000Z（内置浏览器全场景巡检第 1 轮，修掉一个 P0）。
- **本轮性质转变**：按用户指令，从"按 issue 推进"改为"**浏览器逐场景巡检 → 发现即修**"。第 1 轮产出 = 巡检工具 + 1 个 P0 修复。

## 接力载体
- `.agent/` 随仓库提交（根 .gitignore 放行；`.agent/.gitignore` 仅排 `LOCK`）。规划文档 PLAN.md / DECISIONS.md 由规划者维护（现至 D12）。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261002T032000Z | 浏览器 QA 巡检第 1 轮 | 2026-10-02T03:20:00Z |

## 当前活跃
**无**（#69 已 CLOSED）。开放 issue：

| # | 状态 | 说明 |
|---|---|---|
| **#61** | P1 · ready-for-agent · **可执行** | M3 前置守卫（B 类「渲染消费引擎结果」豁免表 + 差集自动化）。**但见下方"优先级建议"** |
| #60 | P2 · ready-for-agent · 可执行 | 引擎单位记号统一 + 门禁 |
| #68 | P2 · ready-for-agent · 可执行 | lint/format 门禁盲区收口 |
| #62–#66 | P2 · blocked（← #61） | M3 五批单源迁移 |
| #44 | P2 · 人类持有 | react19/vite8/express5/TS7，勿动 |

### ⚠️ 优先级建议（待规划者立单，本棒未擅自建单）
修 #69 后**浮出**两个更大的用户可见缺陷，严重度高于 #61，建议优先立单：
1. **55 个场景 `updateEquipment` 抛 TypeError** → 症状是"拖参数器材不动"。已定位样本
   `rigs/electroscopeRig.ts:148`（对 undefined 设 `.visible`）；该场景还叠加「求解失败: 至少需要一个物理物体」+ 3D 内容空。
   与 `docs/plan.md` 阶段 D2 的"43 个 ERROR / 场景切换竞态"**同族**——当初的修复被空白舞台掩盖了。
2. **54 个场景播放按钮骗人**：`totalDuration === 0` 时播放/步进按钮仍可点（`disabled` 只看 `simulationResult`），
   切成 ⏸ 但时间永不动，右侧总时长显示 `0.00s`。
详见 #69 正文「遗留」节与收尾评论。

## 本轮已做（浏览器 QA 巡检第 1 轮）
1. **建巡检工具** `scripts/verify-qa-sweep.cjs`：遍历教材目录全部 123 场景，逐场景查
   console 报错 / 可见文本 NaN·Infinity·undefined / **canvas 数为 0 或整块同色** / 文本溢出裁切 /
   播放是否推进 / **每个参数拉到 min·max 的边界异常** / 时间轴拖到末尾。
   用法：起 dev server 后 `node scripts/verify-qa-sweep.cjs`；env `QA_BASE/QA_ONLY/QA_LIMIT/QA_SKIP_PARAMS/QA_CHANNEL`。
2. **发现并修复 P0 #69**：3D 场景切换后舞台**永久空白**（`useSceneRig` 的 rig 存 ref、就绪存 state，
   两者不同源 → React 同批次 setState 塌陷 → 跳过重渲染）。**实测 101/123 场景受影响，零 console 报错**，
   7 道门禁一道没拦住。修复 = rig 提为 state + `rigReady` 派生；顺带让 `rigError` 真的回退 2D（`SceneStage` 1 行）。
3. **证据**：sweep `no-canvas` 101 → 0；内置浏览器 5 个 3D 场景连切 canvas 恒 1、无 `.equipment-loading` 残留、
   播放时间 2.046→2.546→3.00、2D/3D 往返正常；`useSceneRig.test.ts` 6 例绿（+2）；`npm run precheck` 全绿。

## 已完成（最近，≤20 条）
- **#69** 3D 场景切换舞台永久空白（101/123）— `71573d5`，**本轮 CLOSED**；附新增 sweep 脚本
- **#67** L5 组合实验台场线渲染收尾 — 实现 `83fa03e`（glm 棒）+ 验证收口（上一棒）
- **#58** surface-tension σ_水 三方取值统一到 PHYSICS 单一真源 0.0728 + 渲染消费引擎 — 51ccaa7
- **#59** 移除幻影 double-slit，B 类清单/计数 61→60 — abc4a72
- **#55** B3 清单数字修正 + 61 场景常量/单位核对 — 2a0e312 / 8eda01b
- **#56** 3D 基础层收口：TrajectoryPoint3D 方案A + 3D 自检接入（仍 11 层）— 2e9ccf1
- **#54** 跨包双源消除：rendering/constants.ts 5 项→PHYSICS_CONSTANTS — 3ea8ced
- **#53** 渲染层常量门禁（自检 10→11 层）— 04241b2 · **#52** 渲染层 24 处内联收敛 — 5ec7122 · **#51** 电荷门禁加严 — 89910d1
- **#57** Deploy 修复 — 89b7dcc / d45cd39
- README/plan.md 测试数 **core 1107 / viz 1304(42 files) / total 2411**（本棒 count:sync 已回写三处标记）

## 阻塞项 / 风险
- **无脏树**，可正常跑全量 `precheck` / `count:sync`。
- **CI 盲区（重要）**：7 道门禁**没有任何一道看画面**。#69 那种"舞台根本没渲染"的 P0 全绿通过。
  建议把 `verify-qa-sweep.cjs` 纳入 CI/nightly —— 属改 CI 主流程，**须规划者/用户批准**，本棒未动。
- **单测兜不住这个 bug**：`renderHook` 的 act 边界复现不出应用里的同批次 setState 塌陷，
  真判据是 sweep 的 canvas 断言（已在测试注释与 #69 正文写明）。
- **#44**：人类 assignee，勿重试 React19 / 勿上调 70 kB bundle 预算。
- **自检维持 11 层**：#61 接入方式 = 追加到 `scripts/self-check.mjs` 的 **L11 `test` 数组**，不 +1 层。

## 环境备注（本轮新增事实）
- 本机**没有 msedge**：现有 `scripts/verify-*.cjs` 硬编 `channel: 'msedge'` 在 Linux 全部跑不了。
  Playwright 自带 chromium 已装（`~/.cache/ms-playwright/chromium-1243`）→ 新脚本默认不带 channel。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本需 `required_permissions=all`（/tmp 只读会假红）。
- **`pkill -f "vite --port 5199"` 会连沙箱 bwrap 包装进程一起匹配 → 自杀式终止**，改按 PID 杀或用 `pkill -f "vi""te"`。
- **`gh issue close` 不支持 `--comment-file`**（打印 usage 且静默不关闭）→ 先 `gh issue comment --body-file`，
  再 `gh issue close --reason completed`，最后 `gh issue view --json state` 复核。
- 巡检报告存 `.scratch/qa-sweep-{before,after}.json` + `sweep-{before,after}.log`（gitignore，不入库）。
