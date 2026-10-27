# 《高中核心》24 节逐节物理排查清单 (#159 Phase 2)

> 本清单是 #159 全场景物理模型排查（`docs/scene-physics-audit.md` 123 行基表）在
> **《高中核心》目录分组（24 节）** 上的逐节复核与修复记录。
>
> - 分组来源：`visualization/src/scenes/classroomScripts.ts` 的 `CLASSROOM_SCRIPTS` 键集
>   （侧栏「🌟 高中核心精讲（24 节）」）。**总数核对 = 24 ✓**
> - 取证工具链（新增，均为真实链路）：
>   - `scripts/audit-core-scenes.mts` —— `scene.buildProblem(defaultParams) → solveProblem`
>     → dump `trajectories / charts / diagnostics.maxValues / extra`
>   - `scripts/capture-core-scenes.mjs` —— headless 截 **2D 板书 + 3D rig**，
>     每节 t=0 / 播放中段 / 参数改动后 各一张，并收集 console error / error-banner /
>     空白画布 / 画布尺寸异常
>   - `scripts/scan-rig-param-reads.mts` —— 静态扫描 rig 里 `params['X']` 读取链，
>     揪出「读了场景未声明参数 → 静默回退常量 → 标牌显示冻结值」
> - 截图目录：`docs/screenshots/core-audit/`（`-before` 为修复前，`-after` 为修复后）

## 判定口径

| 维度 | 含义 |
| --- | --- |
| 问题一·物理 | 画面/标牌与引擎结果不一致（公式、方向、正负、单位、单一真源违规、图表键语义错位） |
| 问题二·视觉 | 世界尺度、器材尺寸、间距、标尺口径不统一；装置与物理量级不匹配；裁切/遮挡/过小/标牌越界 |
| 问题三·实验作用 | 关键状态与过程表达不清：轨迹/受力/场线/波形/读数缺失或冻结；动画时间轴与物理时间不一致；看不出该实验要演示的规律 |

严重度：**阻断**（该节演示失效）> **严重**（结论性错误）> **一般**（表达/口径瑕疵）> **通过**。

---

## 0. 清单基准（24 节枚举）

| # | sceneId | 场景名 | 领域 | 引擎模型 | 3D rig |
| --- | --- | --- | --- | --- | --- |
| 1 | `projectile` | 抛体运动 (平抛+斜抛) | mechanics | `projectile` | `projectileRig` |
| 2 | `free-fall` | 自由落体 | mechanics | `uniform-accelerated` | `freeFallRig` |
| 3 | `uniform-accelerated` | 竖直运动（自由落体/上抛） | mechanics | `uniform-accelerated` | `verticalMotionRig` |
| 4 | `inclined-plane` | 斜面运动 | mechanics | `inclined-plane` | `inclineRig` |
| 5 | `collision` | 碰撞 | mechanics | `collision-elastic` | `collisionRig` |
| 6 | `spring` | 弹簧振子 | mechanics | `spring-oscillator` | `springRig` |
| 7 | `electric-field` | 匀强电场 | electromagnetism | `uniform-electric-field` | `electricFieldRig` |
| 8 | `magnetic-field` | 匀强磁场 | electromagnetism | `uniform-magnetic-field` | `magneticFieldRig` |
| 9 | `em-combined` | 电磁复合场 | electromagnetism | `em-combined-field` | `emCombinedRig` |
| 10 | `simple-pendulum` | 单摆 (简谐运动) | mechanics | `simple-pendulum` | `pendulumRig` |
| 11 | `mechanical-wave` | 机械波 (横波/纵波/干涉) | optics | `mechanical-wave` | `waveRig` |
| 12 | `lc-oscillator` | LC 电磁振荡 | electromagnetism | `lc-oscillator` | `lcOscillatorRig` |
| 13 | `circular-motion` | 匀速圆周运动 (向心力) | mechanics | `uniform-circular-motion` | `circularMotionRig` |
| 14 | `orbital` | 万有引力与航天 (卫星轨道) | mechanics | `orbital` | `orbitalRig` |
| 15 | `photoelectric` | 光电效应 | modern | `photoelectric` | `photoelectricRig` |
| 16 | `air-track` | 气垫导轨测速度 | mechanics | `uniform-linear` | `airTrackRig` |
| 17 | `hooke-law` | 胡克定律 F=kx | mechanics | `spring-oscillator` | `hookeLawRig` |
| 18 | `newton-second-law` | 牛顿第二定律 F=ma | mechanics | `newton-second-law` | `newtonSecondLawRig` |
| 19 | `force-composition` | 力的合成 (平行四边形定则) | mechanics | `force-composition` | `forceCompositionRig` |
| 20 | `energy-conservation` | 机械能守恒定律 | mechanics | `uniform-accelerated` | `fallingEnergyRig` |
| 21 | `galileo-incline` | 伽利略斜面理想实验 | mechanics | `galileo-incline` | `galileoInclineRig` |
| 22 | `resistance-law` | 电阻定律 | electromagnetism | `resistance-law` | `resistanceLawRig` |
| 23 | `refraction` | 光的折射定律 | optics | `refraction` | `opticsRig` |
| 24 | `gas-law` | 理想气体状态方程 | thermodynamics | `gas-law` | `gasLawRig` |

> 领域列以 `visualization/src/scenes/categories.ts` + 场景注册表为准（见 §4 分类核对）。

---

## 批次 A — 抛体 / 自由落体 / 竖直运动

### A-1 `projectile` 抛体运动

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **严重 → 已修复** | 3D 落点垫位置由 rig 内**重解落地方程**算出，与引擎 `maxValues.range` 是两套公式；`getVisualPosition` 里还有一段永远走不到的「贴地滑行」分支（引擎契约是「落地即止」，`tEnd=min(tLand,duration)`） | `visualization/src/components/simulation3d/rigs/projectileRig.ts`（旧 `updateEquipment`/`getVisualPosition`） |
| 问题二·视觉 | **一般 → 已修复** | 地面卷尺 `createRangeTape(14, 70)` ⇒ **5 m/世界单位**，与 rig 的 `WORLD_SCALE=0.16`（**6.25 m/单位**）不一致，卷尺刻度读数与画面实际距离对不上 | `visualization/src/components/simulation3d/equipment/rangeTape.ts` |
| 问题三·实验作用 | **严重 → 已修复** | 2D 落到**通用默认渲染器**：只有坐标轴/网格/速度矢量，看不出「水平匀速 + 竖直匀加速 = 抛物线」，也没有最高点/射程标注 —— 而这节课的教学目标正是「平抛运动的分解规律」。另：`duration` 撑到 `tLand+tRoll`，末段时间轴物体静止（动画时间轴 ↔ 物理时间不一致） | `visualization/src/components/simulation/SimulationCanvas.tsx`（无 `case 'projectile'`）＋ `visualization/src/scenes/scenes/mechanics/projectile.ts` |

修复：
- `projectileRig` 新增导出纯函数 `projectileReadouts(params, result)`，读引擎 `diagnostics.maxValues`（`range/apexHeight/flightTime/thetaDeg`），落点垫位置 = 引擎射程 × 场景尺度；删除永不执行的滑行分支。
- `createRangeTape(length, metersPerUnit)` 改为**只给世界单位长度 + 每单位米数**，刻度数字由二者推导；调用方必须传 `1 / WORLD_SCALE`。
- 新增专属板书 `drawProjectileScene`（抛物线 + 最高点/落点标注 + 最高点水平虚线 + vx/vy 分解箭头 + HUD 读 x/y/vx/vy），并把 `projectile` 纳入 `SCENES_MECHANICS`（自定义渲染集合）。
- 场景 `duration` 改为取飞行时间（引擎「落地即止」契约）。

契约断言（`visualization/tests/rendering/scene-rig-physics.test.ts`）：
「引擎射程 = 轨迹终点横坐标」「3D 落点垫位置 = 引擎射程 × 场景尺度」「`projectileReadouts.source === 'engine'`」
「地面卷尺刻度与 worldScale 同源」「`projectileBoardReadouts` 与引擎 H_max/R/vx 一致」。

### A-2 `free-fall` 自由落体

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **阻断 → 已修复** | 引擎 `uniform-accelerated` **不做地面约束**，落地后轨迹外推到 y = −24.1 m；板书直接读 `h₀ − y` 与 `|v_y|`，t=3 s 时显示 **s = 44.10 m / v = 29.40 m/s** —— 超过 20 m 的下落高度，是「穿过地面继续下落」的伪读数 | `visualization/src/rendering/chapter1Scenes.ts`（旧 `drawFreeFallScene`） |
| 问题二·视觉 | **一般 → 已修复** | 3D 摆了一条**水平**地面卷尺：自由落体是纯竖直运动，水平位移恒为 0，卷尺测不到任何东西，且与 `WORLD_SCALE` 口径打架 | `visualization/src/components/simulation3d/rigs/freeFallRig.ts` |
| 问题三·实验作用 | **示意通过** | 铁架台 + 电磁释放头 + 阻尼接料垫 + 高度尺 + 释放点标牌齐备，落地过程可视 | — |

修复：
- 新增导出纯函数 `freeFallReadouts(params, result, currentTime)`：位移夹到 `≤ h₀`、速率夹到落地冲击速度 `√(2gh₀)`、时钟停在落地时刻；板书与契约测试共用这一份口径。
- 删除 3D 的水平地面卷尺（真正要读的量「下落高度」由高度尺 + 释放点标牌承担）。

契约断言：「引擎确实把轨迹外推到地面以下（问题存在的证据）」「板书读数 s ≤ h₀ 且 v ≤ √(2gh₀)」
「落地时刻读数冻结、时钟停在落地时刻」「落地前读数与解析解一致」「自由落体 rig 不再摆放无意义的水平卷尺」。

### A-3 `uniform-accelerated` 竖直运动

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **严重 → 已修复** | 3D 标牌在 rig 内自算 `Δh = v₀y²/(2g)` / `H_max = h₀ + Δh` / `t_上 = v₀y/g` —— 渲染层第二套公式；引擎改模型即与轨迹分叉 | `visualization/src/components/simulation3d/rigs/verticalMotionRig.ts`（旧 `resolveVerticalParams`/`updateVertical`） |
| 问题二·视觉 | **严重 → 已修复** | 3D 自动取景把最高点**顶出视口上沿**，小球被裁掉一半（实测只露半个球） | 同上（缺 `framing`） |
| 问题三·实验作用 | **阻断 → 已修复** | ① 默认 `v0y = 0` ⇒ 与「自由落体」场景**完全同形**，场景名承诺的「上抛→最高点→回落」在默认画面里根本看不到；② 2D 落到**通用默认渲染器**，无竖直运动专属板书 | `visualization/src/scenes/scenes/mechanics/uniform-accelerated.ts` ＋ `SimulationCanvas.tsx` |

修复：
- 场景默认 `v0y: 0 → 20`、`duration: 3 → 5`（覆盖 h₀=20 m / v₀y=20 m/s 的完整上抛—落地过程），与《高中核心》讲稿 `demoParams` 对齐。
- 新增导出纯函数 `verticalMotionReadouts(params, result)`（读**引擎轨迹**求 h₀/H_max/t_up/t_ground，`source: 'engine' | 'fallback'`）与 `verticalMotionBoardReadouts(...)`；rig 与 2D 板书都改读引擎。
- 新增专属板书 `drawVerticalMotionScene`：竖直轨道 + 释放点/最高点标注 + 左侧米制标尺 + **v–t 图**（斜率 −g、过零即最高点）+ 落地冻结读数；`uniform-accelerated` 纳入 `SCENES_MECHANICS`。
- 3D 新增 `framing`：按 `H_max` 推导相机距离与仰角，保证整条竖直通道完整可见。

契约断言：「默认参数不再是与自由落体同形」「板书 H_max/t_up 读引擎轨迹且与轨迹最高点一致」
「落地时刻来自引擎轨迹首次触地」「`verticalMotionReadouts.source === 'engine'`」
「3D 最高点标记高度 = 引擎最高点 × 尺度」。

---

<!-- 批次 B~F 待补 -->

---

## 批次 B — 胡克定律 / 斜面运动 / 伽利略斜面 / 气垫导轨

> 修复前证据：`docs/screenshots/core-audit/{sceneId}-{2d|3d}-{t0|mid|param}-before.png`
> 修复后证据：`docs/screenshots/core-audit/{sceneId}-{2d|3d}-{t0|mid|param}-after.png`

### B-1 `hooke-law` 胡克定律 F=kx

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **阻断 → 已修复** | **引擎层**：`spring-oscillator` 模型**完全忽略重力**，钩码被放在平衡位置后只能在原长附近做简谐振动（还会出现负伸长），「挂在弹簧上的钩码停在 mg/k」这一胡克定律核心结论在引擎里根本不成立 | `physics-core/src/models/spring-oscillator.ts`（新增 `gravityAlongAxis` / `equilibriumDisplacement`，运动方程改为绕 `x_eq = mg∥/k` 振动；水平轴场景 `g∥=0`，行为与旧版逐位一致） |
| 问题一·物理 | **严重 → 已修复** | **2D**：`extensionPx = Math.max(20, currentX × 120)` —— 9.8 cm 形变只有 11.76 px，被钳到 20 px ⇒ **钩码永远不动**；刻度尺却按 120 px/m 标到 1.667 m（有效区间只剩 12/200 px） | `visualization/src/rendering/chapter3Scenes.ts` `drawHookeLawScene`（改为按引擎位置导出伸长量 + 量程自适应刻度尺） |
| 问题二·视觉 | **严重 → 已修复** | **3D**：弹簧形变按 `Δx × WORLD_SCALE × 4`（0.64 单位/米）绘制，与右侧刻度尺的 5.5 单位/米 **差 8.6 倍**；3D 标牌读场景根本不存在的 `params['m']` → 静默回退 0.5 kg，显示 `F=4.90N / Δx=24.5cm`（真值 0.2 kg / 1.96 N / 9.8 cm，错 2.5×） | `visualization/src/components/simulation3d/rigs/hookeLawRig.ts`（形变与刻度尺同源；读数读引擎 `maxValues.equilibriumDisplacement`；新增 `framing` 解决相机过远） |

**修复后**：钩码从弹簧原长释放 → 过冲 → 稳定在 `x_eq = mg/k = 9.8 cm`；2D 板书 `x=0.081m F=1.617N x_eq=0.098m`，3D 标牌 `F = 1.96 N | Δx_eq = 9.8 cm (k=20 N/m)`，与引擎 `maxValues.equilibriumDisplacement` 一致。

### B-2 `inclined-plane` 斜面运动

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **严重 → 已修复** | 场景把「沿斜面向上的初速度」分解成 `v0x=+v₀cosθ, v0y=+v₀sinθ`（**x 分量符号反**），引擎算出 `v∥ = v₀·cos2θ`：θ=30° 只有 0.5·v₀ 且方向朝下、θ=45° 变成 0、θ=60° 符号翻转 | `visualization/src/scenes/scenes/mechanics/inclined-plane.ts`（改为 `v0x=-v₀cosθ, v0y=+v₀sinθ`） |
| 问题一·物理 | **一般 → 已修复** | 引擎把斜面底端硬编码成 `h = |x₀.y| \|\| 10`（20 m），场景没有「斜面长度」参数：默认参数下 t=3 s 时 s=22.05 m，**已滑过底端 2.05 m 仍在加速** | `physics-core/src/models/inclined-plane.ts`（新增 `constraints.inclinedPlane.inclineLength`，给出时按「到达底端即止」钳制）；场景新增 `inclineLength` 参数（默认 6 m）并把物体放在斜面顶端 |
| 问题二·视觉 | **一般 → 已修复** | **2D**：木楔背景里的滑块被写死在斜面 45% 处（`const t = 0.45`），真实物体又由通用轨迹通道按世界坐标绘制 ⇒ 同一画面两个滑块、两个坐标系 | `visualization/src/components/simulation/SimulationCanvas.tsx`（`inclined-plane` 移出 `SCENES_2D_CUSTOM_BG`，并入 `SCENES_MECHANICS`）；新增专属板书 `drawInclinedPlaneScene` |
| 问题二·视觉 | **一般 → 已修复** | **3D**：物块按引擎笛卡尔坐标直接平移（`origin + pos × 0.16`），而斜面是**倾斜**的 ⇒ 物块与板面差一个 θ 角（悬空/陷板）；斜面长度固定 0.16 比例，6 m 斜面只有 0.96 世界单位 | `visualization/src/components/simulation3d/rigs/inclineRig.ts`（改为「沿切向投影 + 长度→固定世界长度」换算；新增 `framing`） |

**修复后**：斜面长 6 m，滑块从顶端 (0, 3 m) 滑到底端 (5.196, 0)，t=1.565 s 到底后速度归零；2D 板书 `s=5.51m v=7.35m/s a=4.90m/s²` 与引擎一致。

### B-3 `galileo-incline` 伽利略斜面理想实验

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **阻断 → 已修复** | **2D**：沿斜面位移用 `frame.position.x`（水平分量）算，θ=30° 时只读到真值的 86.6%；`clamp(…, 0, L)` 让位移在水平外推段（默认时长 76%）**全部冻结**在同一个数 | `visualization/src/rendering/chapter1Scenes.ts`（新增 `galileoInclineReadouts`，沿斜面投影 `s = x·cosθ + y·sinθ`） |
| 问题一·物理 | **严重 → 已修复** | **引擎层**：`all` 模式把水平面放在「对接斜面顶端」高度（engine y=0），小球从对接斜面顶端凭空飞出；同一个「水平面外推」在 `horizontal` 模式却位于谷底高度 ⇒ 两个模式口径打架，几何与物理都不成立 | `physics-core/src/models/galileo-incline.ts`（`all` 模式改为物理连续的「下滑 → 谷底水平面匀速」，对接斜面单独由 `docked` 呈现；轨迹不再超出仿真时长） |
| 问题二·视觉 | **阻断 → 已修复** | **3D**：斜面长度写死 `INCLINE_SPAN=1.8` 世界单位配 `WORLD_SCALE=0.16` ⇒ 画面斜面相当于 **11.25 m**（引擎只有 2 m，差 5.6 倍）；小球位置用手写三角剖面，与引擎轨迹无关 | `visualization/src/components/simulation3d/rigs/galileoInclineRig.ts`（装置几何与球位都由引擎参数/轨迹推导） |
| 问题三·实验作用 | **严重 → 已修复** | **2D**：对接斜面、水平面两段外推**完全不画**，`mode` 参数在 2D 无分支 ⇒ 伽利略三段推理链在 2D 看不到 | `visualization/src/rendering/chapter1Scenes.ts`（按 mode 画斜面 / 对接斜面 / 谷底水平面 + 等高参考线） |

**修复后**：2D 三段装置齐全（下滑斜面 + 谷底水平面 + 等高虚线），小球在谷底后沿水平面继续匀速；3D 斜面长度 = 引擎 L（2 m → 2.6 世界单位），球心贴面。

### B-4 `air-track` 气垫导轨测速度

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题二·视觉 | **严重 → 已修复** | **3D**：滑块放在 `-1.2 + pos.x × 0.16`，光电门放在 `-1.2 + x₁ × 1.8` ⇒ 比例系数差 **11.25 倍**，滑块全程到不了任何一扇门，「遮光计时测速度」这个实验在 3D 里彻底失效 | `visualization/src/components/simulation3d/rigs/airTrackRig.ts`（统一用「导轨世界长度 ÷ 导轨物理长度」换算，与 2D 的 `pixelsPerMeter` 同源） |
| 问题三·实验作用 | **一般 → 已修复** | **3D** 没有挡光片，也没有遮光时间/测速读数 —— 实验的关键量（Δt、v=Δx/Δt）在 3D 里读不到 | 同上：`ownParticles` 自绘滑块 + 挡光片（宽度同口径换算），标牌显示 `G1/G2: Δt=…ms v=…`，数据来自引擎轨迹（与 2D 共用 `computePhotogateMeasurements`） |

**修复后**：3D 滑块（蓝块 + 红挡光片）实际穿过两扇光电门，标牌 `G1: Δt=40ms v=0.500 | G2: Δt=40ms v=0.500`，与引擎速度一致。

---

## 批次 C — 碰撞 / 弹簧振子 / 牛顿第二定律 / 力的合成（+ 机械能守恒、LC 振荡补记）

### C-1 `collision` 碰撞

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题二·视觉 | **严重 → 已修复** | **2D**：木质背景里的两个方块被**写死**在 `width×0.25` / `width×0.7`，真实物体又由通用轨迹通道按世界坐标绘制 ⇒ 同一画面两套位置、两套物体 | `visualization/src/components/simulation/SimulationCanvas.tsx`（`collision` 移出 `SCENES_2D_CUSTOM_BG`，并入 `SCENES_MECHANICS`）；新增专属板书 `drawCollisionScene` + `collisionReadouts` |
| 问题三·实验作用 | **一般 → 已修复** | 2D 没有碰前/碰后状态区分，也没有动量守恒读数 | 新板书：两个方块位置/速度读引擎双轨迹，显示碰前 P、碰后 P、当前 P 与碰撞时刻 |

**修复后**：t=1.5 s（碰后）画面显示 `v₁=0.00 m/s  v₂=5.00 m/s`，`碰前 P=5.00 碰后 P=5.00 当前 P=5.00 kg·m/s`（守恒）。

### C-2 `spring` 弹簧振子

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **严重 → 已修复** | 场景 `naturalLength: 0` + 物体初始位置 `(A, 0)` ⇒ 弹簧长度会**穿过固定端变成负值**，振子从 x=+A 荡到墙的另一侧 | `visualization/src/scenes/scenes/mechanics/spring.ts`（原长 L₀ = A + 0.25，物体初始位于 (L₀+A, 0)，振子始终在墙右侧） |
| 问题二·视觉 | **严重 → 已修复** | **2D**：物块画在 `eqX + clamp(A×200)` —— **永远停在最大振幅处**，弹簧完全不伸缩 | `visualization/src/rendering/chapter1Scenes.ts`（新增 `drawSpringScene` + `springReadouts`） |
| 问题二·视觉 | **一般 → 已修复** | **3D**：固定端放在 world x=−1.6（@0.16 相当于 10 m），与引擎原长毫无关系；振子世界行程仅 ±0.08 单位，几乎看不出在振动 | `visualization/src/components/simulation3d/rigs/springRig.ts`（固定端 = 引擎锚点，世界比例由振幅推导，补 framing） |

**修复后**：引擎轨迹 x ∈ [0.25, 1.25] m（不穿墙），板书 `x=-0.026 m v=-1.579 m/s`，弹簧随物块伸缩。

### C-3 `newton-second-law` 牛顿第二定律

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题二·视觉 | **一般 → 已修复** | **2D**：像素比例固定 28 px/m，默认参数总位移 62.5 m → 1750 px 远超画布，小车在 t≈2.9 s 后被 `clamp` **钉在右缘冻结**约 36% 时长 | `visualization/src/rendering/chapter4Scenes.ts`（按引擎 `maxValues.displacement` 自适应像素/米） |
| 问题二·视觉 | **一般 → 已修复** | **3D**：木板固定 4.2 世界单位（= 26.25 m），小车行程 62.5 m ⇒ **开出木板 2.38 倍**，画面上悬空加速 | `visualization/src/components/simulation3d/rigs/newtonSecondLawRig.ts`（木板长度随行程自适应并从小车起点铺开；滑轮位置随之调整；补 framing） |

### C-4 `force-composition` 力的合成（平行四边形定则）

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **一般 → 已修复** | **2D** 完全自算公式（不读引擎），画面停在指定夹角的静态图形，引擎的扫掠动画在 2D 完全看不到 | `visualization/src/rendering/chapter3Scenes.ts`（新增 `forceCompositionReadouts`，读引擎当前帧：position=合力矢量、velocity=(扫掠夹角°, 合力大小)） |
| 问题二·视觉 | **一般 → 已修复** | **3D**：平行四边形只 push 3 个点（`[pt1, ptRes, pt2]`），**没有闭合** | `visualization/src/components/simulation3d/rigs/forceCompositionRig.ts`（改为 5 点闭合 O→F₁→F→F₂→O 并 `computeLineDistances`） |
| 问题三·实验作用 | **一般 → 已修复** | **3D**：舞台默认小球沿「合力矢量」扫动 —— **把力箭头当成质体在空间里运动** | 同上：`ownParticles: true`（舞台不再叠加小球），改由 rig 绘制合力端点轨迹（引擎伪轨迹）+ 正对木板的取景 |

### C-5 补记：`energy-conservation` 机械能守恒（批次 B 提交中一并修复）

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **严重 → 已修复** | 板书只夹位置不夹速度 ⇒ 动能虚涨到 432.18 J 却写「无摩擦→守恒」；小球水平位置由「下落距离×0.3」自算而非读引擎 | `visualization/src/rendering/chapter7Scenes.ts`（新增 `energyConservationReadouts`，同时夹位置与速度，E总 ≡ E₀；水平位置读引擎 `frame.position.x`） |
| 问题一·物理 | **一般 → 已修复** | 引擎时长 3 s > 触地时刻，轨迹本身穿地 | `visualization/src/scenes/scenes/mechanics/energy-conservation.ts`（仿真时长截到 tGround = √(2h₀/g)） |

### C-6 补记：`lc-oscillator` LC 电振振荡（批次 B 提交中一并修复）

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **严重 → 已修复** | rig 死读 `params['L']`/`params['inductance']`（场景无此参数 → 静默回退 0.1 H，真值 10 μH）与 `params['C']`（把 pF 当 F）⇒ 标牌 `T=19869.06 ms | f=0.1 Hz`，真值 `T=0.19869 μs | f=5.0332 MHz`，**偏差 1.0×10⁸** | `visualization/src/components/simulation3d/rigs/lcOscillatorRig.ts`（重写：读引擎 `maxValues`，μs/ms/ns 与 Hz/kHz/MHz 自适应单位；q(t)/i(t) 走 `chartsOf` 的 `x_t`/`y_t`） |

## 批次 D — 单摆 / 机械波 / 圆周运动 / 万有引力（逐节复核判定为「通过」）

这四节本轮做了完整的引擎 → 渲染/标牌逐项对照，**未发现需要修复的偏差**；
判定为「通过（示意通过）」，不做代码改动，仅补齐证据链与结论。

| sceneId | 领域 | 引擎模型 | rig | 问题一·物理 | 问题二·视觉 | 问题三·实验作用 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `simple-pendulum` | mechanics | `simple-pendulum` | `pendulumRig` | 通过 | 通过 | 通过 | 通过 |
| `mechanical-wave` | optics | `mechanical-wave` | `waveRig` | 通过 | 通过 | 通过 | 通过 |
| `circular-motion` | mechanics | `circular-motion` | `circularMotionRig` | 通过 | 通过 | 通过 | 通过 |
| `orbital` | mechanics | `orbital` | `orbitalRig` | 通过 | 通过 | 通过 | 通过 |

**逐项证据（引擎输出 ↔ 画面/标牌）**

- `simple-pendulum`：引擎 `maxValues.periodSmall = 2.007090 s`，与小角度公式
  `2π√(L/g) = 2π√(1/9.8) = 2.00709 s` **逐位一致**（相对偏差 < 1e-9）；
  轨迹包围盒 x ∈ [−0.2588, 0.2588] m 正是 `L·sin15° = 0.2588 m`，
  `maxThetaDeg = 15.000°` 与场景参数一致；死读扫描 0 处。
- `mechanical-wave`：引擎 `waveSpeed = 1 m/s = f·λ = 2×0.5`，
  `wavelength = 0.5 m`、`frequency = 2 Hz`、`angularFreq = k = 12.5664 rad/m`
  三者自洽；9 个追踪质点相位互异（间距 ≠ λ），波形未退化成直线。
- `circular-motion`：引擎 `radius = 1 m`、`maxSpeed = 3 m/s`、
  `maxAcceleration = 9 m/s²`（= v²/R）、`centripetalForce = 1.8 N`（= mv²/R = 0.2×9）、
  `period = 2.094395 s`；t = 3.142 s 时位置 x = −1.00 m（正好半周期回到 −R），
  与解析解一致。
- `orbital`：引擎 `vOrbit = 7.672594 km/s`、`minR = 6771 km`（= R⊕ + h = 6371 + 400）、
  `vEscape = 10.850687 km/s`（= √2·vOrbit）、`orbitPeriod = 5544.86 s`
  （= 2π√(r³/GM)），四个量互相自洽。

**结论**：四节「画面 ↔ 引擎」逐项对照无偏差，问题一/二/三均判定为**通过**。
截图基线见 `docs/screenshots/core-audit/{simple-pendulum,mechanical-wave,circular-motion,orbital}-*.png`。

## 批次 E — 匀强电场 / 匀强磁场（两个阻断项逐节修复）

### E-1 `electric-field` 匀强电场中的类平抛偏转

**修复前的问题（证据：基线截图 + 引擎 dump）**

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **阻断 → 已修复** | 默认 q = 1.6×10⁻¹⁹ C（质子）、m = 1.67×10⁻²⁷ kg、Ey = 100 N/C ⇒ a = qE/m = **9.58×10⁹ m/s²**；t = 2 s 时 v = **1.916×10¹⁰ m/s（64 倍光速）**、y = 1.916×10¹⁰ m。引擎自己的 `assumptions` 写着「粒子速度远小于光速」，默认参数却直接违反 | `visualization/src/scenes/scenes/electromagnetism/electric-field.ts`（改为演示用宏观带电小球量级 q = 2×10⁻⁸ C、m = 2×10⁻⁷ kg、Ey = 10 N/C、v₀x = 4 m/s、时长 1.5 s ⇒ a = 1 m/s²、x = 6 m、y = 1.125 m、偏转/水平 = 18.8%） |
| 问题一·物理 | **阻断 → 已修复** | 3D 标牌读 `params['U'] ?? params['voltage']`（场景**无此参数** → 静默回退 100 V）与 `params['v0']`（无此参数 → 回退 20 m/s，真值 v₀x = 5 m/s，**错 4 倍**）⇒ 标牌与引擎毫无关系 | `visualization/src/components/simulation3d/rigs/electricFieldRig.ts`（重写：读引擎 q/m/a/v/x/y 与 `maxValues`，不再回退不存在的参数） |
| 问题一·物理 | **一般 → 已修复** | 2D 只画一层**满屏向上的竖直箭头**（`SCENES_2D_CUSTOM_BG`），方向写死 —— Ey < 0 时与引擎的 E = (0, Ey) 相反 | `visualization/src/rendering/chargedParticleScenes.ts`（新增专属板书 `drawElectricFieldScene`，场线箭头方向随 Ey 符号） |
| 问题一·物理 | **一般 → 已修复** | 3D 极板 +/− 极性写死「+ 在上板」，与 E 向上（Ey > 0 ⇒ 下板为正极）相反 | `visualization/src/components/simulation3d/equipment/deflectionPlates.ts`（新增 `updateDeflectionPolarity`，极性随 E 方向换位） |
| 问题二·视觉 | **严重 → 已修复** | 3D 比例写死 0.16，极板 2.8 世界单位 = 17.5 m 物理长度，与真实轨迹尺度对不上；粒子瞬间出屏 | `electricFieldRig.ts`（比例由引擎轨迹跨度推导：水平跨度 → 极板长度，竖直偏移 → 板间距；粒子球半径 0.1；补 `framing`） |
| 问题二·视觉 | **严重 → 已修复** | 3D 沿用通用自动取景（舞台中心 x ≈ 3.6，器材在 x ≈ 0）⇒ 画面偏左、顶部标牌出框 | 同上：`framing` 显式把器材摆到画面中心 |
| 问题二·视觉 | **一般 → 已修复** | 3D 标牌是一条 60+ 字的长文本带（`makeTextSprite` 的 scale.x 随文本长度放大）⇒ 横贯画面且被压扁 | `visualization/src/components/simulation3d/primitives.ts`（新增 `setSpriteGlyphHeight` 固定字高） |
| 问题三·实验作用 | **严重 → 已修复** | 2D 板书只有背景装饰，没有极板、没有轨迹、没有读数 —— 看不出「类平抛」这个实验在演示什么 | `chargedParticleScenes.ts`：极板 + 电子枪 + 场线箭头 + 抛物线轨迹 + 速度/受力矢量 + 读数 HUD + 米制标尺 + 类平抛公式信息条 |

**修复后**：引擎 `a = 1.000 m/s²`、轨迹 x ∈ [0, 6] m / y ∈ [0, 1.125] m、
能量守恒 `1.6×10⁻⁶ J`（首末一致）、`maxSpeed = 4.272 m/s`（全程亚光速）；
2D 板书显示 `t=0.75 s x=3.00 m y=0.281 m v=4.07 m/s a=qE/m=1.000 m/s²`，
极板下 `+` 上 `−`，场线箭头向上，与引擎一致；
3D 轨迹铺满极板长度、偏转量落在板间，标牌 `q/m = 0.100 C/kg a = 1.00 m/s²`。

### E-2 `magnetic-field` 匀强磁场中的匀速圆周运动

**修复前的问题（证据：基线截图 + 引擎 dump）**

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **阻断 → 已修复** | 默认 q = 1.6×10⁻¹⁹ C、m = 1.67×10⁻²⁷ kg、v₀ = 1000 m/s、B = 0.01 T ⇒ **R = mv/(qB) = 1.0437×10⁻³ m（1 mm）**、T = 2πm/(qB) = **6.56×10⁻⁷ s**；10 ms 的仿真时长里绕 **15 248 圈** —— 屏幕上看不出「回旋」 | `visualization/src/scenes/scenes/electromagnetism/magnetic-field.ts`（改为宏观量级 q = 2×10⁻⁶ C、m = 2×10⁻⁸ kg、B = 0.5 T、v₀ = 25 m/s、时长 0.3 s ⇒ **R = 0.500 m、T = 0.1257 s、≈2.4 个周期**） |
| 问题一·物理 | **阻断 → 已修复** | 3D 与 2D 都画 **⊗（垂直纸面向里）**，而引擎 `uniform-magnetic-field` 只读 `fieldStrength`（恒 +z = **出纸面 ⊙**）⇒ 画的场与算的场**方向相反** | `visualization/src/components/simulation3d/rigs/magneticFieldRig.ts` + `chargedParticleScenes.ts`（改画 ⊙：3D 用「圆圈 + 中心实心点」几何，2D 同） |
| 问题一·物理 | **一般 → 已修复** | 3D 标牌读 `params['v'] ?? params['v0']`（场景**两者都没有**）→ 回退 1.0×10⁶ m/s，真值 1000 m/s，**错 1000 倍** | `magneticFieldRig.ts`（重写：读引擎 `maxValues.cyclotronRadius` / `cyclotronPeriod` 与当前帧速率） |
| 问题二·视觉 | **严重 → 已修复** | 3D 轨道世界半径 1.7×10⁻⁴ 单位，而默认球半径 0.22（轨道的 **1300 倍**）⇒ 只看得到一颗静止大球 | `magneticFieldRig.ts`（比例由引擎回旋半径推导：轨道 = 磁腔半径 × 0.66；粒子球半径 0.09；自绘轨道圆虚线） |
| 问题二·视觉 | **严重 → 已修复** | 半透明磁腔写深度 ⇒ 腔内的轨迹线被**整段遮掉**，画面上只剩一根断线 | 同上：磁腔材质 `depthWrite: false` + `renderOrder = -1` |
| 问题二·视觉 | **一般 → 已修复** | 磁腔中心 y = 1.5、半径 1.6 ⇒ 腔体**插进地面**，底部读数标牌被地面遮住 | 同上：`FIELD_CENTER_Y` 抬到 2.0；`framing` 显式取景 |
| 问题三·实验作用 | **严重 → 已修复** | 2D 板书只有满屏 ⊗ 背景，没有轨道、没有洛伦兹力、没有 R/T 读数 —— 看不出「洛伦兹力提供向心力」 | `chargedParticleScenes.ts`：新增专属板书 `drawMagneticFieldScene`（磁腔 + ⊙ 符号 + 轨道圆 + 轨迹 + 速度/洛伦兹力矢量 + 圆心标注 + R/T/角度 HUD） |

**修复后**：引擎 `cyclotronRadius = 0.500 m`、`cyclotronPeriod = 0.125664 s`、
速率恒为 25 m/s（动能 6.25×10⁻⁶ J 首末一致）、轨迹包围盒 x ∈ [−0.5, 0.5] / y ∈ [−1, 0] m；
2D 板书显示 `R=0.500 m T=0.1257 s 转过 430° v=25.0 m/s f=qvB=2.50e-5 N`，
圆心在起点下方（与引擎 `acceleration.y < 0` 同向）；
3D 画出 ⊙ 出纸面 + 轨道圆 + 轨迹 + 洛伦兹力矢量，标牌
`q = +2.00×10⁻⁶ C B = 0.50 T (⊙ 出纸面)` / `R = 0.500 m T = 0.1257 s 转过 430° v = 25.0 m/s`。

**契约保障**：`visualization/tests/rendering/scene-rig-physics.test.ts` 新增 **12 条**断言
（`describe('#159 高中核心·匀强电场…')` / `describe('#159 高中核心·匀强磁场…')`），
全部走「场景默认参数 → `runSceneSimulation` → 板书/rig 读数」真实链路。

### E-3 `em-combined` 电磁复合场（速度选择器）

**修复前的问题（证据：基线截图 + 引擎 dump）**

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **阻断 → 已修复** | 旧默认 q = 1.6×10⁻¹⁹ C、m = 1.67×10⁻²⁷ kg、Ey = 10 N/C、Bz = 0.01 T、v₀x = 1000 m/s ⇒ **v选择 = E/B = 10/0.01 = 1000 m/s 恰好等于 v₀** —— 粒子正好走在速度选择器的平衡点上做匀速直线运动，画面上**「复合场使带电粒子偏转」这个核心现象完全缺席**（基线 3D 截图里轨迹是一条水平直线） | `visualization/src/scenes/scenes/electromagnetism/em-combined.ts`（改为演示用宏观量级 q = 2×10⁻⁶ C、m = 2×10⁻⁸ kg、Bz = 0.5 T、Ey = 22 N/C、v₀x = 20 m/s、时长 0.1 s） |
| 问题一·物理 | **阻断 → 已修复** | 旧默认 q/m = 9.58×10⁷ C/kg、dt = 10⁻⁵ s ⇒ Boris 单步转角 \|q\|B·dt/(2m) = **4.79 rad ≫ π/4** —— 一旦参数偏离平衡点走数值路径，引擎会直接告警「回旋分辨率不足」，轨迹退化成直线 | 同上：新默认 ω = qB/m = 50 rad/s、dt = 10⁻⁴ s ⇒ 单步转角 **0.0025 rad**，引擎 0 告警 |
| 问题一·物理 | **严重 → 已修复** | 2D 板书 `drawEMCombinedField` 在 `Ey >= 0` 时把场线箭头画成**向下**，而引擎 `E = (0, Ey)` 在 2D 坐标（+y 向上）里是**向上** ⇒ 板书画的场预测的偏转方向与引擎轨迹**相反** | `visualization/src/rendering/chargedParticleScenes.ts`（新增专属板书 `drawEMCombinedScene`：E 箭头方向随 Ey 符号） |
| 问题一·物理 | **严重 → 已修复** | 3D rig 把引擎 +y 映射到**世界 −y**（手性翻转）并画 ⊗（入纸面），而引擎 B 恒为 +z（⊙ 出纸面）；2D 又不翻转 ⇒ 两层口径互相打架，板书与 rig 画的场方向都和引擎对不上 | `visualization/src/components/simulation3d/rigs/emCombinedRig.ts`（去掉 y 轴翻转，⊗ → ⊙；2D/3D 同手性） |
| 问题一·物理 | **一般 → 已修复** | 3D 死读 `params['E']` / `params['B']`（场景**没有**这两个参数）⇒ 静默回退到默认值 | 同上：`resolveFields` 只读场景声明过的 `Ey` / `Bz` / `v0x` |
| 问题二·视觉 | **严重 → 已修复** | 3D 比例 `WORLD_SCALE = 0.32` 写死，与新的物理量级完全脱节，粒子只会走一小段就停在腔室中部 | 同上：比例由**引擎轨迹**推导（水平跨度 → 极板长度、竖直偏移 → 板间距），导出 `emCombinedUnitsPerMeter` 供契约测试 |
| 问题二·视觉 | **严重 → 已修复** | 读数标牌的**字高只有 2~3 px**：文本被压成一条横线，完全读不出 E/B/v选择 | `visualization/src/components/simulation3d/primitives.ts`（新增 `makeLabelSprite`「创建即锁定字高」+ `spriteGlyphHeight`）。根因：`makeTextSprite` 初始 `scale.y = 0.1`，而 `setSpriteGlyphHeight` 只在**文本发生变化后**才被调用；本 rig 用**最终文本**创建标牌 ⇒ `setLabelOnce` 的「文本未变即 return」让它永远拿不到字高修正 |
| 问题二·视觉 | **一般 → 已修复** | 标牌右半边被洗成一片白（「发生偏转」四个字几乎看不见） | 同上：移除标牌背后的白色背板 —— 90% 不透明的平面在 Three 的透明排序里会画到标牌之后，把文字洗掉 |
| 问题三·实验作用 | **严重 → 已修复** | 2D 板书只有满屏背景箭头，没有极板、没有狭缝、没有轨迹、没有读数 ⇒ 看不出「速度选择器为什么只放行 v = E/B 的粒子」 | `chargedParticleScenes.ts`：极板 + E 箭头 + ⊙ 符号 + 摆线轨迹 + 速度矢量 + 速度选择狭缝 + HUD + 摆线信息条 |

**修复后（引擎实测）**：`v选择 = E/B = 44.000 m/s ≠ v₀ = 20.00 m/s` ⇒ 粒子走**摆线**
（漂移速度 v_d = E×B/B² = E/B = 44 m/s、回旋角频率 ω = qB/m = 50 rad/s、
相对漂移速度 |v₀ − v_d| = 24 m/s ⇒ 摆幅 2×24/50 = **0.960 m**）；

- 轨迹包围盒 x ∈ [0, 4.8603] m、y ∈ [0, **0.9600** m]（与上式逐位一致）；
- 首帧 a = (0, **1200**) m/s²（= q/m·(E − v₀B) = 100×(22 − 10)）、末帧 v = (37.192, −23.014) m/s、a = (−1150.71, 340.38) m/s²（与引擎 `a = (q/m)(E + v×B)` 逐项吻合）；
- 能量守恒：首末总能量 4.000×10⁻⁶ J 一致，`maxSpeed = 68.0 m/s`（全程亚光速，遵守引擎 `assumptions`）；
- 把 v₀x 调到 44 m/s ⇒ 轨迹回到**直线**（速度选择器原理的直接演示，已固化为契约断言）。

**契约保障**：`describe('#160 电磁复合场…')` 重写为新口径（默认偏离平衡点 / v₀ = E/B 回到直线 /
映射不再翻转 / 极性下板为正 / 比例由引擎推导 / 2D 与 3D 同为 ⊙），并新增
「标牌字高 ≥ 0.06 世界单位」的回归断言（守住上面那条「字被压成一条线」的坑）。

### E-4 `resistance-law` 电阻定律（R = ρ·L/S）

**修复前的问题（证据：基线截图 + 引擎 dump）**

| 维度 | 判定 | 现象 / 证据 | 根因 |
| --- | --- | --- | --- |
| 问题一·物理 | **严重 → 已修复** | 3D rig 自带一份电阻率表（Cu **1.7e-8** / Fe 1.0e-7 / 镍铬 **1.0e-6**）并**自己**按 R = ρ·L/S 算电阻，而引擎用 `RESISTIVITY`（Cu **1.68e-8** / Fe 1.0e-7 / 镍铬 **1.1e-6**）⇒ 铜档 R₀ rig 0.021646 Ω vs 引擎 **0.021390 Ω**（差 1.2%），镍铬档差 **10%**；3D 标牌与 2D 板书 / 数据抽屉里的 R 不是同一个数 | `visualization/src/components/simulation3d/rigs/resistanceLawRig.ts`（改为读引擎 `diagnostics.maxValues`：resistivity / crossSection / baseResistance / slope_R_L / slope_R_invS / rCu / rFe / rNichrome；电阻率表直接用 physics-core 的 `RESISTIVITY`，不再维护第二份副本） |
| 问题一·物理 | **严重 → 已修复** | 2D 板书内联的材料电阻率**铁档写 2.82e-8（实为铝值）**，与引擎 `RESISTIVITY.Fe = 1.0e-7` 不一致 ⇒ 铁档下画面电阻偏小约 **3.5 倍** | `visualization/src/rendering/electricCircuitScenes.ts`（旧 `drawResistanceLawScene` 整体迁出，见下） |
| 问题一·物理 | **严重 → 已修复** | 引擎 `R_invS` 曲线的 **x 是降序**（xRange = [5092958.18, 50929.58]，因为按直径升序遍历 ⇒ 1/S 递减）⇒ 违反「charts 的 x 一律升序」的全局约定，`interpSeries` 的二分查找在该曲线上失效；画出来也是一条**下降**的线，看起来像「R 随 1/S 减小」，与 R = ρ·L·(1/S) 相反 | `physics-core/src/models/resistance-law.ts`（改为按直径**降序**遍历 ⇒ 1/S 升序；引擎侧已 `npm run build:core`） |
| 问题一·物理 | **一般 → 已修复** | 2D 板书用 `as { baseResistance?: number } \| undefined` 强转读 `maxValues`，绕过类型化访问约定 | 新板书 `visualization/src/rendering/resistanceLawScenes.ts` 改为直接读 `maxValues`（类型本就是 `Record<string, number>`，取值得 `number \| undefined`，**无需任何强转**） |
| 问题二·视觉 | **严重 → 已修复** | 2D 板书只有一根导线 + 三行读数，**引擎 6 条 charts 一条都没画** —— R-L / R-1/S / 材料对比这三条正是「控制变量法探究三因素」的结论本身 | 同上：新建专属板书，画出 R-L 直线、R-1/S 直线、材料对比柱 + ρ/S/R₀/斜率 HUD + 结论信息条 |
| 问题二·视觉 | **严重 → 已修复** | 3D 实验板挤在画面左上角很小：舞台按「轨迹包围盒」自动取景，而本场景的引擎轨迹只有 **1 个静止点**（电阻定律是参数研究，没有运动物体） | `resistanceLawRig.ts`：新增 `framing` 显式取景（注视点抬到板面之上、俯角加大），实验板摆到 `STAGE_CENTER_X` |
| 问题二·视觉 | **一般 → 已修复** | 3D 板面上有一颗**毫无意义的默认大球**（引擎轨迹 = 1 个静止点，球不代表任何物理量） | 同上：`ownParticles: true`（舞台不再生成默认球 / 轨迹线），只画实验板与滑夹 |
| 问题二·视觉 | **一般 → 已修复** | 3D 标牌 `R = ${rTotal.toFixed(2)} Ω` 把 0.0214 Ω 写成「0.02 Ω」，有效数字全丢；四根电阻丝标签写死「镍铬 / 康铜」，与场景参数（铜 / 铁 / 镍铬）完全不对应 | `visualization/src/components/simulation3d/equipment/resistanceBoard.ts`：改用 `makeLabelSprite` 固定字高 + 有效数字格式化；丝线标签随场景材料生成 |
| 问题二·视觉 | **一般 → 已修复** | 滑夹位置按 `L/2` 线性映射并硬夹在 [0.05, 0.95] ⇒ **L > 1.9 m 后滑夹卡死在右端**，画面与参数脱节 | `resistanceLawRig.resistanceClipRatio`：改为**对数刻度**映射（0.01~100 m 跨 4 个数量级，每个数量级等分），L = 1 m 正落在板中央，标尺文案同步为「标尺 0 ~ 100 m (对数)」 |
| 问题三·实验作用 | **严重 → 已修复** | 整个实验的落点（R 随 L 线性、随 S 反比、随材料递增）在 2D 与 3D **都看不到**：2D 无曲线、3D 无对比，只有几个孤立的数字 | 2D：三条控制变量曲线 + 材料对比柱 + 结论条；3D：滑夹随 L 移动 + 丝线标签标明 (L,S)/(L/2,S)/(L,2S)/对比材料 + 铜/铁/镍铬三档电阻对比标牌 |

**修复后（引擎实测）**：`ρ = 1.68e-8 Ω·m`、`S = 7.854e-7 m²`、
`R₀ = 0.021390 Ω`、`k(R-L) = ρ/S = 2.139e-2 Ω/m`、`k(R-1/S) = ρ·L = 1.68e-8 Ω·m²`；
三材料 `R_Cu = 0.021390 Ω < R_Fe = 0.127324 Ω < R_Nichrome = 1.400563 Ω`；
三条曲线的 x 全部升序，且逐点满足 R = (ρ/S)·L 与 R = (ρ·L)·(1/S)（误差 < 1e-6，量化步长量级）。

**契约保障**：`physics-core/tests/unit/resistance-law.test.ts` 新增 3 条
（所有 charts 的 x 升序 / R-L 与 R-1/S 的斜率逐点自洽）；
`visualization/tests/rendering/scene-rig-physics.test.ts` 新增 **7 条**
（3D rig 读数 == 引擎 maxValues / rig 源码不再自带 ρ 表 / 标牌读数逐位等于引擎 R₀ /
2D 读数 == 引擎且三条曲线都有数据 / 板书确实把三条曲线画上画布 /
滑夹位置随 L 单调铺满板长 / 无运动物体时不画默认球且显式取景）。

