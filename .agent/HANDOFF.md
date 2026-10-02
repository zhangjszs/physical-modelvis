# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-02 · `qoder-20261002T032000Z` · 执行者）· 浏览器 QA 巡检 **第 1 轮** · 收尾 ~04:20 UTC

### 用户指令（本阶段的任务形态，与历轮不同）
用内置浏览器**逐场景遍历全部 123 个实验**，找"人工容易忽略的细小 bug + 不合物理常识的内容"，
按"一轮只聚焦一个明确问题"推进：打开场景 → 截图/控制台/页面状态/交互 查异常 → 判定问题类别 →
**最小范围修复**（不连带改无关场景）→ 修完立刻用浏览器复验 → 再进下一个。
简报格式：场景名 / 发现的问题 / 修复方式 / 验证结果。

### 本轮做了什么
1. **造了巡检引擎** `scripts/verify-qa-sweep.cjs`（Playwright，遍历目录全部 123 场景，逐场景查 7 类异常：
   console 报错 / 可见文本 NaN·Infinity·undefined / **canvas 数为 0 或整块同色** / 文本溢出裁切 /
   播放是否推进 / **每个参数拉到 min·max 的边界值异常** / 时间轴拖到末尾）。这是后续每一轮的显微镜。
2. **修掉一个 P0（#69，已 CLOSED）**：3D 场景切换后**舞台永久空白**。
   - 根因：`useSceneRig` 把 `rig` 存 `useRef`、把"是否就绪"存 `useState`，两者不同源。
     从已就绪的 3D 场景切到另一个 3D 场景时 `rigReady` 仍是 `true`，而 `rigs/index.ts` 的模块级
     `moduleCache` 让 `loadSceneRig` 在**同一批次**内 resolve，`setRigReady(false)` 与 `setRigReady(true)`
     被 React 批处理合并成"值没变"→ 跳过重渲染 → 渲染期永远读到 `rig=null` → 永久转圈，**零报错**。
   - 规模：**101 / 123 场景**（只有目录里第一个被打开的 3D 场景正常）。
   - 修复：`rig` 提为 `useState`、`rigReady` 派生为 `Boolean(rig)`；切换/非 3D 时清空旧 rig；
     `loadSceneRig` 返回 `undefined` 时报错而非永久转圈；`SceneStage` 的 `show3D` 加 `&& !rigError`
     （让"已回退 2D 画面"的提示语成真）。
   - 验证：sweep `no-canvas` **101 → 0**；内置浏览器 5 个 3D 场景连切 canvas 恒 1、无 `.equipment-loading`
     残留、播放时间 2.046→2.546→3.00、2D/3D 往返正常；`useSceneRig.test.ts` 6 例绿（+2）；
     `npm run precheck` 全绿；测试数 **core 1107 / viz 1304 / total 2411**。commit `71573d5`。

### 下一步建议（按严重度，**不要按 issue 号顺序做**）
1. **【最高优先】55 个场景 `updateEquipment` 抛 TypeError** —— 被 #69 掩盖的旧问题，舞台真挂载后才浮现。
   症状：**拖参数器材不动**（`EquipmentStage` 的 try-catch 兜住不崩，所以画面在但不动）。
   与 `docs/plan.md` 阶段 D2 记录的"43 个 ERROR / 场景切换竞态"**同族**。
   已定位样本：`visualization/src/components/simulation3d/rigs/electroscopeRig.ts:148`
   对 undefined 对象 `setting 'visible'`；场景「静电屏蔽 (接地 vs 不接地)」还叠加
   红色横幅「求解失败: 至少需要一个物理物体」+ 3D 内容空（**两个独立缺陷叠在同一场景**：
   前者是 rig 空引用，后者是 `buildProblem` 产出 `bodies: []` 违反引擎契约 —— 参见 #55 迁移时
   `em-wave-hertz` 补虚拟 antenna 物体的先例）。
   → **建议先立单再动手**（本棒只建了 1 个新单 = #69，已用完额度）。
   复现取证：`node scripts/verify-qa-sweep.cjs` 看 `console` 类 finding 的 55 个场景名。
2. **54 个场景播放按钮"骗人"** —— `totalDuration === 0`（引擎结果无 trajectories 的纯图表/静态场景）时，
   `PlaybackControls.tsx:66-73` 的播放/步进按钮 `disabled={!simulationResult}` 仍为可点，
   点完切成 ⏸ 但时间永不动，右侧总时长标签显示 `0.00s`。修法方向：`totalDuration === 0` 时禁用 + 提示
   "该实验无时序过程"。**先逐个确认这 54 个是否真的无时序**（有些可能该有而引擎没给）。
3. **轻微**：「自由落体」3D 播放中段一个小浮空文字标签与轨迹线重叠（可读性）。
4. 巡检还没覆盖到的维度（下一轮可扩到脚本里）：暗色主题切换、导出 CSV、导学面板、OCR 面板、
   公式推导面板、参数**中间值**（现在只测 min/max）、以及**物理常识类**判定（方向/趋势/单位错）。

### 阻塞项 / 风险
- **CI 有结构性盲区**：7 道门禁**没有一道看画面**。今天这个 101/123 全空白的 P0 是在 CI 全绿状态下存在的。
  建议把 sweep 纳入 CI/nightly —— 属**改 CI 主流程，须规划者/用户批准**，本棒未擅自改。
- **单测兜不住 #69 这类 bug**：`renderHook` 的 act 边界把两次 setState 拆成两批，复现不出应用里的塌陷。
  真判据是 sweep 的 canvas 断言（已在测试注释与 #69 正文写明，别让下一棒误以为有单测保护）。
- **#44 勿动**（人类 assignee；勿重试 React19、勿上调 70 kB bundle 预算）。
- 开放 issue 仍是 #61（P1，M3 前置守卫）/ #60 / #68 / #62–#66（blocked）。
  若用户没有继续要求巡检，则回到 #61；但按严重度，上面第 1、2 条比 #61 更该先做。

### 环境备注（本轮踩过的坑，务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`（非 `npx.cmd`）。
- **本机没有 msedge**：现有 `scripts/verify-*.cjs` 硬编 `channel: 'msedge'`，在 Linux **全部跑不了**。
  Playwright 自带 chromium 已装（`~/.cache/ms-playwright/chromium-1243`）→ 新脚本不要带 channel。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`（后台跑，`/tmp/vite-qa.log`）。
  跑测试/脚本/浏览器需 `required_permissions=all`（`/tmp` 只读会让 vitest 假红）。
- **`pkill -f "vite --port 5199"` 会连沙箱 bwrap 包装进程一起匹配 → 自杀式终止**；按 PID 杀或用 `pkill -f "vi""te"`。
- **`gh issue close` 不支持 `--comment-file`**（打印 usage 且**静默不关闭**）→ 先 `gh issue comment --body-file`，
  再 `gh issue close --reason completed`，最后 `gh issue view --json state` 复核。
- **改源码会让运行中的 dev server HMR 重载** → 跑 sweep 期间不要编辑 `visualization/src/**`，否则基线被污染。
- 巡检产物在 `.scratch/`（gitignore）：`qa-sweep-{before,after}.json`、`sweep-{before,after}.log`、
  `probe-*.cjs`（一次性诊断探针，可复用）、`fix-*.png`（浏览器截图）。
