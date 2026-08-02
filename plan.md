# PhysVis 后续工作计划 (plan.md)

> 汇总当前进行中的工作、阶段 3 渲染迁移、3D 修复交接、以及全部长期优化项的推进计划。
> 关联文档:`docs/rendering-physics-audit.md`(渲染迁移审计)、`3D_VERIFICATION_HANDOFF.md`(3D 修复交接)、`3D_RENDERING_FIXES_SUMMARY.md`(3D 前序修复)。

---

## 0. 当前状态快照 (2026-08-02)

- 分支 `fix/remove-claude-dir`,本地领先 main 6 个提交(均未 push)
- 已提交:`f69ea02`(磁场方向 bug 修复)、`31057c0`(L1 差分测试)、`20c5c9b`(阶段 3 首轮迁移)
- **工作树未提交**(第 2 批迁移,见阶段 A):
  - `physics-core/src/models/mechanical-wave.ts` — **干涉 dir2 符号 bug 修复**(原公式 `sin(ωt−kx)` 两列同向,无驻波;改为 `sin(ωt+dir2·kx)` 后 dir2=-1 产生真实驻波;旧测试是假阳性)
  - `physics-core/tests/unit/mechanical-wave.test.ts` — 驻波断言改为波节 x=(2n+1)λ/4 + tracked 轨迹振幅验证(λ=0.4 时波节/波腹均落 tracked 点)
  - `visualization/src/rendering/chapter4Scenes.ts` — inertia 迁移
  - `visualization/src/rendering/chapter5Scenes.ts` — projectile-collision 迁移
  - `visualization/src/rendering/waveOptScenes.ts` — sound-waveform 迁移
  - `visualization/src/rendering/mechanicalWaveScenes.ts` — mechanical-wave 迁移
  - `visualization/src/rendering/emEquipmentScenes.ts` — lc-oscillator 迁移
  - `visualization/tests/accuracy/single-source-contract.test.ts` — 契约测试 4 → 9
- 测试数:core 917 (65 files) + viz 397 (19 files) = 1314(契约扩展后需重跑确认,viz 预计 402)

---

## 阶段 A:第 2 批迁移收尾 — 验证 + 提交(立即)

1. 重跑 physics-core 全量测试(`cd physics-core && npx.cmd vitest run`)确认 917
2. 重新 build core(`cd physics-core && npm run build`),再跑 visualization 全量测试
3. `npx.cmd prettier --write` + `npx.cmd eslint` 检查所有改动文件
4. 更新 README 测试数 + `docs/rendering-physics-audit.md` 迁移进展表
5. 走代码审查(AGENTS.md 清单)→ `npm run precheck` → 提交
   - 建议 commit:`refactor(render): 阶段 3 第 2 批迁移 — 力学剩余 + 波形类读引擎结果 (含机械波干涉符号 bug 修复)`

---

## 阶段 B:阶段 3 渲染单一真源迁移(继续推进)

目标:有引擎数据的场景,渲染层必须消费引擎结果(`getFrame` / charts 二分插值),无结果时回退自算。
契约由 `visualization/tests/accuracy/single-source-contract.test.ts` 固化。

### B1. 波形类剩余(读引擎 charts)
| 场景 | 状态 | 说明 |
|---|---|---|
| sound-waveform | ✅ 已迁 | 行波快照等效时移采样 waveform_t |
| mechanical-wave | ✅ 已迁(+引擎 bug 修复) | 9 tracked 质点插值,横/纵/驻波 |
| lc-oscillator | ✅ 已迁 | q/i/Ee/Em 读 x_t/y_t/ke_t/pe_t(键名注意!) |
| water-diffraction | ✅ 已迁(+引擎 bug 修复) | HUD 读 maxValues,契约测试 6 例 |
| em-wave-hertz | ✅ 已迁(+场景契约修复) | HUD 读 maxValues,补虚拟 antenna |
| sound-interference | ✅ 已迁(新建渲染函数) | 原错配 drawDoubleSlitScene,操场俯视热图 |

### B2. 电磁/传感类(核对模型输出 charts 字段名后迁移) — ✅ 已完成 (commit 335109d)
| 场景 | 状态 | 说明 |
|---|---|---|
| mutual-inductance | ✅ 已迁 | I1/E2 曲线读引擎 charts(x 轴 s, mod T) |
| em-induction | ✅ 已迁 | x_t 单匝 Φ mWb / y_t ε mV(ms); HUD Φ=单匝×N |
| eddy-current | ✅ 已迁 | P/δ 读 maxValues,温升读轨迹, P∝B² |
| security-alarm | ✅ 已迁 | 标志位读 maxValues(引擎滞回) |
| reed-switch | ✅ 已迁 | H=K/d³ 读引擎(替代旧自算公式) |

### B3. B 类仪器场景
保留自算(静态绘图合理),仅核对常量与单位一致(游标卡尺、多用电表等 47 个场景)。

### 迁移通用套路(已验证)
- 位置/轨迹:`getFrame(simulationResult, currentTime, trajectoryIndex)`(第三参选多物体轨迹)
- 标量:`charts[键].points` 二分查找 + 线性插值;注意 x 轴单位(秒/μs/ms)与取模范围
- 引擎图表键名 ≠ 语义名(lc-oscillator 是 `x_t/y_t/ke_t/pe_t`),访问需 `as unknown as Record<string, ...>` 强转
- 无引擎结果回退原公式;契约测试每个迁移场景 ≥1 用例

---

## 阶段 C:1c 覆盖抽查收尾(A 类剩余场景量化漂移) — ✅ 已完成 (契约 17→21)

A 类剩余 11 场景评估: 4 需迁移 (light-control-switch / moon-earth-test / ac-current / em-damping), 7 可保留 (liquid-crystal / heat-direction / joule-mechanical / hologram / capillary / bohr-orbit / perpetuum-mobile)。
- light-control-switch: LDR 幂律 + 分段 24h 曲线迁移 (漂移最重)
- moon-earth-test: 硬编码常量 → maxValues (最隐蔽)
- ac-current: 双波形引擎序列 + 瞬时值插值
- em-damping: τ_c 与衰减曲线读引擎
- 契约测试 17 → 21, viz 410 → 414

---

## 阶段 D:3D 相关工作(按 3D_VERIFICATION_HANDOFF.md,接手者先读该文档)

### D1. 前置:提交验证脚本(立即)
- `scripts/verify-3d-scene-switching.js` 是 untracked,先提交(浏览器注入脚本,零依赖)

### D2. 任务 1:修复 3 个 CRASH 场景 ⭐
- 确认场景名:DevTools 跑 `copy(JSON.stringify(window.__3D_VERIFY_RESULT.results.filter(r => r.status !== 'OK'), null, 2))`
- 1a 防御层:`EquipmentStage.tsx:151` 的 `rig.buildEquipment` 加 try-catch,失败用空 group 兜底
- 1b 根因层:按 Console 完整堆栈(搜 `[ErrorBoundary`)定位 3 个 rig,修 `buildEquipment` 内部 bug
- 验收:重跑脚本,3 场景变 OK,`全部场景通过`

### D3. 任务 2:3D 稳定性收尾
- 全部 68 个 rig 的 handles 结构统一校验(updateEquipment 入口)
- 初始化 useEffect 的 `rig` 依赖评估(EquipmentStage.tsx:210)

### D4. 任务 3:视觉与交互打磨
- 阴影:评估 VSMShadowMap 或 mapSize 4096(primitives.ts:204-214)
- 68 rig 视觉一致性规范:地面/配色/世界尺度统一
- 交互:参数实时预览、3D 视角预设按钮

### D5. 任务 4:3D 测试覆盖深化
- EquipmentStage 行为测试(mock WebGL):场景切换不崩溃 / 参数变化触发 updateEquipment / rig 失败降级
- rig-contract.test.ts 扩展:updateEquipment 不抛错 / getVisualPosition 合理范围 / buildEquipment 回归保护
- Playwright E2E 冒烟(需 `--use-gl=swiftshader` 软件渲染)

### D6. 任务 5:3D 新功能(长期可选)
- 补齐 55 个无 3D 场景的 rig(优先电磁感应、波动光学)
- 实验导学模式 / 数据导出 CSV / OCR 多题分离

---

## 阶段 E:长期优化与拓展

1. **性能**:大场景渲染分层(Canvas 批处理)、wave 类粒子数自适应
2. **测试数同步**:README 顶部 core/viz/total 每次变更后更新
3. **文档维护**:`docs/rendering-physics-audit.md` 迁移进展表随迁移同步更新
4. **OCR**:支持图片多题分离、识别结果结构化
5. **实验导学**:场景步骤引导模式
6. **数据导出**:仿真结果 CSV/Excel

---

## 验证与提交约定(每项任务通用)

- 门禁:`npm run precheck`(build:core → typecheck → lint → format:check → test → selfcheck);pre-push 钩子强制,不要 `--no-verify`
- PowerShell:`npx.cmd`;改 physics-core 后先 `cd physics-core && npm run build` 再跑可视化测试
- 提交格式:`<type>(<scope>): <概述>` + 详细要点;type 常用 fix/feat/refactor/test/docs/chore
- 代码审查:按 AGENTS.md 7 维度清单,commit 前必做
