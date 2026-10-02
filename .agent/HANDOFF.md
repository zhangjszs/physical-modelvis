# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-02 · `qoder-20261002T080000Z` · 执行者）· 浏览器 QA 巡检 **第 6 轮** · 收尾 ~08:30 UTC

### 阶段任务形态（用户指令）
用内置浏览器逐场景巡检 123 个实验，**一轮只聚焦一个明确问题**：查异常 → 判类别 → 定位根因 →
最小范围修复 → **浏览器复验** → commit + push → 更新 issue → 重写本文件 → 进下一个。
清单外的意外 bug 自行判定优先级插入队列。

### 本轮做了什么 —— #78（CLOSED）
**场景**：所有"数据抽屉打开时切换实验"的路径（复现样本：抛体运动 → 验电器）。
**问题**：曲线图区崩成红字「**图表加载失败**」，且 **ErrorBoundary 粘滞 —— 之后切任何场景都不恢复，
只能刷新页面**；控制台 `Rendered fewer hooks than expected`。
**根因**：`visualization/src/components/charts/GraphPanel.tsx` 把空态早退
`if (!simulationResult && !inCompareMode) return …` 写在三个 `useMemo`（L97/L104/L165）**之前**。
切场景瞬间 store 会把 `simulationResult` 置 null → 该帧少调 3 个 hook → React 抛错。
（与本棒上一轮改动无关，是 HEAD 上就有的结构性缺陷，被静态场景切换路径稳定复现。）

**修复**：① 空态早退下移到全部 hook 之后；`series` memo 改 null 安全
（`simulationResult ? extractGraphSeries(...) : []`，去掉 `simulationResult!` 断言）；组件内留注释防挪回。
② 新增 `tests/charts/hook-order.test.tsx`（2 例，仓库无 `eslint-plugin-react-hooks` 故自带两道防线）：
**静态扫描**顶层早退 return 之后不得再有顶层 hook（已验证修复后全仓 0 命中、旧版精确命中
`GraphPanel.tsx 早退@L87→hook@L165`）；**行为回归**真实渲染走 有→null→有（旧实现下复现出与生产
完全一致的报错）。

**验证**：浏览器复验 —— 抽屉开着切静态场景 `hasChartError=false` 且曲线正常重绘；
**不刷新继续切单摆/抛体均恢复（粘滞消失）**；力学场景回归正常（`.recharts-line-curve` path 764px、
8 个选项卡齐全）；参数对比模式 5 条曲线 + 图例正常；全程 console **0 error**。
`npm run precheck` 全绿（126 + 44 测试文件 / 62.4 kB / 11 层）；测试数 **2420**。commit `06ee453`。

### 本轮的方法论教训（比修掉的 bug 更重要）
**巡检脚本从不打开「数据/图像」抽屉**，所以 #78 这类"抽屉内崩溃 + ErrorBoundary 粘滞"
完全不在那 6 项 ERROR 指标里 —— 上一轮报"ERROR 清零"其实是**判据看不见**，不是没问题。
ErrorBoundary 会把崩溃降级成一个局部小红字，用户不刷新就永久困在坏状态里。

## 下一步建议（按推荐顺序）

### 1.【推荐首选】抛体运动落地后机械能暴涨（P2·物理正确性）
`t = 5.550 s` 超出 `flightTime = 3.021 s` 后，面板显示 `位置 y = -70.443 m`、`Ep = 0 J`、
`Ek = 909.945 J`、`E = 909.945 J` —— 飞行期间精确守恒（219.600 J），**落地后引擎仍继续自由落体
而 Ep 被夹到 0**，机械能凭空涨 4 倍。抛体是 24 节核心精讲之一，这个假守恒很显眼。
**最小安全修法**：把时间轴上限 clamp 到 `flightTime`（落地即停止推进），这也是教材处理惯例；
比"允许 Ep 为负"或"加反弹事件"改动面小得多。先查 `getTotalDuration`/`timeConfig` 与该模型的
轨迹时长是否本就等于 flightTime（若是，则是渲染/播放侧没夹紧，改一处即可）。

### 2.【推荐同轮顺手做】给巡检脚本加"抽屉/图表区"覆盖
逐场景打开「数据/图像」抽屉，检查：是否出现 `.equipment-error` / 「图表加载失败」/
`recharts-wrapper` 缺失 / 曲线 path 长度为 0。这一条能把 #78 这类盲区变成常态检测项，
也能顺带普查"静态场景图表沿用 `y (m)` 等力学字段名"的实际范围（= #73 的 K2）。

### 3. 图表「当前」时间参考线标签与 y 轴刻度重叠
所有带时间参考线的图表都有：抛体压住 `-25`、验电器压住 `50`、单摆压住 `0.25`。
修法很小（给 `ReferenceLine` 的 label 加 `dx` 偏移或移到图表内侧）。

### 4.【P1·设计】#73 的 K2 残留（24 个场景）
静态/曲线类场景仍把轨迹当数据载体：验电器面板「位置 y = 90.000 m」、y–t 图纵轴标题 `y (m)`
而实际画的是张角（0–100，单位应为 °）。根治需在 **A（模型改用 `charts` 承载曲线，那里本来就有
label/unit/xUnit/yUnit）** 与 **B（面板与 `simulationResultAdapter` 改读 charts 元数据）** 之间定方向。
→ 属设计决策，**建议交规划者立单**，不要执行棒自行选路。

### 5. 51 个场景播放按钮"骗人"
`totalDuration === 0` 时播放/步进按钮仍可点（`disabled={!simulationResult}`），切成 ⏸ 但时间永不动，
右侧总时长显示 `0.00s`。动手前先逐个确认这 51 个是否真的无时序（有些可能"本该有而引擎没给"）。

### 6. 3D 相机取景与控件语义
多用电表/游标卡尺/验电器 器材占比极小（卡尺刻度几乎不可辨）；🎯 复位反而把相机拉得更远；
➕/➖ 语义与直觉相反（➕ 缩小、➖ 放大）；3D 文字标签被舞台左边界裁切。

### 7. 胡克定律边界量级（第 3 轮旧账，仍未处理）
k 拉到最小值 1 N/m 时标签显示 `Δx≈4900 cm`（49 m），弹簧垂到地面 —— 远超弹性限度，
需核对参数范围 / 加弹性限度约束或告警。

### 门禁层面的遗留（交规划者立单，本棒未动）
1. **`physics-core/tsconfig.json` 排除 `tests`** → 引擎测试不参与类型检查
   （`base-validate.test.ts` 里有两行 `problem.bodies = [...]` 的真实 readonly 赋值类型错误，IDE 报错而 CI 全绿）。
   注：`visualization/tsconfig.json` 的 `include` **含** `tests`，两边不一致。
2. **4 个模型仍用大锤 `requiresValidation() → false`**（thermistor / strain-gauge / security-alarm /
   light-control-switch）→ 参数范围与 NaN/Inf 守卫目前是关着的，迁到 `requiresBodies()` 需逐个验证。
3. **是否引入 `eslint-plugin-react-hooks`**：本棒用自带静态扫描顶替（零依赖、已验证零误报），
   但官方规则更全（条件调用、依赖数组等）。启用会炸出历史违规，属"新增依赖 + 大范围改动"，交规划者。
4. **建议全仓扫"断言被 catch 包住"的空转测试**（#72 那处让 12 个场景的失败静默存活至今）。

### 若用户不再要求巡检
**按另一规划会话最新的 PLAN 排程**（M2.5 OCR 线已插入）：frontier 是 **#60**，
队列 `#60 → #68 → #74 → #75 → #76 → #77 → #61 → #62–#66`。
⚠️ 我上一轮写的"回到 #61"已作废 —— M2.5 排在 M3 之前。

## 阻塞项 / 风险
- **ERROR 指标"清零"≠没问题**：当前 6 项判据看不见抽屉内崩溃、暗色主题、导出、导学/OCR 面板等区域。
- **ErrorBoundary 降级 + 粘滞**：评估严重度时不能只看有没有红条，要测"切走再切回是否恢复"。
- **并发规划会话**：本轮 `f331e67` 又出现（立单 #74–#77 + D13 + M2.5），但它**只改了 PLAN/DECISIONS**，
  未碰执行者的 STATE/HANDOFF 也未碰我的未提交改动 → 无事故。注意 **issue 编号会被它占用**
  （本轮预想 #74 实际是 #78），引用编号前先 create 拿真号。
- **#44 勿动**；自检维持 11 层；无脏树。

## 环境备注（务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`；本机无 msedge（新脚本用 Playwright 自带 chromium）。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 用 `node .scratch/kill-vite.cjs`**（`pkill -f "vite..."` 会连沙箱包装进程自杀）。
- **jsdom 渲染 recharts 需 `ResizeObserver` stub**：照 `tests/rendering/equipment-stage.test.tsx` 的局部类写法，
  不要改共享 `tests/setup.ts`。
- **core 测试里 `getModel()` 必须从 `../../src/index.js` 导入**（注册在 `solver/solver-router.ts` 副作用里）。
- 临时探针测试文件注意相对路径深度（`tests/` 用 `../src`，`tests/accuracy/` 用 `../../src`），**用完必须删**。
- 改 `physics-core/src` 后必须 `npm run build:core`；**跑巡检期间不要编辑 src**（HMR 污染基线）。
- **教材目录 `<details>` 分组会自动折叠** → 自动化每次切换场景前重新 `d.open = true`。
- **写含反引号/引号的中文正文一律用 Write 工具落文件**，别用 `printf`（会被命令替换 / EOF 报错）。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- 全量巡检：本地 ~8 分钟（`QA_SKIP_PARAMS=1`）；CI 含参数边界实测 27 分钟（`timeout-minutes: 45`）。
- 产物在 `.scratch/`（gitignore）：`qa-{banner,r4}.json`、`sweep-*.log`、`probe-*.cjs`、
  `*.v2.tsx`/`*.fixed.ts`（红→绿对照快照）、截图 `r6-*.png` / `r5-*.png` / `r4-*.png` / `verify*.png` / `fix-*.png` / `shield-*.png`。
- 自检 11 层；测试数真值 **core 1111 / viz 1309 / total 2420**。
