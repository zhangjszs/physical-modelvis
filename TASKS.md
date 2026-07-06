# PhysVis 全实验覆盖 — 开发任务清单

> 覆盖人教版高中物理 **6 册 / 27 章 / 176 个实验**
>
> 工作流: **A (清理) ✅ → B~H (教科书阶段, 顺序执行)**
>
> 每新建 physics-core Model 的详细公式见 `docs/experiment-design-spec.md`
> 通用实现规范 (7 步文件变更清单) 见 `docs/WORKFLOW.md`

---

## 流程约定

1. **每个任务独立 commit** — 通过门禁后立即 commit
2. **门禁 (全部通过才允许 commit)**:
   - `npm test` (全绿)
   - `npm run build` (通过)
3. **参考文档** — 每个新 Model 的公式/参数/图表定义在 `docs/experiment-design-spec.md` 阶段小节中
4. **实现规范** — 每个新物理 Model 的 7 步注册流程见 `docs/WORKFLOW.md`

---

## 任务列表

- [x] **阶段 A: 旧代码清理** (commit `2c86ece`)
  - 删除旧版 physim/ js/ css/ problems/ templates/ 旧 test
  - 更新 package.json
  - 新增 TASKS.md / docs/WORKFLOW.md / docs/experiment-design-spec.md

- [x] **阶段 B: 必修一 20 实验** (7 新 Model + 13 复用)
  - **新建 Model**: ticker-timer, reaction-time, galileo-incline, center-of-gravity, micro-deformation, inertia, overweight (共 7 个)
  - **复用**: air-track, uniform-accelerated, free-fall, hooke-law, sliding-friction, force-composition, newton-third-law, newton-first-law, newton-second-law
  - **退出条件**: `npm test && npm run build` → `git commit -m "feat: 必修一 20 实验全覆盖"`

- [x] **阶段 C: 必修二 25 实验** (8 新 Model + 17 复用)

- [x] **阶段 D: 必修三 26 实验** (14 新 Model + 12 复用)

- [x] **阶段 E: 选必一 40 实验** (13 新 Model + 27 复用) (commit `cbc4f4c`)
  - **新建 Model**: projectile-collision, double-pendulum, forced-vibration, resonance, sound-waveform, water-diffraction, sound-interference, doppler, thin-film, hologram, single-slit, diffraction-grating, polarization (共 13 个)
  - **复用**: momentum (×3), collision (×6), simple-pendulum (×12), spring (×4), mechanical-wave (×6), refraction (×4), interference (×6)
  - **退出条件**: `npm test && npm run build` → ✅ 722 tests 全绿

- [x] **阶段 F: 选必二 28 实验** (14 新 Model + 14 复用) (commit `8b1b4d6`)
  - **新建 Model**: current-balance, eddy-current, em-damping, mutual-inductance, self-inductance, em-wave-communication, em-spectrum, hall-effect, reed-switch, photoresistor, thermistor, strain-gauge, security-alarm, light-control-switch (共 14 个)
  - **复用**: magnetic-force (×4), em-induction (×5), ac-current (×4), lc-oscillator (×2)
  - **退出条件**: `npm test && npm run build` → ✅ 750 tests 全绿

- [x] **阶段 G: 选必三 37 实验** (25 新 Model + 12 复用) (commit `d71844b`)
  - **新建 Model**: diffusion, brownian-motion, oil-film, liquid-mixing, molecular-force, melting-curve, surface-tension, capillary, wetting, liquid-crystal, joule-mechanical, joule-electrical, adiabatic-compression, heat-transfer, energy-transformation, perpetuum-mobile, heat-direction, alpha-scattering, black-body, electron-diffraction, radiation-deflection, decay-statistics, cosmic-ray, neutron-discovery, fission-chain (共 25 个)
  - **复用**: gas-law (×3), photoelectric (×3), bohr (×2), radioactive (×3)
  - **退出条件**: `npm test && npm run build` → ✅ 800 tests 全绿

- [x] **阶段 H: UI 全面扩展** (commit `d6d2773`)
  - SceneSelector 列出全部注册的 scene (按 6 大教材分类)
  - README "9 个物理场景" → "176 个实验场景"
  - **退出条件**: `npm test && npm run build` → ✅

---

## 进度追踪

| 阶段 | 状态 | 实验 | 新建 Model | commit |
|------|------|------|-----------|--------|
| **A** | ✅ done | - | - | `2c86ece` |
| **B** | 🔄 next | 20 | 7 | — |
| **C** | ⏳ | 25 | 8 | — |
| **D** | ⏳ | 26 | 14 | — |
| **E** | ✅ done | 40 | 13 | `cbc4f4c` |
| **F** | ✅ done | 28 | 14 | `8b1b4d6` |
| **G** | ✅ done | 37 | 25 | `d71844b` |
| **H** | ✅ done | — | — | `d6d2773` |
| **合计** | | **176** | **~81** | **8 commits** |

---

## 实现指南

### 每新建 physics-core Model 的标准流程 (7 步)

1. 编辑 `physics-core/src/types/problem.ts`
   - 添加 ModelType union variant
   - 添加 Constraint interface (如果新类型)
   - 在 PhysicsProblem.constraints 扩展
2. 新建 `physics-core/src/models/<name>.ts`
   - 继承 PhysicsModelBase
   - 完整 JSDoc 中文注释
   - 实现 solve() 返回 SimulationResult
   - charts + diagnostics + explanation
3. 新建 `physics-core/tests/unit/<name>.test.ts`
   - ≥ 5 个断言 (元数据+正例+边界)
4. 编辑 `physics-core/src/solver/solver-router.ts`
   - import + registerModel()
5. 编辑 `physics-core/src/index.ts`
   - export 新 Model
6. `cd physics-core && npm run build` — 重建 dist
7. 新建 SceneConfig:
   - 编辑 `visualization/src/scenes/sceneRegistry.ts` 添加 entry
   - 编辑 `visualization/src/components/layout/SceneSelector.tsx` 添加入口

### 关键约定

- 每个场景必须有 `duration` 参数
- 图表 xLabel/yLabel 中文
- 公式命名使用 `公式名: 公式` 的键值对
- 复用现有 Model 时通过不同的 constraints 参数实现差异化
- Canvas 绘制场景也过 Model.solve() 接口 (即使不真的解方程)

### 每阶段验收

```bash
npm test               # physics-core + visualization 全绿
npm run build          # vite build ≤ 5s
```

通过后立即 commit, 格式: `feat: <教材名> <N> 个实验: <一句话说明>`

---

## 新 Loop: Stage I/J/K — 可视化缺口填补 (方向 ①②④)

> 审计发现: 68 个 physics-core Model 无 SceneConfig, FormulaPanel 只覆盖 15 个场景, 特殊渲染器空白
>
> 工作流: I (SceneConfig) → J (定制渲染器) → K (FormulaPanel)
>
> 每个任务独立 commit, 通过门禁 `npm test && npm run build && cd visualization && npx tsc --noEmit`

### 阶段 I: SceneConfig 创建 (68 个孤立 Model 挂入 sceneRegistry)

- [x] **I1: 选必一 13 个 Model SceneConfig** (commit `d30f0d8`)
  - 模型: double-pendulum, forced-vibration, resonance, projectile-collision, sound-waveform, water-diffraction, sound-interference, doppler, thin-film, hologram, single-slit, diffraction-grating, polarization
  - 文件: `visualization/src/scenes/sceneRegistry.ts`
  - 参考: 现有 SceneConfig 的 `parameters` + `buildProblem` 模式 (如 projectile)
  - 参数规则: 每个 Model 至少 3 个可调参数 + duration 必含
  - buildProblem: constraints key 与 model 的 `requiredParameters` 对齐

- [x] **I2: 选必二 14 个 Model SceneConfig** (commit `45d46fc`)
  - 模型: current-balance, eddy-current, em-damping, mutual-inductance, self-inductance, em-wave-communication, em-spectrum, hall-effect, reed-switch, photoresistor, thermistor, strain-gauge, security-alarm, light-control-switch
  - 文件: `visualization/src/scenes/sceneRegistry.ts`
  - 参考: 选必二模型 constraints 接口定义 (reed-switch 用 ReedSwitchConstraint 等)

- [x] **I3: 选必三 (热学) 10 个 Model SceneConfig** (commit `8e2088f`)
  - 模型: diffusion, brownian-motion, oil-film, liquid-mixing, molecular-force, melting-curve, surface-tension, capillary, wetting, liquid-crystal
  - 文件: `visualization/src/scenes/sceneRegistry.ts`

- [x] **I4: 选必三 (热力学) 7 个 Model SceneConfig**
  - 模型: joule-mechanical, joule-electrical, adiabatic-compression, heat-transfer, energy-transformation, perpetuum-mobile, heat-direction
  - 文件: `visualization/src/scenes/sceneRegistry.ts`

- [x] **I5: 选必三 (原子核物理) 9 个 Model SceneConfig** (f2ae8d7)
  - 模型: alpha-scattering, black-body, electron-diffraction, radiation-deflection, decay-statistics, cosmic-ray, neutron-discovery, fission-chain, bohr (bohr 文件 modelType='bohr', 已存在 sceneId 'bohr' 指向 'bohr-model')
  - 文件: `visualization/src/scenes/sceneRegistry.ts`

- [x] **I6: 必修三 11 个 Model SceneConfig** (commit `974a815`)
  - 模型: capacitor-charge, parallel-plate-capacitor, load-voltage, resistance-law, coulomb-force-explore, electroscope, electrostatic-induction, electrostatic-shielding, faraday-cup, ampere-force, em-wave-hertz (实际 11 个, 与 ModelType 注册一致)
  - 文件: `visualization/src/scenes/sceneRegistry.ts`

- [x] **I7: 仪器测量 + 工具场景 SceneConfig** (commit `7428379`)
  - 模型: multimeter (多用电表), vernier-caliper (游标卡尺), micrometer (螺旋测微器)
  - 这三个需要特殊 canvas 渲染, 在后续 Stage J 处理定制渲染器
  - 文件: `visualization/src/scenes/sceneRegistry.ts`

### 阶段 J: 定制 Canvas 渲染器 (Special Renderers)

> 通用 `CanvasRenderer.ts` 已覆盖轨迹/向量/场线; 以下场景需要定制渲染

- [x] **J1: 双摆/共振/受迫振动渲染器** (commit `3802d04`)
  - 文件: `visualization/src/rendering/chapter2Scenes.ts`
  - 内容: 双摆支架+双线+摆球+相位标记; 共振振幅-频率曲线+当前点; 受迫振动相位差可视化
  - 参考现有 `chapter3Scenes.ts` 模式
  - 3 个渲染器: `drawDoublePendulumSyncScene`, `drawForcedVibrationScene`, `drawResonanceCurveScene`

[x] **J2: 波动场景渲染器 (声波/水波/多普勒/干涉/衍射)** (commit `9ad468f`)
  - 文件: `visualization/src/rendering/wave optScenes.ts`
  - 内容: 波前圆+视疏区域(声波); 水波涟漪+衍射暗区; 多普勒频移+波纹压缩; 双缝干涉条纹; 单缝衍射光强包络; 薄膜等厚干涉
  - 使用 textureFactory 波纹纹理

- [x] **J3: 电磁装备渲染器 (电流天平/电磁阻尼/互感自感/电磁振荡)** (commit `fd8f80c`)
  - 文件: `visualization/src/rendering/emEquipmentScenes.ts`
  - 内容: U 形磁铁+水平导体棒+砝码+指针(电流天平); 铝框+阻尼振动曲线; 双线圈+感应电动势波形; LC 振荡电流+磁场能/磁场能条

- [x] **J4: 量子/原子核渲染器 (α散射/衰变/裂变链)** (commit `e6c43e8`)
  - 文件: `visualization/src/rendering/nuclearScenes.ts`
  - 内容: 金核(Z可配)+α 粒子双曲线轨迹(5 条不同瞄准距)+大角度偏转闪烁; 泊松直方图+高斯拟合±σ 区+N 计数动画; 裂变级联树+U-235 发光+碎片+200 MeV/次+临界判别
  - sceneId: alpha-scattering, decay-statistics, fission-chain
  - 3 个渲染器: drawAlphaScatteringScene, drawDecayStatisticsScene, drawFissionChainScene

- [x] **J5: 热学/分子渲染器 (扩散/布朗/熔化曲线/热传递/表面张力/毛细/液晶)** (commit `bfcb2f5`)
  - 文件: `visualization/src/rendering/thermalScenes.ts`
  - 内容: 分子粒子随机运动+浓度梯度+菲克定律(扩散); 布朗粒子抖动+轨迹尾巴+爱因斯坦公式; 熔化/凝固 T-t 平台段+晶格/液态对照; 三种传热对比(传导/对流/辐射)+Qdot-t 曲线; 表面张力液膜+吊环受力; 毛细弯月面+Jurin 公式; 液晶分子排列+透射率-温度
  - sceneId: diffusion, brownian-motion, melting-curve, heat-transfer, surface-tension, capillary, liquid-crystal
  - 7 个渲染器: drawDiffusionScene, drawBrownianScene, drawMeltingCurveScene, drawHeatTransferScene, drawSurfaceTensionScene, drawCapillaryScene, drawLiquidCrystalScene

- [x] **J6: 传感器/控制电路渲染器 (霍尔元件/光敏/热敏/干簧管/应变片/报警电路/光控开关)** (commit `0122d1c`)
  - 文件: `visualization/src/rendering/sensorScenes.ts`
  - 内容: 7 个渲染器:
    1. drawHallEffectScene — 3D 霍尔片+载流子偏转+电势差表+VH=IB/nqt 公式
    2. drawPhotoresistorScene — LDR 符号+R-L 双对数曲线+小灯+阈值开关逻辑
    3. drawThermistorScene — NTC 温度计+R-T 指数衰减+R0exp(B(1/T-1/T0))
    4. drawReedSwitchScene — 玻璃管+铁磁簧片+LED+磁铁滑杆+磁滞回线
    5. drawStrainGaugeScene — 应变片变形+惠斯通电桥+ΔR/R=Kε+ΔU-ε 曲线
    6. drawSecurityAlarmScene — 门框+门磁+干簧管+非门逻辑+LED/蜂鸣器
    7. drawLightControlSwitchScene — LDR 分压+三极管+继电器+24h 照度曲线
  - sceneId: hall-effect, photoresistor, thermistor, reed-switch, strain-gauge, security-alarm, light-control-switch

### 阶段 K: FormulaPanel 覆盖 (FORMULA_MAP 扩展)

> 现有 15 个场景, 需扩展到覆盖所有注册场景
> 每个新 sceneId 在 FormulaPanel FORMULA_MAP 内建立对应 formula 定义

- [x] **K1: 选必一 13 场景公式** (commit `4be69f3`)
  - 文件: `visualization/src/components/formula/FormulaPanel.tsx`
  - 内容: 双摆周期公式 / 受迫振动+共振条件 / 动量守恒 (平抛碰撞) / 声波波形+波长公式 / 水波衍射条件 / 多普勒频移公式 / 薄膜干涉 2nd=kλ / 全息干涉记录再现 / 单缝衍射 asinθ=kλ / 光栅方程 dsinθ=kλ / 偏振马吕斯定律

- [x] **K2: 选必二 14 场景公式** (commit `e36100d`)
  - 文件: `visualization/src/components/formula/FormulaPanel.tsx`
  - 内容: 电流天平 F=BIL / 涡流热功率 / 电磁阻尼力 / 互感 MΦ / 自感 L=IΦ / 电磁波发射功率 / 电磁波谱排序 / 霍尔电压 VH=IB/nqd / 干簧管原理 / 光敏电阻 R-L 曲线 / 热敏电阻 R-T 曲线 / 应变片 ΔR/R=Gε / 报警电路逻辑

- [x] **K3: 选必三 (热学+热力学) 17 场景公式** (commit `aec7372`)
  - 文件: `visualization/src/components/formula/FormulaPanel.tsx`
  - 内容: 扩散菲克定律 / 布朗运动爱因斯坦公式 / 油膜法 d=V/S / 分子力曲线 / 熔化曲线平台 / 表面张力系数 / 毛细上升 / 润湿接触角 / 液晶光学各向异性 / 焦耳热 Q=I²Rt / 绝热方程 PVγ=常数 / 热传导傅里叶定律 / 能量守恒 / 热力学第二定律 / 热机效率上限
  - 10 热学 + 7 热力学 = 17 场景, 每个 ≥3 条公式 + ≥3 tips

- [~] **K4: 选必三 (原子核) + 必修三 场景公式**
  - 文件: `visualization/src/components/formula/FormulaPanel.tsx`
  - 内容: 卢瑟福散射公式 / 黑体辐射维恩位移+斯忒藩-玻尔兹曼 / 电子衍射关系 / 放射性衰变 N=N0e^{-λt} / 宇宙线簇射 / 中子裂变 / 波尔轨道能级 / 电容 C=εS/4πkd / 欧姆定律 / 库仑定律 / 安培力

---

## 新 Loop 进度追踪

| 阶段 | 状态 | 任务 |
|------|------|------|
| **I** | ✅ done | SceneConfig ×68 (I1-I7) |
| **J** | ✅ done | 定制渲染器 ×6 (J1-J6 done) |
| **K** | 🔄 next (K2 done → K3) | FormulaPanel 扩展 ×4 (K2 done) |
| **合计** | | **17 任务**, 覆盖 68 个 Model 可视化 + 36 个公式集 + 6 个渲染器 |

