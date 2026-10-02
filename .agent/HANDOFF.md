# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-02 · `qoder-20261002T070000Z` · 执行者）· 浏览器 QA 巡检 **第 5 轮** · 收尾 ~07:40 UTC

### 阶段任务形态（用户指令）
用内置浏览器逐场景巡检 123 个实验，**一轮只聚焦一个明确问题**：查异常 → 判类别 → 定位根因 →
最小范围修复 → **浏览器复验** → commit + push → 更新 issue → 重写本文件 → 进下一个。
发现清单外的意外 bug 时自行判定优先级插入队列。

### 本轮做了什么 —— #73（CLOSED）
**场景**：验电器、探究电荷间作用力（库仑定律）的数据抽屉「实时状态」面板。
**问题**：显示「位置 y = 90.000 **m**」「势能 Ep = 90.000 **J**」「动能 Ek = 1.000 **J**」这类量纲错乱的假读数。
**根因不在面板**：引擎 `electroscope` 把参数扫描结果塞进了 `TrajectoryPoint` ——
`position={x:q(μC), y:θ(°)}`、`kineticEnergy: q²`、`potentialEnergy: θ`。面板只是老实打印。

**先普查再动手**（82 个有轨迹数据的场景，判据用"不需要场景语义就能判定矛盾"的物理自洽性）：
- **K1 自相矛盾**（`velocity ≡ 0` 却报非零动能）→ **2 个**：`electroscope`、`coulomb-force-explore`（后者把 N 当动能、C 当势能）
- **K2 字段复用**（`velocity ≡ 0` 但 `position` 随 t 变）→ **24 个**（声波/热敏电阻/应变片/黑体/干涉/衍射/偏振/α散射…）

**最小修复**：① 两个 K1 模型删掉 `kineticEnergy`/`potentialEnergy`（字段 optional、两场景都没配 `ke_t`/`pe_t` 曲线、
渲染层 0 处读它 → 唯一消费者就是说谎的面板）；② `StateInspector` 对缺失值显示 `—`，不再 `?? 0` 把"未计算"报成"0 焦耳"；
③ 新增常驻守卫 `tests/accuracy/trajectory-semantics.test.ts`：K1 零容忍 + K2 24 项白名单（逐项注明 position 实际存什么），
断言"不得超出白名单"，逼后来者显式承认字段复用。

**验证**：红→绿（换回旧模型时 K1 精确报出 `max Ek = 17.975` / `max Ek = 1`）；
浏览器复验含**回归对照**：验电器/库仑探究能量三行变 `—`，而**抛体运动能量行仍是正常数值且随时间变化、
机械能全程 219.600 J 精确守恒**（自由落体亦正常）→ 证明没误伤真力学场景；
`npm run precheck` 全绿；测试数 **core 1111 / viz 1307 / total 2418**。commit `33d5fee`。

**五轮累计**：ERROR 级问题（舞台空白 / console 报错 / 错误提示条）**全部清零**，剩 51 个 WARN。

## 下一步建议（按严重度）

### 1.【下一轮首选·崩溃】`GraphPanel` hooks 顺序违规 → 曲线图崩且不可恢复
本轮复验时发现的**新 bug，与本棒改动无关**（diff 不含该文件），是 HEAD 上就有的结构性缺陷：

- **症状**：数据抽屉开着时从力学场景切到静态场景（验电器/库仑探究），曲线图区显示红字「图表加载失败」；
  **ErrorBoundary 粘滞 —— 之后切任何场景都不恢复，只能刷新页面**。控制台
  `Rendered fewer hooks than expected. This may be caused by an accidental early return statement.` ×2。
- **根因已定位**：`visualization/src/components/charts/GraphPanel.tsx:87` 的提前 return 位于
  两个 `useMemo`（L97 `series`、L104 `compareData`）**之前**。切场景瞬间 store 把 `simulationResult` 置 null
  → 走早退分支 → 该帧少渲染 2~3 个 hook → React 抛错。
- **修法**（一处、机械）：把两个 `useMemo` 提到早退之前（`extractGraphSeries` 需能容忍 null，
  或在 memo 内短路 `if (!simulationResult) return {}`），早退只负责渲染占位。
- **复现取证**：起 dev server → 打开抛体运动 → 点「数据/图像」→ 切到「验电器 (箔片张角 vs 电量)」→ 看曲线区与控制台。
- **建议顺手加防回潮守卫**：扫 `visualization/src/components/**/*.tsx`，同一组件函数体内
  `return` 之后仍出现 `use[A-Z]` 即失败（这类 bug 肉眼极难发现，且 ErrorBoundary 会把它从"崩溃"降级成"静默粘滞"）。

### 2.【P2·物理正确性】抛体运动落地后机械能暴涨
`t = 5.550 s`（超出 `flightTime = 3.021 s`）时面板显示 `位置 y = -70.443 m`、`Ep = 0 J`、`Ek = 909.945 J`、
`E = 909.945 J` —— 飞行期间精确守恒，**落地后引擎仍继续自由落体而 Ep 被夹到 0**，机械能凭空涨 4 倍。
方向：落地即停止推进 / Ep 允许为负 / 加地面事件 —— 属建模决策，先定口径再动。

### 3.【P1·设计】#73 的 K2 残留（24 个场景）
验电器面板仍显示「位置 y = 90.000 m」、y–t 曲线把 θ(度) 当 y(m) 画（纵轴 0–100）。
根治需在 **A（曲线类模型改用 `charts` 承载，那里本来就有 label/unit/xUnit/yUnit 元数据）** 与
**B（面板与 `simulationResultAdapter` 改读 charts 的 label/unit，不再硬编码"位置 x (m)/势能 (J)"）** 之间定方向。
注意 `simulationResultAdapter.ts` 的 `ke_t`/`pe_t`/`a_t` 是兄弟消费者。详见 #73 正文。

### 4. 51 个场景播放按钮"骗人"
`totalDuration === 0` 时播放/步进按钮仍可点（`disabled={!simulationResult}`），切成 ⏸ 但时间永不动，
右侧总时长显示 `0.00s`。动手前先逐个确认这 51 个是否真的无时序（有些可能"本该有而引擎没给"）。

### 5. 3D 相机取景与控件语义
多用电表/游标卡尺/验电器 器材占比极小（卡尺刻度几乎不可辨）；🎯 复位反而把相机拉得更远；
➕/➖ 语义与直觉相反（➕ 缩小、➖ 放大）；3D 文字标签被舞台左边界裁切。

### 6. 胡克定律边界量级（第 3 轮旧账，仍未处理）
k 拉到最小值 1 N/m 时标签显示 `Δx≈4900 cm`（49 m），弹簧垂到地面 —— 远超弹性限度，需核对参数范围/加弹性限度约束。

### 门禁层面的遗留（交规划者立单，本棒未动）
1. **`physics-core/tsconfig.json` 排除 `tests`** → 引擎测试不参与类型检查（`base-validate.test.ts` 里有两行
   `problem.bodies = [...]` 的真实 readonly 赋值类型错误，IDE 报错而 CI 全绿）。
2. **4 个模型仍用大锤 `requiresValidation() → false`**（`thermistor`/`strain-gauge`/`security-alarm`/`light-control-switch`）
   → 它们的参数范围与 NaN/Inf 守卫目前是关着的；迁到 `requiresBodies()` 需逐个验证。
3. **建议全仓扫"断言被 catch 包住"的空转测试**（#72 那处让 12 个场景的失败静默存活至今）。

### 若用户不再要求巡检
回到 backlog frontier **#61**（P1，M3 前置守卫；保守口径见 D12）。

## 阻塞项 / 风险
- **ErrorBoundary 会把 React 崩溃"降级"成粘滞的局部错误区**，用户只看到「图表加载失败」，
  而巡检脚本目前把这类错误算作 `error-banner`（会被抓到）但**不会**因为"粘滞不恢复"而升级严重度 —— 评估问题时别只看有没有红条。
- **jsdom 单测复现不出挂载/渲染时序类 bug**（React passive effect 子先父后）；这类改动判据是浏览器巡检。
- **#44 勿动**；自检维持 11 层；无脏树。

## 环境备注（务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`；本机无 msedge（新脚本用 Playwright 自带 chromium）。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 用 `node .scratch/kill-vite.cjs`**（`pkill -f "vite..."` 会连沙箱包装进程自杀）。
- **core 测试里 `getModel()` 必须从 `../../src/index.js` 导入**（注册在 `solver/solver-router.ts` 的模块副作用里）。
- **临时探针测试文件的相对路径深度**：放 `tests/` 用 `../src/...`，放 `tests/accuracy/` 用 `../../src/...`；
  **用完必须删**，否则被 `npm test` 计入测试数。
- 改 `physics-core/src` 后必须 `npm run build:core` 再跑前端测试（#15 dist 守卫）。
- **跑巡检期间不要编辑 `visualization/src/**` 与 `physics-core/src/**`**（HMR 污染基线）。
- **教材目录 `<details>` 分组会自动折叠** → 自动化每次切换场景前重新 `d.open = true`。
- **写含反引号/引号的中文正文一律用 Write 工具落文件**，别用 `printf`（shell 会做命令替换 / EOF 报错）。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- 全量巡检：本地 ~8 分钟（`QA_SKIP_PARAMS=1`）；CI 含参数边界实测 27 分钟（`timeout-minutes: 45`）。
- 产物在 `.scratch/`（gitignore）：`qa-{banner,r4}.json`、`sweep-*.log`、`probe-*.cjs`、`apply-exemption.cjs`、
  `kill-vite.cjs`、`*.fixed.ts`（红→绿快照）、截图 `r4-*.png` / `r5-*.png` / `verify*.png` / `fix-*.png` / `shield-*.png`。
- 自检 11 层；测试数真值 **core 1111 / viz 1307 / total 2418**。
