# TASKS（GitHub Issue 本地镜像）

> Planner 整体重写 · 2026-11-22 · D77（含 pending 决策 D78）。GitHub Issues（25 开放单）为唯一权威；Executor 先改 Issue，再同步本文件状态。
> 基线：`main @ e7e987d`（与 `origin/main` 同步；本轮规划追加 1 个 `.agent/` 提交），测试真值 **3260 = physics-core 1224 + visualization 2036**，`npm run selfcheck` 11/11 PASS，远端 CI `45037307092` / Deploy `45037587458` / QA `44962261661` 全绿；未见 `.agent/LOCK` 残留。
> 标签约定：`ready-for-agent` 仅挂于今日队列 4 单（`#179/#180/#181/#182`）；`priority:P1` 严格收敛为今日队列 4 单；`needs-triage` / `in-review` / `in-progress` / `needs-info` 均已清零。

## 本轮验收与治理摘要（2026-11-22）

- **昨日现场核查**：已读 `.agent/DIARY/2026-11-22.md`（四段实录：M10 Wave 2 + 脏文件清理推送 + 晚间空队列巡检 + M11 首批 5 单）及 `STATE.md` / `HANDOFF.md` / `ENV.md`，Executor 集中验收、刷新 M11 队列及工作区 Node `24→26` / IDE 自动保存信号已全部回应。
- **M10 Wave 2 独立验收（3 / 3 全部通过 → CLOSED，M10 达成 8 / 8 正式收官并关闭 Milestone 4）**：
  - **#174**（`3e9f3cc` / `84ac72a`）：新增专用 `NewtonTubeModel`（登记 `MODEL_CHART_KEYS`），双体契约 `y=H→0` 真空同落/空气线性阻力恒不领先，2D/3D 全面消费 `getFrame`；独立复跑 `newton-tube.test.ts` (7/7)、`gapScenes.integration`、`scene-rig-physics`、`rigs-build`、`typed-charts` (2/2) + `selfcheck` 11/11 + 远端 CI/Deploy 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/174#issuecomment-7081286440)）。
  - **#175**（`2caf0ff` / `1c80197`）：`orbital.ts` 消费 `centralRadius` 首次触地 80 次二分插值截断、`flags.impacted`、`触地碰撞` 关键帧，2D/3D 触地改绘截断轨迹；独立复跑 `orbital.test.ts` (14/14)、`scene-rig-physics`、`three-scene-fixes` (12/12)、`single-source-contract` + `selfcheck` 11/11 + 远端 CI/Deploy 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/175#issuecomment-7081287743)）。
  - **#177**（`55df189` / `8583206`）：`newton-third-law.ts` 自由双体内力运动总动量守恒、负内力相向接触停于质心不穿透，2D/3D 同源并清除「共同加速」误述；独立复跑 `newton-third-law.test.ts` (12/12)、`scene-rig-physics` + `selfcheck` 11/11 + 远端 CI/Deploy 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/177#issuecomment-7081289092)）。
- **M11 首批独立验收（5 / 5 全部通过 → CLOSED，M11 进度 0 / 13 → 5 / 13）**：
  - **#170**（`5636563` / `d057d07`）：轴向有符号投影与帧内插值速度同源；独立复跑 `spring.test.ts` (15/15) + `selfcheck` 11/11 + 远端 CI/Deploy 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/170#issuecomment-7081288919)）。
  - **#176**（`234f8c5` / `1001a1c`）：卡文迪什/微小形变统一 `D·tan(2θ) ≈ 2Dθ` 与 2D/3D `maxValues` 单一真源；独立复跑 `cavendish.test.ts` (15/15)、`micro-deformation.test.ts` (15/15)、`optical-lever-single-source.test.ts` (2/2) + `selfcheck` 11/11 + 远端 CI/Deploy 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/176#issuecomment-7081290227)）。
  - **#178**（`42d3e7f` / `0039b51`）：外切摩擦轮 `direction=-1`、`ω₂=-(r₁/r₂)ω₁` 切点速度矢量严格相等与 2D/3D 对齐；独立复跑 `transmission-belt.test.ts` (17/17)、`transmission-belt-direction.test.ts` (2/2) + `selfcheck` 11/11 + 远端 CI/Deploy 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/178#issuecomment-7081292922)）。
  - **#183**（`e644942` / `c2294ea`）：按 Planner 定型保留 `min=0` 空白态，消除 `0/0=NaN` 并同步 2D/3D 空白态文案；独立复跑 `liquid-mixing.test.ts` (5/5)、`liquid-mixing-empty.test.ts`、`single-source-contract` + `selfcheck` 11/11 + 远端 CI/Deploy 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/183#issuecomment-7081294186)）。
  - **#184**（`80bd329` / `5b525f8`）：按当前模式输出主曲线与终态 `t=tMax`、`T(tMax)`，明示 `T_env` 渐近，修正辐射 O(N) 子步与 2D/3D 同源；独立复跑 `heat-transfer.test.ts` (5/5)、`heat-transfer-consistency.test.ts`、`trajectory-semantics.test.ts`、`count:check` (3260) + `selfcheck` 11/11 + 远端 CI/Deploy 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/184#issuecomment-7081295379)）。
- **队列治理与排程**：
  - M11 Wave 2（电磁+光学 4 单：`#179/#180/#181/#182`）逐单完成 4.2 Ready 门禁定型并升为 `priority:P1` + `ready-for-agent`；其余 M11 Wave 3 4 单（`#185/#186/#187/#188`）与 M12 12 单维持 `priority:P2`。
  - 工作区 4 处 Node `24→26` 未暂存改动（§1.10 CI/CD 红线）+ 2 处 23:18 IDE 自动保存复发噪声记入 **D78（pending · 第 1 天询问）** 待用户拍板。

---

## 今日队列（2026-11-22，共 4 项 · 全部属 M11 Wave 2 · `ready-for-agent`）

### 1. #179 · 光控开关阈值失效与 `L=0` NaN 修复（D69=A）

- Issue：[#179](https://github.com/zhangjszs/physical-modelvis/issues/179)；Milestone：M11（5/13）；状态：**ready**（`ready-for-agent`）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 [最新评论](https://github.com/zhangjszs/physical-modelvis/issues/179#issuecomment-7081304594)）：
  - 按 D69=A 以分压 `V_B = E·R_LDR/(R_LDR+R_fix) >= VbeOn` 为唯一开关真源；放宽模型 `lightIntensity` 下限至 `0`，定义有界饱和幂律 `computeRldr(L)` 使 `L=0` 返回有限 `R_dark`（消除 `Infinity/NaN`、完全黑暗亮灯），并校准参考点使默认参数临界照度 `L_crit ≈ 10 lx`；导出只读 `criticalLux` 且 24h 曲线与 `trajectory` 复用 `computeRldr`。
  - 场景移除无效 `threshold` 滑块；2D（`sensorApplicationScenes.ts`）与 3D（`circuitRig.ts` 光控分支）消费引擎 `maxValues` 并展示 `L_crit`；更新 `single-source-contract.test.ts:599-623` 与 2D/3D 同源单测（不改其他电路场景 `#199`）。

### 2. #180 · 静电感应近远端电荷硬守恒与箔片张角物理量纲修复

- Issue：[#180](https://github.com/zhangjszs/physical-modelvis/issues/180)；Milestone：M11（5/13）；状态：**ready**（`ready-for-agent`）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 [最新评论](https://github.com/zhangjszs/physical-modelvis/issues/180#issuecomment-7081305550)）：
  - 孤立中性导体硬不变量 `q_near + q_far === 0`（`<1e-12`）写入 `conservedQuantities`；废弃 `INDUCTION_K=1e9` 双倒平方净电荷公式，改用量纲明确的感应电荷重分布（`μC`，`|q_near| <= |Q_C|`）与有界单调张角 `θ ∈ [0°, 90°)`，支持正/负 `chargeC` 与 `Q=0` 无 NaN，场强比与电荷比分离。
  - 2D（`drawElectrostaticInductionScene`）与 3D（`electroscopeRig` 感应场景）消费引擎真源；不改动 `electrostatic-shielding`（留给 M12 `#198` 防同文件冲突）。

### 3. #181 · 双缝干涉改为单缝前插透明薄片相移闭环（D70=A）

- Issue：[#181](https://github.com/zhangjszs/physical-modelvis/issues/181)；Milestone：M11（5/13）；状态：**ready**（`ready-for-agent`）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 [最新评论](https://github.com/zhangjszs/physical-modelvis/issues/181#issuecomment-7081306944)）：
  - 按 D70=A 移除双程 `2nd` 逻辑，改为单缝插透明薄片 `Δ_opt=(n-1)t`，总光程差 `d·x/L - Δ_opt`，屏幕 `intensityCurve`、`fringeOrderCurve`、`keyframes` 与 `fringes` 整体向插片侧平移 `x_shift = Δ_opt·L/d`（保持 `Δy = λL/d` 严格不变），输出 `fringeShiftMm`/`filmOpticalPathDiffUm`/`filmShiftOrders`。
  - 预设改名「单缝加薄片」；2D（`drawInterferenceScene`）与 3D（`waveOpticsRig` `interference` 分支）绘出单缝薄片并同步平移条纹；更新 `interference.test.ts:104-114` 旧断言（不改光栅/水波 `#202`）。

### 4. #182 · 薄膜干涉两界面 Fresnel 复振幅与真实相对半波损失

- Issue：[#182](https://github.com/zhangjszs/physical-modelvis/issues/182)；Milestone：M11（5/13）；状态：**ready**（`ready-for-agent`）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 [最新评论](https://github.com/zhangjszs/physical-modelvis/issues/182#issuecomment-7081307705)）：
  - 移除无条件 `+λ/2`，改用两界面真实 Fresnel 带符号幅反射系数与 Airy 复振幅反射率（正入射及倾斜 s/p 平均，保证 `0<=R<=1` 且 `d→0` 收敛到空气/基底单界面反射率 `0.04`）；以 `hasRelativeHalfWave = (r1·r2)<0` 判定相对半波损失并更新 `thicknessScan`/`wavelengthScan`/标签。
  - 修复 2D `drawThinFilmScene` 读错 `params.refractiveIndex`（改读 `refIndex`/`subsIndex` 与引擎结果）及硬编码「空气 n=1」与无条件半波损失标注；同步 3D `waveOpticsRig` `thin-film` 标牌（不改光栅/水波 `#202`）。

---

## M11 剩余待排队列（Wave 3 · 4 单 · `open · priority:P2`）

> [Milestone 5](https://github.com/zhangjszs/physical-modelvis/milestone/5)（进度 5 / 13：已关 5 单 + 今日队列 4 单 + 下表 4 单待 Wave 2 推进后过 4.2 门禁入队）。

| Issue | 标题 | 标签 | 备注 |
| --- | --- | --- | --- |
| [#185](https://github.com/zhangjszs/physical-modelvis/issues/185) | β 射线负电荷半径归零修复 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | Planner 4.2 预审已补：相对论动量 + `+x` 反向偏转 + 3D 消费引擎 |
| [#186](https://github.com/zhangjszs/physical-modelvis/issues/186) | 衰变统计试验次数 `nTrials` 生效 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | Planner 4.2 预审已补：`nTrials` 控真实样本总数 + 大 λ 稳定抽样 |
| [#188](https://github.com/zhangjszs/physical-modelvis/issues/188) | 光栅角色散 `rad/nm` 差 1000 倍与缺级判据 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 乘数 `1e-9` + 真实 `missingOrders`（先于 M12 `#202`） |
| [#187](https://github.com/zhangjszs/physical-modelvis/issues/187) | AM 调制采样低于 Nyquist 导致混叠 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 短时载波细节 vs 长时包络抗混叠策略 |

---

## M12 物理引擎与 3D 实验台增补缺陷批（12 单 · 0 / 12）

> [Milestone 6](https://github.com/zhangjszs/physical-modelvis/milestone/6) · 按 **D75=A（已确认）** 排在 M11 清零后分批入队，均维持 `open · priority:P2`。

| Issue | 标题 | 标签 | 备注 |
| --- | --- | --- | --- |
| [#192](https://github.com/zhangjszs/physical-modelvis/issues/192) | `melting-curve` 默认即熔化跳过平台，2D 秒当分钟取模循环 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 补 `initialTemp < Tm` + 2D `currentTime/60` |
| [#193](https://github.com/zhangjszs/physical-modelvis/issues/193) | `centrifugal` 滑动段对加速度开方致动能暴涨 292 倍，三套公式不互通 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 模型改切向惯性/含摩擦滑出 + 2D/3D 消费 `getFrame` |
| [#194](https://github.com/zhangjszs/physical-modelvis/issues/194) | `adiabatic-compression` p-V 忽略 `compressionRatio`，p·V^γ 单位差 1000^γ | `priority:P2`, `type:bug`, `area:engine` | 按 `1..r_max` 生成 p-V 并统一 `kPa·L^γ` |
| [#195](https://github.com/zhangjszs/physical-modelvis/issues/195) | `bohr-model` 巴尔末系 Hα~Hδ 倒序且说明残留 `${nHigh}→${nLow}` | `priority:P2`, `type:bug`, `area:engine` | 按 `lambdaNm` 降序命名 + 清洗模板字符串 |
| [#196](https://github.com/zhangjszs/physical-modelvis/issues/196) | `cosmic-ray` 1500m 处通量不连续跌落，30km 处指数爆炸 | `priority:P2`, `type:bug`, `area:engine` | 改为平滑连续大气通量函数（含合理标高/Pfotzer 极大） |
| [#197](https://github.com/zhangjszs/physical-modelvis/issues/197) | `hologram` / `security-alarm` / `current-magnetic` 绑定无关 3D Rig | `priority:P2`, `type:bug`, `area:render` | 拆分专用可交互 3D Rig 并消费引擎结果 |
| [#198](https://github.com/zhangjszs/physical-modelvis/issues/198) | `electrostatic-shielding` 在 `electroscopeRig` 三项控件全部失效 | `priority:P2`, `type:bug`, `area:render` | 接入 `externalField/cavityCharge/isGrounded`；**排 #180 后**防冲突 |
| [#199](https://github.com/zhangjszs/physical-modelvis/issues/199) | `circuitRig` 漏读 `circuit`/`load-voltage`/`bulb-vi` 阻值与内阻参数 | `priority:P2`, `type:bug`, `area:render` | 对齐参数别名/引擎真源 + `load-voltage` 扫阻动画；**排 #179 后**防冲突 |
| [#200](https://github.com/zhangjszs/physical-modelvis/issues/200) | `capacitorRig` 把 `area(m²)` 当 `cm²` 且漏读 `epsilonR` 致介质板恒隐身 | `priority:P2`, `type:bug`, `area:render` | 修正 `m²→cm²` 与 `epsilonR` 读取并消费引擎 `C` |
| [#201](https://github.com/zhangjszs/physical-modelvis/issues/201) | `doppler-effect` 2D 渲染器仍读错 `waveSpeed`/`frequency` | `priority:P2`, `type:bug`, `area:render` | 改读 `sourceFreq`/`soundSpeed` 并消费引擎结果 |
| [#202](https://github.com/zhangjszs/physical-modelvis/issues/202) | `waveOpticsRig` 漏读 `slitSep`/`screenDist`/`gratingConst` 及水波量纲错位 | `priority:P2`, `type:bug`, `area:render` | 补映射/μm→mm + 拆分水波槽 Rig；**排 #181/#182/#188 后**防冲突 |
| [#203](https://github.com/zhangjszs/physical-modelvis/issues/203) | `fieldRig`/`doublePendulumRig`/`slidingFrictionRig` 与 `electron-diffraction` 低压负半径 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 4 项独立 3D/引擎细节修补（可合修或拆单） |

---

## 后置产品线、工程维护与冻结项（5 单）

- **#191** · `[P2] 实现组合实验台「可控放置」交互改造（#166 P1 期：B-1~B-9）`：**blocked** · `priority:P2` · `type:feature` · `area:render`。按 **D72=A / D75=A** 排于 M11/M12 清零后启动。
- **#171** · `[P1][Sandbox M0] 固定平抛实验作为可编辑的沙盒预设装配`：**blocked** · `priority:P2` · `type:feature` · `area:engine, area:render`。按 D72=A 排于 #191 收口后由 Planner 出 Phase A RFC 再转 ready。
- **#189** · `[P2][UI/UX Redesign] PHYSVIS // WORLD ENGINE 改版`：**blocked** · `priority:P2` · `type:feature` · `area:render`。按 D72=A 顺位后置，合并前需 owner 人工预览认可。
- **#167** · `CI「安装 Playwright Chromium」遇 runner DNS 抖动加固`：`open` · `priority:P3` · `type:chore` · `area:ci`。D71=A 已授权 1.10 局部范围（仅给 `ci.yml`/`qa-sweep.yml` 安装步加 3 次退避重试），后置排期（M10 刚关闭，未满 2 个 Milestone）。
- **#44** · `[P2] 暂缓 React 19 迁移`：**blocked + parked** · `priority:P2` · `type:chore` · `area:ci`。D44=B 冻结维持，勿动。
