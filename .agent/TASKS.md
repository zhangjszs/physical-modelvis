# TASKS（GitHub Issue 本地镜像）

> Planner 整体重写 · 2026-11-19 · D74–D76·续（pending 清零）。GitHub Issues（33 开放单）为唯一权威；Executor 先改 Issue，再同步本文件状态。
> 基线：`main @ 9b0ad1a`（领先 `origin/main @ e6e05f8` 1 个 Executor 空队列收尾提交；本轮规划再追加 1 个 `.agent/` 提交），代码至 `8a09ec0`（Wave 1 全部合入），测试真值 **3214 = physics-core 1196 + visualization 2018**，远端 CI `44129200526` / Deploy `44129943335` / QA `44430900298`（2026-11-19）全绿；未见 `.agent/LOCK` 残留。
> 标签约定：`ready-for-agent` 仅挂于今日队列 3 单；`priority:P1` 严格收敛为今日队列 3 单；`needs-triage` / `in-review` / `in-progress` 均已清零。

## 本轮验收与治理摘要（2026-11-19）

- **昨日日报核查**：已读 `.agent/DIARY/2026-11-18.md`（Wave 1 全清空 + 晚间空队列巡检两段）、`2026-11-17.md`、`2026-11-13.md` 与 `STATE.md` / `HANDOFF.md` / `ENV.md`，全部信号已响应。
- **M10 Wave 1 独立验收（5 / 5 全部通过 → CLOSED，M10 进度 0/8 → 5/8）**：
  - **#166**（`bd3692e` / `81c3064`）：`resetLab` 重置 `nextId=1`、`CompositionLab` 改 `sourceDisplayName(selected)`、线拾取 `0.03m` 与 `decidePointerDownPick`；独立重跑 `tests/composition/`（12/12, 129 passed）+ `verify-composition-interaction.mjs`（`COMPOSITION INTERACTION VERIFICATION OK`，0 console error）→ **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/166#issuecomment-7012534146)）。
  - **#169**（`a569999` / `604fe5c`）：斜面分段上滑/静持/折返、`[0, L]` 双端截断、3D 全板长与 2D 瞬时加速度；独立重跑 `inclined-plane.test.ts`（18）+ `incline-contact.test.ts`（5）+ `scene-rig-physics.test.ts`（140）全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/169#issuecomment-7012537443)）。
  - **#172**（`7752f96` / `66af132`）：`vertical-circle-integrator.ts` RK4 积分与脱轨斜抛、`rod` `v₀≥√(4gr)`、`ring` 单侧约束与 2D/3D 真源；独立重跑 `vertical-circle.test.ts`（23）+ `single-source-contract.test.ts`（91）+ `scene-rig-physics.test.ts`（140）全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/172#issuecomment-7012540368)）。
  - **#173**（`7e555e2` / `d5db38e`）：`OM_signed`/`ON_signed` 带符号落点、动量代数和、非弹性文案与 2D/3D 落点；独立重跑 `projectile-collision.test.ts`（7）+ `single-source-contract.test.ts`（91）+ `scene-rig-physics.test.ts`（140）全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/173#issuecomment-7012543183)）。
  - **#190**（`4287dcc` / `8a09ec0`）：校验/求解失败与非法时长清 `result: null`、`stageTrajectory.ts` 停播归零与空格守卫；独立重跑 `tests/composition/`（129）+ `verify-composition-interaction.mjs` 全绿 → **通过并关闭**（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/190#issuecomment-7012546443)）。
- **队列治理与新单分拣**：
  - M10 Wave 2 全部 3 单（`#174/#175/#177`）补齐 4.2 Ready 门禁定型，升为 `priority:P1` + `ready-for-agent`。
  - 2026-11-18 新建 12 个 `needs-triage`（`#192–#203`）全量核实无重复，摘 `needs-triage`、依契约 4.3 收敛为 `priority:P2`，新建 **[Milestone 6 (M12)](https://github.com/zhangjszs/physical-modelvis/milestone/6)** 承接。
  - 用户同日答复「都安推荐的来」→ **D74=A**（由用户自行清理工作区 3 处未暂存改动，Agent 严格不碰）与 **D75=A**（排程正式确立为 `M10 → M11 → M12 → #191 → #171 → #189`）全部转正生效，**pending 清零**。

---

## 今日队列（2026-11-19，共 3 项 · 全部属 M10 Wave 2 · `ready-for-agent`）

### 1. #174 · 牛顿管空气/真空双体物理真源与 2D/3D 同源修复

- Issue：[#174](https://github.com/zhangjszs/physical-modelvis/issues/174)；Milestone：M10（5/8）；状态：**in-review**（2026-11-22 完成，commit `3e9f3cc` @ main / merge `84ac72a`，待 Planner 验收；执行报告见 [comment](https://github.com/zhangjszs/physical-modelvis/issues/174#issuecomment-7066494827)）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 [最新评论](https://github.com/zhangjszs/physical-modelvis/issues/174#issuecomment-7012556907)）：
  - 新增专用模型 `NewtonTubeModel`（`modelType: 'newton-tube'`，同步注册并登记 `chart-registry.ts` `MODEL_CHART_KEYS`，不污染 `uniform-accelerated`）。
  - 双体契约（`y=H → 0`）：`trajectories[0]`=硬币（自由落体触地即止）；`trajectories[1]`=羽毛（真空与硬币同落；空气采用线性阻力解析解 $v_t=1.6\text{ m/s}$、$\tau=v_t/g$ 触地即止，确保任意时刻羽毛绝不领先硬币）。
  - 2D（`chapter2Scenes.ts`）移除 `drop/maxDrop` 归一化与 `1-exp(-3t/duration)`，3D（`newtonTubeRig.ts`）移除自算 `vTerminal*t*0.45`，双端均消费引擎双体轨迹并补齐单测与集成测试。

### 2. #175 · 卫星轨道地球半径不可穿透边界碰撞截断与 2D/3D 对齐

- Issue：[#175](https://github.com/zhangjszs/physical-modelvis/issues/175)；Milestone：M10（5/8）；状态：**in-review**（2026-11-22 完成，commit `2caf0ff` @ main，待 Planner 验收；执行报告见 [comment](https://github.com/zhangjszs/physical-modelvis/issues/175#issuecomment-7066640711)）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 [最新评论](https://github.com/zhangjszs/physical-modelvis/issues/175#issuecomment-7012559250)）：
  - `orbital.ts` 消费 `centralRadius`：当 `r <= centralRadius` 时二分/二次插值求首次触地时刻/位置/末速度并立即截断积分，产出 `flags.impacted`、`触地碰撞` 关键帧与告警（不影响安全圆/椭圆轨道，明确无大气阻力）。
  - 2D（`chapter6Scenes.ts`）与 3D（`orbitalRig.ts`）在 `impacted=true` 时按截断引擎轨迹绘线并展示坠地告警，不再画穿地闭合椭圆；补全 `velocityFactor=0.5/1/1.5` 及边界回归。

### 3. #177 · 牛顿第三定律自由双体内力动量守恒与 2D/3D 同源修复

- Issue：[#177](https://github.com/zhangjszs/physical-modelvis/issues/177)；Milestone：M10（5/8）；状态：**in-review**（2026-11-22 完成，commit `55df189` @ main / merge `8583206`，待 Planner 验收；执行报告见 [comment](https://github.com/zhangjszs/physical-modelvis/issues/177#issuecomment-7066732876)）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 [最新评论](https://github.com/zhangjszs/physical-modelvis/issues/177#issuecomment-7012561263)）：
  - 维持 `allowMotion` 参数契约：`allowMotion=1` 改为光滑水平面自由双体内力运动（`a_A=-F_AB/m_A, a_B=F_AB/m_B`，总动量守恒、`F_AB<0` 相向至接触停于质心不穿透），更新 `conservedQuantities`、`explanation` 与 `newton-third-law.test.ts:58-72`。
  - 2D（`chapter3Scenes.ts`）与 3D（`newtonThirdLawRig.ts`）消费双体轨迹真源并移除「共同加速」错误文案与单向硬编码公式。

---

## M11 电磁 / 光学 / 热学 / 近代物理缺陷修复（13 单 · 0 / 13）

> [Milestone 5](https://github.com/zhangjszs/physical-modelvis/milestone/5) · 均保持 `open` · `priority:P2`，待 M10 8/8 收官后按批次过 4.2 门禁转 `ready`。

| Issue | 标题 | 标签 | 备注 |
| --- | --- | --- | --- |
| [#170](https://github.com/zhangjszs/physical-modelvis/issues/170) | 弹簧振子平衡位置关键帧速度文本误用 `v0` | `priority:P2`, `type:bug`, `area:engine`, `in-review` | **in-review**（2026-11-22，commit `5636563` / merge `d057d07`，消费帧内插值速度与 `velocity` 同源） |
| [#176](https://github.com/zhangjszs/physical-modelvis/issues/176) | 卡文迪什/微小形变光杠杆位移多乘 2 | `priority:P2`, `type:bug`, `area:engine`, `area:render`, `in-review` | **in-review**（2026-11-22，commit `234f8c5` / merge `1001a1c`，两模型统一 `D·tan(2θ)` 与 2D/3D 单一真源） |
| [#178](https://github.com/zhangjszs/physical-modelvis/issues/178) | 摩擦轮接触传动反向旋转 | `priority:P2`, `type:bug`, `area:engine`, `area:render`, `in-review` | **in-review**（2026-11-22，commit `42d3e7f` / merge `0039b51`，`friction` 反向无打滑与 2D/3D 对齐） |
| [#179](https://github.com/zhangjszs/physical-modelvis/issues/179) | 光控开关 `threshold` 失效与 `L=0` NaN | `priority:P2`, `type:bug`, `area:engine`, `area:render` | **D69=A 已确认**：以 `V_B>=VbeOn` 为真源，移除假滑块改示 `L_crit` |
| [#180](https://github.com/zhangjszs/physical-modelvis/issues/180) | 静电感应近远端电荷守恒与张角量纲 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 硬不变量 `q_near + q_far = 0`（孤立中性导体） |
| [#181](https://github.com/zhangjszs/physical-modelvis/issues/181) | 双缝干涉薄膜预设无相移效应 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | **D70=A 已确认**：改为单缝插薄片 `Δ=(n-1)t` 移条纹并改名「单缝加薄片」 |
| [#182](https://github.com/zhangjszs/physical-modelvis/issues/182) | 薄膜干涉两界面反射相对相变（半波损失） | `priority:P2`, `type:bug`, `area:engine`, `area:render` | Fresnel 幅反射系数符号 + 传播相位 |
| [#183](https://github.com/zhangjszs/physical-modelvis/issues/183) | 液体混合双零体积收缩率 NaN 修复 | `priority:P2`, `type:bug`, `area:engine`, `area:render`, `in-review` | **in-review**（2026-11-22，commit `e644942` / merge `c2294ea`，`VTotal=0` 置 0 + 2D/3D 空白态「无液体，收缩率不适用」） |
| [#184](https://github.com/zhangjszs/physical-modelvis/issues/184) | 热传递终态关键帧 `t=0` 与温度误用环境值 | `priority:P2`, `type:bug`, `area:engine`, `area:render`, `in-review` | **in-review**（2026-11-22，commit `80bd329` / merge `5b525f8`，`t=tMax` 与 `T(tMax)` 同源 + 2D/3D 一致） |
| [#185](https://github.com/zhangjszs/physical-modelvis/issues/185) | β 射线负电荷半径归零修复 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | `r = p/(|q|B)` + `sign(q)` 偏转方向 + 相对论动量 |
| [#186](https://github.com/zhangjszs/physical-modelvis/issues/186) | 衰变统计试验次数 `nTrials` 生效 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | `nTrials` 控制 Poisson 抽样次数 |
| [#187](https://github.com/zhangjszs/physical-modelvis/issues/187) | AM 调制采样低于 Nyquist 导致混叠 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 短时细节 vs 长时包络/抗混叠策略 |
| [#188](https://github.com/zhangjszs/physical-modelvis/issues/188) | 光栅角色散 `rad/nm` 差 1000 倍与缺级判据 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 乘数 `1e-9` + 真实 `missingOrders` 判定 |

---

## M12 物理引擎与 3D 实验台增补缺陷批（12 单 · 0 / 12）

> [Milestone 6](https://github.com/zhangjszs/physical-modelvis/milestone/6) · 2026-11-18 审计新增，全部已摘 `needs-triage`、收敛 `priority:P2`；按 **D75=A（已确认）** 排在 M11 后清零。

| Issue | 标题 | 标签 | 备注 |
| --- | --- | --- | --- |
| [#192](https://github.com/zhangjszs/physical-modelvis/issues/192) | `melting-curve` 默认即熔化跳过平台，2D 秒当分钟取模循环 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 补 `initialTemp < Tm` + 2D `currentTime/60` |
| [#193](https://github.com/zhangjszs/physical-modelvis/issues/193) | `centrifugal` 滑动段对加速度开方致动能暴涨 292 倍，三套公式不互通 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 模型改切向惯性/含摩擦滑出 + 2D/3D 消费 `getFrame` |
| [#194](https://github.com/zhangjszs/physical-modelvis/issues/194) | `adiabatic-compression` p-V 忽略 `compressionRatio`，p·V^γ 单位差 1000^γ | `priority:P2`, `type:bug`, `area:engine` | 按 `1..r_max` 生成 p-V 并统一 `kPa·L^γ` |
| [#195](https://github.com/zhangjszs/physical-modelvis/issues/195) | `bohr-model` 巴尔末系 Hα~Hδ 倒序且说明残留 `${nHigh}→${nLow}` | `priority:P2`, `type:bug`, `area:engine` | 按 `lambdaNm` 降序命名 + 清洗模板字符串 |
| [#196](https://github.com/zhangjszs/physical-modelvis/issues/196) | `cosmic-ray` 1500m 处通量不连续跌落，30km 指数爆炸 | `priority:P2`, `type:bug`, `area:engine` | 改为平滑连续大气通量函数（含合理标高/Pfotzer 极大） |
| [#197](https://github.com/zhangjszs/physical-modelvis/issues/197) | `hologram` / `security-alarm` / `current-magnetic` 绑定无关 3D Rig | `priority:P2`, `type:bug`, `area:render` | 拆分专用可交互 3D Rig 并消费引擎结果 |
| [#198](https://github.com/zhangjszs/physical-modelvis/issues/198) | `electrostatic-shielding` 在 `electroscopeRig` 三项控件全部失效 | `priority:P2`, `type:bug`, `area:render` | 接入 `externalField/cavityCharge/isGrounded`；**排 #180 后**防冲突 |
| [#199](https://github.com/zhangjszs/physical-modelvis/issues/199) | `circuitRig` 漏读 `circuit`/`load-voltage`/`bulb-vi` 阻值与内阻参数 | `priority:P2`, `type:bug`, `area:render` | 对齐参数别名/引擎真源 + `load-voltage` 扫阻动画 |
| [#200](https://github.com/zhangjszs/physical-modelvis/issues/200) | `capacitorRig` 把 `area(m²)` 当 `cm²` 且漏读 `epsilonR` 致介质板恒隐身 | `priority:P2`, `type:bug`, `area:render` | 修正 `m²→cm²` 与 `epsilonR` 读取并消费引擎 `C` |
| [#201](https://github.com/zhangjszs/physical-modelvis/issues/201) | `doppler-effect` 2D 渲染器仍读错 `waveSpeed`/`frequency` | `priority:P2`, `type:bug`, `area:render` | 改读 `sourceFreq`/`soundSpeed` 并消费引擎结果 |
| [#202](https://github.com/zhangjszs/physical-modelvis/issues/202) | `waveOpticsRig` 漏读 `slitSep`/`screenDist`/`gratingConst` 及水波量纲错位 | `priority:P2`, `type:bug`, `area:render` | 补映射/μm→mm + 拆分水波槽 Rig；**排 #181/#188 后**防冲突 |
| [#203](https://github.com/zhangjszs/physical-modelvis/issues/203) | `fieldRig`/`doublePendulumRig`/`slidingFrictionRig` 与 `electron-diffraction` 低压负半径 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 4 项独立 3D/引擎细节修补（可合修或拆单） |

---

## 后置产品线、工程维护与冻结项（5 单）

- **#191** · `[P2] 实现组合实验台「可控放置」交互改造（#166 P1 期：B-1~B-9）`：**blocked** · `priority:P2` · `type:feature` · `area:render`。#166 P0 已关闭；按 **D72=A / D75=A（已确认）** 排于 M10/M11/M12 清零后启动。
- **#171** · `[P1][Sandbox M0] 固定平抛实验作为可编辑的沙盒预设装配`：**blocked** · `priority:P2` · `type:feature` · `area:engine, area:render`。按 D72=A 排于 #191 收口后由 Planner 出 Phase A RFC 再转 ready。
- **#189** · `[P2][UI/UX Redesign] PHYSVIS // WORLD ENGINE 改版`：**blocked** · `priority:P2` · `type:feature` · `area:render`。按 D72=A 顺位后置，合并前需 owner 人工预览认可。
- **#167** · `CI「安装 Playwright Chromium」遇 runner DNS 抖动加固`：`open` · `priority:P3` · `type:chore` · `area:ci`。D71=A 已授权 1.10 局部范围（仅给 `ci.yml`/`qa-sweep.yml` 安装步加 3 次退避重试），后置排期。
- **#44** · `[P2] 暂缓 React 19 迁移`：**blocked + parked** · `priority:P2` · `type:chore` · `area:ci`。D44=B 冻结维持，勿动。
