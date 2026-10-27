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
