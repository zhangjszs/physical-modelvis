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

- [ ] **阶段 F: 选必二 28 实验**
  - **新建 Model**: current-balance, eddy-current, em-damping, mutual-inductance, self-inductance, em-wave-communication, em-spectrum, hall-effect, reed-switch, photoresistor, thermistor, strain-gauge, security-alarm, light-control-switch (共 14 个)
  - **复用**: magnetic-force (×4), em-induction (×5), ac-current (×4), lc-oscillator (×2)
  - **退出条件**: `npm test && npm run build` → `git commit -m "feat: 选必二 28 实验全覆盖"`

- [ ] **阶段 G: 选必三 37 实验**
  - **新建 Model**: diffusion, brownian-motion, oil-film, liquid-mixing, molecular-force, melting-curve, surface-tension, capillary, wetting, liquid-crystal, joule-mechanical, joule-electrical, adiabatic-compression, heat-transfer, energy-transformation, perpetuum-mobile, heat-direction, alpha-scattering, black-body, electron-diffraction, radiation-deflection, decay-statistics, cosmic-ray, neutron-discovery, fission-chain (共 25 个)
  - **复用**: gas-law (×3), photoelectric (×3), bohr (×2), radioactive (×3)
  - **退出条件**: `npm test && npm run build` → `git commit -m "feat: 选必三 37 实验全覆盖"`

- [ ] **阶段 H: UI 全面扩展**
  - SceneSelector 列出全部 ~176 注册的 scene (按 7 大教材分类)
  - problemAnalyzer 关键词覆盖全部新 sceneId (≥ 50 条)
  - FormulaPanel FORMULA_MAP 覆盖新 scene ≥ 70%
  - README "9 个物理场景" → "176 个实验场景"
  - **退出条件**: `npm test && npm run build` → `git commit -m "feat: SceneSelector + problemAnalyzer + FormulaPanel 全覆盖"`

---

## 进度追踪

| 阶段 | 状态 | 实验 | 新建 Model | commit |
|------|------|------|-----------|--------|
| **A** | ✅ done | - | - | `2c86ece` |
| **B** | 🔄 next | 20 | 7 | — |
| **C** | ⏳ | 25 | 8 | — |
| **D** | ⏳ | 26 | 14 | — |
| **E** | ✅ done | 40 | 13 | `cbc4f4c` |
| **F** | ⏳ | 28 | 14 | — |
| **G** | ⏳ | 37 | 25 | — |
| **H** | ⏳ | — | — | — |
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
