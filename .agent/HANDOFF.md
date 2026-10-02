# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-02 · `qoder-20261002T055000Z` · 执行者）· 浏览器 QA 巡检 **第 4 轮** · 收尾 ~06:45 UTC

### 阶段任务形态（用户指令）
用内置浏览器逐场景巡检 123 个实验，**一轮只聚焦一个明确问题**：查异常 → 判类别 → 定位根因 →
最小范围修复 → **浏览器复验** → commit + push → 更新 issue → 重写本文件 → 进下一个。
用户已批准巡检接入 CI（第 2 轮完成）。

### 本轮做了什么 —— #72（CLOSED）
**双重发现**：12 个场景一直对用户显示红条「**求解失败: 至少需要一个物理物体**」，而**本该拦住它们的 L2 自检断言在空转**。

1. **门禁 bug**：`visualization/tests/accuracy/scene-contract.test.ts` 第 3 条 check 把
   `expect(v.valid).toBe(true)` 写在 `try { … } catch { /* skip */ }` 里 —— `expect` 失败抛的
   AssertionError 被空 catch 吞掉，于是无论多少场景 validate 失败，这条 check 永远绿。
   改为**收集 failures 数组、循环结束后一次性断言**。收紧后当场报出 12 个场景，
   与浏览器巡检看到的 12 个红条 **1:1 对上**（两条独立证据链互证）。
2. **引擎 bug**：12 个模型全文不引用 `problem.bodies`，却被基类无条件要求"至少一个物体"。
   **关键取舍：没有沿用 #71 的 `requiresValidation() → false` 大锤** —— 批量套上去后
   `micrometer`（刻意软限程模型，厚度超量程要产出告警而非抛错）的
   "thickness=NaN 仍被 `NON_FINITE_PARAMETER` 拒绝"契约**当场失败**，证明大锤会连带关掉 #8 的参数范围拦截与
   NaN/Inf 守卫。于是在 `PhysicsModelBase` 新增**窄钩子 `requiresBodies()`**（默认 true，只作用于 NO_BODIES 一项），
   13 个模型改用它（12 个新修 + `electrostatic-shielding` 从大锤迁回窄豁免），
   并给 `requiresValidation()` 补"⚠ 这是大锤，只豁免 bodies 请用 requiresBodies"的警示。
3. **契约测试 +3 例**（`base-validate.test.ts`）：豁免模型不再产出 NO_BODIES / 未豁免模型仍产出（防钩子被全局关掉）/
   **窄豁免不关掉 NaN-Inf 守卫**（把这次被打回的教训固化成测试）。
4. **验证**：全量巡检 `error-banner` **12 → 0**、ERROR 场景 **12 → 0**、完全无异常场景 **69 → 72**、
   playback WARN 54 → 51（静电感应/验电器/库仑定律 求解跑通后播放复活）；
   内置浏览器目视复验 6 个代表场景 **6/6 通过**（红条消失 + 画面非空白 + 0 console error）；
   `npm run precheck` 全绿；CI + Deploy 绿。commit `e0c0f1d`，测试数 **core 1111 / viz 1305 / total 2416**。

**至此 ERROR 类问题清零**（舞台空白 / console 报错 / 错误提示条 三类全 0）。

## 下一步建议（按严重度，**别按 issue 号顺序做**）

本轮复验时浏览器又暴露 5 个问题，已逐项取证（详见 #72 正文「修这批场景时浏览器又暴露出 5 个新问题」）：

### 1.【下一轮首选】通用遥测面板量纲错乱（疑似影响面最广）
验电器场景的遥测面板显示「**位置 y = 90.000 m / 势能 = 90.000 J / 加速度 = 90.117 m/s²**」——
把 θ（度）塞进了 y 位置与能量字段。这不是验电器独有的话，**很可能污染所有非力学场景的学生读数**。
建议做法：先做一次**影响面普查**（全场景读一遍遥测面板的 label/单位与场景物理量是否对得上），
再定位映射源头（疑似 `getVisualPosition()` / `diagnostics.maxValues` 的通用回退路径）做最小修。
判据可加进巡检脚本（遥测面板文本里"位置/势能/加速度"与场景 model 语义的一致性）。

### 2. 验电器「箔片张角 vs 电量」核心关系不成立
`theta_deg` **钉在 90.000° 饱和**，q 从 1 μC 拉到 49.91 μC 张角读数纹丝不动；
而 App 自己的诊断面板已打出「⚠ factor > 1, 模型失效 (q 超出可用范围)」。
即场景标题在当前默认参数下是假的。方向：核对 `electroscope` 模型的参数默认值/量程与
`foilFactor` 公式，必要时收窄场景参数范围或改模型（**注意它现在用的是大锤 `requiresValidation() → false`，
参数守卫是关着的** —— 见下方遗留 2）。

### 3. 51 个场景播放按钮"骗人"
`totalDuration === 0`（引擎结果无 trajectories）时，`PlaybackControls.tsx` 的播放/步进按钮
`disabled={!simulationResult}` 仍可点，切成 ⏸ 但时间永不动，右侧总时长显示 `0.00s`。
方向：`totalDuration === 0` 时禁用 + 提示"该实验无时序过程"。
**动手前先逐个确认这 51 个是否真的无时序** —— 有些可能"本该有而引擎没给"，那是引擎侧的另一类问题。

### 4. 参数→重解疑似滞后一拍
改 q 后诊断值不刷新，必须再改另一个参数才带出旧值（而新改的那个又停在旧值）。
需确认是重解调度 bug 还是采集时序问题（本棒只观察到一次，证据强度中等）。

### 5. 3D 相机取景与控件语义
多用电表 / 游标卡尺 / 验电器 三个器材在画面里占比极小（卡尺主尺与游标刻度几乎不可辨）；
🎯 复位按钮会把相机拉得**更远**而非复位；➕/➖ 与直觉相反（➕ 缩小、➖ 放大）。
另有 3D 文字标签被舞台左边界裁切（验电器放大时「箔片张角 θ=…」等）。

### 6. 物理量级可疑（第 3 轮旧账，仍未处理）
胡克定律 k 拉到最小值 1 N/m 时标签显示 `Δx≈4900 cm`（49 m），画面里弹簧垂到地面 —— 远超弹性限度。
需核对该场景 `parameters` 的 min 是否合理、是否该加弹性限度约束（或产出"超出弹性限度"告警）。
这类"边界值下量级失真"可考虑归并到上面第 1 条的"遥测与场景语义一致性"普查里一并处理。

### 门禁层面的两个遗留（交规划者立单，本棒未动）
1. **`physics-core/tsconfig.json` 的 `exclude` 含 `tests`** → 引擎测试**不参与类型检查**。
   `base-validate.test.ts` 里就有两行 `problem.bodies = [...]`（readonly 属性赋值）的真实类型错误，IDE 报错而 CI 全绿。
2. **4 个模型仍用大锤 `requiresValidation() → false`**（`thermistor` / `strain-gauge` / `security-alarm` /
   `light-control-switch`）→ 它们的参数范围与 NaN/Inf 守卫目前是关着的。迁到 `requiresBodies()` 会重新启用校验、
   可能暴露新失败，需逐个验证。
3. 更一般地：**建议全仓扫一遍"断言被 catch 包住"的空转测试**。本轮 L2 那一处让 12 个场景的失败静默存活至今。

### 若用户不再要求巡检
回到 backlog frontier **#61**（P1，M3 前置守卫；保守口径见 D12）。

## 阻塞项 / 风险
- **jsdom 单测复现不出挂载/渲染时序类 bug**（React passive effect 子先父后）；这类改动判据是**浏览器巡检**。
- 巡检脚本目前仍不覆盖：暗色主题、导出 CSV、导学/OCR/公式面板、参数**中间值**、物理方向/趋势断言、
  遥测面板与场景语义的一致性（= 上面第 1 条要补的）。
- **#44 勿动**；不动他人 PR。无脏树。

## 环境备注（务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`；本机无 msedge（新脚本用 Playwright 自带 chromium）。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；跑测试/脚本/浏览器需 `required_permissions=all`。
- **杀 dev server 不要用 `pkill -f "vite..."`**（命令行含 "vite" 就自杀）→ 用 `.scratch/kill-vite.cjs`。
- **core 测试里 `getModel()` 必须从 `../../src/index.js` 导入**（注册在 `solver/solver-router.ts` 副作用里，
  从 `models/base.js` 拿会看到空注册表）。
- 改 `physics-core/src` 后必须 `npm run build:core` 再跑前端测试/typecheck（#15 dist 守卫）。
- **跑巡检期间不要编辑 `visualization/src/**` 与 `physics-core/src/**`**（HMR 污染基线）。
- **教材目录的 `<details>` 分组会自动折叠** → 自动化脚本每次切换场景前需重新 `d.open = true`。
- **写含反引号/引号的中文正文一律用 Write 工具落文件**，别用 `printf`（shell 会做命令替换 / EOF 报错）。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- 全量巡检：本地 ~8 分钟（`QA_SKIP_PARAMS=1`）；CI 含参数边界实测 27 分钟（`timeout-minutes: 45`）。
- 产物在 `.scratch/`（gitignore）：`qa-{banner,r4}.json`、`sweep-*.log`、`probe-*.cjs`、`apply-exemption.cjs`、
  `kill-vite.cjs`、截图 `r4-*.png` / `verify*.png` / `fix-*.png` / `shield-*.png`。
- 自检 11 层；测试数真值 **core 1111 / viz 1305 / total 2416**。
