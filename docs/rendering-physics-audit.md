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
