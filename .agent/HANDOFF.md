# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-03 · `qoder-20261003T010000Z` · 执行者）· 浏览器 QA 巡检 **第 8 轮** · 收尾 ~01:45 UTC

### 阶段任务形态（用户指令）
用内置浏览器逐场景巡检 123 个实验，**一轮只聚焦一个明确问题**：查异常 → 判类别 → 定位根因 →
最小范围修复 → **浏览器复验** → commit + push → 更新 issue → 重写本文件 → 进下一个。

### 本轮做了什么 —— #88（CLOSED）
**场景**：全部场景的参数交互（复现样本：抛体运动「模拟时长」）。
**问题**：拖完滑块仿真不刷新，结果稳定反映**上一个**参数值，必须再改一次或点「重置参数」才更新。
**根因是过期闭包，不是"没触发重算"**（这个区分很关键，否则容易去改错地方）：

- `ParameterPanel` 用 150ms debounce 调 `onRunSimulation()` —— **定时器持有"创建它那一帧"的函数身份**；
- `useSceneSimulation` 的 `runSimulation` 是 `useCallback`，**从渲染期闭包读 `parameters`**；
- 于是 150ms 后执行的是旧函数，闭包里的 `parameters` 还是改动前的值 → 每次重算慢一步；
- 旁证：`setParameter` 不 bump `sceneLoadVersion`（所以"自动运行"那条路也帮不上），
  而「重置参数 / 预设」走 `applyPreset` 会 bump 版本 → **点重置就正常**，与观测完全吻合。

**修复**：`runSimulation` 改为在调用瞬间 `useSimulationStore.getState()` 读
`currentScene`/`parameters`/`scenes`，`useCallback` 依赖收敛到两个稳定 setter。
这样**任何**被延迟持有的旧身份被调用都拿到最新状态 —— 从根上消除这类时序错配，
而不是只在 `ParameterPanel` 一处打补丁。debounce 保留（150ms 是刻意设计，避免每次 input 都重算上千采样点）。

**同类残留已扫完**：全仓只有 4 处定时器 —— `CompositionStage:228` 本来就用 `getState()`（正确写法），
`ParameterPanel` 三处调的都是本次修好的 `onRunSimulation` → **无残留**。

**+2 回归用例**：①用旧一帧 `runSimulation` 身份重算也必须用最新参数
（旧实现下报 `expected { angle: 45 } to match object { angle: 60 }` —— 滞后一步的字面证据）；
②连续两次改参数，第二次重算必须反映第二次的值。

**验证**（内置浏览器 6 项判定全过，数值全部与解析式吻合）：

| 判定 | 操作 | 结果 |
|---|---|---|
| A | 模拟时长 5 → 1 | timelineMax **立即 = 1** ✅ |
| B | 模拟时长 → 20 | 立即回到 3.0212（落地截断）✅ |
| C | 初速度 v₀ → 40 | Ek 立即 = 800.000 J；timelineMax = 5.8422 = 解析值 ✅ |
| D | 发射角 θ → 90 | `range=0`、`thetaDeg=90`、`flightTime=8.213`、`apexHeight=83.633=2+1600/19.6` ✅ |
| E | 点「重置参数」 | 完全回到基线，无残留 ✅ |
| F | 换单摆，摆长 1 → 5 | `periodSmall` 立即 2.007 → **4.488 = 2π√(5/9.8)** ✅ |

F 尤其重要：单摆是**数值积分**模型、抛体是**解析**模型，都立即响应 → 证明修的是调度层。
全程 console **0 error 0 warning**。`precheck` 全绿；测试数 **core 1114 / viz 1311 / total 2425**。
commit `fdca402`。

⚠️ **连续两轮截图失败**：自动化浏览器标签页被置后台（`visibilityState=hidden`），
`take_screenshot` 报 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE` → 本轮结论**全部来自 DOM/JS 读数**，
未做像素级视觉确认。下一棒若要视觉证据，需先把该标签页置于前台。

---

## 下一步建议（按推荐顺序）

### 1.【强烈推荐】给巡检脚本加「交互后一致性」+「抽屉/图表区」两类判定
本轮和上轮的两个 bug（#88 参数滞后、#78 图表崩溃）**都是脚本判据看不见、靠子代理偶然撞出来的**。
建议把这两类固化成第 9、10 项判定，逐场景自动执行：

- **抽屉覆盖**：打开「数据/图像」→ 检查 `.equipment-error` / 「图表加载失败」/
  `recharts-wrapper` 缺失 / 曲线 `path` 长度为 0；
- **交互一致性**：改第一个参数滑块到 `max`，等 ~0.6s（覆盖 150ms debounce），
  断言 `timeline-slider.max` 或「实时状态」任一行数值**发生变化**；不变即"参数不生效/滞后"类 bug。
  这条能一次性把 123 个场景的同类问题全部扫出来（当前一个都测不到）。

注意脚本细节：参数面板要先切到「⚙️ 参数调试」页签才渲染 `.param-item`；
数据抽屉要点「数据/图像」；`<details>` 目录分组会自动折叠，每次切换前要重新 `d.open = true`。

### 2. 图表「当前」时间参考线标签与 y 轴刻度重叠
抛体压住 `-25`、验电器压住 `50`、单摆压住 `0.25`，所有带时间参考线的图表都有。
修法很小（给 `ReferenceLine` 的 label 加 `dx` 偏移或移到图表内侧）。属"人工一眼能看到"的那类。

### 3.【P1·设计】#73 的 K2 残留（24 个场景）
静态/曲线类场景仍把轨迹当数据载体：验电器面板「位置 y = 90.000 m」、y–t 图纵轴标题 `y (m)`
而实际画的是张角（应为 °）。根治需在 **A（模型改用 `charts` 承载，那里本来就有 label/unit）** 与
**B（面板与 `simulationResultAdapter` 改读 charts 元数据）** 之间定方向 → **属设计决策，交规划者立单**。

### 4. 51 个场景播放按钮"骗人"
`totalDuration === 0` 时播放/步进按钮仍可点（`disabled={!simulationResult}`），切成 ⏸ 但时间永不动。
注意与 #87 的"落地截断"区分：这一条专指完全没有 trajectories 的场景。

### 5. 3D 相机取景与控件语义
多用电表/游标卡尺/验电器 器材占比极小（卡尺刻度几乎不可辨）；🎯 复位反而把相机拉得更远；
➕/➖ 语义与直觉相反（➕ 缩小、➖ 放大）；3D 文字标签被舞台左边界裁切。

### 6. 胡克定律边界量级（第 3 轮旧账，仍未处理）
k 拉到最小值 1 N/m 时标签显示 `Δx≈4900 cm`（49 m），弹簧垂到地面 —— 远超弹性限度。

### 门禁层面的遗留（交规划者立单，本棒未动）
1. **没有任何测试覆盖"改参数 → 结果刷新"**（#88 的制度性原因，本轮已补上该 hook 的用例，
   但**UI 层**仍无覆盖）；建议纳入第 1 项的巡检扩展。
2. **`physics-core/tsconfig.json` 排除 `tests`** → 引擎测试不参与类型检查
   （`base-validate.test.ts` 有两行 `problem.bodies = [...]` 的真实 readonly 赋值类型错误，IDE 报错而 CI 全绿）；
   `visualization/tsconfig.json` 反而**含** `tests`，两边不一致。
3. **4 个模型仍用大锤 `requiresValidation() → false`**（thermistor / strain-gauge / security-alarm /
   light-control-switch）→ 参数范围与 NaN/Inf 守卫目前关着，迁到 `requiresBodies()` 需逐个验证。
4. **是否引入 `eslint-plugin-react-hooks`**：第 6 棒用自带静态扫描顶替（零依赖、已验证零误报），
   官方规则还能查条件调用与依赖数组，但启用会炸出历史违规 → 交规划者。
5. **建议全仓扫"断言被 catch 包住"的空转测试**（#72 那处让 12 个场景的失败静默存活至今）。

### 若用户不再要求巡检
按规划会话最新 PLAN：frontier 是 **#60**，队列 `#60 → #68 → #74–#77 → #79–#81 → #61 → #62–#66`。

## 阻塞项 / 风险
- **八轮累计**：舞台空白 101→0、console 报错 55→0、错误提示条 12→0、参数滞后一步已消除；
  ERROR 类清零，剩 51 个 playback WARN + 若干可读性/取景问题。
- **"ERROR 清零"≠没问题**：#78/#88 都发生在脚本 6 项判据的盲区（抽屉内、交互后）。
  判据覆盖度是当前最大风险，故队列第 1 项是扩判据而不是继续点场景。
- **并发规划会话仍活跃**（编号已到 #87，本轮占 #88）：它只改 PLAN/DECISIONS，未碰执行者文件 → 无事故。
  **引用 issue 编号前务必先 create 拿真号。**
- **#44 勿动**；自检维持 11 层；无脏树。

## 环境备注（务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`；本机无 msedge（新脚本用 Playwright 自带 chromium）。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 用 `node .scratch/kill-vite.cjs`**（`pkill -f "vite..."` 会连沙箱包装进程自杀）。
- **改完 `physics-core/src` 若再跑 prettier，必须重新 `npm run build:core`** —— 否则 `guard-dist-freshness`
  会让 `npm test`/`count:sync` 直接失败（第 7 轮踩过）。
- **jsdom 渲染 recharts 需 `ResizeObserver` stub**：照 `tests/rendering/equipment-stage.test.tsx` 的局部类写法。
- **core 测试里 `getModel()` 必须从 `../../src/index.js` 导入**（注册在 `solver/solver-router.ts` 副作用里）。
- 临时探针测试文件注意相对路径深度（`tests/` 用 `../src`，`tests/accuracy/` 用 `../../src`），**用完必须删**。
- **跑巡检期间不要编辑 src**（HMR 污染基线）；改 `scripts/`、`.github/`、`.agent/` 安全。
- **教材目录 `<details>` 分组会自动折叠** → 每次切换场景前重新 `d.open = true`。
- **参数面板要先切到「⚙️ 参数调试」页签才渲染 `.param-item`**；抛体场景「模拟时长」是第 5 个参数（index=4）。
- **写含反引号/引号的中文正文一律用 Write 工具落文件**，别用 `printf`（会被命令替换 / EOF 报错）。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- 全量巡检：本地 ~8 分钟（`QA_SKIP_PARAMS=1`）；CI 含参数边界实测 27 分钟（`timeout-minutes: 45`）。
- 产物在 `.scratch/`（gitignore）：`qa-{banner,r4}.json`、`sweep-*.log`、`probe-*.cjs`、`kill-vite.cjs`、
  `*.fixed.ts`/`*.v2.tsx`（红→绿对照快照）、截图 `r4/r5/r6/shield/verify/fix-*.png`（**r7/r8 两轮截图缺失**）。
- 自检 11 层；测试数真值 **core 1114 / viz 1311 / total 2425**。
