# PhysVis 全实验覆盖 — 开发任务清单

> 覆盖人教版高中物理 **6 册 / 27 章 / 176 个实验**
>
> 当前已有 32 个 physics-core Model + 32 个 Scene，**目标 95 Model + 176 Scene**
>
> 工作流: **A (清理) → B~H (教科书阶段) → commit 迭代**
>
> 每个新建 Model 的详细公式见 `docs/experiment-design-spec.md`。
> 通用实现规范见 `docs/WORKFLOW.md`。

---

## 📋 流程约定

1. **每阶段独立 commit** — 完成一个阶段 + 通过门禁 → commit → Tag 阶段
2. **门禁 (全部通过才允许 commit)**:
   - `npm test` (全 289+/25+ tests 全绿)
   - `npm run build` (≤ 5s)
   - `npx tsc --noEmit -p visualization/tsconfig.json` 类型检查
3. **代码审查** — 按 `AGENTS.md > 代码审查约定` 7 个维度过一遍
4. **commit 格式** — `feat: <阶段名> (<N> 个实验): <具体说明>`
5. **每新建 Model 参考 `docs/experiment-design-spec.md`** 中的公式/参数/图表定义

---

## 📊 进度总览

| 阶段 | 教材 | 实验数 | 复用 | 新建 Model | 状态 |
|------|------|--------|------|-----------|------|
| **A** | 清理 | - | - | - | 🔄 待做 |
| **B** | 必修一 | 20 | 11 | 9 | ⏳ 待做 |
| **C** | 必修二 | 25 | 9 | 16 | ⏳ 待做 |
| **D** | 必修三 | 26 | 14 | 12 | ⏳ 待做 |
| **E** | 选必一 | 40 | 24 | 16 | ⏳ 待做 |
| **F** | 选必二 | 28 | 18 | 10 | ⏳ 待做 |
| **G** | 选必三 | 37 | 11 | 26 | ⏳ 待做 |
| **H** | UI 扩展 | - | - | - | ⏳ 待做 |
| **合计** | 6 册 | **176** | 87 | **89** | ~95 Model 总数 |

---

## 🔴 阶段 A: 旧代码清理

**目标**: 提交已在 working tree 中删除的 32 个旧版文件

**步骤**:
1. `git add -A` (stage deletions + package.json/scripts 更新)
2. `git commit -m "chore: 清理旧版代码 (physim/旧引擎, js/旧SPA, css, problems, templates, 旧test)"`
3. npm test + npm run build 通过

---

## 🟠 阶段 B: 必修一 20 实验 (新建 9 Model)

新建 Model:
1. `ticker-timer` — 打点计时器 (vₙ = (xₙ+xₙ₊₁)/2T)
2. `reaction-time` — 测反应时间 t=√(2h/g)
3. `galileo-incline` — 伽利略斜面理想实验
4. `center-of-gravity` — 悬挂法确定重心
5. `micro-deformation` — 光杠杆放大微小形变
6. `inertia` — 惯性实验组合
7. `overweight` — 超重和失重 (N=m(g±a))

复用 Scene (参数/UI 扩展):
- air-track, uniform-accelerated, free-fall, hooke-law, sliding-friction, force-composition, newton-third-law, newton-first-law, newton-second-law

退出条件:
- [ ] 9 新 Model + 测试通过
- [ ] 20 SceneConfig 注册
- [ ] npm test + build 通过
- [ ] `git commit -m "feat: 必修一 20 个实验全覆盖"`

---

## 🟡 阶段 C: 必修二 25 实验 (新建 16 Model)

新建 Model:
1. `curve-velocity-direction` — 曲线运动速度方向
2. `curve-condition` — 曲线运动条件
3. `motion-composition` — 蜡块运动合成分解
4. `transmission-belt` — 传动方式 (皮带/齿轮/摩擦轮/同轴)
5. `vertical-circle` — 竖直圆周最高点条件
6. `centrifugal` — 离心现象
7. `cavendish` — 卡文迪什扭秤测 G
8. `moon-earth-test` — 月地检验思想实验

复用 Scene:
- projectile (×3), circular-motion (×4), orbital (×2), energy-conservation (×4), free-fall (×2), air-track, simple-pendulum, spring (×2)

退出条件:
- [ ] 16 新 Model + 测试
- [ ] 25 SceneConfig
- [ ] npm test + build 通过
- [ ] `git commit -m "feat: 必修二 25 个实验全覆盖"`

---

## 🟢 阶段 D: 必修三 26 实验 (新建 12 Model)

新建 Model:
1. `electrostatic-induction` — 静电感应
2. `electroscope` — 验电器
3. `coulomb-force-explore` — 探究电荷间作用力因素
4. `electrostatic-shielding` — 静电屏蔽
5. `faraday-cup` — 法拉第圆筒
6. `capacitor-charge` — 电容充放电
7. `parallel-plate-capacitor` — 平行板电容器因素
8. `vernier-caliper` — 游标卡尺读数
9. `micrometer` — 螺旋测微器读数
10. `resistance-law` — 电阻定律
11. `multimeter` — 多用电表
12. `load-voltage` — 路端电压与 E/r 测量三法
13. `ampere-force` — 安培力因素
14. `em-wave-hertz` — 赫兹电磁波实验

复用 Scene:
- electric-field (×4), circuit (×3), magnetic-field (×3), em-induction (×2)

退出条件:
- [ ] 12 新 Model + 测试
- [ ] 26 SceneConfig
- [ ] npm test + build 通过
- [ ] `git commit -m "feat: 必修三 26 个实验全覆盖"`

---

## 🔵 阶段 E: 选必一 40 实验 (新建 16 Model)

新建 Model:
1. `projectile-collision` — 平抛验证动量守恒
2. `double-pendulum` — 两个单摆步调
3. `forced-vibration` — 受迫振动频率
4. `resonance` — 共振曲线
5. `sound-waveform` — 声音波形
6. `water-diffraction` — 水波衍射
7. `sound-interference` — 声音干涉
8. `doppler` — 多普勒效应
9. `thin-film` — 薄膜干涉
10. `hologram` — 全息照相
11. `single-slit` — 单缝衍射
12. `diffraction-grating` — 光栅衍射
13. `polarization` — 偏振光 (马吕斯定律)

复用 Scene:
- momentum (×3), collision (×6), simple-pendulum (×12), spring (×4), mechanical-wave (×6), refraction (×4), interference (×6)

退出条件:
- [ ] 13 新 Model + 测试
- [ ] 40 SceneConfig
- [ ] npm test + build 通过
- [ ] `git commit -m "feat: 选必一 40 个实验全覆盖"`

---

## 🟣 阶段 F: 选必二 28 实验 (新建 10+ Model)

新建 Model:
1. `current-balance` — 电流天平
2. `eddy-current` — 涡流现象
3. `em-damping` — 电磁阻尼与电磁驱动
4. `mutual-inductance` — 互感现象
5. `self-inductance` — 自感现象
6. `em-wave-communication` — 电磁波发射接收
7. `em-spectrum` — 电磁波谱
8. `hall-effect` — 霍尔元件
9. `reed-switch` — 干簧管
10. `photoresistor` — 光敏电阻
11. `thermistor` — 热敏电阻
12. `strain-gauge` — 电阻应变片
13. `security-alarm` — 门窗防盗报警
14. `light-control-switch` — 光控开关

复用 Scene:
- magnetic-force (×4), em-induction (×5), ac-current (×4), lc-oscillator (×2)

退出条件:
- [ ] 14 新 Model + 测试
- [ ] 28 SceneConfig
- [ ] npm test + build 通过
- [ ] `git commit -m "feat: 选必二 28 个实验全覆盖"`

---

## 🟤 阶段 G: 选必三 37 实验 (新建 25+ Model)

新建 Model:
1. `diffusion` — 扩散现象
2. `brownian-motion` — 布朗运动
3. `oil-film` — 油膜法测分子大小
4. `liquid-mixing` — 酒精与水混合
5. `molecular-force` — 分子间作用力 (Lennard-Jones)
6. `melting-curve` — 晶体熔化
7. `surface-tension` — 液体表面张力
8. `capillary` — 毛细现象
9. `wetting` — 浸润与不浸润
10. `liquid-crystal` — 液晶光学性质
11. `joule-mechanical` — 焦耳热功当量
12. `joule-electrical` — 焦耳电热实验
13. `adiabatic-compression` — 压缩点火
14. `heat-transfer` — 热传递三方式
15. `energy-transformation` — 能量转化与守恒
16. `perpetuum-mobile` — 第二类永动机
17. `heat-direction` — 热传导方向性
18. `alpha-scattering` — α 粒子散射
19. `black-body` — 黑体辐射
20. `electron-diffraction` — 电子衍射
21. `radiation-deflection` — 放射线磁场偏转
22. `decay-statistics` — 衰变统计规律
23. `cosmic-ray` — 宇宙射线
24. `neutron-discovery` — 中子发现
25. `fission-chain` — 核裂变链式反应

复用 Scene:
- gas-law (×3), photoelectric (×3), bohr (×2), radioactive (×3)

退出条件:
- [ ] 25 新 Model + 测试
- [ ] 37 SceneConfig
- [ ] npm test + build 通过
- [ ] `git commit -m "feat: 选必三 37 个实验全覆盖"`

---

## ⚫ 阶段 H: UI 全面扩展

**目标**: 全量 SceneSelector + problemAnalyzer + FormulaPanel

### H1. SceneSelector 全场景覆盖
当前 SCENE_CATEGORIES 仅列 15 scene，需要列出全部注册的 ~176 scene。
按 7 大教材分类扩展。

### H2. problemAnalyzer 关键词扩展
当前 SCENE_KEYWORDS 10 条，扩展到 ≥ 50 条覆盖全部新 sceneId。
关键词从 experiments/ 中提取 (实验名 → 同义/近义/描述词)。

### H3. FormulaPanel 公式扩展
FORMULA_MAP 每个新 scene 至少一组核心公式。

### H4. README/CLAUDE.md 更新
- README "9 个物理场景" → "176 个实验场景"
- CLAUDE.md 模型列表更新

退出条件:
- [ ] SceneSelector 列出全部注册的 scene
- [ ] problemAnalyzer 覆盖全部新 sceneId
- [ ] FormularMap 覆盖新 scene ≥ 70%
- [ ] npm test + build 通过
- [ ] `git commit -m "feat: SceneSelector + problemAnalyzer + FormulaPanel 全覆盖"`

---

## 📈 全部完成后的状态

- **physics-core Model**: ~95 个 (当前 32 + 新建 63)
- **Scene (tsx)**: 176 个 SceneConfig
- **SceneSelector 显示**: 176 个
- **Test count**: ≥ 500+ (每 Model ≥ 5 断言)
- **npm build**: 通过

---

## ⚠️ 注意事项

1. **不要为了测试而测试** — 每个断言必须验证物理意义的正确性
2. **静态场景也要有 Model** — 即使只是 Canvas 绘制, 也过 physics-core 的 Model.solve() 接口
3. **复用 Model 优先于新建** — 能用 constraint 参数表达的场景不要建新 Model
4. **不要破坏已有测试** — 新 Model 不能导致已有 289+ 测试失败
5. **中文 JSDoc 必须完整** — 每个 Model 必须有
6. **图表必须有中文标注** — xLabel/yLabel 中文
