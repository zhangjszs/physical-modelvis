# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-03 · `qoder-20261003T000000Z` · 执行者）· 浏览器 QA 巡检 **第 7 轮** · 收尾 ~00:50 UTC

### 阶段任务形态（用户指令）
用内置浏览器逐场景巡检 123 个实验，**一轮只聚焦一个明确问题**：查异常 → 判类别 → 定位根因 →
最小范围修复 → **浏览器复验** → commit + push → 更新 issue → 重写本文件 → 进下一个。
清单外的意外 bug 自行判定优先级插入队列。

### 本轮做了什么 —— #87（CLOSED）
**场景**：抛体运动 (平抛+斜抛)（24 节核心精讲之一）。默认模拟时长 5s，飞行时间只有 3.02s。
**问题**：播放到末尾时面板显示「位置 y = **−70.443 m**」「机械能 E = **909.945 J**」——
小球**穿过地面继续掉**，而这一页正在讲"机械能守恒"，面板显示的机械能恰好不守恒（飞行期间明明是 219.600 J）。
**根因**：`physics-core/src/models/projectile.ts` 把特征量与落地时刻 `tLand` 算在 `sampleTrajectory` **之后**，
轨迹按完整 `duration` 用纯抛物线采样 → `t > tLand` 是物理上不存在的外推：y 变负、`vy` 无界增长 → Ek 一直涨，
而 `potentialEnergy = m·g·Math.max(0, y−groundY)` 把地下夹成 0 → 两者相加自然暴涨。
（关键帧那边倒是已经用了 `Math.min(tLand, duration)`，所以只有轨迹/图表/面板越界。）

**修复**：特征量/落地时刻计算前移到采样之前，轨迹只采样到 `tEnd = min(tLand, duration)`；
`simEnd` 至少保留一个采样步长防退化轨迹，`endSampleCount` 按比例缩放保持采样密度。
→ 时间轴上限自然等于 flightTime（`getTotalDuration` 由轨迹算出），穿地区间**从源头不可达**；
`模拟时长` 仍是上界；`neverLands`（判别式 ≤ 0）分支完全不变。
**刻意不加告警**：把 duration 设得比飞行时间长是正常用法，落地即止是预期行为，
发告警等于对绝大多数用户天天报"狼来了"（代码内已注释说明理由）。

**连带修正了一处测试自身的隐含假设**：`differential-analytic.test.ts` 的抛体组原来在
`t = duration·{0.3,0.7,1}` 探测，而该文件的 `pointAt()` 是**就近取样本、不插值** ——
旧代码能通过纯属巧合（`sampleCount=800`，`800×0.3=240` 正好落在整数样本号上）。
截断后样本数变成 564 之类，`0.3` 不再落在格点，就冒出 1.2e-3 的"假不精确"。
改为**按样本索引**探测、用每个样本自己的 `p.t` 套解析式（对差分测试反而更严格），并加 `tSpan ∈ (0, duration]` 边界断言。

**新增 +3 回归用例**（`projectile.test.ts`）：截断后末点 t≈flightTime 且全程 y≥0 且机械能偏差<1% 且无告警 /
`duration < flightTime` 时末点仍等于 duration（证明截断只由落地触发）/ `neverLands` 时末点等于 duration 且有告警。

**验证**：浏览器实测 timelineMax 5.55 → **3.0212（=flightTime）**；末态 `位置 y = 0 m`、`E = 219.600 J`；
y–t 曲线 1633 个采样点 `min=0`、无负值、末点与 0 刻度像素精确重合；诊断报告 `✓ 所有检查通过`；
切场景往返数值一致、无红条；console **0 error**。引擎 1114 + 可视化 1309 全绿；`precheck` 全绿。
commit `83f2632`，测试数 **core 1114 / viz 1309 / total 2423**。

---

## 下一步建议（按推荐顺序）

### 1.【强烈推荐】参数改完不重算 —— 「仿真结果滞后一次修改」（P1，影响全部场景的交互）
第 6 轮列为"疑似"，本轮子代理**用真实键盘 Home 键**复现（排除合成事件干扰），已证实：

| 设「模拟时长」为 | timelineMax 实际值 |
|---|---|
| 5（初始） | 3.0212 ✅ |
| 0.5 | 3.0212（= 上一次的 5） |
| 1 | 0.5（= 上一次的 0.5） |
| 8 | 2（= 上一次的 2） |

**本棒已完成的定位（下一棒可直接接着查，别从零开始）**：
- `visualization/src/store/simulationStore.ts:109` `setParameter` **只改 `parameters`，不 bump `sceneLoadVersion`**：
  ```ts
  setParameter: (name, value) => { set(s => ({ parameters: { ...s.parameters, [name]: value } })); },
  ```
- `useSceneSimulation.ts` 里 `runSimulation()` **只有一个调用点**：
  `useEffect(() => { runSimulation(); }, [currentScene, sceneLoadVersion])` ——
  依赖数组里**既没有 `parameters` 也没有 `runSimulation`**。
- `sceneLoadVersion` 只被 `setScene` / `setSceneWithParameters` / `applyPreset` bump
  （「重置参数」和「预设」按钮走 `applyPreset` → 所以点了重置就刷新，与观测一致）。

⇒ 结论：**拖滑块本身不触发重算**，看到的"滞后一步"是别的渲染路径顺带带出来的。
下一轮要做的：① 先确认还有没有别处 effect 在 `[parameters]` 上重跑（解释"下一步会刷新"）；
② 修法倾向"把 parameters 纳入自动运行的触发条件"（或在 `setParameter` 里 bump 版本），
注意避免**每次 input 事件都重算 800 个采样点**造成的卡顿 —— 可能需要 debounce，
并确认 `runSimulation` 的 useCallback 依赖已含 `parameters`（它已含，所以关键是触发条件）；
③ 补一条测试：setParameter 后 simulationResult 必须反映新值（当前所有测试都测不到这条，才让它活到现在）。

### 2. 给巡检脚本加"抽屉/图表区"覆盖
逐场景打开「数据/图像」抽屉，检查 `.equipment-error` / 「图表加载失败」/ `recharts-wrapper` 缺失 /
曲线 path 长度为 0。#78 那类抽屉内崩溃目前完全在 6 项 ERROR 指标之外。

### 3. 图表「当前」时间参考线标签与 y 轴刻度重叠
抛体压住 `-25`、验电器压住 `50`、单摆压住 `0.25`，所有带时间参考线的图表都有。
修法很小（给 `ReferenceLine` 的 label 加 `dx` 偏移或移到图表内侧）。

### 4.【P1·设计】#73 的 K2 残留（24 个场景）
静态/曲线类场景仍把轨迹当数据载体：验电器面板「位置 y = 90.000 m」、y–t 图纵轴标题 `y (m)`
而实际画的是张角（0–100，应为 °）。根治需在 **A（模型改用 `charts` 承载，那里本来就有 label/unit）**
与 **B（面板与 `simulationResultAdapter` 改读 charts 元数据）** 之间定方向 → **属设计决策，交规划者立单**。

### 5. 51 个场景播放按钮"骗人"
`totalDuration === 0` 时播放/步进按钮仍可点（`disabled={!simulationResult}`），切成 ⏸ 但时间永不动。
注意：#87 之后抛体这类"落地截断"的场景时间轴会变短，**别把两者混为一谈** —— 这一条专指完全没有 trajectories 的场景。

### 6. 3D 相机取景与控件语义
多用电表/游标卡尺/验电器 器材占比极小（卡尺刻度几乎不可辨）；🎯 复位反而把相机拉得更远；
➕/➖ 语义与直觉相反（➕ 缩小、➖ 放大）；3D 文字标签被舞台左边界裁切。

### 7. 胡克定律边界量级（第 3 轮旧账，仍未处理）
k 拉到最小值 1 N/m 时标签显示 `Δx≈4900 cm`（49 m），弹簧垂到地面 —— 远超弹性限度，
需核对参数范围 / 加弹性限度约束或告警。

### 门禁层面的遗留（交规划者立单，本棒未动）
1. **`physics-core/tsconfig.json` 排除 `tests`** → 引擎测试不参与类型检查
   （`base-validate.test.ts` 里有两行 `problem.bodies = [...]` 的真实 readonly 赋值类型错误，IDE 报错而 CI 全绿）。
   `visualization/tsconfig.json` 的 `include` 反而**含** `tests`，两边不一致。
2. **没有任何测试覆盖"改参数 → 结果刷新"** —— 这正是第 1 项缺陷能活到现在的制度性原因。
3. **4 个模型仍用大锤 `requiresValidation() → false`**（thermistor / strain-gauge / security-alarm /
   light-control-switch）→ 参数范围与 NaN/Inf 守卫目前是关着的。
4. **是否引入 `eslint-plugin-react-hooks`**：第 6 棒用自带静态扫描顶替（零依赖、已验证零误报），
   官方规则更全（条件调用、依赖数组）但启用会炸出历史违规 → 交规划者。
5. **建议全仓扫"断言被 catch 包住"的空转测试**（#72 那处让 12 个场景的失败静默存活至今）。

### 若用户不再要求巡检
按规划会话最新 PLAN：frontier 是 **#60**，队列 `#60 → #68 → #74–#77 → #79–#81 → #61 → #62–#66`。

## 阻塞项 / 风险
- **ERROR 指标"清零"≠没问题**：巡检 6 项判据看不见抽屉内崩溃、参数不刷新、暗色主题、导出、导学/OCR 面板。
- **并发规划会话仍活跃**：本轮 issue 编号已被它推进到 #86（我的 #87 是第 8 个新号）。它只改 PLAN/DECISIONS，
  未碰执行者文件 → 无事故。但**引用 issue 编号前务必先 create 拿真号**。
- **#44 勿动**；自检维持 11 层；无脏树。

## 环境备注（务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`；本机无 msedge（新脚本用 Playwright 自带 chromium）。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 用 `node .scratch/kill-vite.cjs`**（`pkill -f "vite..."` 会连沙箱包装进程自杀）。
- **改完 `physics-core/src` 后若再跑 prettier，必须重新 `npm run build:core`** ——
  否则 `guard-dist-freshness` 会让 `npm test`/`count:sync` 直接失败（本棒踩过一次）。
- **jsdom 渲染 recharts 需 `ResizeObserver` stub**：照 `tests/rendering/equipment-stage.test.tsx` 的局部类写法。
- **core 测试里 `getModel()` 必须从 `../../src/index.js` 导入**（注册在 `solver/solver-router.ts` 副作用里）。
- 临时探针测试文件注意相对路径深度（`tests/` 用 `../src`，`tests/accuracy/` 用 `../../src`），**用完必须删**。
- **跑巡检期间不要编辑 src**（HMR 污染基线）；改 `scripts/`、`.github/`、`.agent/` 安全。
- **教材目录 `<details>` 分组会自动折叠** → 自动化每次切换场景前重新 `d.open = true`。
- **参数面板要先切到「⚙️ 参数调试」页签才渲染 `.param-item`**；「模拟时长」是第 5 个参数（index=4）。
- **写含反引号/引号的中文正文一律用 Write 工具落文件**，别用 `printf`（会被命令替换 / EOF 报错）。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- 全量巡检：本地 ~8 分钟（`QA_SKIP_PARAMS=1`）；CI 含参数边界实测 27 分钟（`timeout-minutes: 45`）。
- 自动化浏览器视图可能被置为 hidden 导致截图失败（本轮步骤 7 就没拍到），结论要标注"仅 JS 读数"。
- 产物在 `.scratch/`（gitignore）：`qa-{banner,r4}.json`、`sweep-*.log`、`probe-*.cjs`、`kill-vite.cjs`、
  `*.fixed.ts`/`*.v2.tsx`（红→绿对照快照）、截图 `r7-*.png` / `r6-*.png` / `r5-*.png` / `r4-*.png` / `verify*.png` / `fix-*.png` / `shield-*.png`。
- 自检 11 层；测试数真值 **core 1114 / viz 1309 / total 2423**。
