# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261002T070000Z`（**执行者**·浏览器 QA 巡检第 5 轮）
- 会话开始: 2026-10-02T07:00:00Z (UTC)
- 本轮代码 commit: `33d5fee`（fix #73）· pre-push 全量 precheck 绿 · CI/Deploy 见文末
- 脉络：…→ `qoder-20261002T055000Z`(#72 十二场景红条 + L2 断言空转) → 本棒 T070000Z（#73 面板量纲错乱）
- **阶段任务**：按用户指令用内置浏览器逐场景巡检 123 个实验，一轮修一个明确问题，修完立刻浏览器复验。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。规划文档 PLAN.md / DECISIONS.md 由规划者维护（现至 D12）。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261002T070000Z | 巡检第 5 轮（#73） | 2026-10-02T07:00:00Z |

## 巡检战果（123 场景全量，同一脚本同一口径）

| 指标 | 初始 | #69 后 | #70 后 | #71 后 | #72 后 | **#73 后** |
|---|---|---|---|---|---|---|
| 舞台空白（0 canvas） | **101** | 0 | 0 | 0 | 0 | **0** |
| console / pageerror | 0（被掩盖） | 55 | **0** | 0 | 0 | **0** |
| 可见错误提示条 | — | — | — | **12** | **0** | **0** |
| ERROR 级场景 | 101 | 55 | 0 | 12 | 0 | **0** ✅ |
| 完全无异常场景 | 9 | 34 | 69 | 69 | 72 | **72** |
| WARN（播放按钮类） | 114 | 54 | 54 | 54 | 51 | **51** |

## 当前活跃
**无**（#73 已 CLOSED）。开放 issue：#61（P1 可执行）· #60 / #68（P2）· #62–#66（blocked）· #44（人类持有）。

## 本轮已做（#73，CLOSED）
**问题**：数据抽屉「实时状态」面板显示「位置 y = 90.000 **m**」「势能 Ep = 90.000 **J**」「动能 Ek = 1.000 **J**」——
面板没算错，它只是老实打印了引擎塞进 `TrajectoryPoint` 的东西
（`electroscope`：`position={x:q, y:θ}`、`kineticEnergy: q²`、`potentialEnergy: θ`）。

**先做影响面普查**（82 个有轨迹数据的场景，判据用"不需要场景语义就能判定矛盾"的物理自洽性）：
- **K1 自相矛盾**（`velocity ≡ 0` 却报非零动能）：**2 个** — `electroscope`、`coulomb-force-explore`（后者把 N 当动能、C 当势能）
- **K2 字段复用**（`velocity ≡ 0` 但 `position` 随 t 变 = 轨迹数组当参数扫描曲线用）：**24 个**
- 求解抛错：0

**最小修复**：
1. 引擎：两个 K1 模型删掉 `kineticEnergy`/`potentialEnergy`（字段本身 optional；两场景都没配 `ke_t`/`pe_t` 曲线；
   渲染层 0 处读能量字段 → 唯一消费者就是说谎的面板）
2. `StateInspector`：能量/加速度缺失时显示 `—`，不再用 `?? 0` 把"未计算"报成"0 焦耳"
3. 新增常驻守卫 `tests/accuracy/trajectory-semantics.test.ts`（2 例）：K1 零容忍 + K2 24 项白名单
   （逐项注明 position 实际存什么），断言"不得超出白名单" → 以后这么干必须显式承认

**验证**：
- 红→绿：换回旧模型时 K1 断言精确报出 `max Ek = 17.975`（库仑）与 `max Ek = 1`（验电器）；修复后全绿
- 浏览器复验 + **回归对照**：验电器/库仑探究能量三行均为 `—`；**抛体运动能量行仍是正常数值且随时间变化
  （Ek 200→100→216 J、Ep 反向），机械能全程 219.600 J 精确守恒**，自由落体亦正常 → 证明没误伤真力学场景
- `npm run precheck` 全绿（126+43 测试文件 / 62.4 kB / 11 层 PASS）；测试数 **core 1111 / viz 1307 / total 2418**

## 已完成（最近，≤20 条）
- **#73** 数据面板量纲错乱（2 处自相矛盾能量 + 24 处字段复用登记）— `33d5fee`，**本轮 CLOSED**
- **#72** L2 validate 断言空转 + 12 个纯场模型误要求 bodies → 新增窄钩子 `requiresBodies()` — `e0c0f1d`
- **#71** 静电屏蔽求解失败 + 巡检新增「可见错误提示条」判定 — `e5a367a` / `921e5a4`
- **#70** 3D 切场景旧 rig 泄漏 → updateEquipment 消费错配 handles（55 场景）+ 巡检接入 CI — `8984fc9` / `5700693`
- **#69** 3D 场景切换舞台永久空白（101/123）— `71573d5`
- **#67** L5 场线渲染收尾 — `83fa03e` · **#58** σ_水 单一真源 — 51ccaa7 · **#59** 幻影 double-slit — abc4a72
- **#55** B3 核对 — 2a0e312/8eda01b · **#56** 3D 基础层收口 — 2e9ccf1 · **#54** 跨包双源 — 3ea8ced · **#53** 渲染门禁 — 04241b2 · **#52** 24 处内联 — 5ec7122 · **#51** 电荷门禁 — 89910d1 · **#57** Deploy — 89b7dcc/d45cd39
- README/plan.md 测试数 **core 1111 / viz 1307(43 files) / total 2418**（本棒 count:sync 已回写）

## 阻塞项 / 风险
- **本轮复验新发现的崩溃级 bug 未修**（已完整定位，见 HANDOFF 下一步第 1 条）：
  `GraphPanel.tsx:87` 提前 return 位于两个 `useMemo` 之前 → 切场景时 `simulationResult` 瞬时为 null
  → "Rendered fewer hooks than expected" → 曲线图区崩成「图表加载失败」且 **ErrorBoundary 粘滞，只能刷新页面**。
  与本棒改动无关（diff 不含该文件），是 HEAD 上就存在的结构性缺陷。
- **「断言被 catch 包住」/「hooks 顺序」这类结构缺陷肉眼难查**：建议给巡检或测试加静态守卫
  （扫组件里 return 之后是否还有 `use[A-Z]`）。
- **K2 的 24 个场景**仍把轨迹当数据载体（验电器面板「位置 y = 90 m」、y–t 图把 θ 当 y 画）——
  根治需在 A（模型改用 charts 承载曲线）/ B（面板读 charts 的 label/unit）之间定方向，见 #73 正文。
- **`physics-core/tsconfig.json` 排除 tests** → 引擎测试不参与类型检查（该目录存在真实 readonly 赋值类型错误而 CI 全绿）。
- **4 个模型仍用大锤 `requiresValidation() → false`**（thermistor / strain-gauge / security-alarm / light-control-switch）。
- **#44 勿动**；自检维持 11 层；无脏树。

## 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`；本机无 msedge（新脚本用 Playwright 自带 chromium）。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 用 `node .scratch/kill-vite.cjs`**（`pkill -f "vite..."` 会连沙箱包装进程自杀）。
- **core 测试里 `getModel()` 必须从 `../../src/index.js` 导入**（注册在 `solver/solver-router.ts` 副作用里）。
- **可视化测试里放临时探针文件时注意相对路径深度**：`tests/x.test.ts` 用 `../src/...`，`tests/accuracy/x.test.ts` 用 `../../src/...`。
  临时探针**用完必须删**，否则会被 `npm test` 收进测试数。
- 改 `physics-core/src` 后必须 `npm run build:core` 再跑前端测试（#15 dist 守卫）；跑巡检期间不要编辑 src（HMR 污染基线）。
- **教材目录 `<details>` 分组会自动折叠** → 自动化每次切换场景前需重新 `d.open = true`。
- **写含反引号/引号的中文正文一律用 Write 工具落文件**，别用 `printf`。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- 全量巡检：本地 ~8 分钟（`QA_SKIP_PARAMS=1`）；CI 含参数边界实测 27 分钟（`timeout-minutes: 45`）。
- 产物在 `.scratch/`（gitignore）：`qa-{banner,r4}.json`、`sweep-*.log`、`probe-*.cjs`、`apply-exemption.cjs`、
  `kill-vite.cjs`、`*.fixed.ts`（红→绿对照用的快照）、截图 `r4-*.png` / `r5-*.png` / `verify*.png` / `fix-*.png`。
