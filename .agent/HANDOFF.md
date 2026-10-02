# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-02 · `qoder-20261002T042500Z` · 执行者）· 浏览器 QA 巡检 **第 2 轮** · 收尾 ~04:55 UTC

### 阶段任务形态（用户指令，历轮沿用）
用内置浏览器**逐场景遍历 123 个实验**找"人工易忽略的细小 bug + 不合物理常识的内容"；
**一轮只聚焦一个明确问题**：打开场景 → 截图/控制台/DOM/交互 查异常 → 判定类别 → 最小范围修复 →
**修完立刻用浏览器复验** → 再进下一个。简报格式：场景名 / 问题 / 修复 / 验证。
用户已额外批准：**把巡检接入 CI**（本轮已做）。

### 本轮做了什么 —— 修 #70（CLOSED）+ 接入 CI
**场景**：全部 3D 实验中的 55 个（自由落体 / 胡克定律 / 单摆 / 万有引力 / 气垫导轨 / 牛顿第二定律 …）。
**问题**：**拖参数滑块，3D 器材不动**。画面不是空白、看不出异常，错误被 `EquipmentStage` 的 try-catch
吞成一条 `console.error`。类别 = 交互异常 + 控制台报错。
**根因**：`useSceneRig` 的 `rig` state **不记录它属于哪个场景**。切场景那一帧 `currentScene` 已是新值、
`rig` 还是旧场景的；`SceneStage` 用 `key={currentScene}` 强制重挂 → `EquipmentStage`（mount effect 依赖 `[]`）
**用旧 rig 建了一套 handles** → 下一帧新 rig 到位后调 `updateEquipment(旧 handles)` →
55 个场景报了 **9 种不同属性**的 `Cannot read properties of undefined`
（`rod`/`position`/`geometry`/`radius`/`material`/`setDirection`/`rotation`/`visible`/`set`）。
是 `docs/plan.md` 阶段 D2"场景切换竞态"家族的残留形态，被上一轮的 #69 空白 bug 掩盖着。
**修复**：`rig`/`error` 与 `sceneId` 绑成一个 `RigEntry` state，派生前先按 sceneId 过滤 ——
切换那一帧 `rig` 必为 `null`，从**渲染期**就切断"用旧 rig 挂载"的路径（不是靠 effect 补救）。
**验证**：巡检 console finding **55 → 0**、ERROR 场景 **55 → 0**、完全无异常场景 **34 → 69**；
内置浏览器实测 自由落体 h0 / 胡克定律 k / 单摆 L 拉到 max·min，**器材均肉眼可见随动**，全程 **0 error 0 warning**；
`useSceneRig.test.ts` 7 例绿；`npm run precheck` 全绿；测试数 **2412**。commit `8984fc9`。
**接入 CI**：新增 `.github/workflows/qa-sweep.yml` —— PR 跑前 12 场景 + `QA_STRICT=canvas`
（只拦"舞台未渲染"，console 降级 WARN，不卡正常 PR）；nightly/手动跑全量 123 场景 + 严格口径；
报告上传 artifact 14 天。脚本新增 `QA_STRICT` 开关。**已 `workflow_dispatch` 实跑**（run `37002178007`）。

### 下一步建议（按严重度，**别按 issue 号顺序做**）
1. **【下一轮首选】「静电屏蔽 (接地 vs 不接地)」舞台完全空白** + 红色提示条
   **「求解失败: 至少需要一个物理物体」**，播放控件全禁用、时间 0.00s。
   根因方向：场景侧 `buildProblem` 产出 `bodies: []` 违反引擎契约（`base.validate()` 要求至少一个物体）。
   **先例可抄**：`em-wave-hertz` 当初同因，补一个虚拟 antenna 物体解决（见 `docs/rendering-physics-audit.md` 第 3 批）。
   同类可能还有别的场景 —— 修完这一单建议顺手跑一次"全场景扫 `求解失败` 提示条"的巡检
   （现巡检脚本只扫 console/NaN，**没扫 `.error-banner` 文本**，值得补一条判定）。
2. **54 个场景播放按钮"骗人"**：`totalDuration === 0`（引擎结果无 trajectories 的纯图表/静态场景）时，
   `PlaybackControls.tsx` 的播放/步进按钮 `disabled={!simulationResult}` 仍可点，切成 ⏸ 但时间永不动，
   右侧总时长显示 `0.00s`。修法方向：`totalDuration === 0` 时禁用 + 提示"该实验无时序过程"。
   **动手前先逐个确认这 54 个是否真的无时序** —— 有些可能"本该有时序而引擎没给"，那是另一类（引擎侧）问题。
3. **物理量级可疑（巡检截图发现，待核）**：胡克定律 k 拉到最小值 1 N/m 时标签显示 `Δx≈4900 cm`（49 m），
   画面里弹簧垂到地面 —— 远超弹性限度。需核对该场景 `parameters` 的 min 是否合理、是否该加弹性限度约束。
   这类"边界值下量级失真"是本轮巡检新打开的一层，值得专门一轮去扫（可扩脚本：参数在 min 时检查展示数值量级）。
4. **巡检流水线已验收（本棒完成，无需复查）**：run `37002178007` → **completed success**，
   全量 123 场景含逐参数 min/max 边界扫描耗时 **27 分钟**，结果 **ERROR 0 / WARN 54 / OK 69，边界异常 0 项**。
   `timeout-minutes` 已因实测耗时从 30 调到 45（`5700693`）。下一棒若给脚本加新判定导致变慢，同步调这个值。
5. 若用户不再要求巡检：回到 backlog frontier **#61**（P1，M3 前置守卫；口径见 D12）。

### 阻塞项 / 风险
- **jsdom 单测复现不出这类挂载时序 bug**：本轮新用例在旧实现下**也通过**（React passive effect 子先父后，
  `renderHook` 不涉及子组件）。3D 舞台类改动的判据是**浏览器巡检**，不是单测 —— 别再往这个方向补单测，浪费时间。
- **巡检脚本目前不检查页面上的错误提示条**（`.error-banner` / toast），所以第 1 条那类"求解失败"是
  **靠浏览器子代理肉眼发现的**，不是脚本发现的。补上这条判定能显著提高性价比（下一轮顺手做）。
- **#44 勿动**（人类 assignee）；不动他人 PR（#23/#25 已致谢关闭）。
- 无脏树；全量 precheck / count:sync 正常。

### 环境备注（本轮新增/强化）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- **杀 dev server 不要用 `pkill -f "vite..."`**：命令行里只要出现 "vite" 字样（含同条命令的其它参数），
  就会连沙箱 bwrap 包装进程一起杀掉 → 命令自杀、后续步骤全丢。用 `ss -ltnp | grep :5199` 取 PID 再 `kill`。
- **跑巡检期间不要编辑 `visualization/src/**`**：dev server HMR 会中途改变被测对象，污染 before/after 基线。
  改 `scripts/`、`.github/` 是安全的（Node 已把脚本读进内存）。
- 本机无 msedge：新脚本用 Playwright 自带 chromium；现有 `verify-*.cjs` 硬编 `channel:'msedge'` 在 Linux 跑不了。
- **`gh issue close` 不支持 `--comment-file`**（静默不关闭）→ 先 `gh issue comment --body-file`，
  再 `gh issue close --reason completed`，最后 `gh issue view --json state` 复核。
- 全量巡检耗时：本地约 8 分钟（`QA_SKIP_PARAMS=1`）/ 约 15-20 分钟（含参数边界）；**CI 上含参数全量实测 27 分钟**。
  产物在 `.scratch/`（gitignore）：`qa-sweep-{before,after,r2}.json`、`sweep-*.log`、`probe-*.cjs`（可复用诊断探针）、
  `verify*.png` / `fix-*.png`。
- 自检 11 层；测试数真值 **core 1107 / viz 1305 / total 2412**。
