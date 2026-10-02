# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261003T000000Z`（**执行者**·浏览器 QA 巡检第 7 轮）
- 会话开始: 2026-10-03T00:00:00Z (UTC)
- 本轮代码 commit: `83f2632`（fix #87 抛体落地截断）· pre-push 全量 precheck 绿
- 脉络：…→ T080000Z(#78 GraphPanel hooks) → 本棒 T000000Z（#87 抛体穿地与机械能暴涨）
- **阶段任务**：按用户指令用内置浏览器逐场景巡检 123 个实验，一轮修一个明确问题，修完立刻浏览器复验。

## ⚠️ 并发规划会话（本轮再次出现，但这次没有互踩）
`f331e67 chore(agent): OCR 功能线立单 #74-#77 + D13 + M2.5 排程（M3 顺延）` 由另一规划会话写入，
**只改了 `.agent/PLAN.md` 与 `DECISIONS.md`**（规划者所有文件），未碰执行者的 `STATE.md`/`HANDOFF.md`，
也未碰我当时的未提交改动 → 文件职责分界生效，无覆盖事故。
**它改变了 backlog 排程**：M2.5（OCR 线 #74→#75→#76→#77）插在 M2 尾与 M3 之间，
故**若停止巡检，下一手是 #60，不是 #61**（我上一轮 HANDOFF 的说法已过时，本轮已纠正）。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者（现至 D13）；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261002T080000Z | 巡检第 6 轮（#78） | 2026-10-02T08:00:00Z |

## 巡检战果（123 场景全量，同一脚本同一口径）

| 指标 | 初始 | #69 后 | #70 后 | #71 后 | #72 后 | #73 后 | **#78 后** |
|---|---|---|---|---|---|---|---|
| 舞台空白（0 canvas） | **101** | 0 | 0 | 0 | 0 | 0 | **0** |
| console / pageerror | 0（被掩盖） | 55 | **0** | 0 | 0 | 0 | **0** |
| 可见错误提示条 | — | — | — | **12** | **0** | 0 | **0** |
| ERROR 级场景 | 101 | 55 | 0 | 12 | 0 | 0 | **0** ✅ |
| 完全无异常场景 | 9 | 34 | 69 | 69 | 72 | 72 | **72** |
| WARN（播放按钮类） | 114 | 54 | 54 | 54 | 51 | 51 | **51** |

**注**：#78 的图表崩溃**不在这六项指标里**——巡检脚本从不打开「数据/图像」抽屉，
抽屉内的崩溃与 ErrorBoundary 粘滞是**浏览器子代理肉眼发现的**。→ 队列里有"给巡检加抽屉覆盖"一项。

## 当前活跃
**无**（#87 已 CLOSED）。开放 issue 与排程（按规划会话最新 PLAN）：
**#60 → #68 → #74–#77（OCR）→ #79–#81（3D 性能）→ #61 → #62–#66**；#44 人类持有勿动。
⚠️ 规划会话仍在活跃建单（本轮 issue 编号已排到 #87），引用编号前先 `gh issue create` 拿真号。

## 本轮已做（#87，CLOSED）
**场景**：抛体运动 (平抛+斜抛)。默认模拟时长 5s 而飞行时间仅 3.02s。
**问题**：播放到末尾时面板显示「位置 y = -70.443 m」「机械能 E = 909.945 J」——
小球穿地继续掉，而且**这一页正在讲机械能守恒，面板显示的机械能恰好不守恒**（飞行期间明明是 219.600 J）。
**根因**：`projectile.ts` 把特征量与落地时刻 `tLand` 算在 `sampleTrajectory` **之后**，
轨迹按完整 duration 用纯抛物线采样 → `t > tLand` 是物理上不存在的外推：y 变负、|v| 无界增长→Ek 一直涨，
而 Ep = `m·g·Math.max(0, y-groundY)` 被夹在 0 → 两者相加自然暴涨。（关键帧那边倒是已经用了
`Math.min(tLand, duration)`，所以只有轨迹/图表/面板越界。）
**修复**：特征量/落地时刻计算前移到采样之前，轨迹只采样到 `tEnd = min(tLand, duration)`
（simEnd 至少留一个步长防退化、endSampleCount 按比例缩放保持密度）。时间轴上限自然等于 flightTime
（getTotalDuration 由轨迹算出），穿地区间从源头不可达；模拟时长仍是上界；neverLands 分支完全不变。
**刻意不加告警**：duration 大于飞行时间是正常用法，落地即止是预期行为，发告警等于天天报“狼来了”。
**连带修正测试自身的隐含假设**：`differential-analytic.test.ts` 的抛体组原在 `t = duration·{0.3,0.7,1}` 探测，
而该文件 `pointAt()` 是**就近取样本、不插值** —— 旧代码能过纯属巧合（800×0.3=240 正好落在整数样本号）。
改为**按样本索引**探测并用每个样本自己的 `p.t` 套解析式（对差分反而更严格）。
**新增 +3 回归用例**：截断后末点 t≈flightTime 且全程 y≥0 且机械能偏差<1% 且无告警 /
duration<flightTime 时末点仍等于 duration（截断只由落地触发）/ neverLands 时末点等于 duration 且有告警。
**验证**：浏览器实测 timelineMax 5.55 → **3.0212（=flightTime）**；末态 y=0 m、E=**219.600 J**；
y-t 曲线 1633 个采样点 min=0、无负值、末点与 0 刻度像素重合；诊断报告 `✓ 所有检查通过`；
切场景往返数值一致无红条；console 0 error；引擎 1114 + 可视化 1309 全绿。

## 上轮已做（#78，CLOSED）
**问题**：数据抽屉打开时从力学场景切到静态场景，曲线图崩成红字「图表加载失败」，
且 **ErrorBoundary 粘滞——之后切任何场景都不恢复，只能刷新页面**；控制台
`Rendered fewer hooks than expected`。

**根因**：`GraphPanel.tsx` 把空态早退 `if (!simulationResult && !inCompareMode) return …`
写在三个 `useMemo`（L97/L104/L165）**之前**。切场景瞬间 store 把 `simulationResult` 置 null
→ 该帧少调 3 个 hook → React 抛错。

**修复**：① 空态早退下移到全部 hook 之后；`series` memo 改 null 安全
（`simulationResult ? extractGraphSeries(...) : []`，去掉 `simulationResult!` 断言）；
组件内留注释防止后人挪回去。② 新增 `tests/charts/hook-order.test.tsx`（2 例）——
仓库没装 `eslint-plugin-react-hooks`，故自带两道防线：
**静态扫描**（顶层早退 return 之后不得再有顶层 hook；依赖 prettier 4 空格缩进判定顶层，
已验证修复后全仓 0 命中、旧版精确命中 `GraphPanel.tsx 早退@L87→hook@L165`）+
**行为回归**（真实渲染走 有→null→有，旧实现下复现出与生产完全一致的报错）。

**验证**：浏览器复验抽屉开着切静态场景 `hasChartError=false` 且曲线正常重绘；
**不刷新继续切单摆/抛体均恢复（粘滞消失）**；力学场景回归正常（`.recharts-line-curve` path 764px、
8 个选项卡齐全）；参数对比模式 5 条曲线 + 图例正常；全程 console **0 error**。
`npm run precheck` 全绿（126 + 44 测试文件 / 62.4 kB / 11 层 PASS）；测试数 **core 1111 / viz 1309 / total 2420**。

## 已完成（最近，≤20 条）
- **#87** 抛体运动落地后穿地、机械能凭空涨 4 倍（轨迹未按 flightTime 截断）+ 修正差分测试的格点假设 — `83f2632`，**本轮 CLOSED**
- **#78** GraphPanel 空态早退致曲线图崩溃+粘滞 + hooks 顺序双守卫 — `06ee453`
- **#73** 数据面板量纲错乱（2 处自相矛盾能量 + 24 处字段复用登记）— `33d5fee`
- **#72** L2 validate 断言空转 + 12 个纯场模型误要求 bodies → 窄钩子 `requiresBodies()` — `e0c0f1d`
- **#71** 静电屏蔽求解失败 + 巡检新增「可见错误提示条」判定 — `e5a367a` / `921e5a4`
- **#70** 3D 切场景旧 rig 泄漏 → updateEquipment 错配 handles（55 场景）+ 巡检接入 CI — `8984fc9` / `5700693`
- **#69** 3D 场景切换舞台永久空白（101/123）— `71573d5` · **#67** L5 场线收尾 — `83fa03e`
- **#58** σ_水 单一真源 — 51ccaa7 · **#59** 幻影 double-slit — abc4a72 · **#55** B3 核对 — 2a0e312/8eda01b
- **#56** 3D 基础层 — 2e9ccf1 · **#54** 跨包双源 — 3ea8ced · **#53** 渲染门禁 — 04241b2 · **#52** 24 处内联 — 5ec7122 · **#51** 电荷门禁 — 89910d1 · **#57** Deploy — 89b7dcc/d45cd39
- README/plan.md 测试数 **core 1114 / viz 1309(44 files) / total 2423**（本棒 count:sync 已回写）

## 阻塞项 / 风险
- **巡检脚本不打开「数据/图像」抽屉** → 抽屉内的崩溃（#78 这类）与 ErrorBoundary 粘滞**完全不在覆盖范围内**。
  这是本轮最重要的方法论教训：ERROR 指标"清零"不等于没问题，只是**当前判据看不见**。
- **ErrorBoundary 会把崩溃降级成局部错误区**且粘滞不恢复 → 评估严重度时不能只看有没有红条。
- **`visualization/tsconfig.json` 的 `include` 含 `tests`**（core 不含）→ 可视化测试参与类型检查，
  写测试要保证类型干净；而 **core 测试不参与类型检查**（`base-validate.test.ts` 里有真实 readonly 赋值错误而 CI 全绿）。
- **K2 的 24 个场景**仍把轨迹当数据载体（静态场景图表沿用 `y (m)` 等力学字段名/单位）→ 需定 A/B 方向，见 #73。
- **4 个模型仍用大锤 `requiresValidation() → false`**（thermistor / strain-gauge / security-alarm / light-control-switch）。
- **#44 勿动**；自检维持 11 层；无脏树。

## 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`；本机无 msedge（新脚本用 Playwright 自带 chromium）。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 用 `node .scratch/kill-vite.cjs`**（`pkill -f "vite..."` 会连沙箱包装进程自杀）。
- **jsdom 渲染 recharts 需 `ResizeObserver` stub**（照 `tests/rendering/equipment-stage.test.tsx` 的局部类写法，别改共享 setup）。
- **core 测试里 `getModel()` 必须从 `../../src/index.js` 导入**（注册在 `solver/solver-router.ts` 副作用里）。
- 临时探针测试文件注意相对路径深度（`tests/` 用 `../src`，`tests/accuracy/` 用 `../../src`），**用完必须删**。
- 改 `physics-core/src` 后必须 `npm run build:core`；跑巡检期间不要编辑 src（HMR 污染基线）。
- **教材目录 `<details>` 分组会自动折叠** → 自动化每次切换场景前重新 `d.open = true`。
- **写含反引号/引号的中文正文一律用 Write 工具落文件**，别用 `printf`。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- **issue 编号会被并发会话占用**：本轮预想编号 #74 实际是 #78（#74–#77 已被规划会话建掉）→
  在正文/测试注释里引用 issue 号前，先 `gh issue create` 拿到真号。
- 全量巡检：本地 ~8 分钟（`QA_SKIP_PARAMS=1`）；CI 含参数边界实测 27 分钟（`timeout-minutes: 45`）。
- 产物在 `.scratch/`（gitignore）：`qa-{banner,r4}.json`、`sweep-*.log`、`probe-*.cjs`、`*.v2.tsx`/`*.fixed.ts`
  （红→绿对照快照）、截图 `r6-*.png` / `r5-*.png` / `r4-*.png` / `verify*.png` / `fix-*.png` / `shield-*.png`。
