# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261002T055000Z`（**执行者**·浏览器 QA 巡检第 4 轮）
- 会话开始: 2026-10-02T05:50:00Z (UTC)
- 本轮代码 commit: `e0c0f1d`（fix #72）· **CI + Deploy 绿** · pre-push 全量 precheck 绿
- 脉络：…→ `qoder-20261002T042500Z`(#70 参数不随动 + #71 静电屏蔽 + 巡检接入 CI) → 本棒 T055000Z（#72 十二场景红条 + L2 门禁空转）
- **阶段任务**：按用户指令用内置浏览器逐场景巡检 123 个实验，一轮修一个明确问题，修完立刻浏览器复验。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。规划文档 PLAN.md / DECISIONS.md 由规划者维护（现至 D12）。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261002T055000Z | 巡检第 4 轮（#72） | 2026-10-02T05:50:00Z |

## 巡检战果（跨棒累计，同一脚本同一判定口径，123 场景全量）

| 指标 | 初始 | #69 后 | #70 后 | #71 后（加红条判定） | **#72 后（本轮）** |
|---|---|---|---|---|---|
| 舞台空白（0 canvas） | **101** | 0 | 0 | 0 | **0** |
| console / pageerror | 0（被掩盖） | 55 | **0** | 0 | **0** |
| 可见错误提示条 | — | — | — | **12** | **0** |
| ERROR 级场景合计 | 101 | 55 | 0 | 12 | **0** ✅ |
| 完全无异常场景 | 9 | 34 | 69 | 69 | **72** |
| 剩余 WARN | 114 | 54 | 54 | 54 | **51**（全为 playback 类） |

**ERROR 类问题已清零**，剩余 51 个 WARN 全属同一族（播放按钮，见「下一步」）。

## 当前活跃
**无**（#72 已 CLOSED）。开放 issue：

| # | 状态 | 说明 |
|---|---|---|
| **#61** | P1 · ready-for-agent · 可执行 | M3 前置守卫（B 类单源快照豁免表 + 差集自动化） |
| #60 / #68 | P2 · ready-for-agent · 可执行 | 单位记号统一+门禁 / lint-format 盲区 |
| #62–#66 | P2 · blocked（← #61） | M3 五批单源迁移 |
| #44 | P2 · 人类持有 | 依赖大版本迁移，勿动 |

## 本轮已做（#72，CLOSED）
**双重发现**：12 个场景对用户显示「求解失败: 至少需要一个物理物体」，而**本该拦住它们的 L2 自检断言一直在空转**。

1. **门禁 bug**：`scene-contract.test.ts` 第 3 条 check 把 `expect(v.valid).toBe(true)` 写在
   `try { … } catch { /* skip */ }` 里 → AssertionError 被空 catch 吞掉 → 无论多少场景 validate 失败都是绿的。
   改为**收集 failures 数组、循环后一次性断言**（一次报出全部违规，而非只报第一个）。收紧后当场报出 12 个，
   与浏览器巡检看到的 12 个红条 **1:1 对应**。
2. **引擎 bug**：12 个模型全文不引用 `problem.bodies`，却被基类无条件要求"至少一个物体"。
   **没有沿用 #71 的 `requiresValidation()` 大锤** —— 批量套上去后 `micrometer`（刻意软限程模型）的
   "thickness=NaN 仍被 NON_FINITE_PARAMETER 拒绝"契约当场失败，证明大锤会连带关掉 #8 的参数范围与 NaN/Inf 守卫。
   → 在 `PhysicsModelBase` 新增**窄钩子 `requiresBodies()`**（默认 true，只作用于 NO_BODIES 一项），
   13 个模型改用它（12 新修 + `electrostatic-shielding` 从大锤迁来），并给 `requiresValidation()` 加大锤警示注释。
3. **契约测试 +3 例**（`base-validate.test.ts`）：豁免模型不再产出 NO_BODIES / 未豁免模型仍产出（防钩子被全局关掉）/
   **窄豁免不关掉 NaN-Inf 守卫**（固化这次被打回的教训）。
4. **验证**：巡检 `error-banner` 12→0、ERROR 场景 12→0、无异常场景 69→72、playback 54→51
   （静电感应/验电器/库仑定律 求解跑通后播放复活）；内置浏览器目视复验 6 个代表场景 **6/6 通过且画面非空白**、
   console 0 error；`npm run precheck` 全绿。测试数 **core 1111 / viz 1305 / total 2416**。

## 已完成（最近，≤20 条）
- **#72** L2 validate 断言空转（expect 被空 catch 吞）+ 12 个纯场模型误要求 bodies → 新增窄钩子 `requiresBodies()` — `e0c0f1d`，**本轮 CLOSED**
- **#71** 静电屏蔽求解失败 + 巡检新增「可见错误提示条」判定（显形 12 场景）— `e5a367a` / `921e5a4`
- **#70** 3D 切场景旧 rig 泄漏 → updateEquipment 消费错配 handles（55 场景参数不随动）+ 巡检接入 CI — `8984fc9` / `5700693`
- **#69** 3D 场景切换舞台永久空白（101/123）— `71573d5`
- **#67** L5 组合实验台场线渲染收尾 — `83fa03e` + 验证收口
- **#58** σ_水 单一真源 0.0728 — 51ccaa7 · **#59** 幻影 double-slit 61→60 — abc4a72 · **#55** B3 核对 — 2a0e312/8eda01b
- **#56** 3D 基础层收口 — 2e9ccf1 · **#54** 跨包双源消除 — 3ea8ced · **#53** 渲染层常量门禁 — 04241b2 · **#52** 24 处内联收敛 — 5ec7122 · **#51** 电荷门禁加严 — 89910d1 · **#57** Deploy 修复 — 89b7dcc/d45cd39
- README/plan.md 测试数 **core 1111 / viz 1305(42 files) / total 2416**（本棒 count:sync 已回写）

## 阻塞项 / 风险
- **无脏树**，全量 `precheck` / `count:sync` 正常。
- **「断言被 catch 包住」是系统性风险**：本轮只修了 L2 一处。全仓还有多少空转断言未知 —— 这类门禁比没有门禁更糟。
- **`physics-core/tsconfig.json` 的 `exclude` 含 `tests`** → 引擎测试**不参与类型检查**；
  `base-validate.test.ts` 里就有两行 `problem.bodies = [...]`（readonly 属性赋值）的真实类型错误，IDE 报错而 CI 全绿。
  本轮未动（属改 CI/构建配置，须规划者批准）。
- **4 个模型仍用大锤 `requiresValidation() → false`**（`thermistor` / `strain-gauge` / `security-alarm` /
  `light-control-switch`）→ 它们的参数范围与 NaN/Inf 守卫目前是关着的。迁移到 `requiresBodies()` 需逐个验证。
- **#44**：人类 assignee，勿动。**自检维持 11 层**。

## 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`；本机无 msedge（新脚本用 Playwright 自带 chromium）。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 不要用 `pkill -f "vite..."`**（命令行含 "vite" 就会连沙箱包装进程自杀）→ 用 `.scratch/kill-vite.cjs`（按 /proc 匹配 + 排除自身）。
- **core 测试里用 `getModel()` 必须从 `../../src/index.js` 导入**：模型注册在 `solver/solver-router.ts` 的模块副作用里，
  从 `models/base.js` 直接拿会看到空注册表（`UnsupportedModelError: 该模型尚未注册`）。
- **跑巡检期间不要编辑 `visualization/src/**` / `physics-core/src/**`**（HMR 污染基线；改引擎还要重建 dist）。
- **写含反引号/引号的中文正文一律用 Write 工具落文件**，别用 `printf`（会被 shell 当命令替换执行 / EOF 报错）。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- 巡检产物在 `.scratch/`（gitignore）：`qa-sweep-{before,after,r2}.json`、`qa-{banner,r4}.json`、`sweep-*.log`、
  `probe-*.cjs`、`apply-exemption.cjs`、`kill-vite.cjs`、截图 `verify*.png` / `fix-*.png` / `shield-*.png` / `r4-*.png`。
