# 渲染层物理对账审计 (2026-08-02)

> 目的:识别"双源物理"场景——physics-core 引擎已有模型输出结果,但 Canvas 渲染层自算物理公式,
> 导致画面与引擎数值可能不一致。本清单是阶段 3(渲染单一真源)的迁移依据。

> **⚠️ 关于本文件中的测试数**:下文各阶段条目里出现的"测试数:core NNN / viz NNN / total NNN"
> 是**该阶段完成当时的历史快照**,用于记录里程碑,不代表当前值,也不应被引用为现状。
> 当前测试数的**单一真源**是 `README.md` 顶部测试数行(带 `<!-- test-count -->` 标记),
> 由 `npm run count` 实跑、`npm run count:check` 在 precheck/CI 中拦截漂移。
> 本文的**迁移进展表**随渲染改动同步更新;计数快照保持历史原样,以免篡改里程碑记录。

## 物理常量口径

引擎计算一律引用 `physics-core/src/units/constants.ts` 的 `PHYSICS_CONSTANTS`,
**不在模型内联字面量**。约定如下：

- **重力加速度**取 `PHYSICS_CONSTANTS.g.value = 9.8`（教材口径），
  `g_precise = 9.80665` 供高精度场合显式选用；`applicableRange`/讲解文案中的
  "g=9.8" 属展示文本，可直接书写。
- **库仑常数 k / 真空磁导率 μ₀ / 摩尔气体常量 R / 基本电荷 e / 光速 c**
  同理走 constants；`R` 已在 #13 中补入常量表。
- `ParameterSpec.defaultValue` 虽是 UI 元数据，但同样收敛到 constants
  （`defaultValue: PHYSICS_CONSTANTS.g.value`），使口径**无例外**，不必记忆特例。
- 该约定由 `physics-core/tests/unit/constants-single-source.test.ts` 固化：
  剥离注释与字符串后扫描 `src/models/*.ts`，出现物理常量字面量即失败。

---

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
| B-静态自算 | 36 | 多为仪器读数场景（#55 校正 34→37；#59 移除幻影 double-slit→36）|
| B-数值自算 | 30 | 数值关系自算（#55 校正：原表头 13，实测条目 30）|

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

## B 类:静态/数值自算 (60 · 去重后：静态 36 + 数值 30 − 6 重复)

> 静态仪器绘图(游标卡尺、多用电表等)自算合理;数值自算(电路读数、光学关系)需在迁移时核对常量。

B-静态自算 (36):bohr / center-of-gravity / force-composition / cavendish / circuit / resistance-law /
load-voltage / multimeter-tool / vernier-caliper-tool / micrometer-tool / bulb-vi /
parallel-plate-capacitor / coulomb-force-explore / electroscope / electrostatic-induction /
electrostatic-shielding / faraday-cup / efield-lines / em-spectrum / magnetic-force / ampere-force /
current-magnetic / molecular-force / oil-film / cosmic-ray / neutron-discovery / wetting /
joule-electrical / energy-transformation / single-slit / thin-film /
refraction / total-internal-reflection / black-body / electron-diffraction / micro-deformation

B-数值自算 (30):diffraction-grating / polarization-malus / interference / doppler-effect /
photoelectric / hall-effect / thermistor / photoresistor / strain-gauge / gas-law / capacitor-charge /
radioactive / decay-statistics / alpha-scattering / fission-chain / heat-transfer / diffusion /
brownian-motion / melting-curve / surface-tension / joule-electrical / liquid-mixing / perpetuum-mobile /
heat-direction / adiabatic-compression / energy-transformation / load-voltage / resistance-law / vernier-caliper-tool / micrometer-tool

> **去重与别名说明（#55）**：
> - 上述 6 个场景同时出现在 B-静态与 B-数值两类（既有静态仪器示意、又含数值自算关系）：`resistance-law` / `load-voltage` / `vernier-caliper-tool` / `micrometer-tool` / `joule-electrical` / `energy-transformation`。故 B 类唯一场景数 = 36 + 30 − 6 = **60**（#55 校正原表头 34+13=47 系误计；#59 进一步移除幻影 `double-slit` 使 B-静态 37→36、并集 61→60）。
> - 原 `double-slit(sound-interference)` 为误合并：`sound-interference` 已在第 3 批迁引擎（新建 `drawSoundInterferenceScene`、读引擎 `charts`），属**已迁移**场景，不在 B 类。**#59 进一步核实**：拆分后保留的 `double-slit` 本身仍**非注册 sceneId**（真实“双缝干涉”场景为 `interference`，已列于 B-数值），故已从 B-静态清单移除。

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

## 第 6 批迁移进展 (2026-08-11): 低优先级清理收尾, 契约测试 21 → 23

audit 第 5 批标记的 2 个"可保留但存在静态分歧"场景完成对齐:

| 场景 | 迁移方式 | 备注 |
|------|---------|------|
| `liquid-crystal` | 透射率-温度曲线改读引擎 `charts.x_t` (Tarasov Δn(T)/Δn(0)=(1−T/Tc)^0.22, 取扫描区间点并外扩一点; 窄区间单点不退化); Tc/Vth 读 `maxValues.clearingPointDegC/thresholdVoltageV`; HUD 增 T% (maxValues.transmittancePct) | 原渲染分段线性 (±3°C 台阶 0.85→0.15) 与引擎 Tarasov 曲线分歧; 回退保留原分段线性。**附带引擎校准**: transmittance 系数 0.25 → 2.5 (Δn∈[0,0.2] → 相位 [0,π/2], 峰值 100%), 原系数下透射率峰值仅 2.45% 全程贴地, 教学不可见 |
| `capillary` | 常量对齐引擎: ρ_汞 13500 → 13534 kg/m³; 汞+石蜡 θ 140° → 150° (补 isMercury+isParaffin 分支, 原仅水+石蜡有 105° 分支) | 引擎 `capillary.ts:57-65` 为 13534 / (玻璃 140°, 石蜡 150°); Jurin 公式不变 |

### 契约测试新增 (21 → 23)

| 场景 | 断言 |
|------|------|
| liquid-crystal | x_t 曲线采样点 (0/15/30/35/40/50/90℃) 与 Tarasov 独立复算一致 (T>Tc 透射率≈0, 旧分段线性回退在此为 0.15 会被拦截); maxValues.transmittancePct = 工作点复算值 |
| capillary | mv.density=13534 / thetaDeg=150°; hMm 与 Jurin 复算 (σ=0.487, r=0.5mm) 一致; 旧常量 (13500/140°) 复算偏差 >1e-4 可检测 |

viz 测试数 1159 → 1161。

## 第 7 批迁移进展 (2026-09-28): bohr-orbit 部分迁移 (#30, Depends on #20)

第 5 批曾把 `bohr-orbit` 列入"7 个可保留" (静态绘图合理) —— 该豁免理由覆盖不了**随时间变化的电子角动画** (#20)。
本次逐量决策:

| 场景部位 | 处置 | 备注 |
|------|------|------|
| 轨道半径 rₙ | 已迁: 读引擎 `charts.x_t` (n, E), r ∝ 1/\|E\| ∝ n², 无结果回退 n² 布局 | 引擎改 E₁ 时画面跟随; 实现 `readEngineOrbitRadii` (`atomicModelScenes.ts`) |
| 电子角位置 | 豁免 (装饰动画): 引擎 bohr 模型无电子位置输出 (trajectories 为单点占位), 量子模型本无经典轨道相位; 角速度 1.2/n 纯视觉示意 | 豁免理由记于 `drawBohrOrbitScene` 注释, 不再视为"笼统保留" |

### 契约测试新增 (bohr-orbit × 3)

| 场景 | 断言 |
|------|------|
| bohr-orbit | x_t (n, E) 与 E_n=-13.6/n² 独立复算一致 (n=1..6); r₄/r₁≈16、r₂/r₁≈4; null/空 charts/NaN 点一律回退 null; 源码含 `readEngineOrbitRadii(simulationResult)` + `engineRadii ??` 回退 + 豁免注释 |

`drawBohrScene` (能级/里德伯硬编码) 见 #31 (同批收尾):

| 场景部位 | 处置 | 备注 |
|------|------|------|
| 能级标注 E(n) | 已迁: 读引擎 `charts.x_t` (n→E 映射, `readEngineBohrLevels`), 无结果回退 −13.6/n² | 左侧能级图数值 |
| 谱线波长 | 已迁: 读引擎 `charts.y_t` (按 n₂ 升序, 元素 i ↔ n₂=n₁+1+i), 无结果回退里德伯公式 | 右侧光谱条带; 回退常量 R∞=1.097e7 (引擎真源 `maxValues.R_inf`) |
| 跃迁 ΔE (bohr-orbit 右侧) | 已迁: 取引擎能级差 \|E(n₂)−E(n₁)\|, 无结果回退 13.6·(1/n₁²−1/n₂²) | 与 drawBohrScene 共用 `readEngineBohrLevels` |

### 契约测试新增 (bohr × 3)

| 场景 | 断言 |
|------|------|
| bohr | `maxValues.R_inf`=1.097e7 / `E1_eV`=−13.6 / `baseN`=2; y_t 巴尔末 4 条谱线与里德伯公式一致 (Hα∈(650,660)nm); ΔE(3→2)≈1.89eV; 缺 n=1 时回退 null; 源码含 `readEngineBohrLevels` + `['y_t']` + `Rydberg` 回退 |

## 第 8 批迁移进展 (2026-09-29): #20 剩余范围收尾 — 逐量决策

#20 剩余的 4 组自算点逐一复核 (渲染源码 + 引擎输出对照), 结论 3 处数值已迁引擎 / 其余装饰动画逐行豁免。
本批之后 #20 验收项"audit 每行有明确处置"闭环: 下表每行 = 已迁 / 豁免+理由, 无"笼统保留", 无待迁项。

| #20 定位 | 场景部位 | 处置 | 备注 |
|------|------|------|------|
| `nuclearScenes.ts:118` 脉冲靶核发光 | 靶核 pulse | 豁免 (装饰动画): 引擎无"靶核发光强度"输出 (charts 为散射角直方图 + 示例轨迹); pulse 仅为存在感示意 | 注释记于 `drawAlphaScatteringScene` 脉冲处 |
| `nuclearScenes.ts:136` α 入射进度 | 入射 α 位置 | 豁免 (装饰动画): 引擎无"当前入射粒子随时间位置"输出; progress 仅为入射示意 | 同上注释; 计数器已读引擎 `charts.x_t`, k 已迁引擎 (见下) |
| `nuclearScenes.ts:210,222` 大角度闪烁 | 闪烁标注 | 豁免 (装饰动画): 与 pulse 同理, 闪烁频率无物理含义 | 同上注释覆盖 |
| `alpha-scattering` k 系数 | 碰撞参数 k | 已迁: 读引擎 `maxValues.k`, 无结果回退 `2·Z·e²/(E·5.0)` | 实现 `readEngineAlphaK` (`nuclearScenes.ts`); 散射角公式不变 |
| `decay-statistics` 底部进度 | 采样进度条/闪烁点 | 豁免 (装饰动画): 直方图 + 高斯拟合已读引擎 `charts.x_t/y_t`; 进度仅为蒙特卡洛采样示意 | 注释记于 `drawDecayStatisticsScene` 底部 |
| `fission-chain` 激活相位/脉冲 | 级联点亮时序 | 豁免 (装饰动画): 引擎输出每代中子数 + 累计裂变, 无逐节点屏幕坐标; activationPhase 仅为点亮时序 | 注释记于 `drawFissionChainScene`; 每代 N_g 已读引擎, 无结果回退 k^g |
| `diffusion` | D 系数已迁 + 粒子位置豁免 | D 读引擎 `maxValues.diffusionCoeff`, 无结果回退 `D₀·(T/300)^1.5`; 粒子 drift/jitter 为装饰动画豁免 (引擎 trajectories 单点占位, 浓度曲线已读引擎 `charts.x_t`) | 实现 `readEngineDiffusionCoeff` (`molecularKineticScenes.ts:76`); 注释记于粒子处 |
| `brownian-motion` | D 系数已迁 + 轨迹位置豁免 | D 读引擎 `maxValues.diffusionCoeff` (Stokes-Einstein), 无结果回退本地公式; 轨迹/小分子抖动为装饰动画豁免 (μm 量级经示意放大, 定量 x(t) 已读引擎 `charts.x_t`) | 实现 `readEngineBrownianCoeff` (`molecularKineticScenes.ts:280`); 注释记于轨迹处 |
| `chapter5Scenes.ts:638` 竖直圆回退角 | `omega*currentTime` | 已迁 (早先批次) + 回退豁免: 有引擎时位置/速度取 `getFrame` (非匀速); `angle` 仅无引擎回退 (匀速占位) | 注释记于 `drawVerticalCircleScene`; HUD 速度取 frame.velocity |
| `emWaveScenes.ts:63,138` 交变电流回退 | 自算正弦/drawSineChart | 回退保留 (防御空结果): 有引擎时 u/u2/峰值/频率/匝比读引擎 charts/maxValues | 注释记于 `drawAcCurrentScene` 瞬时值处 |
| `emWaveScenes` 赫兹行进波纹 | 6 波纹相位 | 豁免 (装饰动画): 引擎驻波为 t=0 包络快照, 无逐时行进波; 波纹仅为传播方向示意, f/λ/ε 已读引擎 | 注释记于 `drawEmWaveHertzScene` 波纹处 |
| `emWaveScenes` AM 三段图 | 载波/音频/已调波 | 豁免 (装饰动画): 引擎真实高频 (MHz) 无法逐像素展示, 此处 22/2 压缩周期为原理示意 | 注释记于 `drawEmWaveCommunicationScene` |

### 契约测试新增 (#20 × 11)

| 场景 | 断言 |
|------|------|
| diffusion | D 与 `1e-5·(T/300)^1.5` 独立复算一致; `readEngineDiffusionCoeff` 非法输入回退 null; 源码含 `readEngineDiffusionCoeff(simulationResult)` + 豁免注释 |
| brownian-motion | D 与 Stokes-Einstein 独立复算一致; 非法输入回退 null; 源码含 `readEngineBrownianCoeff(simulationResult)` + 豁免注释 |
| alpha-scattering | k 与 `2·Z·e²/(E·5.0)` 独立复算一致; 非法输入回退 null; 源码含 `readEngineAlphaK(simulationResult)` + 豁免注释 |

## 第 9 批迁移进展 (2026-09-29): vertical-circle 临界徽标模型相关 (#34)

`drawVerticalCircleScene` 的最高点通过性徽标曾硬编码绳模型公式
(`critical=√(g·L)`, 不分 modelType) —— 杆模型低速下与引擎
(`vMin=0`、`flags.passesTop=true`) 结论相反 (红色"最高点速度不足"误报)。

| 场景部位 | 处置 | 备注 |
|------|------|------|
| 临界值 v_top_min | 已迁: 读引擎 `maxValues.vMin`, 无结果回退模型相关公式 (杆→0, 绳/环→√(g·L)) | 实现 `readEngineVerticalCircle` (`chapter5Scenes.ts`); 回退 g=9.8 与引擎默认值一致 (场景无 gravity 参数) |
| 通过性徽标/文案 | 已迁: 读引擎 `flags.passesTop`, 无结果回退 `v0>=critical` | 杆低速 (v0=1, L=1) 现显示通过, 与引擎一致; 绳/环行为不变; HUD `v_top_min` 同源 |

### 契约测试新增 (#34 × 3)

| 场景 | 断言 |
|------|------|
| vertical-circle | 杆 v0=1/L=1: `vMin`=0 且 `passesTop`=true; 绳同参数: `vMin`≈√9.8 且 `passesTop`=false; helper 非法输入回退; 源码含 `readEngineVerticalCircle(simulationResult)` + `passesTop` + `isRod` 回退 |

## M3 批次 1 迁移进展 (2026-10-07): 光学波动 + 波粒二象 (#62), 契约用例 +10

B-数值批次迁移第 1/5 批。逐场景逐量决策 (规则 A 全量 / B 局部 / C 豁免, 见 #62);
charts 访问走 #82 类型化访问层 `chartsOf(simulationResult, model)`。豁免表 22 → 17 项。

| 场景 | 决策 | 消费方式 | 备注 |
|------|------|------|------|
| `diffraction-grating` | B 局部 | k_max 读 `maxValues.orderMax` (引擎按 \|sinθ\|≤1 截断, 与 floor(d/λ) 同式) | 主极大射线 θ_k=asin(kλ/d) 与引擎 principalMaxima 逐字同式, 作为示意图保留自绘; 引擎 grating_intensity 曲线主极大为针状峰 (N=500 峰宽 < 采样步长), 无对应画布元素可替换 |
| `polarization-malus` | B 局部 | 最终出射光强 I (HUD/副标题/末片强度条) 读 `maxValues.Ifinal` | 中间片强度引擎未产出序列, 逐片级联自算与引擎 `polarization.ts` 逐字同式保留 (示意); 无结果回退级联末值 |
| `interference` | B 局部 | 条纹间距 Δy (HUD/副标题) 读 `maxValues.deltaYmm` | 屏上条纹带与光强曲线为**像素空间示意图** (纵轴是像素而非物理坐标; 引擎 x_t 为物理 mm 远场曲线), 标定不同故保留自绘, 注释在案 |
| `doppler-effect` | B 局部 | 前 (θ=0°) / 后 (θ=180°) 观察者 f′ 由 `charts.fprime_vs_theta` 插值 (`interpSeries`), 非有限回退同式 f′=f·v/(v∓v_s) | 波前圆推进为装饰示意; 引擎 maxValues.fObserved 对应场景 dirAngle 而非固定 θ=0, 故取 θ 扫描曲线插值保证两观察者读数与 dirAngle 无关 |
| `photoelectric` | **A 全量 (曲线) + B (读数)** | Ek-ν 直线整条读 `charts.y_t` 点列 (止于引擎采样域上界); ν₀ 读 `maxValues.thresholdFrequency_THz`; HUD K_max 与动画电子由 y_t 插值 (`kAt`) | 无引擎结果回退同式自算 (ν₀=W₀/h, 斜率 h/e, 常数取共享 `PHYSICS_CONSTANTS`); 引擎 `photoelectric.ts` 局部 h=6.626e-34 为截断字面量 (与 units/constants 的 6.62607015e-34 有 1e-5 相对差), 教学不可见, 回退取精确值 |

### 契约用例新增 (#62 × 10, 每场景 2 例)

| 场景 | 断言 |
|------|------|
| diffraction-grating | `orderMax`=min(4, floor(2/0.55))=3; 曲线中央主极大=1、±θ 对称、远离 0 级趋零; 源码含 `mvGrating?.orderMax ?? Math.min(orderMax` |
| polarization-malus | `Ifinal`=cos²(0)·cos²(45°)=0.5、`transmission`=0.5; multi_scan 在 45° 处=0.5; 源码含 `mvMalus?.Ifinal ??` + `cascaded` |
| interference | `deltaYmm`=2.4; x_t 在 ±Δy 处=1 (主极大)、±Δy/2 处=0 (暗纹); 源码含 `mvInterf?.deltaYmm ??` |
| doppler-effect | `fObserved`=548.39、`fBeat`=48.39; θ 扫描 0°/180° 插值=548.39/459.46; 源码含 `chartsOf(simulationResult, 'doppler')?.fprime_vs_theta` + `interpSeries(thetaScan` + `Number.isFinite(engF)` |
| photoelectric | `thresholdFrequency_THz`≈556.1 (CODATA); y_t 末点 (1500, K≈3.90); 首点 x≥ν₀; x_t 末点与 y_t 数值一致; 源码含 `chartsOf(simulationResult, 'photoelectric')` + `mvPhoto?.thresholdFrequency_THz ??` + `kAt(nuMax)` + `ekSeries?.points` |

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
6. 测试数:core 1039 / viz 1207 / total 2246 (2026-09-28 实测, 以 README 顶部 `<!-- test-count -->` 标记为单一真源)。

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

## 已迁场景 → 契约覆盖对照 (2026-09-28 核定, 2026-09-29 #35 增补至 7 项例外)

覆盖清单**以 `visualization/tests/accuracy/single-source-contract.test.ts` 各 it 首段的 sceneId 为准**(每条用例自述场景, 注释不复制清单以免二次过时)。本节只登记两侧的**例外与复核方法**:

- **豁免 (既定不需契约)**:`transmission-belt` — 引擎仅输出静态关系 charts、无逐时轨迹, 转轮动画属渲染层合理示意图(见第 2 批迁移表"不迁移 (B 类语义)")。
- **豁免 (装饰动画, 无数值迁移)**:`decay-statistics`、`fission-chain` — 第 8 批逐量决策为纯装饰豁免 (采样进度条/级联点亮时序), 定量部分 (直方图/高斯拟合、每代中子数) 早先批次已读引擎, 本批无新增引擎消费故不补契约。
- **误入项**:`uniform-magnetic-field` 见于"审计副产物: 模型层方向 bug 修复"表, 不属迁移进展表, 不计入对照。
- **契约侧多出项**:`newton-second-law`、`bohr-orbit`、`bohr` 有契约用例但不在迁移进展表(补迁/部分迁移场景, 以用例为准; `bohr` 系 #31 加用例时漏登记, #35 补上)。

复核方法(两集合差集应**恰为本节登记的 7 项例外**, 多出任何一项即为覆盖缺口):

```bash
# 迁移进展表中的场景
grep -oE '^\| `[a-z0-9-]+`' docs/rendering-physics-audit.md | grep -oE '`[a-z0-9-]+`' | tr -d '`' | sort -u
# 契约已覆盖的场景
grep -oE "scene\('[a-z0-9-]+'\)" visualization/tests/accuracy/single-source-contract.test.ts | grep -oE "'[a-z0-9-]+'" | tr -d "'" | sort -u
```

**新增迁移场景时, 同步在契约文件补 ≥1 用例**(引擎端独立公式复算 + 渲染消费端源码契约), 否则回退自算无人拦截。

> **机器守卫 (#61)**: 上述手工 grep 差集已固化为 `visualization/tests/accuracy/single-source-coverage.test.ts`
> **差集守卫**(对称差 ≠ 7 项例外即失败, 例外清单以该测试内 `EXCEPTIONS` 常量登记, 与本节互链);
> 同文件的**消费守卫**登记了 B-数值自算场景「draw 函数体未消费引擎结果」豁免表(首版 22 项, 待迁),
> 供 #62–#66 迁移逐项销名、防回退自算。手工命令保留作备用口径。

---

## #55 步骤2: B 类场景常量/单位核对记录 (2026-10-01 · agent qoder-20261001T163330Z)

> 对应 B3「B 类仪器场景保留自算, 仅核对常量与单位一致」。本表逐项核对 61 个 B 类 sceneId 的
> **场景 UI 单位**(`parameters[].unit`) → **`buildProblem` 换算** → **引擎侧值/`ParameterSpec.unit`** 三者是否自洽。
>
> **方法(可复现)**:一次性脚本 `tsx` 导入 `getAllScenes()` + 引擎 `getModel()`,对每个 B 类场景以
> 默认参数调用 `buildProblem(defaults)` 探针,直接读出**引擎侧实际数值**(换算已生效),与场景 UI
> 单位/默认值逐项比对;`ParameterSpec.unit` 同名参数自动比对单位串。非正则解析,数据来自运行时对象。
>
> **结论**:60 个真实 sceneId 的**单位换算数值全部正确**(含 kPa→Pa、L→m³、mm→m、μm/μF→m/F、
> cP→Pa·s、GPa→Pa、×10ⁿ 标度电荷/速度/质量、指数→Hz、kΩ→Ω 等),无漏换算/数量级错误。
> 3 项**非物理数值**问题见文末「核对发现」, 已各自另立 issue #58/#59/#60(本 issue 内不改数值)。

### 核对表

图例:`换算✓`=场景 UI 单位经 buildProblem 正确换算为引擎单位(列出引擎侧实读值);
`同单位`=UI 与引擎同单位、无换算;`F1/F2/F3`=见「核对发现」。

| sceneId | 换算/单位核对 | 结论 |
|---|---|---|
| bohr | series/maxN 无量纲; seriesB→'Balmer' | 一致 |
| center-of-gravity | vertices m(引擎), shapeType 无量纲 | 一致 |
| force-composition | f1/f2 N、angleDeg ° 同单位 | 一致 |
| cavendish | m1/m2 kg、distance/mirrorDist m、torsionConst N·m/rad 同单位; armLength=1 m 硬编码 | 一致 |
| circuit | emf V、r/r1/r2/r3 Ω; internalResistance/resistance 仅改名值不变 | 一致 |
| resistance-law | length m、diameter mm 同单位; 引擎内 d/1000 mm→m; ρ Cu1.68e-8/Fe1.0e-7/Nichrome1.1e-6 ✓ | 一致 |
| load-voltage | emf V、internalResistance Ω; loadRange[loadRMin Ω, loadRMax kΩ→**10000 Ω**] | 换算✓ |
| multimeter-tool | mode/range/testValue 无量纲(选档示数) | 一致 |
| vernier-caliper-tool | objectSize mm 同单位 | 一致 |
| micrometer-tool | thickness mm 同单位 | 一致 |
| bulb-vi | emf V、r/R_bulb Ω(→circuit 改名) | 一致 |
| parallel-plate-capacitor | area m²、epsilonR 无量纲; **distance 1 mm→0.001 m**(×1e-3) | 换算✓ |
| coulomb-force-explore | q1/q2 μC、distance cm 同单位(引擎亦 μC/cm) | 一致 |
| electroscope | charge μC、foilLength cm、foilMass g 同单位 | 一致 |
| electrostatic-induction | chargeC μC、separation/distanceAC cm 同单位 | 一致 |
| electrostatic-shielding | externalField V/m、cavityCharge μC 同单位 | 一致 |
| faraday-cup | totalCharge μC、probe 无量纲 | 一致 |
| efield-lines | q/dipoleCharge nC、plateVoltage V(引擎 field-lines 无 ParameterSpec 冲突) | 一致 |
| em-spectrum | **freqMinExp=1→10 Hz、freqMaxExp=16→1e16 Hz**(10^exp) | 换算✓ |
| magnetic-force | B T、I A、L m、theta °; **q 1.6×10⁻¹⁹→1.6e-19 C、v 1×10⁶→1e6 m/s、mass 9.1×10⁻³¹→9.1e-31 kg** | 换算✓ |
| ampere-force | B T、I A、L m、angle ° 同单位 | 一致 |
| current-magnetic | current A、turns/radius 无量纲/同单位 | 一致 |
| molecular-force | **epsilon 1×10⁻²¹→1e-21 J、sigma 0.34 nm→3.4e-10 m** | 换算✓ |
| oil-film | oilConcentration、drops/mL、filmArea cm² 同单位; drops=1 硬编码 | 一致 |
| cosmic-ray | altitude m 同单位 | 一致 |
| neutron-discovery | alphaEnergy MeV、targetMass u 同单位 | 一致 |
| wetting | medium/surface 无量纲枚举→liquidMode/surfaceMode | 一致 |
| joule-electrical | voltage V、resistance Ω、time s、waterMass kg 同单位 | 一致 |
| energy-transformation | inputEnergy J、efficiency 无量纲 同单位 | 一致 |
| double-slit | **注册表无此 sceneId**;真实「双缝干涉」= `interference`(见 F1) | **F1→#59 已修** |
| single-slit | slitWidth mm、wavelength nm、screenDist m 同单位 | 一致 |
| thin-film | thickness/wavelength nm 同单位; incAngle °→incidentAngleDeg 'deg'(F2); substrateIndex | 一致 |
| refraction | n1/n2 无量纲; angle °→incidentAngleDeg(改名值不变) | 一致 |
| total-internal-reflection | 同 refraction(n1/n2/°), mode 无量纲 | 一致 |
| black-body | temperature K 同单位 | 一致 |
| electron-diffraction | accVoltage V 同单位; crystalLattice=0.213 nm 硬编码(量级合理) | 一致 |
| micro-deformation | pressure N、laserDist/mirrorDist m; **youngModulus 10 GPa→1e10 Pa**(×1e9); thickness/tableLength 引擎内 | 换算✓ |
| diffraction-grating | wavelength nm、orderMax/slitCount 无量纲; **gratingConstant/slitWidth 'um' vs 'μm'**(F2,值不换算,μm 原生) | 一致 |
| polarization-malus | initIntensity/nPolarizers 无量纲; angles °→polarizerAngles 'deg'(F2) | 一致 |
| interference | wavelengthNm nm、slitSeparationMm mm、screenDistanceM m(名称内嵌单位=场景同单位) | 一致 |
| doppler-effect | soundSpeed/sourceSpeed m/s、sourceFreq Hz 同单位; directionAngle °→'deg'(F2) | 一致 |
| photoelectric | workFunction eV、freqMin/MaxTHz THz(改名值不变, 单位内嵌) | 一致 |
| hall-effect | current A、magneticField T、chargeDensity m⁻³、thickness m 同单位 | 一致 |
| thermistor | temperature/BValue K、R0 Ω 同单位; B=3950 K、T0=298.15 K 引擎内 ✓ | 一致 |
| photoresistor | darkResistance Ohm、sensitivity 1/lx、lightIntensity lx 同单位; temperature °C→temperatureCelsius(值不变) | 一致 |
| strain-gauge | strain με、gaugeFactor 无量纲、bridgeVoltage V 同单位 | 一致 |
| gas-law | n mol→moles、T0 K; **p0 101.3 kPa→101300 Pa**(×1e3)、**V0 22.4 L→0.0224 m³**(/1e3) | 换算✓ |
| capacitor-charge | resistance Ω、emf V; **capacitance 100 μF→1e-4 F**(×1e-6) | 换算✓ |
| radioactive | N0 个→initialAtoms、halfLife/tEnd s(→duration) 同单位 | 一致 |
| decay-statistics | meanCount/nTrials 无量纲 | 一致 |
| alpha-scattering | alphaEnergy MeV、targetZ 无量纲; foilThickness=1e-6 m 硬编码(量级合理) | 一致 |
| fission-chain | multiplicationFactor/generations 无量纲 | 一致 |
| heat-transfer | ambientTemp/initialTemp K、time s; materialType='copper'(引擎) | 一致 |
| diffusion | temperature K、particleCount 无量纲; gridSize=1e-6 m 硬编码 | 一致 |
| brownian-motion | liquidTemp K、duration s; **particleRadius 1 μm→1e-6 m**、**fluidViscosity 1 cP→0.001 Pa·s**(×1e-3) | 换算✓ |
| melting-curve | meltingPoint °C、heatingRate °C/min、duration min(→timeConfig 1200 s ×60) ✓; latentHeat=334 J/kg(冰)✓ | 换算✓ |
| surface-tension | sliderLength **4 cm→0.04 m**、temperature °C 换算✓; **但 σ_水取值三方不一致 + 渲染自算**(见 F3) | **F3** |
| liquid-mixing | volumeWater/Alcohol mL 同单位 | 一致 |
| perpetuum-mobile | hotTemp/coldTemp K 同单位 | 一致 |
| heat-direction | hotTemp/coldTemp K、thermalConductivity W/(m·K) 同单位 | 一致 |
| adiabatic-compression | initialTemp K、compressionRatio 无量纲(+gamma=1.4 双原子) | 一致 |

### 核对发现(均另立 issue #58/#59/#60, 本 issue 内不改物理数值)

- **F1 · `double-slit` 为幻影 sceneId（✅ #59 已修）**:B-静态清单登记的 `double-slit` 在 `visualization/src` 中**无对应 `id:'double-slit'` 场景**;真实「双缝干涉」场景 id 为 `interference`(已列于 B-数值)。故 B 类「61 个唯一场景」实际含 1 个不存在的 id(真实唯一 sceneId = 60),且 `doubleSlitIntensity` 仅是 `rendering/constants.ts` 的绘图辅助函数名。→ 建议修正 B-静态清单(以 `interference` 计/去重)与并集计数口径（→ issue #59）。**#59 已执行**：从 B-静态清单移除 `double-slit`，B-静态 37→36、并集 61→60，分类统计表与去重说明同步。
- **F2 · 引擎 `ParameterSpec.unit` 记号 split(可自动化模式)**:引擎侧角度单位串存在 `'deg'`(13 处:polarization/doppler/hologram/wetting/single-slit/water-diffraction/double-pendulum/thin-film)与 `'°'`(17 处)并存;长度单位 `'um'`(diffraction-grating/hologram)与 `'μm'` 并存。场景侧统一用 `'°'`/`'μm'`。**纯 UI 记号差异,无数值/换算影响**(同为度 / 同为微米、buildProblem 不换算)。因属可正则检出的模式 → 记为潜在门禁候选,是否收口交规划者判定（→ issue #60）。
- **F3 · surface-tension σ_水三方取值不一致 + headline 值自算(单源缺口)**:① `rendering/constants.ts` 单一真源 `SIGMA_WATER_20C=0.0728`(IAPWS,仅 `renderers.test.ts` L3 断言使用),② 引擎 `surface-tension.ts` 硬编码 `sigma0=0.072`,③ 渲染 `drawSurfaceTensionScene` 亦硬编码 `sigma0=0.072` **并自算 `F=2σ(L/100)` 展示 headline σ/F,未消费引擎 `forceCurve` charts**(仅底部 σ-T 曲线读 `charts.y_t`)。②=③(0.072)但≠①(0.0728),三者约 1% 偏差;温度模型亦不同(②加法 β=1.5e-4 vs ③①乘法 −0.002·σ₀)。`drawCapillaryScene` 亦硬编码 0.072 复现同模式。→ 属常量取值不一致 + 有引擎数据却自算,违单源约定（→ issue #58）。
