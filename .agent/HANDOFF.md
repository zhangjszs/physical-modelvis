# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-02 · `qoder-20261002T042500Z` · 执行者）· 浏览器 QA 巡检 **第 2 + 第 3 轮** · 收尾 ~05:35 UTC

### 阶段任务形态（用户指令，历轮沿用）
用内置浏览器**逐场景遍历 123 个实验**找"人工易忽略的细小 bug + 不合物理常识的内容"；
**一轮只聚焦一个明确问题**：打开场景 → 截图/控制台/DOM/交互 查异常 → 判定类别 → 最小范围修复 →
**修完立刻用浏览器复验** → 再进下一个。简报格式：场景名 / 问题 / 修复 / 验证。
用户已批准：**巡检接入 CI**（第 2 轮已做）。

### 第 2 轮做了什么 —— #70（CLOSED）+ CI 接线
**场景**：55 个 3D 实验。**问题**：拖参数滑块，**3D 器材不动**（画面不空白、console 只有一条被 try-catch 吞掉的 error）。
**根因**：`useSceneRig` 的 `rig` state 不记录它属于哪个场景 → 切场景那一帧 `currentScene` 新、`rig` 旧 →
`SceneStage` 用 `key={currentScene}` 重挂 → `EquipmentStage`（mount effect 依赖 `[]`）**用旧 rig 建 handles** →
新 rig 到位后 `updateEquipment(旧 handles)` → 55 个场景报了 **9 种不同属性**的 `Cannot read properties of undefined`。
**修复**：`rig`/`error` 与 `sceneId` 绑成一个 `RigEntry` state，派生前先按 sceneId 过滤（渲染期就切断，不靠 effect 补救）。
**验证**：巡检 console finding **55 → 0**、ERROR 场景 **55 → 0**、无异常场景 **34 → 69**；
浏览器实测 自由落体 h0 / 胡克定律 k / 单摆 L 拉到 max·min **器材均肉眼可见随动**，全程 0 error。commit `8984fc9`。
**CI 接线**：新增 `.github/workflows/qa-sweep.yml`（PR 跑前 12 场景 + `QA_STRICT=canvas` 只拦"舞台未渲染"；
nightly/手动跑全量 + 严格口径；报告传 artifact）。**已实跑验收**：run `37002178007` **success**，
全量含逐参数边界扫描耗时 **27 分钟**，故 `timeout-minutes` 已 30→45（`5700693`）。

### 第 3 轮做了什么 —— #71（CLOSED）+ 补巡检盲区
**场景**：「静电屏蔽 (接地 vs 不接地)」。**问题**：3D 舞台**全空** + 红色提示条
**「求解失败: 至少需要一个物理物体」** + 播放控件禁用，而 **console 一条 error 都没有**（错误只写进 DOM）。
**根因**：`electrostatic-shielding` 是纯场模型（全文件 **0 次**引用 `problem.bodies`），但 `base.validate()`
无条件要求至少一个物体 → 场景 `buildProblem` 的 `bodies: []` 被判非法。
**修复**：按仓库**现有惯例**声明 `requiresValidation() → false`（`thermistor`/`strain-gauge`/`security-alarm`/
`light-control-switch` 四个同类模型已这么做）。**没有**往场景塞假物体 —— 那会让一个不存在的物体顺着
轨迹/数据抽屉/CSV 导出/3D 舞台一路泄漏出去。引擎单测 +1 例锁住。commit `e5a367a`。
**验证**：红条消失（`errorBannerText=null`）、3D 可见导体壳+顶杆金球+电荷球、播放按钮启用、
2D 板书与数据抽屉正常、console 0 error；`npm run precheck` 全绿；测试数 **core 1108 / viz 1305 / total 2413**。
**顺带补盲区**：给巡检脚本加第 8 类判定「可见错误提示条」（`921e5a4`）—— 这正是本单能长期存活的原因。

## 下一步建议（按严重度，**别按 issue 号顺序做**）

### 1.【下一轮首选】12 个场景仍向用户显示「求解失败: 至少需要一个物理物体」
第 3 轮补上红条判定后全量重扫，**ERROR 从 0 变 12**。这 12 个场景与 #71 **同一根因**：
电阻定律 / 路端电压与负载 / 电容充放电 / 平行板电容器因素 / 静电感应 / 验电器 /
探究电荷间作用力(库仑定律) / 法拉第圆筒 / 游标卡尺读数 / 螺旋测微器读数 / 多用电表 / 安培力因素。

**本棒已完成逐个分诊**（表在 #71 末尾评论）：**12 个模型对 `problem.bodies` 的引用次数全部为 0**，
且均未覆写 `requiresValidation` → 与 `electrostatic-shielding` 完全同构，**修法就是同一行 × 12 个文件**，
不需要往场景补物体（"库仑定律该有两个电荷""验电器该有箔片"是物理直觉期待，不是这些模型的代码现状）。

注意事项：
- 动手前**重跑一遍分诊**（`grep -c "\.bodies" physics-core/src/models/<model>.ts`），防止表过期；
- 改完 `npm run build:core` 再跑可视化测试（#15 dist 守卫）；
- 每个模型补 1 条"bodies 为空可求解"的引擎用例，或并入既有 `it`（测试数不动 → 免 count:sync）；
- 3 个是**测量仪器**（游标卡尺/螺旋测微器/多用电表），属 audit 的 B-静态类：红条会消失，
  但数据抽屉可能仍为空 —— 那是既定设计（无引擎逐时数据），别当成"没修好"；
- 收尾必须重跑全量巡检确认 `error-banner` **12 → 0**。

### 2. 54 个场景播放按钮"骗人"
`totalDuration === 0`（引擎结果无 trajectories）时，`PlaybackControls.tsx` 的播放/步进按钮
`disabled={!simulationResult}` 仍可点，切成 ⏸ 但时间永不动，右侧总时长显示 `0.00s`。
方向：`totalDuration === 0` 时禁用 + 提示"该实验无时序过程"。
**先逐个确认这 54 个是否真的无时序** —— 有些可能"本该有时序而引擎没给"，那是另一类（引擎侧）问题。

### 3. 物理量级可疑（巡检截图发现，待核）
胡克定律 k 拉到最小值 1 N/m 时标签显示 `Δx≈4900 cm`（49 m），画面里弹簧垂到地面 —— 远超弹性限度。
需核对该场景 `parameters` 的 min 是否合理、是否该加弹性限度约束。这类"边界值下量级失真"值得专门一轮。

### 4. 静电屏蔽场景修完后遗留的三处小问题（本棒观察，未修）
- **3D 视图对参数变化无动于衷**：t=0 静态下拉 E（0↔1000）、接地开关（0↔1），滑块读数变、3D 画面几乎不变
  （场线/接地效果只在 2D 板书体现）→ 需确认该场景 rig 的 `updateEquipment` 是否本该重绘；
- **数据抽屉读数不一致**：「极值统计」显示 `isGrounded = 0`，而滑块是 `1`（同区 `E=500.000` 一致）→ 疑似 maxValues 键映射错位；
- 3D 顶部文字标签拥挤略重叠。

### 5. 若用户不再要求巡检
回到 backlog frontier **#61**（P1，M3 前置守卫；保守口径见 D12）。

## 阻塞项 / 风险
- **jsdom 单测复现不出挂载时序类 bug**（React passive effect 子先父后，`renderHook` 不涉及子组件）：
  第 2 轮那个"3D→3D 切换"新用例**在旧实现下也通过**。3D 舞台类改动的判据是**浏览器巡检**，别再补这类单测。
- **巡检脚本的判定仍不含**：暗色主题、导出 CSV、导学/OCR/公式面板、参数**中间值**、物理方向/趋势类断言。
  目前 8 类判定主要覆盖"渲染是否发生 + 数值是否泄漏 + 有没有报错"。
- **#44 勿动**（人类 assignee）；不动他人 PR（#23/#25 已致谢关闭）。
- 无脏树；全量 precheck / count:sync 正常。

## 环境备注（务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 不要用 `pkill -f "vite..."`**：命令行只要含 "vite" 字样（含同条命令其它参数）就会连沙箱包装进程一起自杀。
  用 `ss -ltnp | grep :5199` 取 PID 再 `kill`。
- **跑巡检期间不要编辑 `visualization/src/**`**（HMR 会污染 before/after 基线）；改 `scripts/`、`.github/` 安全。
- 本机无 msedge：新脚本用 Playwright 自带 chromium；现有 `verify-*.cjs` 硬编 `channel:'msedge'` 在 Linux 跑不了。
- **`gh issue close` 不支持 `--comment-file`**（静默不关闭）→ 先 comment 再 close，最后 `--json state` 复核。
- **`printf` 写含反引号的中文正文会被 shell 当命令替换执行**（本棒踩过两次：丢了 `.agent/DECISIONS.md` 路径、
  以及 `\\"` 转义导致整条命令 EOF 报错）→ 一律用 Write 工具落文件，再 `gh ... --body-file`。
- 巡检耗时：本地 ~8 分钟（`QA_SKIP_PARAMS=1`）/ 15-20 分钟（含参数边界）；**CI 全量含边界实测 27 分钟**。
- 产物在 `.scratch/`（gitignore）：`qa-sweep-{before,after,r2}.json`、`qa-{shield,banner}.json`、`sweep-*.log`、
  `probe-*.cjs`（可复用诊断探针）、`verify*.png` / `fix-*.png` / `shield-*.png`。
- 自检 11 层；测试数真值 **core 1108 / viz 1305 / total 2413**。
