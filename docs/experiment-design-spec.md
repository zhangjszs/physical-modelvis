# 实验设计规格 — 全部新建 physics-core Model 列表

> 本文档是 `TASKS.md` 的公式参考，供 executor 在实现每个新 Model 时使用。

---

## 阶段 B: 必修一 20 实验 (新建 9 Model)

### B1. ticker-timer (打点计时器)
- **物理**: 匀变速直线运动 — 纸带分析
- **公式**:
  - 中间时刻瞬时速度: `v_n = (x_n + x_{n+1}) / (2T)`
  - 逐差法加速度: `a = [(x_4+x_5+x_6)-(x_1+x_2+x_3)]/(9T²)`
  - Δx = aT² 判据
- **参数**: `frequency` (Hz, 默认 50), `tickCount` (点数, 默认 10), `acceleration` (m/s², 默认 2)
- **约束**: TickerTimerConstraint { frequency, tickCount, acceleration }
- **图表**: paper-tape 静态图 (点迹+标度), v-t 直线 (斜率=a)
- **诊断**: v-t 线性拟合 R², 加速度标称值 vs 拟合值
- **备注**: 不做时间序列, 生成 paper-tape 静态图作为 trajectory-t 替代 (用 pos index 伪造 t)

### B2. reaction-time (测反应时间)
- **物理**: 自由落体 — t=√(2h/g)
- **公式**: `t = √(2h/g)`
- **参数**: `distance` (尺子下落距离 h, 默认 0.2 m), `g` (9.8)
- **约束**: ReactionTimeConstraint { distance }
- **图表**: ruler-t (直尺位置-时间), t-h 曲线
- **诊断**: t vs √h 线性
- **交互**: 输入尺子被握住的刻度位置 → 自动计算 t

### B3. galileo-incline (伽利略斜面理想实验)
- **物理**: 冲淡重力 — x ∝ t² → 匀加速; 外推 90°→自由落体
- **公式**: `x = ½g·sinθ·t²` (沿斜面), 外推 lim_{θ→90} = 自由落体
- **参数**: `angleDeg` (倾角, 默认 30°), `distance` (斜面长度, 默认 1 m), `g` (9.8)
- **约束**: GalileoInclineConstraint { angleDeg, distance }
- **图表**: x-t 曲线 (不同 θ 对比), sinθ-t 关系图
- **关键帧**: 三段式推理动画 (冲淡重力 → 对接斜面 → 水平外推)
- **备注**: 同一 Model 支持多种 θ 值对比

### B4. center-of-gravity (悬挂法确定重心)
- **物理**: 二力平衡 — 悬挂线延长线交点 = 重心
- **公式**: 两悬挂线交点解析解 (直线-直线交点)
- **参数**: `shapePoints` (多边形顶点坐标数组), `precision` (计算精度)
- **约束**: CenterOfGravityConstraint { vertices: Vector2D[] }
- **图表**: static (不规则薄板 + 两次悬挂线 + 重心标记)
- **备注**: 不做时间序列 (static scene), 但通过 Model.solve() 计算交点

### B5. micro-deformation (桌面微小形变光杠杆放大)
- **物理**: 光杠杆放大 — 反射光点位移 = L·2α (α = 桌面倾角)
- **公式**: `Δs = 2L·tan(α) ≈ 2L·α` (α 很小)
- **参数**: `laserDist` (激光到镜面距离, 默认 1 m), `mirrorDist` (镜面到投影屏距离, 默认 5 m), `pressure` (桌面压力, 默认 100 N), `youngModulus` (桌面杨氏模量)
- **约束**: MicroDeformationConstraint { laserDist, mirrorDist, pressure, youngModulus, thickness }
- **图表**: pressure-Δs 直线
- **备注**: 静态场景 (光路图)

### B6. inertia (惯性实验)
- **物理**: 牛顿第一定律 — 保持原运动状态
- **现象**: 棋子叠放打击、鸡蛋落入水杯、小车急停木块倒伏
- **参数**: `massRatio` (质量比), `initialSpeed` (初速度), `externalForceMode` (='stroke' | 'stop' | 'smoothPull')
- **约束**: InertiaConstraint { massRatio, initialSpeed, mode }
- **图表**: v-t 曲线 (三段对比)
- **备注**: 3 种惯性现象共用 Model, 用 mode 参数切

### B7. overweight (超重和失重)
- **物理**: `N = m(g+a)` 超重, `N = m(g-a)` 失重, `a=g → N=0` 完全失重
- **公式**: `F_N = m·(g +·a_y)` (a_y 向上为正)
- **参数**: `mass` (kg), `accProfile` (加速度曲线: 'upStart' | 'upStop' | 'downStart' | 'downStop')
- **约束**: OverweightConstraint { mass, accMagnitude (m/s²), mode }
- **图表**: a_y-t, F_N-t (对比 mg 参考线), F_N-a_y 直线
- **关键帧**: 4 个阶段 (匀速、加速、匀速、减速)

### B8. (复用) friction-detail (摩擦力大小方向)
- 复用 sliding-friction Model, 仅扩展 friction-direction 图

### B9. (复用) ticker-timer-detail (传感器数字化对比)
- 复用 uniform-accelerated, 叠加实时 v-t 曲线

---

## 阶段 C: 必修二 25 实验 (新建 16 Model)

### C1. curve-velocity-direction (曲线运动速度方向)
- **物理**: 质点某点速度方向沿曲线切线
- **参数**: `trackShape` (轨道形状: 'circle' | 'parabola' | 'spiral'), `rotationSpeed`, `releaseAngle`
- **约束**: CurveVelocityConstraint { trackShape, angularSpeed, releaseIndex }
- **图表**: 轨迹 (曲线) + 脱离点切线箭头 (3+ 位置对比)
- **备注**: 静态/半动态演示

### C2. curve-condition (曲线运动条件)
- **物理**: 合力与速度不共线 → 曲线
- **公式**: F_合 方向 vs v 方向 → 夹角 sin(θ) 判断
- **参数**: `forceDirection` (力的方向角), `initialVelocity`, `mass`
- **约束**: CurveConditionConstraint { forceAngle, initialSpeed, mass }
- **图表**: 直线条件 (F//v) vs 条件条件 (F⊥v 圆周) vs 一般斜向
- **备注**: 复用 projectile 类工具, 但改初始条件

### C3. motion-composition (蜡块运动合成分解)
- **物理**: 合运动 = 分运动向量叠加, v = √(vx²+vy²), tanθ=vy/vx
- **公式**: x = v_x·t, y = v_y·t (独立)
- **参数**: `vxConst` (水平匀速), `vyAccel` (竖直匀加速: 模拟蜡块在移动玻璃管中)
- **约束**: MotionCompositionConstraint { vxConst, vyAccel }
- **图表**: x-t, y-t, 合轨迹 (直线/曲线切换)

### C4. transmission-belt (几种传动方式)
- **物理**: 皮带 v=ωr (大小轮同 v), 齿轮 ω₁r₁=ω₂r₂ (反向), 摩擦轮, 同轴 ω 同
- **公式**: `v_belt = ω₁r₁ = ω₂r₂`, `ω_gear1·r1 = ω_gear2·r2`, `ω_coax = const`
- **参数**: `mode` ('belt' | 'gear' | 'friction' | 'coax'), `r1`, `r2`, `omega1`
- **约束**: TransmissionConstraint { mode, r1, r2, omega1 }
- **图表**: 静态机构图 + 轮缘某点 v-t, ω-t

### C5. vertical-circle (竖直圆周最高点条件)
- **物理**: 绳模型 v_min=√(gr) (最高点张力为0), 杆模型 v_min=0, 圆环 v_min=√(gr)
- **公式**: `F_T + mg = mv²/r`, 临界 F_T=0 → v=√(gr)
- **参数**: `length` (绳长 r), `mass`, `modelType` ('rope' | 'rod' | 'ring'), `initialSpeed`
- **约束**: VerticalCircleConstraint { length, modelType, initialSpeed }
- **图表**: 轨迹 (最高点放大), F_T-t, v-t, 临界速度标注
- **关键帧**: 最高点 (是否脱离)

### C6. centrifugal (离心现象)
- **物理**: F_实 < mω²r → 离心运动 (惯性表现)
- **公式**: `F_friction_max = μ·m·g`, `F_required = m·ω²·r`
- **参数**: `mass`, `radius`, `angularSpeed`, `frictionCoeff`
- **约束**: CentrifugalConstraint { mass, radius, angularSpeed, frictionCoeff }
- **图表**: ω-r 相图 (临界曲线), 物块位置随时间, 说明离心条件
- **备注**: 静态分析 (比较 F_需 vs F_max)

### C7. cavendish (卡文迪什扭秤)
- **物理**: F=Gm₁m₂/r² + 三次放大 (力矩、扭转、光杠杆)
- **公式**: `F = G·m₁m₂/r²`, `τ = F·L = k·θ_suspension`, `Δspot = 2D·θ_mirror`
- **参数**: `m1`, `m2`, `distance`, `torsionConst`, `mirrorDist`
- **约束**: CavendishConstraint { m1, m2, distance, torsionConst, mirrorDist }
- **图表**: 光点位移 vs m₂ 位置, θ vs 1/r² 直线 (验证 F∝1/r²)
- **诊断**: 拟合 G 值

### C8. moon-earth-test (月地检验)
- **物理**: a_月/g = R²/r² = 1/3600
- **公式**: `a_月 = 4π²r/T²`, `a_月/g = R²/r²`
- **参数**: `earthRadius`, `moonDistance` (≈60R), `moonPeriod` (27.3天)
- **约束**: MoonEarthTestConstraint { earthRadius, moonDistance, moonPeriod }
- **图表**: 静态对比图 (a_月 vs g 缩短 3600 倍)
- **备注**: 思想实验, 不运动

### C9. (复用 projectile) projectile-detail (飞镖斜抛)
### C10. (复用 projectile) projectile-sensor (传感器研究平抛)

### C11. (复用 circular-motion) centripetal-feel (感受向心力)
### C12. (复用 circular-motion) centripetal-formula (探究向心力)
### C13. (复用 circular-motion) centripetal-sensor (传感器向心力)
### C14. (复用 circular-motion) centrifugal (离心现象)
### C15. (复用 orbital) planetary-motion (行星运动开普勒三定律)
### C16. (复用 orbital) cosmic-velocity (牛顿大炮宇宙速度)

### C17. (复用 energy-conservation) work-energy-theorem (恒力做功与动能)
### C18. (复用 free-fall) mech-energy-conservation (验证机械能守恒自由落体法)
### C19. (复用 free-fall) free-fall-energy (自由落体机械能研究)
### C20. (复用 air-track) air-track-energy (气垫导轨验证机械能守恒)

### C21. (复用 simple-pendulum) pendulum-energy (动能势能转化)
### C22. (复用 spring) spring-energy (弹性势能动能转化)
### C23. (复用 spring) spring-potential-expr (探究弹性势能表达式)

### C24. (复用 orbital - 已经做) 行星运动/宇宙速度
### C25. (补充) ball-leaning (光滑斜面上滑块) 

---

## 阶段 D: 必修三 26 实验 (新建 12 Model)

### D1. electrostatic-induction (静电感应)
- **物理**: 导体 A/B 靠近带电体 C → 两端出现等量异号电荷
- **参数**: `chargeC` (C 带电量), `separation` (A/B 间隙), `distanceAC`
- **约束**: ElectrostaticInductionConstraint { chargeC, separation, distanceAC }
- **图表**: 箔片张角 vs 距离 A-C, 电荷分布图

### D2. electroscope (验电器)
- **物理**: 同种电荷排斥; 箔片张角∝电荷量
- **公式**: `θ ∝ q²` (力矩平衡)
- **参数**: `charge`, `foilLength`, `foilMass`
- **约束**: ElectroscopeConstraint { charge, foilLength, foilMass }

### D3. coulomb-force-explore (探究电荷间作用力因素)
- **物理**: F = k·q₁q₂/r²; 控制变量法
- **参数**: `q1`, `q2`, `distance`, `mode` (切换电量/距离变量)
- **约束**: CoulombForceConstraint { q1, q2, distance, mode }
- **图表**: F-q 直线, F-1/r² 直线
- **诊断**: 拟合 k 值

### D4. coulomb-torsion (库仑扭秤)
- 复用 coulomb-force-explore (添加扭秤放大可视化)

### D5. electrostatic-shielding (静电屏蔽)
- **物理**: 导体内 E=0, (不)接地屏蔽差异
- **参数**: `isGrounded`, `externalField`, `cavityCharge`
- **约束**: ElectrostaticShieldingConstraint { isGrounded, externalField, cavityCharge }
- **图表**: 金属网罩内箔片张角 vs 接地状态

### D6. faraday-cup (法拉第圆筒)
- **物理**: 空腔导体电荷仅分布外表面
- **参数**: `innerProbeDepth`, `outerProbeDepth`, `totalCharge`
- **约束**: FaradayCupConstraint { innerProbeDepth, totalCharge }

### D7. capacitor-charge (电容充放电)
- **物理**: 暂态 — U_c = E·(1-e^{-t/RC}) 充电, U_c = E·e^{-t/RC} 放电
- **公式**: `τ = RC`, `I = E/R·e^{-t/RC}`
- **参数**: `resistance`, `capacitance`, `emf`, `mode` ('charge' | 'discharge')
- **约束**: CapacitorConstraint { resistance, capacitance, emf, mode }
- **图表**: U_c-t 指数曲线, I-t 指数, ln(U_c)-t 直线 (放电)

### D8. parallel-plate-capacitor (平行板电容器)
- **物理**: C = εr·S/(4πkd); 控制变量
- **参数**: `area`, `distance`, `epsilonR`, `mode`
- **约束**: ParallelPlateConstraint { area, distance, epsilonR }
- **图表**: C-1/d 直线, C-S 直线, C-εr 直线

### D9. vernier-caliper (游标卡尺读数)
- **物理**: L = 主尺 + K×(1/N) mm, N=10/20/50
- **参数`: `objectSize` (测量对象), `nType` (10|20|50 分度)
- **约束**: VernierCaliperConstraint { objectSize, nType, randomOffset }
- **图表**: 静态游标尺图示 + 读数值

### D10. micrometer (螺旋测微器)
- **物理**: L = a + b·0.5 + n·0.01 mm
- **参数**: `thickness`, `randomAngle`
- **约束**: MicrometerConstraint { thickness, randomAngle }

### D11. resistance-law (电阻定律)
- **物理**: R = ρ·L/S; 控制变量 (L, S, material)
- **参数**: `length`, `diameter`, `material` ('Cu' | 'Fe' | 'Nichrome')
- **约束**: ResistanceLawConstraint { length, diameter, material }
- **图表**: R-L 直线, R-1/S 直线, ρ 材料比较

### D12. multimeter (多用电表使用)
- **物理**: 切换档位, 指针读数; 欧姆档 I = E/(R_int+R_x)
- **参数**: `mode` ('DCV' | 'ACV' | 'Ohm' | 'DCA'), `range`, `testValue`
- **约束**: MultimeterConstraint { mode, range, testValue }
- **图表**: 刻度盘 + 指针位置

### D13. load-voltage (路端电压与负载)
- **物理**: U = E - Ir = E·R/(R+r); U-I 直线截距=E, 斜率=-r
- **参数**: `emf`, `internalResistance`, `rLoadRange`
- **约束**: LoadVoltageConstraint { emf, internalResistance, rLoadRange }
- **图表**: U-R 曲线 (渐近线 E), U-I 直线
- **诊断**: E 标称值 vs 拟合截距

### D14~16. (复用 load-voltage) E/r 测量三法 (伏安、安阻、伏阻)

### D17. ampere-force (安培力因素)
- **物理**: F = BIL·sinθ; 控制变量
- **参数**: `B`, `I`, `L`, `angle`
- **约束**: AmpereForceConstraint { B, I, L, angle }
- **图表**: F-I 直线, F-L 直线, F-sinθ 直线

### D18. em-wave-hertz (赫兹实验 — 必修三引入电磁波初步)
- **物理**: 赫兹振子火花放电; 电磁振荡 + 辐射
- **参数**: `frequency`, `turns`, `sparkGap`
- **约束**: HertzExperimentConstraint { frequency, turns, sparkGap, distance }
- **图表**: LC 振荡电流, 接收端感应电动势 vs 距离

---

## 阶段 E: 选必一 40 实验 (新建 16 Model)

### E1. projectile-collision (平抛验证动量守恒)
- **物理**: 平抛等时性 + 动量守恒 m1·OP = m1·OM + m2·ON
- **参数**: `m1`, `m2`, `v1Initial`, `tableHeight`
- **约束**: ProjectileCollisionConstraint { m1, m2, v1Initial, tableHeight }
- **图表**: 平抛轨迹 (入射球碰前、碰后两球), 落点 OP/OM/ON 标记

### E2. double-pendulum (两个单摆步调)
- **物理**: 同相/反相对比; 固有频率相同时步调一致
- **参数**: `length1`, `length2`, `phaseDiff` (0 或 π), `mode`
- **约束**: DoublePendulumConstraint { length1, length2, phaseDiff }
- **图表**: θ1-t 和 θ2-t 重叠图 (同相 vs 反相)

### E3. forced-vibration (受迫振动频率)
- **物理**: f_受 = f_驱 ≠ f_0 (固有频率)
- **参数**: `naturalFreq`, `drivingFreq`, `damping`
- **约束**: ForcedVibrationConstraint { naturalFreq, drivingFreq, damping }
- **图表**: 稳态振幅-时间, A-f_驱 共振曲线

### E4. resonance (共振)
- **物理**: 共振条件 f_驱 = f_0; A-f 共振曲线 (不同阻尼下的峰形)
- **参数**: `naturalFreq`, `dampingValues` (数组), `freqRange`
- **约束**: ResonanceConstraint { naturalFreq, damping, freqRange }
- **图表**: A-f 曲线族 (不同阻尼)

### E5. sound-waveform (声音波形)
- **物理**: 声波显示 — 乐音 vs 噪声 vs 拾音频率
- **参数**: `frequency`, `waveType` ('sine' | 'complex' | 'noise')
- **约束**: SoundWaveformConstraint { frequency, waveType }
- **图表**: 波形图 (时域)

### E6. water-diffraction (水波衍射)
- **物理**: 缝宽 d vs 波长 λ 决定衍射明显度
- **参数**: `wavelength`, `slitWidth`, `tankDepth`
- **约束**: WaterDiffractionConstraint { wavelength, slitWidth, tankDepth }
- **图表**: 衍射图样 (俯视), 振幅-角度分布

### E7. sound-interference (操场声音干涉)
- **物理**: 同频同相声波干涉; 波程差决定加强/减弱
- **参数**: `frequency`, `speakerDist`, `listenerPos`
- **约束**: SoundInterferenceConstraint { frequency, speakerDist, listenerPos }
- **图表**: 声强分布图 (二维), 加强/减弱区标记

### E8. doppler (多普勒效应)
- **物理**: f' = v/(v∓vs)·f (靠近频率升高，远离降低)
- **参数**: `soundSpeed`, `sourceSpeed`, `sourceFreq`, `observerPos`
- **约束**: DopplerConstraint { soundSpeed, sourceSpeed, sourceFreq, observerPos }
- **光谱线图**: 拍频 vs 速度, f'-v_s 曲线

### E9. thin-film (薄膜干涉)
- **物理**: 等厚干涉; 光程差 Δ = 2d·n_film + λ/2
- **参数**: `filmThickness`, `refIndex`, `wavelength`, `mode` ('reflection' | 'wedge')
- **约束**: ThinFilmConstraint { filmThickness, refIndex, wavelength, mode }
- **图表**: 膜厚-颜色图, 反射/透射率 vs 厚度

### E10. hologram (全息照片)
- **物理**: 全息记录振幅+相位; 再现时衍射三维像
- **参数**: `referenceAngle`, `objectShape`, `wavelength`
- **约束**: HologramConstraint { referenceAngle, objectShape, wavelength }
- **图表**: 静态全息干涉条纹图 + 再现像

### E11. single-slit (单缝衍射)
- **物理**: I = I₀(sinα/α)², α = πa·sinθ/λ; 中央明纹宽 2λ/a
- **参数**: `slitWidth`, `wavelength`, `screenDist`
- **约束**: SingleSlitConstraint { slitWidth, wavelength, screenDist }
- **图表**: I-α 光强分布, 静态衍射图样

### E12. diffraction-grating (光栅衍射)
- **物理**: d·sinθ = kλ (主极大), 缺级条件
- **参数**: `gratingConstant`, `wavelength`, `orderMax`
- **约束**: DiffractionGratingConstraint { gratingConstant, wavelength, orderMax }
- **图表**: 多缝衍射光强, 衍射谱 (按颜色)

### E13. polarization (偏振光)
- **物理**: 马吕斯定律 I = I₀·cos²θ; 起偏/检偏
- **参数**: `initialIntensity`, `anglePolarizer2`, `nPolarizers`, `polarizerAngles` (数组)
- **约束**: PolarizationConstraint { initialIntensity, polarizerAngles }
- **图表**: I-θ 极坐标图 (cos²θ), 静态光矢端迹

### E14~40. 详见 explanations 复用表 (见 TASKS.md 阶段 E)

---

## 阶段 F: 选必二 28 实验 (新建 10 Model)

### F1. current-balance (电流天平)
- **物理**: m₁g = nBIl (安培力与重力平衡); 电流反向 B = mg/(2nIl)
- **参数**: `wireLen`, `turns`, `mass`, `current`, `Bknown`
- **约束**: CurrentBalanceConstraint { wireLen, turns, mass, current }
- **图表**: 天平倾斜角度 vs I, mg-t 图

### F2. eddy-current (涡流现象)
- **物理**: 块状导体在变化磁场中感生漩涡电流致热; 叠片铁芯减小涡流
- **参数**: `B`, `frequency`, `conductivity`, `thickness`
- **约束**: EddyCurrentConstraint { B, frequency, conductivity, thickness }
- **图表**: 涡流流线图案, 热功率 P ∝ B²f²d²/ρ

### F3. em-damping (电磁阻尼/驱动)
- **物理**: 涡流阻碍相对运动 "来拒去留"; 旋转磁场驱动金属筒
- **参数**: `mode` ('damping' | 'drive'), `B`, `angularSpeed`, `conductivity`
- **约束**: EMDampingConstraint { mode, B, angularSpeed, conductivity }
- **图表**: 摆动衰减曲线 (有/无阻尼对比), 转速 vs 时间

### F4. mutual-inductance (互感现象)
- **物理**: 原线圈电流变化 → 副线圈感生电动势 (互感 M)
- **公式**: `E₂ = -M·dI₁/dt`, `M = k·√(L₁L₂)`
- **参数**: `L1`, `L2`, `coupling`, `frequency`, `primaryCurrent`
- **约束**: MutualInductanceConstraint { L1, L2, coupling, frequency, primaryCurrent }
- **图表**: I₁-t (交流), E₂-t (感生电动势)

### F5. self-inductance (自感现象)
- **物理**: E = -L·dI/dt; 通电时灯泡延迟亮, 断电时闪亮
- **参数**: `inductance`, `resistance`, `emf`, `mode` ('turnOn' | 'turnOff')
- **约束**: SelfInductanceConstraint { inductance, resistance, emf, mode }
- **图表**: i-t 指数曲线, 灯泡亮度对比

### F6. em-wave-communication (电磁波发射接收)
- **物理**: AM/FM 调制; 调谐选频; 解调
- **参数**: `carrierFreq`, `modulationType` ('AM' | 'FM'), `audioFreq`, `distance`
- **约束**: EMWaveCommConstraint { carrierFreq, modulationType, audioFreq, distance }
- **图表**: 载波/调制波/解调波形, 频谱

### F7. em-spectrum (电磁波谱)
- **物理**: c=λf; 各波段 (无线电→微波→红外→可见→紫外→X→γ) 的位置和产生方式
- **参数**: `freqRange`, `highlightBand`
- **约束**: EMSpectrumConstraint { highlightBand }
- **图表**: 对数频谱图, 强调所选波段

### F8. hall-effect (霍尔元件)
- **物理**: U_H = IB/(nq·t); 测磁场
- **参数**: `current`, `B`, `chargeDensity`, `thickness`
- **约束**: HallEffectConstraint { current, B, chargeDensity, thickness }
- **图表**: U_H-I 直线 (B 恒定), U_H-B 直线 (I 恒定)

### F9. reed-switch (干簧管)
- **物理**: 磁体使软磁簧片磁化吸合/弹开 → 电路通断
- **参数**: `magnetPos`, `coilCurrent`, `mode` ('magnetic' | 'coil')
- **约束**: ReedSwitchConstraint { magnetPos, coilCurrent, mode }
- **图表**: 簧片状态(开/合) vs 磁体距离, 电平 vs 时间

### F10. photoresistor (光敏电阻)
- **物理**: 光照激发载流子 → R 减小; R 随光强增大非线性减小
- **参数**: `lightIntensity`, `darkResistance`, `sensitivity`
- **约束**: PhotoresistorConstraint { lightIntensity, darkResistance, sensitivity }
- **图表**: R-光强曲线

### F11. thermistor (热敏电阻)
- **物理**: NTC: T↑→R↓ (指数); PTC: 居里点附近急剧↑
- **参数**: `temperature`, `mode` ('NTC' | 'PTC'), `R0`, `BValue`
- **约束**: ThermistorConstraint { temperature, mode, R0, BValue }
- **图表**: R-T 曲线 (NTC 指数下降, PTC 先降后升)

### F12. strain-gauge (电阻应变片)
- **物理**: R=ρL/S; 拉伸导致 L↑+S↓→R↑; 电桥输出 ΔU∝F
- **公式**: `ΔR/R = K·ε` (ε = 应变, K 灵敏系数)
- **参数**: `strain`, `gaugeFactor`, `bridgeVoltage`
- **约束**: StrainGaugeConstraint { strain, gaugeFactor, bridgeVoltage }
- **图表**: ΔR/R-ε 直线, F-ΔU 直线

### F13. security-alarm (门窗防盗报警)
- **物理**: 干簧管感知磁场 → 继电器通断 → LED/蜂鸣器
- **参数**: `doorState` (开/闭), `magnetPos`
- **约束**: SecurityAlarmConstraint { doorState, magnetPos }
- **图表**: 门窗开闭状态 + 电路状态 + LED/蜂鸣

### F14. light-control-switch (光控开关)
- **物理**: 光敏电阻分压 + 三极管开关 + 继电器驱动路灯
- **参数**: `lightIntensity`, `threshold`
- **约束**: LightControlSwitchConstraint { lightIntensity, threshold }
- **图表**: 光强-时间 + LED 亮灭状态

---

## 阶段 G: 选必三 37 实验 (新建 26 Model)

### G1. diffusion (扩散现象)
- **物理**: 浓度扩散 Fick 定律 J = -D·dC/dx; 均方位移 ∝ t
- **参数**: `temperature`, `mode` ('gas' | 'liquid'), `initialConcentration`, `particleCount`
- **约束**: DiffusionConstraint { temperature, mode, particleCount }
- **图表**: 浓度-位置 (分布随时间展宽), 均方位移 ~ t 线性

### G2. brownian-motion (布朗运动)
- **物理**: 液体分子无规则撞击悬浮微粒; 微粒越小、温度越高运动越激烈
- **参数**: `particleRadius`, `liquidTemp`, `fluidViscosity`, `duration`
- **约束**: BrownianMotionConstraint { particleRadius, liquidTemp, fluidViscosity }
- **图表**: 微粒轨迹 (x-y), 位移平方-时间 线性

### G3. molecular-force (分子间作用力)
- **物理**: r=r₀ 合力为零; r<r₀ 斥力; r>r₀ 引力; 弹簧类比 F-r 关系
- **参数**: `rRange`, `epsilon` (势阱深度), `sigma` (分子直径)
- **约束**: MolecularForceConstraint { rRange, epsilon, sigma }
- **公式**: `U(r) = 4ε[(σ/r)¹² - (σ/r)⁶]` (Lennard-Jones)
- **图表**: U-r 势能曲线, F-r 力曲线, r₀ 标记

### G4. molecular-spring (分子间引力 铅块实验)
- 复用 molecular-force (把势能曲线映射到铅块拉开的力学现象)

### G5. liquid-mixing (酒精与水混合)
- **物理**: 分子间隙 → 混合后体积减小
- **参数**: `volumeWater`, `volumeAlcohol`
- **约束**: LiquidMixingConstraint { volumeWater, volumeAlcohol }
- **图表**: 混合前后体积对比, ΔV-比例图

### G6. oil-film (油膜法测分子大小)
- **物理**: 单分子油膜 d = V/S
- **参数**: `oilConcentration`, `dropsPerMl`, `filmArea`
- **约束**: OilFilmConstraint { oilConcentration, dropsPerMl, filmArea }
- **图表**: 油膜面积方格计数, 分子直径直方图

### G7. melting-curve (晶体熔化)
- **物理**: 晶体有固定熔点, 熔化吸热温度不变; 非晶体无固定熔点
- **参数**: `mode` ('crystal' | 'noncrystal'), `meltingPoint`, `heatingRate`
- **约束**: MeltingCurveConstraint { mode, meltingPoint, heatingRate }
- **图表**: T-t 曲线 (平台), 物态标记 (固/固液共存/液)

### G8. surface-tension (表面张力)
- **物理**: 液面收缩 (表面层分子稀疏, f=σ·L)
- **参数**: `liquidMode` ('water' | 'mercury'), `sliderLength`, `temperature`
- **约束**: SurfaceTensionConstraint { liquidMode, sliderLength, temperature }
- **图表**: 棉线圈形状 (液膜收缩), 拉力-σL 直线

### G9. capillary (毛细现象)
- **物理**: 浸润上升/不浸润下降, h ∝ 1/r
- **公式**: `h = 2σ·cosθ/(ρgr)`
- **参数**: `tubeRadius`, `liquidMode` ('water' | 'mercury'), `materialMode` ('glass' | 'paraffin')
- **约束**: CapillaryConstraint { tubeRadius, liquidMode, materialMode }
- **图表**: h-1/r 直线, 弯月面形状

### G10. wetting (浸润与不浸润)
- **物理**: 附着层分子力为斥力→浸润, 为引力→不浸润; 接触角判据
- **参数**: `liquidMode`, `surfaceMode`
- **约束**: WettingConstraint { liquidMode, surfaceMode }
- **图表**: 接触角图示 (+ 水在玻璃 < 90°, 水银在玻璃 > 90°)

### G11. liquid-crystal (液晶光学性质)
- **物理**: 光学各向异性, 随温度/电压变化
- **参数**: `temperature`, `voltage`, `mode` ('nematic' | 'cholesteric')
- **约束**: LiquidCrystalConstraint { temperature, voltage, mode }
- **图表**: 透光强度-温度/电压, 颜色变化

### G12. joule-mechanical (焦耳热功当量)
- **物理**: W = mgh·n (重物下落 n 次), Q = McΔt, 热功当量 J = W/Q ≈ 4.18 J/cal
- **参数**: `mass`, `height`, `drops`, `waterMass`, `specificHeat`
- **约束**: JouleMechanicalConstraint { mass, height, drops, waterMass, specificHeat }
- **图表**: W-t, Q-t, J-W/Q 直线

### G13. joule-electrical (焦耳电热实验)
- **物理**: W = UIt, Q = McΔt
- **参数**: `voltage`, `current`, `time`, `waterMass`
- **约束**: JouleElectricalConstraint { voltage, current, time, waterMass }
- **图表**: W-t, Q-t, W-Q 线性

### G14. adiabatic-compression (压缩点火)
- **物理**: 绝热压缩 ΔU = W, 气体温度升至燃点
- **公式**: `T₂ = T₁·(V₁/V₂)^(γ-1)` (γ=Cp/Cv)
- **参数**: `initialTemp`, `compressionRatio`, `gamma`, `ignitionTemp`
- **约束**: AdiabaticCompressionConstraint { initialTemp, compressionRatio, gamma, ignitionTemp }
- **图表**: T-V 曲线 (绝热线), p-V 图, 是否点燃标记

### G15. heat-transfer (热传递三方式)
- **物理**: 传导、对流、辐射
- **参数**: `mode` ('conduction' | 'convection' | 'radiation'), `materialType`, `temperatureDiff`
- **约束**: HeatTransferConstraint { mode, materialType, temperatureDiff }
- **图表**: 钢珠脱落顺序 (传导), 对流循环 (墨水示踪), 辐射 (黑/白瓶温度升速)

### G16. energy-transformation (能量转化与守恒演示)
- **物理**: 重力势能 ↔ 动能 ↔ 电能 ↔ 光/热能 ↔ 化学能
- **参数**: `mode` (能量转换器类型)
- **约束**: EnergyTransformationConstraint { mode }
- **图表**: 能量flow Sankey 图, 各形式能量比例

### G17. perpetuum-mobile (第二类永动机)
- **物理**: 卡诺效率 η = 1 - T₂/T₁; 开尔文表述 — 不能把热量100%转成功
- **参数**: `hotTemp`, `coldTemp`, `mode`
- **约束**: PerpetuumMobileConstraint { hotTemp, coldTemp, mode }
- **图表**: T-S 图, η-T₂/T₁ 关系, 热流方向

### G18. heat-direction (热传导方向性)
- **物理**: 克劳修斯表述 — 热量自发从高温→低温
- **参数**: `hotTemp`, `coldTemp`, `time`, `thermalConductivity`
- **约束**: HeatDirectionConstraint { hotTemp, coldTemp, thermalConductivity }
- **图表**: T-t (双物体趋同), 热平衡终温标记

### G19. alpha-scattering (α 粒子散射)
- **物理**: 库仑散射 — 绝大多数直线穿过/少数偏转/极少数反弹 → 核式结构
- **公式**: `b = (q₁q₂)/(4πε₀m_αv²)·cot(θ/2)` (碰撞参数)
- **参数**: `alphaEnergy`, `targetZ` (核电荷数), `foilThickness`, `nParticles`
- **约束**: AlphaScatteringConstraint { alphaEnergy, targetZ, foilThickness, nParticles }
- **图表**: 散射角分布 (绝大多数/少数/极少数比例), 轨迹 x-y 平面 (椭圆双曲线)

### G20. black-body (黑体辐射)
- **物理**: 维恩位移律 λ_m·T = b; 斯特藩-玻尔兹曼 E = σT⁴
- **参数**: `temperature`, `freqRange`
- **约束**: BlackBodyConstraint { temperature }
- **图表**: 辐射光谱 (峰值随 T 移动), λ_m-1/T 线性, E-T⁴ 线性

### G21. electron-diffraction (电子衍射)
- **物理**: 德布罗意波长 λ = h/√(2meU); 多晶衍射环
- **参数**: `accVoltage`, `crystalLattice`
- **约束**: ElectronDiffractionConstraint { accVoltage, crystalLattice }
- **图表**: λ-U 关系 (λ∝1/√U), 衍射环半径

### G22. radiation-deflection (放射线磁场偏转)
- **物理**: qvB = mv²/r → r = mv/qB; α 偏转半径 > β; γ 不偏转
- **参数**: `Bfield`, `particleType` (alpha|beta|gamma), `particleEnergy`
- **约束**: RadiationDeflectionConstraint { Bfield, particleType, particleEnergy }
- **图表**: 三种粒子轨迹对比, r-1/qB 直线

### G23. decay-statistics (衰变统计规律)
- **物理**: 泊松分布 (小 N) → 高斯分布 (大 N > 20); σ ≈ √N̄
- **参数**: `meanCount`, `nTrials`, `experimentTime`
- **约束**: DecayStatisticsConstraint { meanCount, nTrials, experimentTime }
- **图表**: 频数直方图 + 高斯拟合, σ-√N̄ 线性

### G24. cosmic-ray (宇宙射线)
- **物理**: 宇宙射线主要为 μ 子, 穿透力强, 计数率 vs 高度/屏蔽
- **参数**: `altitude`, `shieldingMode` ('air' | 'lead' | 'water')
- **约束**: CosmicRayConstraint { altitude, shieldingMode }
- **图表**: 计数率-高度关系, 不同屏蔽材料对比

### G25. neutron-discovery (中子发现 — 查德威克)
- **物理**: 动量守恒 + 能量守恒 → m_n ≈ 1.0087u
- **参数**: `alphaEnergy`, `targetMass`
- **约束**: NeutronDiscoveryConstraint { alphaEnergy, targetMass }
- **图表**: 反冲核动能 vs 靶核类型 (氢 vs 氮气), m_n 计算结果

### G26. fission-chain (核裂变链式反应)
- **物理**: ²³⁵U + n → Ba + Kr + 3n + 200MeV; k=1 临界, k>1 超临界, k<1 次临界
- **参数**: `multiplicationFactor`, `generations`, `initialNeutrons`
- **约束**: FissionChainConstraint { multiplicationFactor, generations, initialNeutrons }
- **图表**: 裂变数-t (指数增长/恒定/衰减), 累计能量-G 直线

---

## 复用 Model 列表

### 必修一
- air-track → 气轨测速度
- uniform-accelerated → 探究速度随时间变化 + 传感器测速度
- free-fall → 牛顿管 + 测 g
- hooke-law → 胡克定律
- sliding-friction → 摩擦力大小方向 + 滑动摩擦力影响因素
- force-composition → 力的合成
- newton-third-law → 牛顿第三定律
- newton-first-law → 阻力对运动影响/伽利略理想斜面
- newton-second-law → 探究 a-F, a-m

### 必修二
- projectile → 探究平抛+传感器研究平抛
- circular-motion → 感受向心力+向心力公式+传感器向心力+离心现象
- em-combined → 平抛+斜抛(飞镖)
- orbital → 行星运动+人造卫星
- energy-conservation → 动能定理+机械能守恒
- free-fall → 机械能守恒自由落体+机械能研究
- air-track → 气垫导轨验证机械能守恒
- simple-pendulum → 动能势能转化
- spring → 弹性势能转化+探究弹性势能表达式

### 必修三
- electric-field → 电场线+加速偏转
- circuit → 测电阻率+小灯泡+路端电压
- magnetic-field → 奥斯特+通电导线磁场+感应电流条件
- electromagnetic → 电磁波发射接收
- capacitor → 充放电+传感器放电

### 选必一
- momentum → 动量守恒(3a~c)
- collision → 碰撞不变量+两球碰撞+摆球验证
- simple-pendulum → 小球 x-t 图+单摆周期+摆球验证+周期因素+周期摆长关系+测 g
- spring → 弹簧振子图像+传感器振动
- mechanical-wave → 绳波+人浪+水波+波的叠加+水槽干涉
- refraction → 折射率+全反射+有机玻璃棒导光+水流导光
- interference → 双缝+白光+传感器+玻璃片+测波长

### 选必二
- magnetic-force → 安培力方向+安培力因素+阴极射线+带电粒子圆周
- em-induction → 感应条件+楞次+法拉第定律+互感+自感
- ac-current → 交变电流产生+示波器+有效值+变压器
- lc-oscillator → LC 振荡+周期

### 选必三
- gas-law → 玻意耳+查理+盖吕萨克
- photoelectric → 光电效应+极限频率+光电管
- bohr → 氢原子光谱+连续与线状光谱
- radioactive → 云室+盖革计数器+宇宙射线

---

## 实现的优先级

阶段 A (cleanup) → B (必修一) → C (必修二) → F (选必二) → E (选必一) → D (必修三) → G (选必三) → H (UI scaffolding)

**为何把 选必二放在 选必一前面?**
- 选必二 Model 复用率高 (80% 复用现有 Model), 快速出成果
- 选必一的 19/20 复用, 选必二 18/28 复用 — 都好做
- 选必三新建比例最高 (26/37 = 70%), 适合在熟练后做

---

## 每 Model 的标准检查清单

- [ ] `physics-core/src/types/problem.ts` 添加 ModelType + Constraint 接口
- [ ] `physics-core/src/models/<name>.ts` 实现继承 PhysicsModelBase
- [ ] `physics-core/tests/unit/<name>.test.ts` ≥ 5 个断言
- [ ] `physics-core/src/solver/solver-router.ts` 注册
- [ ] `physics-core/src/index.ts` 导出
- [ ] `cd physics-core && npm run build` 通过
- [ ] `cd visualisation/src/scenes/sceneRegistry.ts` 添加 SceneConfig
- [ ] `visualization/src/components/layout/SceneSelector.tsx` 添加分类入口
- [ ] npm test + npm run build 全绿
