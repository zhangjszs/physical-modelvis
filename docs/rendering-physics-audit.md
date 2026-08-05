# 渲染层物理对账审计 (2026-08-02)

> 目的:识别"双源物理"场景——physics-core 引擎已有模型输出结果,但 Canvas 渲染层自算物理公式,
> 导致画面与引擎数值可能不一致。本清单是阶段 3(渲染单一真源)的迁移依据。

## 审计方法

1. 从 `SimulationCanvas.tsx` 提取 113 个 `sceneId -> drawFn` 路由
2. 从 `scenes/scenes/*.ts` 提取 105 个 `sceneId -> model` 映射
3. 对每个 drawFn 函数体做静态分析,按数据源分类:
   - **C-轨迹**:调用 `getFrame()` / 读 `.trajectories` — 引擎驱动,安全
   - **C-charts**:读 `simulationResult.charts` — 引擎驱动,安全
   - **A-动态自算**:使用 `currentTime` + 物理公式(`Math.sin/cos/sqrt`)— 双源风险
   - **B-静态自算**:不使用 `currentTime`(纯仪器/示意图)— 双源风险低
   - **B-数值自算**:自算数值但无时间依赖 — 双源风险中

## 分类统计

| 分类 | 数量 | 说明 |
|------|-----|------|
| C-轨迹 | 15 | 引擎驱动 |
| C-charts | 9 | 引擎驱动 |
| A-动态自算 | 27 | **高危,优先迁移** |
| B-静态自算 | 34 | 多为仪器读数场景 |
| B-数值自算 | 13 | 数值关系自算 |

## A 类:高危动态双源 (27)

> 有引擎模型,渲染层用 `currentTime` + 公式自算运动/波形。画布画面与引擎 trajectory/charts 可能漂移。

| sceneId | model | drawFn |
|---------|-------|--------|
| ac-current | ac-current | drawAcCurrentScene |
| bohr-orbit | bohr-model | drawBohrOrbitScene |
| capillary | capillary | drawCapillaryScene |
| eddy-current | eddy-current | drawEddyCurrentScene |
| em-damping | em-damping | drawEmDampingScene |
| em-induction | em-induction | drawEmInductionScene |
| em-wave-hertz | em-wave-hertz | drawEmWaveHertzScene |
| heat-direction | heat-direction | drawHeatDirectionScene |
| hologram | hologram | drawHologramScene |
| inertia | inertia | drawInertiaScene |
| joule-mechanical | joule-mechanical | drawJouleMechanicalScene |
| lc-oscillator | lc-oscillator | drawLCOscillatorScene |
| light-control-switch | light-control-switch | drawLightControlSwitchScene |
| liquid-crystal | liquid-crystal | drawLiquidCrystalScene |
| mechanical-wave | mechanical-wave | drawMechanicalWaveScene |
| moon-earth-test | moon-earth-test | drawMoonEarthTestScene |
| mutual-inductance | mutual-inductance | drawMutualInductanceScene |
| orbital | orbital | drawOrbitalScene |
| perpetuum-mobile | perpetuum-mobile | drawPerpetuumMobileScene |
| projectile-collision | projectile-collision | drawProjectileCollisionScene |
| reed-switch | reed-switch | drawReedSwitchScene |
| security-alarm | security-alarm | drawSecurityAlarmScene |
| simple-pendulum | simple-pendulum | drawSimplePendulumScene |
| sound-waveform | sound-waveform | drawSoundWaveformScene |
| transmission-belt | transmission-belt | drawTransmissionBeltScene |
| vertical-circle | vertical-circle | drawVerticalCircleScene |
| water-diffraction | water-diffraction | drawWaterDiffractionScene |

## B 类:静态/数值自算 (47)

> 静态仪器绘图(游标卡尺、多用电表等)自算合理;数值自算(电路读数、光学关系)需在迁移时核对常量。

B-静态自算 (34):bohr / center-of-gravity / force-composition / cavendish / circuit / resistance-law /
load-voltage / multimeter-tool / vernier-caliper-tool / micrometer-tool / bulb-vi /
parallel-plate-capacitor / coulomb-force-explore / electroscope / electrostatic-induction /
electrostatic-shielding / faraday-cup / efield-lines / em-spectrum / magnetic-force / ampere-force /
current-magnetic / molecular-force / oil-film / cosmic-ray / neutron-discovery / wetting /
joule-electrical / energy-transformation / double-slit(sound-interference) / single-slit / thin-film /
refraction / total-internal-reflection / black-body / electron-diffraction / micro-deformation

B-数值自算 (13):diffraction-grating / polarization-malus / interference / doppler-effect /
photoelectric / hall-effect / thermistor / photoresistor / strain-gauge / gas-law / capacitor-charge /
radioactive / decay-statistics / alpha-scattering / fission-chain / heat-transfer / diffusion /
brownian-motion / melting-curve / surface-tension / joule-electrical / liquid-mixing / perpetuum-mobile /
heat-direction / adiabatic-compression / energy-transformation / load-voltage / resistance-law / vernier-caliper-tool / micrometer-tool

## 阶段 3 迁移进展 (2026-08-02)

首轮迁移 3 个力学场景,抽查量化分歧后全部改为消费引擎结果:

| 场景 | 迁移前分歧 | 迁移方式 |
|------|-----------|---------|
| `orbital` | vFactor=1.2 时引擎椭圆率 1.57, 画面画匀速圆, 分歧 **102.6%** | 卫星位置/速度箭头读 `getFrame`, 按轨道半径比例映射到屏幕; 椭圆形状与不均匀角速度由引擎积分决定 |
| `simple-pendulum` | θ₀=60° 引擎周期 2.150s vs 小角度近似 2.007s, 偏差 **7.1%** | 摆角读 `charts.theta_t` (度), 能量条读 `charts.pe_t/ke_t`, 线性插值; 无引擎结果时回退原公式 |
| `vertical-circle` | 引擎最高点 v=0 (机械能守恒) 而渲染无速度概念 | 位置读 `getFrame` 轨迹角度, HUD 增加当前速度 v (引擎积分值) |

契约测试 `visualization/tests/accuracy/single-source-contract.test.ts`(4 用例)固化:
引擎椭圆性/周期非线性/速度非匀速的物理不变量,渲染层若回退自算公式即拦截。

## 第 2 批迁移进展 (2026-08-02)

力学剩余 + 波形类,契约测试 4 → 9 用例:

| 场景 | 迁移方式 | 备注 |
|------|---------|------|
| `transmission-belt` | **不迁移 (B 类语义)** | 引擎仅输出静态关系 charts (omega_comparison/v_surfaces/r_omega_inverse/gear_ratio), 无逐时轨迹; 转轮动画属渲染层合理示意图 |
| `projectile-collision` | 读 `diagnostics.maxValues` (OP/OM/ON/tFall/v1After/v2After/pBefore/pAfter) | 碰后速度/动量面板/HUD 不再自算解析公式; 回退保留 |
| `inertia` | 读引擎双轨迹 `getFrame(sim, t, 0/1)` (上下物体), 像素映射 `x·scale+cx, groundY−y·scale` | 回退原 shake 自算 |
| `sound-waveform` | 读 `charts.waveform_t` (x 轴 ms), 行波快照等效时移 `t_eng=(t−x/vPx) mod duration` 二分插值, `vPx=ω/k` | 与原 sin(kx−ωt) 恒等; 回退保留 |
| `mechanical-wave` | 9 tracked 质点 (x=−1..3) 间线性插值驱动 60 粒子, `engineCount=trajs.length−1` 去掉末尾 snapshot | **附带修复引擎干涉公式 bug** (见下); 回退保留 |
| `lc-oscillator` | 读 `charts.x_t/y_t/ke_t/pe_t` (μC/mA/μJ, x 轴 μs, 覆盖 2T), `interp()` 二分插值 + mod 2e6; q/i/Ee/Em 与 Q/I 曲线数组均改引擎 | 键名≠语义名 (q_t/i_t/Ee_t/Em_t), 类型强转访问; 回退保留 |

### 引擎 bug 修复:mechanical-wave 干涉方向

- 原公式 `sin(ωt + dir2·k·x + φ2)`, dir2=−1 时两列波**同向传播**, 不产生驻波 (旧单测是 ωt=12π 巧合假阳性)
- 修复为 `sin(ωt − dir2·k·x + φ2)`: dir2=−1 → ωt+kx 反向传播, 形成驻波
- 单测改为: 波节 x=(2n+1)λ/4 处振幅 < 0.02, 波腹 x=nλ/2 处振幅 > 0.15 (λ=0.4, 波节/波腹均落 tracked 质点)
- 教训: 断言抄模型行为会被"巧合"骗过 (12π·0=0), 必须从物理先推导期望值

### 契约测试新增 (4 → 9)

| 场景 | 断言 |
|------|------|
| sound-waveform | 复合音谐波成分 (峰值间距≠T); 时域波形与行波快照等效时移一致 |
| mechanical-wave | 9 tracked 质点轨迹; snapshot 起伏; 干涉驻波节点/波腹 (λ=0.4) |
| lc-oscillator | q(0)=1μC, i(0)≈0, q/i 90° 相位差, 能量守恒 Ee+Em=Q₀²/2C |

core 测试数 881 → 917 (机械波单测重构 + 断言补齐), viz 393 → 402。

## 第 3 批迁移进展 (2026-08-02)

波形类剩余,契约测试 9 → 12 用例:

| 场景 | 迁移方式 | 备注 |
|------|---------|------|
| `water-diffraction` | HUD 读 `maxValues.ratio/halfWidthAngle`; 波前动画保留 (引擎无逐时数据) | **附带修复引擎极小值边界误检** (见下); 新增引擎单测 6 例 |
| `em-wave-hertz` | HUD 读 `maxValues.frequency/wavelength/currentEmf_mV`, HUD 增加 ε 项 | **修复场景定义 bug**: buildProblem `bodies: []` 违反引擎契约 (至少一个物体), 补虚拟 antenna 物体 |
| `sound-interference` | **新建渲染函数** `drawSoundInterferenceScene` (原渲染错配: 复用了光双缝 `drawDoubleSlitScene`) | 操场俯视 2D 干涉热图 (与引擎同式采样) + 观察点数值读引擎 maxValues (λ/Δr/I_ratio) + flags 判定; 回退同式自算 |

### 引擎 bug 修复:water-diffraction 极小值边界误检

- 原极小值检测无边界排除, θ=±60° 扫描边界处 I=0.035<0.1·A0 且单调递减, 被误记为第一极小 (firstMinimaDeg=59.4°)
- 修复: 仅检测 |θ| < θ_max − Δθ 内的局部极小, firstMinimaDeg 现为 ±30° (arcsin(λ/a))
- 新增 `water-diffraction.test.ts` 6 例: 主极大/半宽/极小位置/边界排除/强弱衍射

### 契约测试新增 (9 → 12)

| 场景 | 断言 |
|------|------|
| water-diffraction | 中央主极大 = A0; 半宽 = arcsin(λ/a); I(±30°)≈0 |
| em-wave-hertz | 波长 = c/f; 电流波形峰值间距 = T (多峰值平均) |
| sound-interference | 观察点 I_ratio 与独立公式一致; scan_line 含加强/减弱交替 (≥3 次跳变) |

core 测试数 917 → 923, viz 402 → 405。

## 第 4 批迁移进展 (2026-08-02): 电磁/传感类, 契约测试 12 → 17

| 场景 | 迁移方式 | 备注 |
|------|---------|------|
| `mutual-inductance` | 读 `charts.primary_current_vs_time/secondary_emf_vs_time` (x 轴 s, 周期 T=1/f), `interpSeries` mod T; I1now/E2now/波形曲线/HUD M·E2pk 均改引擎 | 相位断言: E2 峰值处 I1≈0 (dI1/dt 最大) |
| `em-induction` | 读 `charts.x_t/y_t` (单匝 Φ mWb / ε mV, x 轴 ms, 20ms 周期); meter 读引擎 ε, HUD Φ = 引擎单匝 × N | **引擎陷阱: x_t 是单匝磁通 B·A·cos(ωt), 未乘 N; N 只体现在 ε**; 自算回退保留 |
| `eddy-current` | 读 `maxValues.eddyPower_W/skinDepth_mm`, 温升轨迹 `getFrame(sim, t, 0)`; HUD 增加 P/δ, 信息栏温度 | P 随 B² 正比 (两解对比断言) |
| `security-alarm` | 读 `maxValues.alarmFlag/reedStateFlag` (0/1), 滞回判定由引擎 (x_t 为 0~60mm 状态扫描曲线, 过渡区 y=0.5) | 渲染只消费 maxValues 标志位; 过渡区仅存在于引擎扫描曲线 |
| `reed-switch` | 读 `maxValues.currentField_mT (K/d³)/currentState`, 吸合/释放阈值判定由引擎; HpullShow/HrelShow 改引擎值 | **替代旧自算公式 200/(1+(d/10)²)**, 物理改为偶极场 K/d³ (数量级一致) |

### 契约测试新增 (12 → 17)

| 场景 | 断言 |
|------|------|
| mutual-inductance | 副线圈 E2 峰值间距 = T=20ms; E2 峰时 I1≈0 (90° 相位) |
| em-induction | Φ(t) 单匝振幅 = B·A = 5 mWb, 周期 20ms; ε 振幅 = N·B·A·ω; Φ 过零 (符号翻转) 时 \|ε\| 最大 |
| eddy-current | 功率 > 0, 温升轨迹单调不减, P ∝ B² (0.2T vs 0.4T → 4 倍) |
| security-alarm | 吸合区 d=5: alarm=0/reed=1; 断开区 d=40: alarm=1/reed=0; 过渡区 d=20: 扫描曲线 y=0.5 |
| reed-switch | H = 100/d³ (d=1→100mT, d=3→3.7mT); 吸合/断开状态随阈值; 过渡区 H 在释放~吸合之间 |

core 测试数 923, viz 405 → 410。

## 第 5 批迁移进展 (2026-08-02): 1c 覆盖抽查收尾, 契约测试 17 → 21

A 类剩余 11 场景逐一评估 (渲染自算 vs 引擎数据), 结论 4 需迁移 / 7 可保留:

| 场景 | 迁移方式 | 备注 |
|------|---------|------|
| `light-control-switch` | 24h 曲线整条读 `charts.x_t` (h/lux, 夜间 0.5/白天峰值 50100 分段模型), 当前照度/时刻点插值; R_LDR/V_B 读 `maxValues.rLdr/vB` (幂律 R=1e6·L^-0.7), 状态读 `lightOnFlag/transistorOnFlag` | **漂移最重**: 原 LDR 指数模型 1e6·e^(-7L) + 整段正弦 24h 曲线均与引擎不同; HUD 标签 V_cc → V_B (引擎 LDR 在下分压拓扑) |
| `moon-earth-test` | 柱状图/误差/HUD 全部读 `maxValues.aMoon/aFromSquareInv/gOver3600/relDiff_pct/ratioRr/r` | **最隐蔽**: 渲染完全硬编码常量 (R/r/T/g) 不读 params, 改参必漂移; 公转动画保留示意 |
| `ac-current` | 双波形曲线读 `charts.x_t (e-t, ms/V) / y_t (u2-t)`, 当前时刻指示点 + 瞬时值插值; 峰值/频率/匝比读 maxValues | 波形原为 phase 自算正弦, 现引擎序列驱动 (2 周期); 回退 drawSineChart 保留 |
| `em-damping` | τ_c 读 `maxValues.tauC_s`; 底部衰减曲线读 `charts.angular_velocity_vs_time` (s/rad·s⁻¹, ω=ω₀·e^(-t/τ)) | 原自算摆角衰减, 现引擎 ω(t) 直接消费; 摆角动画保留示意; 无铝框对比曲线引擎无数据, 保留自算 |

7 个可保留 (动画示意/公式逐字一致): liquid-crystal / heat-direction / joule-mechanical / hologram / capillary / bohr-orbit / perpetuum-mobile。
其中 liquid-crystal 透射率-温度曲线与 capillary 材料常量存在静态分歧 (分段线性 vs Tarasov; ρ_汞 13500 vs 13534、汞+石蜡 θ 140° vs 150°), 标记低优先级清理。

### 契约测试新增 (17 → 21)

| 场景 | 断言 |
|------|------|
| ac-current | 双曲线覆盖 2 周期 (40ms@50Hz); e 振幅=Em, u2 振幅=Em·0.1; 同相; maxValues.frequency/peakEmf/turnsRatio |
| em-damping | ω(t) 单调衰减 100→<1 rad/s; τ_c=J/(0.5·σ·R⁴·B²) 解析值; omega0_rad_s |
| light-control-switch | 夜晚 0.5lx: 灯亮/导通, R_LDR=1e6·0.5^-0.7, V_B>0.7V; 白天 50000lx: 灯灭; 24h 曲线夜间段 0.5、峰值>49000 |
| moon-earth-test | a_月≈0.00272 m/s²; g/3600≈9.80665/3600; aFromSquareInv≈gOver3600; relDiff<5% |

core 测试数 923, viz 410 → 414。

## 迁移建议

阶段 3 迁移顺序:
1. **力学优先**(simple-pendulum ✅ / vertical-circle ✅ / orbital ✅ / transmission-belt / projectile-collision / inertia)— 轨迹明确,直接用 `getFrame(simulationResult, currentTime)`
2. **波形类**(sound-waveform / mechanical-wave / water-diffraction / lc-oscillator / em-wave-hertz)— 用引擎 waveform_t / A_f_drive 等 charts
3. **电磁/传感**(em-induction / eddy-current / mutual-inductance / security-alarm / reed-switch)— 核对模型输出 charts 字段名后迁移
4. **B 类仪器场景**保留自算,仅核对常量与单位一致

## 注意

- `drawThinFilmScene` 同时出现在动态和静态判定中(函数体含静态绘制 + 动态标注),迁移时以实际渲染需求为准
- 部分 A 类场景的模型可能只输出静态结果(如 capillary 的液面高度),"动态"来自渲染层的示意动画——这类场景需人工判断:引擎无轨迹时,自算动画是合理设计,不必强制迁移

## 审计副产物:模型层方向 bug 修复 (2026-08-02)

覆盖审计(1c)为最后 2 个零覆盖模型补测试时,新测试抓出 1 个**真实物理 bug**:

| 模型 | bug | 修复 |
|------|-----|------|
| `uniform-magnetic-field` | 洛伦兹力方向反了:q>0, Bz>0, v=(1,0) 时物理 F=qv×B=(0,−qBz) 应向下弯(圆心 (0,−R),顺时针),原实现圆心 (0,+R)、逆时针旋转 | `perpX/Y` 取反 + 旋转角 `-sign·ωt` (`uniform-magnetic-field.ts:64-79`) |

- 该场景 `magnetic-field` 渲染层只画 ⊗ 符号网格(无粒子/轨迹/图表),画面不受影响,但引擎轨迹与 HUD 数值此前是错的
- 新增 20 个断言测试(`uniform-magnetic-field.test.ts` 10 个 + `uniform-circular-motion.test.ts` 10 个),core 测试数 861 → 881
- 教训:渲染层"自算示意图"反而掩盖了引擎层错误;补测试时断言要先推导物理而非抄模型行为

## 阶段 D:3D 场景切换稳定性 (2026-08-02)

Playwright 实测 123 场景发现 **43 个场景**报 `updateEquipment failed: Cannot read properties of undefined`
(此前交接文档预估"3 个 CRASH",实际范围更大)。根因不是 rig 实现 bug,而是**场景切换竞态**:

- `<LazyEquipmentStage key={currentScene} rig={rig} />` 中,场景切换时 `key` 先变、`rig` state 后更新
- 中间 commit 用**上一场景的 rig** 挂载新 key 的 EquipmentStage(buildEquipment 正确,handles 是旧场景的)
- 随后 `setRig(新rig)` 更新,key 未变 → 组件不重挂 → updateEquipment effect 用**新 rig + 旧 handles** → 崩
- 首次切换不崩(rig 未缓存时中间有 spinner 空窗),chunk 缓存后必现 → 表现为间歇性

修复(`ProjectileScene.tsx`):
- rig 改为**按场景 ID 缓存**(`rigCacheRef`),渲染条件加 `rigReady` 校验:挂载时 rig 必属当前场景
- 移除"旧 rig 先挂载"的中间态,错配路径被彻底关闭

回归保护:
- `tests/rendering/rigs-build.test.ts`:124 → 126(共享 rig 交叉参数 + 空/极端参数契约)
- `tests/rendering/equipment-stage.test.tsx`(新增 5 例):EquipmentStage 挂载/参数/场景切换行为,
  断言 remount 后 updateEquipment 必须消费本 rig 自己的 handles(引用相等)
- `scripts/verify-3d-smoke.cjs`(新增):14 个代表性场景 × 2 轮切换冒烟,实测通过

测试数:core 923 / viz 545 / total 1468

## 阶段 D 续:视觉与交互打磨 (D4, 2026-08-02)

1. **视角预设按钮**(EquipmentStage 新增):默认/侧视/俯视/正视四档,右上角玻璃拟态按钮组,
   相对初始注视点偏移切换相机(侧视 +x / 俯视 +y / 正视 +z),点"默认"恢复初始视角。
   浏览器实测:4 档切换零 console error,active 高亮正确。
2. **阴影调优**(primitives.ts):DirectionalLight shadow mapSize 2048 → 4096,
   PCFShadowMap + radius=3/bias=-0.0005 缓解硬边锯齿;VSMShadowMap 有 light bleeding 风险,不采用。
3. **视觉一致性审查结论**:48 个 rig 的 worldScale 全部统一 **0.16**(实测无例外),
   环境(createEnvironment 地面/网格/光照)为全局共享单实现 → 视觉规范已天然统一,无需逐 rig 改造。

## 阶段 E-1:渲染性能优化 (2026-08-02)

1. **轨迹绘制批处理**(CanvasRenderer):`drawTrajectory` 增加可选 `endIndex`;
   ≥60 点的大轨迹按 alpha/线宽分 **8 档**,每档一条 path 一次 stroke(原每段一次
   beginPath/stroke,2D/3D 同构);小轨迹(<60 点)保持逐段,视觉精细度优先。
2. **每帧零分配轨迹**(SimulationCanvas):`countPastPoints` 二分 upper_bound 求已播放点数,
   以 `endIndex` 传给 drawTrajectory —— 消除每帧 `filter+map` 两个数组分配;
   `allPositions` 按 points 引用缓存(仅新仿真结果时重建)。
3. **机械波粒子自适应**(mechanicalWaveScenes):粒子数 = 画布宽/11px(24~140),小画布不再浪费
   绘制调用;每帧仅对 9 个 tracked 质点各取一次 `getFrame`(O(9) 次二分),粒子位移用
   单调游标在线性插值(摊销 O(1)/粒子) —— 替代原每粒子 1~2 次 getFrame 二分 + 对象分配。
4. **扩散场景**(molecularKineticScenes):粒子数按区域面积自适应(700px²/粒子,cap 200);
   颜色改为 16 级预生成阶梯缓存(原每帧每粒子构造 `rgb(...)` 字符串)。
5. **布朗轨迹**(molecularKineticScenes):80 段逐段 stroke → 按 alpha/线宽分 8 档合并 stroke。
6. 验证:viz 全量 545 通过、tsc/lint/prettier 干净;E-1 冒烟
   (scripts/verify-e1-render-smoke.cjs:抛体/自由落体/机械波/扩散/布朗,含播放)零错误;
   3D 冒烟(verify-3d-smoke.cjs 14 场景 × 2 轮)零错误。

## 阶段 E-4:OCR 多题分离与结构化 (2026-08-02)

1. **后端多题化**(server/ocr-proxy.ts):Prompt 改为返回 `{"problems":[{...}]}` 数组结构,
   每题含 index(1 起递增)/type(single-choice|multiple-choice|fill-blank|essay)/
   options/answer/given/formulas;max_tokens 2000 → 3000。
2. **归一化纯函数**(server/ocr-utils.ts 新增):stripJsonFence(剥围栏)+
   normalizeRecognizeResult(兼容 `{problems:[...]}` / 单题对象 / 数组三形态,
   字段类型校验、非法项过滤、题号补齐);解析失败返回 502「未识别到有效题目」。
3. **前端多题导航**(OCRPanel):题号按钮组(active 高亮)逐题切换、题型中文标签、
   公式展示;「加载仿真」作用于当前题;场景模板映射与数值参数映射抽为
   src/components/ocr/ocrUtils.ts 纯函数(resolveScene / buildSceneParams / inferProblemTypeLabel)。
4. **入口修复**:OCRPanel 此前是孤儿组件(README 声称顶栏有入口但从未挂载),
   已挂载到 App.tsx 顶栏;后端健康检查从挂载时改为面板打开时,避免页面加载噪音。
5. **测试**:server/ocr-utils.test.ts(12 例,多题/兼容/过滤/题号)+
   tests/ocr/ocrUtils.test.ts(10 例,场景解析/参数映射/题型标签);
   冒烟 scripts/verify-ocr-mount.cjs(入口存在→打开→状态显示→关闭,零错误;
   favicon 404 与 3001 未启动噪音按预期过滤)。
6. 测试数:core 923 / viz 567 / total 1490。

## 阶段 E-5:实验导学 (2026-08-02)

1. **数据层**(src/scenes/guidance.ts):`SceneGuidance{sceneId, goal, steps[]}` 结构;
   12 个核心场景(抛体/自由落体/匀变速/斜面/碰撞/弹簧/电场/磁场/复合场/单摆/机械波/扩散/光电)手写精编步骤,
   每步含 操作/观察/paramFocus(关联参数);其余场景 `buildFallback` 按场景名与参数自动生成 4 步通用引导。
2. **约束自检**:测试强制 paramFocus 必须存在于场景 parameters(本次修正了 electric-field 无 v0、
   em-combined 为 Ex、mechanical-wave 为 waveMode、photoelectric 为 W0/nuMin 等参数名偏差)。
3. **UI**(GuidancePanel.tsx):顶栏「📖 导学」入口;面板含实验目标、进度条、步骤卡(操作/观察/参数 chips)、
   上一步/下一步/重新开始;切换场景自动回到第 1 步。
4. **关键坑**:GuidancePanel 最初 fixed 定位在 .top-bar(带 backdrop-filter)内被当作 containing block,
   "下一步"按钮被舞台视图按钮拦截 — 改用 `createPortal(..., document.body)` 渲染遮罩解决。
5. **测试与冒烟**:guidance.test.ts 8 例;verify-guidance-smoke.cjs 覆盖精编推进/回退/关闭、
   切「直流电路」回退场景(4 步 + goal 含场景名)。
6. 测试数:core 923 / viz 575 / total 1498。

## 阶段 E-6:数据导出 CSV (2026-08-02)

1. **纯函数导出**(src/utils/exportCsv.ts):
   - `trajectoriesToCsv`:多物体轨迹合并列(time + body1 x/y/vx/vy + body2 ...),行数取最长轨迹,缺帧留空;数字截断 6 位小数,非有限值转空串。
   - `chartsToCsv`:遍历 charts,仅 ChartSeries(有 points)生成块,ForceDiagram 自动跳过;块格式 `# 键 — yLabel (yUnit)` + header + 数据行;块间空行分隔。
   - `downloadCsv`:Blob 加 UTF-8 BOM(`\uFEFF`),Excel 直接打开不乱码。
2. **UI**(ExportDataButton.tsx):阶段栏「导出数据」下拉菜单,三项(轨迹 CSV / 图表 CSV / 全部 CSV);无仿真结果时按钮 disabled。
3. **挂载**:ProjectileScene stage-actions 区域。
4. **测试**:exportCsv.test.ts 13 例覆盖格式化/转义/多物体/缺帧/图表块/ForceDiagram 跳过/下载流程。
5. 测试数:core 923 / viz 588 / total 1511。
