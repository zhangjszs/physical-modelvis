# 全场景物理模型排查清单 (issue #159, Phase 0 v1)

> 生成: join-checklist.mts（engine-dump + static-scan + rig-param-mismatch + browser-shots 自动 join）。
> 三类判定: P1 模型出错 / P2 尺度比例 / P3 可视化充分性。严重度: 阻断/严重/一般。
> 行数 = 注册场景数 = 123。判定/严重度/根因列由人工核对填写；自动红旗见 .scratch/scene-audit/*.json。

| sceneId | 领域 | 场景名 | 引擎模型 | rig | worldScale | 参数命中 | 引擎轨迹/图表 | 探针状态 | 判定 | 严重度 | 根因/建议 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `projectile` | 力学 | 抛体运动 (平抛+斜抛) | projectile | ? | 0.16 | n/a | 1动/1条·7图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `uniform-accelerated` | 力学 | 竖直运动（自由落体/上抛） | uniform-accelerated | verticalMotionRig | 0.16 | 3/4 | 1动/1条·5图 | OK | 已修复 | — | F-A1 已修: CanvasRenderer.draw3DBody/drawCircularBody3D 阴影椭圆 radiusX/Y 加正下限 clamp(0.2/0.06); 回归 canvas-shadow-clamp.test.ts 3 例(先红后绿: 回退 clamp 2 例红) |
| `free-fall` | 力学 | 自由落体 | uniform-accelerated | freeFallRig | 0.16 | 1/2 | 1动/1条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `collision` | 力学 | 碰撞 | collision-elastic | ? | 0.16 | n/a | 2动/2条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `spring` | 力学 | 弹簧振子 | spring-oscillator | ? | 0.16 | n/a | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `inclined-plane` | 力学 | 斜面运动 | inclined-plane | inclineRig | 0.16 | 1/2 | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `circular-motion` | 力学 | 匀速圆周运动 (向心力) | uniform-circular-motion | circularMotionRig | 0.6 | n/a | 1动/1条·6图 | OK | 通过 | — | worldScale=0.6 有意偏差: 注释论证「1m 半径→0.6 单位」使小半径圆周可见, 球径按半径等比缩放(BALL_RADIUS_RATIO=0.12, MIN/MAX clamp), 有自定义 framing 与力/速度矢量; 复核无问题 |
| `orbital` | 力学 | 万有引力与航天 (卫星轨道) | orbital | ? | 0.16 | n/a | 1动/1条·5图 | OK | 通过 | — | #159 高中核心 24 节逐节复核: 引擎 vOrbit=7.672594 km/s / minR=6771 km / vEscape=10.850687 km/s / orbitPeriod=5544.86 s 四量自洽, 画面↔引擎逐项无偏差 → 三类均判定通过 |
| `air-track` | 力学 | 气垫导轨测速度 | uniform-linear | airTrackRig | 0.16 | 3/3 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `energy-conservation` | 力学 | 机械能守恒定律 (动能↔势能) | uniform-accelerated | fallingEnergyRig | 0.16 | 1/2 | 1动/1条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `momentum` | 力学 | 动量定理与反冲 | momentum | ? | 0.16 | n/a | 1动/1条·4图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `mechanical-wave` | 力学 | 机械波 (横波/纵波/干涉) | mechanical-wave | waveRig | 1 | 3/3 | 82动/82条·3图 | OK | P2 | 通过 | worldScale=1 有意偏差, #160 已论证(介质4m→4单位); #159 高中核心逐节复核: waveSpeed=1=f·λ、λ=0.5 m、f=2 Hz、k=ω=12.5664 自洽, 9 质点相位互异 → 三类均判定通过 |
| `simple-pendulum` | 力学 | 单摆 (简谐运动) | simple-pendulum | pendulumRig | 1 | n/a | 1动/1条·5图 | OK | P2 | 通过 | worldScale=1 (1单位=1米) 有意偏差, #160 已论证; #159 高中核心逐节复核: 引擎 periodSmall=2.007090 s 与 2π√(L/g) 逐位一致, 轨迹 ±L·sin15°=±0.2588 m → 三类均判定通过 |
| `hooke-law` | 力学 | 胡克定律 F=kx | spring-oscillator | hookeLawRig | 0.16 | 1/2 | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `sliding-friction` | 力学 | 滑动摩擦力 f=μN | sliding-friction | slidingFrictionRig | 0.16 | 4/4 | 2动/2条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `force-composition` | 力学 | 力的合成 (平行四边形定则) | force-composition | forceCompositionRig | 0.16 | 3/3 | 1动/1条·1图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `newton-second-law` | 力学 | 牛顿第二定律 F=ma | newton-second-law | newtonSecondLawRig | 0.16 | 2/2 | 1动/1条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `newton-first-law` | 力学 | 牛顿第一定律 (惯性) | uniform-linear | newtonFirstLawRig | 0.16 | 2/2 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `newton-third-law` | 力学 | 牛顿第三定律 | newton-third-law | newtonThirdLawRig | 0.16 | 4/4 | 2动/2条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `ticker-timer` | 力学 | 打点计时器测瞬时速度 | ticker-timer | tickerTimerRig | 0.16 | n/a | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `reaction-time` | 力学 | 测反应时间 | reaction-time | reactionTimeRig | 0.16 | n/a | 1动/1条·4图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `galileo-incline` | 力学 | 伽利略斜面理想实验 | galileo-incline | galileoInclineRig | 0.16 | 1/2 | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `center-of-gravity` | 力学 | 悬挂法确定重心 | center-of-gravity | centerOfGravityRig | 0.16 | 1/1 | 0动/1条·1图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `inertia` | 力学 | 惯性实验 (棋子/鸡蛋/小车) | inertia | ? | 0.16 | n/a | 2动/2条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `overweight` | 力学 | 超重与失重 (电梯台秤) | overweight | ? | 0.16 | n/a | 1动/1条·6图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `curve-velocity-direction` | 力学 | 曲线运动速度方向 | curve-velocity-direction | curveVelocityDirectionRig | 0.16 | 2/2 | 5动/5条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `curve-condition` | 力学 | 曲线运动条件 | curve-condition | curveConditionRig | 0.16 | 3/3 | 1动/1条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `motion-composition` | 力学 | 运动的合成与分解 | motion-composition | motionCompositionRig | 0.16 | 2/2 | 1动/1条·6图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `transmission-belt` | 力学 | 传动方式 (皮带/齿轮/摩擦轮/同轴) | transmission-belt | transmissionBeltRig | 0.16 | 4/4 | 2动/2条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `vertical-circle` | 力学 | 竖直圆周最高点条件 | vertical-circle | verticalCircleRig | 0.16 | 4/4 | 1动/1条·6图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `centrifugal` | 力学 | 离心现象 | centrifugal | ? | 0.16 | n/a | 1动/1条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `cavendish` | 力学 | 卡文迪什扭秤测 G | cavendish | ? | 0.16 | n/a | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `moon-earth-test` | 力学 | 月地检验 (牛顿) | moon-earth-test | orbitalRig | 0.16 | n/a | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `double-pendulum-sync` | 力学 | 双单摆步调比较 | double-pendulum | doublePendulumRig | 0.16 | 5/6 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `forced-vibration-freq` | 力学 | 受迫振动 (频率响应) | forced-vibration | vibrationRig | 0.16 | 5/7 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `resonance-curve` | 力学 | 共振曲线 (幅-频) | resonance | vibrationRig | 0.16 | 4/7 | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `sound-waveform` | 力学 | 声音波形 (纯音+复合) | sound-waveform | soundWaveformRig | 0.16 | 5/5 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `doppler-effect` | 力学 | 多普勒效应 (声源运动) | doppler | dopplerRig | 1 | 0/3 | 1动/1条·2图 | OK | 已修复 | — | F-A2 已修: 新建 dopplerRig(移动波源+同心波前+双观察者), 前/后 f′ 读 charts.fprime_vs_theta(548.39/459.46), 信息牌读 maxValues(v=340/λ=0.68)+「读数源自引擎」; 旧 waveRig 的 v=1.00m/s 已消除; scene-rig-physics 增 4 例 |
| `water-diffraction` | 力学 | 水波衍射 (遇障碍物) | water-diffraction | waveOpticsRig | 0.16 | 2/8 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `sound-interference` | 力学 | 声波干涉 (双喇叭) | sound-interference | soundInterferenceRig | 1 | 0/8 | 1动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 soundInterferenceRig：双喇叭+同心波前+引擎 scan_line 强度剖面；观察点 I/I₀=0.482/λ=0.68/f=500 读 maxValues；替代误用 waveOpticsRig(光干涉)；scene-rig-physics 增 2 例 |
| `projectile-collision` | 力学 | 平抛碰撞 (验证动量守恒) | projectile-collision | collisionRig | 0.16 | 2/4 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `newton-tube` | 力学 | 牛顿管 (真空 vs 空气) | uniform-accelerated | newtonTubeRig | 0.16 | 3/3 | 1动/1条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `work-energy` | 力学 | 动能定理 W = ΔEk | uniform-accelerated | workEnergyRig | 0.16 | 3/3 | 1动/1条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `ball-xt` | 力学 | 小球 x-t 图像 (简谐运动) | simple-pendulum | ballXtRig | 0.16 | 4/4 | 1动/1条·5图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `electric-field` | 电磁学 | 匀强电场 | uniform-electric-field | electricFieldRig | 1 | 0/3 | 1动/1条·4图 | OK | 已修复 | — | #159 高中核心逐节复核(阻断级): 旧默认 q=1.6e-19 C/m=1.67e-27 kg/Ey=100 N/C → a=9.58e9 m/s²、v=64 倍光速; 3D 标牌读不存在的 params.U/v0 (回退 100 V / 20 m/s); 极板极性与 E 方向相反; 比例写死 0.16。已改为宏观量级 (q=2e-8 C, m=2e-7 kg, Ey=10 N/C → a=1 m/s², x=6 m, y=1.125 m), 比例由引擎轨迹推导, 专属 2D 板书 + 引擎驱动 3D rig, 新增 6 条契约断言 |
| `magnetic-field` | 电磁学 | 匀强磁场 | uniform-magnetic-field | magneticFieldRig | 1 | 1/4 | 1动/1条·3图 | OK | 已修复 | — | #159 高中核心逐节复核(阻断级): 旧默认 R=1.04 mm、10 ms 绕 15248 圈, 只剩静止大球; 2D/3D 画 ⊗(入纸面) 而引擎 B 恒为 +z(⊙ 出纸面); 标牌读不存在的 params.v/v0 (回退 1e6 m/s, 错 1000 倍); 半透明磁腔写深度遮掉腔内轨迹。已改为 q=2e-6 C, m=2e-8 kg, B=0.5 T, v0=25 m/s → R=0.5 m, T=0.1257 s; ⊙ 出纸面; 轨道比例由引擎回旋半径推导; 新增 6 条契约断言 |
| `em-combined` | 电磁学 | 电磁复合场 | em-combined-field | emCombinedRig | 1 | 3/5 | 1动/1条·4图 | OK | 已修复 | — | #159 高中核心逐节复核(阻断级): 旧默认 v选择=E/B=1000 m/s 恰等于 v₀ → 粒子走平衡点直线, 复合场核心现象缺席; q/m 下 Boris 单步转角 4.79 rad ≫ π/4; 2D 板书 E 箭头画反(向下 vs 引擎向上); 3D 翻转 y 轴 + 画 ⊗ 而引擎 B 恒 +z(⊙); 比例写死 0.32; 标牌字高被压成 2~3 px 一条线; 白色背板把标牌右半边洗白。已改为宏观量级 (q=2e-6 C, m=2e-8 kg, B=0.5 T, Ey=22 N/C, v₀=20 m/s → v选择=44 m/s ≠ v₀, 走摆线, 摆幅 0.96 m, 单步转角 0.0025 rad), 比例由引擎轨迹推导, 2D/3D 同手性且同为 ⊙, 新增 makeLabelSprite 锁定字高, 新增 8 条契约断言 |
| `circuit` | 电磁学 | 直流电路分析 (串并联) | circuit | ? | 0.16 | n/a | 0动/1条·3图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `magnetic-force` | 电磁学 | 安培力与洛伦兹力 | magnetic-force | ampereForceRig | 0.16 | 4/8 | 1动/1条·1图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `em-induction` | 电磁学 | 电磁感应 (法拉第定律) | em-induction | emInductionRig | 1 | 0/8 | 0动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 emInductionRig（线圈+往复磁铁），ε(t)/Φ(t) 读 charts x_t/y_t 按引擎周期插值，ε_peak=157.1V/Φ单匝=5mWb 读 maxValues；不再显安培力装置；scene-rig-physics 增 3 例 |
| `ac-current` | 电磁学 | 交变电流与变压器 (选必二§3) | ac-current | acCurrentRig | 1 | 0/7 | 0动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 acCurrentRig（Eₘ=311V/匝比10:1/U₂峰值=31.10V 读 maxValues；e/u₂ 读 charts x_t/y_t；旋转线圈+铁芯装置）；scene-rig-physics 增 2 例 |
| `lc-oscillator` | 电磁学 | LC 电磁振荡 | lc-oscillator | lcOscillatorRig | 0.16 | 1/4 | 0动/1条·4图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `current-balance` | 电磁学 | 电流天平 (安培力测量) | current-balance | ampereForceRig | 0.16 | 1/8 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `eddy-current` | 电磁学 | 涡流现象 (阻尼摆动) | eddy-current | eddyCurrentRig | 1 | 0/8 | 1动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 eddyCurrentRig（P=95.4mW/δ=9.35mm 读 maxValues；板温读轨迹；金属板+磁极+4 涡流环）；scene-rig-physics 增 2 例 |
| `em-damping` | 电磁学 | 电磁阻尼/驱动 | em-damping | emDampingRig | 1 | 0/8 | 1动/1条·1图 | OK | 已修复 | — | F-A3 已修: 新建 emDampingRig（ω(t) 读 charts.angular_velocity_vs_time；τ_c=0.04ms/ω₀=100 读 maxValues；摆臂+铜盘+磁极）；scene-rig-physics 增 2 例 |
| `mutual-inductance` | 电磁学 | 互感现象 (双线圈) | mutual-inductance | mutualInductanceRig | 1 | 0/8 | 1动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 mutualInductanceRig（I₁/E₂ 读 charts primary_current_vs_time/secondary_emf_vs_time；M=42.4mH/E₂幅值=13.33V 读 maxValues；双线圈）；scene-rig-physics 增 2 例 |
| `self-inductance` | 电磁学 | 自感现象 (断电自感) | self-inductance | selfInductanceRig | 1 | 0/8 | 1动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 selfInductanceRig（断电衰减 I(t)/ε_L(t) 读 charts current_vs_time/voltage_vs_time；τ=0.05s/I₀=1.2A 读 maxValues；线圈+电源/电阻）；scene-rig-physics 增 2 例 |
| `em-wave-communication` | 电磁学 | 电磁波发射接收 | em-wave-communication | emWaveRig | 0.16 | 0/2 | 1动/1条·4图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `em-spectrum` | 电磁学 | 电磁波谱 (频段分布) | em-spectrum | emSpectrumRig | 1 | 0/2 | 1动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 emSpectrumRig：6 段对数频率谱带+引擎 spectrum_curve+高亮频段；范围 10~1e16Hz/λ≈533nm/E≈2.32eV 读 maxValues；替代误用 emWaveRig(赫兹波)；scene-rig-physics 增 2 例 |
| `hall-effect` | 电磁学 | 霍尔元件 (VH-IS) | hall-effect | fieldRig | 0.16 | 1/6 | 1动/2条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `reed-switch` | 电磁学 | 干簧管 (磁控开关) | reed-switch | reedSwitchRig | 0.16 | 1/1 | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `photoresistor` | 电磁学 | 光敏电阻 (R-L特性) | photoresistor | ? | 0.16 | n/a | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `thermistor` | 电磁学 | 热敏电阻 (R-T特性) | thermistor | ? | 0.16 | n/a | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `strain-gauge` | 电磁学 | 电阻应变片 (惠斯通电桥) | strain-gauge | strainGaugeRig | 0.16 | 2/2 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `security-alarm` | 电磁学 | 门窗防盗报警 (磁控) | security-alarm | circuitRig | 0.16 | 0/7 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `light-control-switch` | 电磁学 | 光控开关 (光敏+继电器) | light-control-switch | circuitRig | 0.16 | 0/7 | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `capacitor-charge` | 电磁学 | 电容充放电 (RC 暂态电路) | capacitor-charge | capacitorRig | 0.16 | 1/9 | 0动/1条·6图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `parallel-plate-capacitor` | 电磁学 | 平行板电容器因素 (C=εr·S/4πkd) | parallel-plate-capacitor | capacitorRig | 0.16 | 2/9 | 0动/1条·6图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `load-voltage` | 电磁学 | 路端电压与负载 (U=E−Ir) | load-voltage | circuitRig | 0.16 | 1/7 | 0动/1条·6图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `resistance-law` | 电磁学 | 电阻定律 (R=ρ·L/S) | resistance-law | resistanceLawRig | 0.16 | 3/3 | 0动/1条·6图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `coulomb-force-explore` | 电磁学 | 探究电荷间作用力 (库仑定律) | coulomb-force-explore | coulombRig | 1 | 0/5 | 1动/1条·3图 | OK | 已修复 | — | F-A3 已修: 新建 coulombRig（两点同号电荷 + 斥力箭头 + 间距标尺），F 读 maxValues.F0_N=3.595 N + k 相对误差；不再显验电器；scene-rig-physics 增 2 例 |
| `electroscope` | 电磁学 | 验电器 (箔片张角 vs 电量) | electroscope | ? | 0.16 | n/a | 1动/1条·1图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `electrostatic-induction` | 电磁学 | 静电感应 (近/远端感应电荷) | electrostatic-induction | electroscopeRig | 0.16 | 1/5 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `electrostatic-shielding` | 电磁学 | 静电屏蔽 (接地 vs 不接地) | electrostatic-shielding | electroscopeRig | 0.16 | 0/5 | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `faraday-cup` | 电磁学 | 法拉第圆筒 (内表面电荷=0) | faraday-cup | faradayCupRig | 0.16 | 3/3 | 0动/1条·1图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `ampere-force` | 电磁学 | 安培力因素 (F=BIL·sinθ) | ampere-force | ampereForceRig | 0.16 | 4/8 | 0动/1条·3图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `em-wave-hertz` | 电磁学 | 赫兹电磁波实验 (LC振荡+驻波) | em-wave-hertz | emWaveRig | 0.16 | 1/2 | 0动/1条·4图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `multimeter-tool` | 电磁学 | 多用电表 (选档读数) | multimeter | measurementToolRig | 0.16 | n/a | 0动/1条·3图 | OK | 已修复 | — | P3 已修 (#164): 补 framing(器械居中+拉近 distance<4) + ownParticles(stage 不再画占位轨迹球遮挡器械); 证据 docs/screenshots/issue-164-*-3d.png |
| `vernier-caliper-tool` | 电磁学 | 游标卡尺读数 | vernier-caliper | measurementToolRig | 0.16 | n/a | 0动/1条·3图 | OK | 已修复 | — | P3 已修 (#164): 补 framing(器械居中+拉近 distance<4) + ownParticles(stage 不再画占位轨迹球遮挡器械); 证据 docs/screenshots/issue-164-*-3d.png |
| `micrometer-tool` | 电磁学 | 螺旋测微器读数 | micrometer | measurementToolRig | 0.16 | n/a | 0动/1条·3图 | OK | 已修复 | — | P3 已修 (#164): 补 framing(器械居中+拉近 distance<4) + ownParticles(stage 不再画占位轨迹球遮挡器械); 证据 docs/screenshots/issue-164-*-3d.png |
| `current-magnetic` | 电磁学 | 电流的磁场 | current-magnetic-field | fieldRig | 0.16 | 1/6 | 0动/0条·0图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `efield-lines` | 电磁学 | 电场线分布 | electric-field-lines | efieldLinesRig | 1 | 0/6 | 0动/0条·0图 | OK | 已修复 | — | F-A3 已修: 新建 efieldLinesRig，场线几何直接读 extra.fieldLines(点电荷/偶极/极板)、maxField 读 maxValues；不再显匀强场+霍尔；scene-rig-physics 增 2 例 |
| `bulb-vi` | 电磁学 | 小灯泡伏安特性 | circuit | circuitRig | 0.16 | 2/7 | 0动/1条·3图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `refraction` | 光学 | 光的折射定律 (Snell) | refraction | ? | 0.16 | n/a | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `interference` | 光学 | 双缝干涉 (杨氏实验) | interference | ? | 0.16 | n/a | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `thin-film` | 光学 | 薄膜干涉 (等厚) | thin-film | waveOpticsRig | 0.16 | 1/8 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `single-slit` | 光学 | 单缝衍射 (光强分布) | single-slit | waveOpticsRig | 0.16 | 2/8 | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `diffraction-grating` | 光学 | 光栅衍射 (光栅方程) | diffraction-grating | waveOpticsRig | 0.16 | 2/8 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `polarization-malus` | 光学 | 偏振光 (马吕斯定律) | polarization | polarizationRig | 1 | 0/4 | 1动/1条·3图 | OK | 已修复 | — | F-A3 已修: 新建 polarizationRig：偏振片堆+光束+引擎 malus_curve；Ifinal=0.5/透射率=0.5 读 maxValues；替代误用 opticsRig(折射)；scene-rig-physics 增 2 例 |
| `hologram` | 光学 | 全息照相 (干涉记录) | hologram | ? | 0.16 | n/a | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `total-internal-reflection` | 光学 | 全反射与光导 | refraction | opticsRig | 0.16 | 3/4 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `gas-law` | 热学 | 理想气体状态方程 | gas-law | gasLawRig | 0.16 | 5/5 | 1动/1条·1图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `diffusion` | 热学 | 扩散现象 (浓度梯度) | diffusion | ? | 0.16 | n/a | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `brownian-motion` | 热学 | 布朗运动 (微粒抖动) | brownian-motion | brownianMotionRig | 0.16 | 4/4 | 10动/10条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `oil-film` | 热学 | 油膜法测分子直径 | oil-film | oilFilmRig | 0.16 | 3/3 | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `liquid-mixing` | 热学 | 液体混合 (扩散) | liquid-mixing | liquidMixingRig | 0.16 | 2/2 | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `molecular-force` | 热学 | 分子力曲线 (F-r) | molecular-force | molecularForceRig | 0.16 | 2/2 | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `melting-curve` | 热学 | 熔化/凝固曲线 (T-t) | melting-curve | meltingCurveRig | 0.16 | 3/3 | 0动/1条·3图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `surface-tension` | 热学 | 表面张力 (膜收缩) | surface-tension | surfaceTensionRig | 0.16 | 3/3 | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `capillary` | 热学 | 毛细现象 (液面升降) | capillary | ? | 0.16 | n/a | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `wetting` | 热学 | 润湿/不润湿 (接触角) | wetting | ? | 0.16 | n/a | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `liquid-crystal` | 热学 | 液晶 (光学各向异性) | liquid-crystal | liquidCrystalRig | 0.16 | 3/3 | 0动/1条·3图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `joule-mechanical` | 热学 | 探究做功与内能关系 (机械功) | joule-mechanical | jouleMechanicalRig | 0.16 | 5/5 | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `joule-electrical` | 热学 | 探究做功与内能关系 (电功) | joule-electrical | jouleElectricalRig | 0.16 | 4/4 | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `adiabatic-compression` | 热学 | 绝热压缩 (气体点火) | adiabatic-compression | adiabaticCompressionRig | 0.16 | 2/2 | 1动/1条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `heat-transfer` | 热学 | 热传递 (三种模式对比) | heat-transfer | heatTransferRig | 0.16 | 4/4 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `energy-transformation` | 热学 | 能量转化 (能量守恒) | energy-transformation | energyTransformationRig | 0.16 | 3/3 | 1动/1条·4图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `perpetuum-mobile` | 热学 | 永动机不可能 (热二律) | perpetuum-mobile | perpetuumMobileRig | 0.16 | 3/3 | 0动/1条·3图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `heat-direction` | 热学 | 热力学方向性 (热二定律) | heat-direction | heatDirectionRig | 0.16 | 3/3 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `photoelectric` | 近代物理 | 光电效应 (爱因斯坦方程) | photoelectric | ? | 0.16 | n/a | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `bohr` | 近代物理 | 玻尔氢原子模型 (能级与光谱) | bohr-model | ? | 0.16 | n/a | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `radioactive` | 近代物理 | 放射性衰变 (云室径迹) | radioactive-decay | radioactiveRig | 1 | n/a | 20动/20条·2图 | OK | 已修复 | — | F-A3 已修: 新建 radioactiveRig：样品+云室径迹+引擎 x_t 衰减曲线；N(0)=1000/T½=10s 读 maxValues；替代误用 nuclearRig(α 散射)；scene-rig-physics 增 2 例 |
| `micro-deformation` | 近代物理 | 光杠杆放大微小形变 | micro-deformation | microDeformationRig | 0.16 | 3/3 | 2动/3条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `alpha-scattering` | 近代物理 | α 粒子散射实验 | alpha-scattering | nuclearRig | 0.16 | n/a | 5动/5条·3图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `black-body` | 近代物理 | 黑体辐射 | black-body | blackBodyRig | 0.16 | 1/1 | 1动/1条·1图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `electron-diffraction` | 近代物理 | 电子衍射 | electron-diffraction | electronDiffractionRig | 0.16 | 1/1 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `radiation-deflection` | 近代物理 | 放射线磁场偏转 | radiation-deflection | radiationDeflectionRig | 0.16 | 3/3 | 1动/1条·1图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `decay-statistics` | 近代物理 | 衰变统计规律 | decay-statistics | decayStatisticsRig | 1 | n/a | 1动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 decayStatisticsRig：引擎 x_t/y_t 直方图柱；λ=50/σ=7.07/maxBin=74 读 maxValues；替代误用 nuclearRig；scene-rig-physics 增 2 例 |
| `cosmic-ray` | 近代物理 | 宇宙射线 | cosmic-ray | cosmicRayRig | 0.16 | 2/2 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `neutron-discovery` | 近代物理 | 中子发现 (查德威克实验) | neutron-discovery | neutronDiscoveryRig | 0.16 | 2/2 | 1动/1条·2图 | OK | 通过(基线) |  | 探针 OK + 引擎求解 OK + 单源契约/coverage 守卫绿; 待批次内逐景复核 |
| `fission-chain` | 近代物理 | 核裂变链式反应 | fission-chain | fissionChainRig | 1 | n/a | 1动/1条·2图 | OK | 已修复 | — | F-A3 已修: 新建 fissionChainRig：逐代中子柱读 charts.x_t/y_t；k=1/genMax=10/totalFissions=11 读 maxValues；替代误用 nuclearRig；scene-rig-physics 增 2 例 |
| `bohr-orbit` | 近代物理 | 玻尔氢原子模型 (轨道能级) | bohr-model | quantumRig | 0.16 | n/a | 0动/1条·2图 | OK | 通过 | — | 通过(示意): 3D 为器械示意几何, 定量曲线与读数在 2D 板书+数据抽屉; 全量复扫 123 景 0 crash/error/空白、QA sweep 抽屉 123/123 无错、交互 0 不随动 |
| `geiger-counter` | 近代物理 | 盖革计数器 | radioactive-decay | geigerCounterRig | 1 | n/a | 20动/20条·2图 | OK | 已修复 | — | F-A3 已修: 新建 geigerCounterRig：GM 计数管+脉冲；计数率读 charts.y_t、剩余核数读 x_t；替代误用 nuclearRig；scene-rig-physics 增 2 例 |

---

## 排查方法与证据链（Phase 0）

1. **引擎侧** `.scratch/scene-audit/engine-dump.mts`：全 123 景 `loadAllScenes → buildProblem(defaultParams) → runSceneSimulation(solveProblem)`，dump 参数表/problem/trajectories 值域/charts 键与值域/maxValues/extra/warnings → `engine-dump.json`。123/123 求解成功，0 失败。
2. **浏览器侧** `.scratch/scene-audit/browser-shots.cjs`：生产 preview(:4173) headless 遍历，每景 3D t=0 / 2D 板书 / 播放中段三截图 + webgl2 判定 + console/pageerror/error-banner + 近空白启发式；逐景 30s 硬超时+reload 恢复；**点击后校验 H2 标题==目标**（修复了首版 force-click 错位伪影）。结果 `browser-shots.json` + `shots/`。123 景：122 确认 3D、0 crash/error/banner/空白、1 SLOW(electric-field)。
3. **静态红旗** `.scratch/scene-audit/static-scan.mts`：运行时读 rig 对象 worldScale/framing/ownParticles + join 轨迹尺度 → R-SCALE-ODD(5)/R-STATIC(33)/R-TINY/R-HUGE(抽象坐标假阳性, 逐景过滤)。
4. **共享 rig 错配** `.scratch/scene-audit/rig-param-mismatch.cjs`：rig 读取的 params 键 vs 场景实际参数名；并核查 rig 是否读 result（maxValues/charts/meta.model）→ 定位"零命中+不读引擎"的语义错配。
5. **QA sweep** `scripts/verify-qa-sweep.cjs`（:4173）：NaN/裁切/空白/error-banner/交互随动/切换耗时（后台跑, 结果 qa-sweep.json）。
6. 基线复用：`docs/rendering-physics-audit.md`（M3 单源收口/60 景单位核对/3D R1–R8 豁免）不重查；`single-source-contract/coverage`、`scene-rig-physics`、`rigs-build` 守卫当前绿。

## 确认发现详述

### F-A1 [P3/严重] 2D 阴影椭圆负半径抛错，中断整帧 2D 绘制（跨场景共享）
- 现象：2D 模式播放时 pageerror `ellipse ... minor-axis radius (-0.184) is negative`，该帧后续绘制被跳过 → 2D 画面不完整。
- 根因：`visualization/src/rendering/CanvasRenderer.ts:865-870` `draw3DBody`：`shadowScaleY = 0.35 + Math.min(heightDiff/(r*8), 0.2)`，物体 screen-y 低于地面投影线（heightDiff 足够负）时为负。
- 影响：uniform-accelerated（实测触发）；共享路径，任何物体低于地面线的场景都可能触发。
- 修复：shadowScaleX/Y 加正下限 clamp 或 heightDiff<0 不画投影；补"物体低于地面线不抛错"回归。
- 证据：首轮探针 pageerror + shots/002-*/。

### F-A2 [P1/阻断] doppler-effect 3D=waveRig 错配（错误数值读数）
- 3D 显示机械波空台架：`v = λf = 1.00 m/s`（声速应 340）、`λ = 0.50 m` 恒定、`追踪质点 0 个`、无移动波源/波前/观察者；改 doppler 参数 3D 不变。
- 2D 正确（读 fprime_vs_theta，前/后 f′=548.39）。2D/3D 严重不一致；3D 为默认视图。
- 根因：`rigs/bundles/opticsBundle.ts:17` `'doppler-effect': waveRig` + waveRig 无 doppler 分支、不读引擎。
- 修复：新建多普勒专用 rig（移动波源+同心波前+前后观察者 f′ 读 maxValues.fObserved/fprime_vs_theta）。
- 证据：shots/045(首轮错位跑恰为 doppler) 3d-t0 vs 2d.png 对照 + engine-dump(doppler extraKeys=[])。

### F-A3 [P1/系统性·严重] 共享 rig 语义错配（16 景，见基表 P1 行）
- 模式：rig 被多现象共用且不读 result，仅 params 防御式取数+硬编码本现象标题/公式；共用场景参数零命中 → 3D 显"另一现象装置+错误标题/公式+冻结默认读数"。
- 组：ampereForceRig{em-induction,eddy-current,em-damping,mutual-inductance,self-inductance}；nuclearRig{radioactive,geiger-counter,decay-statistics,fission-chain}；electroscopeRig{coulomb-force-explore}；circuitRig{ac-current}；waveOpticsRig{sound-interference}；emWaveRig{em-spectrum}；fieldRig{efield-lines}；opticsRig{polarization-malus}；waveRig{doppler-effect=F-A2}。
- 与 audit R4「裸几何合理」豁免不同：此处是"另一具体现象的装置+错误公式标题"，属误导。
- 修复方向：按现象拆专用 rig，或 rig 读 result.meta.model 分支+读引擎 maxValues/charts 出读数。

### F-A4 [已排除·探针伪影] 个别场景 2D 截图慢
- 探针 SLOW(electric-field 2D) 系 headless swiftshader 下对**持续动画的密集场线 2D 画布**做元素截图所致；
  QA sweep 客观计时「点击→场景激活+首帧」最长 1348ms（预算 25000ms）、堆增量 3.8MB、WARN 0 → **非产品性能缺陷**，不立项。
- QA sweep 另确认：123 景 NaN/裁切/空白/error-banner 0、抽屉 123/123 无 ErrorBoundary 粘滞、交互抽样 12 景「参数→读数/时间轴→读数」0 不随动 → 2D 侧无额外 P1。

### P2 尺度偏差（4 景，均有意/待复核）
- simple-pendulum=1、mechanical-wave=1、em-combined=0.32：#160 已论证，通过。
- circular-motion=0.6：HEAD 9920bea 重写、有注释论证，待复核取景/球径比例。

## 分批修复计划（Phase 1，清单确认后执行）

| 批次 | 范围（sceneId） | 依赖 | Issue |
|---|---|---|---|
| B1 力学 | uniform-accelerated(F-A1) + circular-motion(P2 复核) + 力学 R-STATIC 判定 | P0 | #160 |
| B2 电磁 | F-A3 电磁组：em-induction/eddy-current/em-damping/mutual-inductance/self-inductance/ac-current/efield-lines/coulomb-force-explore + doppler-effect(F-A2, 光学域但同 rig 族) | P0 | #161 |
| B3 光学+热学 | sound-interference/polarization-malus + 光学/热学 R-STATIC 判定 | P0 | #162 |
| B4 近代 | nuclearRig 组 radioactive/geiger-counter/decay-statistics/fission-chain + em-spectrum + 近代 R-STATIC 判定 | P0 | #163 |
| B5 P3 专项 | F-A1 clamp 收口 + F-A4 性能 + 跨域 R-STATIC 可视化补强 + 取景/裁切复核 | B1–B4 | #164 |

每批验收：precheck 全绿；契约测试先红后绿（scene-rig-physics / single-source-contract 补断言）；修复前后浏览器截图对照入 docs/screenshots/；清单对应行状态+commit hash 更新；count:sync。

---

## Phase 1 收口 (2026-10-27)

**P1 = 16/16 已修复**（逐景专用 rig，均读引擎 charts/maxValues/extra）：
- B2 阻断/电磁族：doppler-effect、em-induction、self-inductance、mutual-inductance、eddy-current、em-damping、ac-current、efield-lines、coulomb-force-explore
- B3 光学：sound-interference、polarization-malus
- B4 近代：em-spectrum、radioactive、geiger-counter、decay-statistics、fission-chain

**P3**：F-A1 2D 阴影椭圆负半径 clamp（跨场景共享，先红后绿 3 例）；测量工具 3 景补 framing + ownParticles（器械居中放大、去除占位球遮挡）；16 个新 rig 长信息牌 scale.x 修正（原 3.x 经 makeTextSprite ×(canvasWidth/384) 放大到 15+ 单位导致左右裁切）。其余 27 个示意/装饰 3D 场景经复核判定通过（定量在 2D 板书+数据抽屉）。

**P2**：simple-pendulum/mechanical-wave=1、em-combined=0.32（#160 已论证）；circular-motion=0.6（复核通过）。

**回归证据**：全量 headless 复扫 123 景 → 122 确认 3D / 0 crash·error·banner·空白 / 1 已知截图伪影(electric-field)；QA sweep 123 景 0 ERROR/0 WARN、抽屉 123/123 无粘滞、交互抽样 0 不随动、切换耗时 ≤1348ms；scene-rig-physics 增至 52 例（真实场景→引擎→rig 读数/结构）。

**提交**：`26f0b95`(F-A1+doppler) / `04d1e7b`(efield-lines+coulomb) / `b3efb1c`(em-induction) / `7bd4df2`(剩余 12 景) / B5(测量工具取景)，每批 precheck 全绿。
