# PhysVis 后续工作计划 (plan.md)

> 汇总当前进行中的工作、阶段 3 渲染迁移、3D 修复交接、以及全部长期优化项的推进计划。
> 关联文档:`docs/rendering-physics-audit.md`(渲染迁移审计)、`docs/archive/3D_VERIFICATION_HANDOFF.md`(3D 修复交接)、`docs/archive/3D_RENDERING_FIXES_SUMMARY.md`(3D 前序修复)。

---

## 0. 当前状态快照 (2026-08-11 更新)

- 分支 main,工作树干净,全部已 push
- 阶段 A-D、E-1/4/5/6 全部完成并已提交(详见下方各阶段 ✅)
- **8-02 之后的新增工作**:
  - `2586909` 场景配置机械化拆分 — SCENES 单文件 → `scenes/scenes/<领域>/` 子目录,registry 改异步 `loadAllScenes`(删除同步 SCENES 导出)
  - `ceb70db` 构建体积优化 — 首屏 gzip 352→57 kB (-84%)
  - `b52dcce`/`4a35ace`/`955307c` 过时文档归档到 `docs/archive/`(TASKS/M7-spec/3D 交接等)
  - `7ab9064` 删除过时启动脚本(setup.bat/sh/start.bat,physim 目录已改 physics-core,vite 替代 http-server)
  - `b0bd171` 清理失效/一次性脚本(verify-3d-coverage.mjs 因 SCENES 重构失效、fix-scene-names/split-scenes/rewrite-time-series 等迁移工具、.scratch 草稿)
  - README 补测试数行(core 923 / viz 1159 / 2082)
  - **audit 遗留低优先级清理完成**(liquid-crystal 透射率曲线迁引擎 x_t Tarasov + capillary 常量 ρ_汞 13534/θ 汞+石蜡 150° 对齐引擎,契约测试 21→23)
- 测试数:core 923 (66 files) + viz 1161 (29 files) = 2084(2026-08-11 实测)
- **缺口场景已全部补建**:DEVELOPMENT_GUIDE 列出的 8 个可视化缺口(total-internal-reflection / current-magnetic / efield-lines / newton-tube / bulb-vi / work-energy / ball-xt / geiger-counter)均已存在
- 无剩余低优先级清理项(audit 第 5 批标记的 liquid-crystal / capillary 分歧已收尾)

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

## 阶段 D:3D 相关工作(按 3D_VERIFICATION_HANDOFF.md,接手者先读该文档) — ✅ 全部完成 (2026-08-02)

### D1. 前置:提交验证脚本 — ✅ (commit 44345b2)
- `scripts/verify-3d-scene-switching.js` 已入库

### D2. 任务 1:修复 CRASH 场景 ⭐ — ✅
- **实测范围扩大**:Playwright 全量 123 场景发现 **43 个 ERROR**(非交接文档预估的 3 个 CRASH),
  全部为 `updateEquipment failed: Cannot read properties of undefined`
- **根因不是 rig bug,是场景切换竞态**:`key={currentScene}` 先变、`rig` state 后更新 →
  中间 commit 用旧场景 rig 挂载新 key 的 EquipmentStage(buildEquipment 正确,handles 是旧场景的)→
  rig 更新后 key 未变不重挂 → 新 rig updateEquipment 消费旧 handles → 崩;首切不崩(chunk 未缓存有 spinner 空窗)
- 1a 防御层:EquipmentStage buildEquipment try-catch ✅ (commit a2689ce)
- 1b 根因层:`ProjectileScene.tsx` rig 改为按场景 ID 缓存 + `rigReady` 渲染条件,
  挂载时 rig 必属当前场景,错配路径关闭
- 验收:14 代表性场景 × 2 轮 Playwright 冒烟(scripts/verify-3d-smoke.cjs)零错误

### D3. 任务 2:3D 稳定性收尾 — ✅
- handles 结构校验:rigs-build.test.ts 扩展交叉参数契约(共享 rig 场景互用彼此参数 + 空/极端参数)
- 初始化 useEffect `rig` 依赖评估结论:保持 `[]`(key 保证 remount + rig 按场景缓存引用稳定,加依赖冗余)

### D4. 任务 3:视觉与交互打磨 — ✅
- 阴影:DirectionalLight mapSize 2048 → 4096(PCFShadowMap + radius/bias;VSM 有 bleeding 风险不采用)
- 视觉一致性审查:48 rig worldScale 全部统一 0.16,环境全局共享单实现 → 已天然统一,无需逐 rig 改造
- 交互:EquipmentStage 新增视角预设按钮(默认/侧视/俯视/正视),浏览器实测 4 档零错误

### D5. 任务 4:3D 测试覆盖深化 — ✅
- EquipmentStage 行为测试(equipment-stage.test.tsx 5 例,mock WebGLRenderer/OrbitControls):
  挂载/参数更新/场景切换 remount 消费本 rig handles(引用断言)/错配不白屏/getVisualPosition 防御
- rigs-build.test.ts:124 → 126(交叉参数 + 极端参数)
- Playwright 冒烟:scripts/verify-3d-smoke.cjs(14 场景 × 2 轮,手动运行)

### D6. 任务 5:新功能(长期可选)
- 补齐无 rig 场景:已实际完成 — SCENE_TO_MODULE 123 场景 100% 有 rig(rigs-build.test.ts 断言非空)
- 实验导学模式 / 数据导出 CSV / OCR 多题分离:归入阶段 E 长期项

---

## 阶段 E:长期优化与拓展

1. **性能**:大场景渲染分层(Canvas 批处理)、wave 类粒子数自适应 — ✅ (见 E-1)
   - CanvasRenderer.drawTrajectory:≥60 点轨迹按 alpha/线宽分 8 档批处理(一次 path/stroke/档),小轨迹保持逐段;2D/3D 均支持
   - SimulationCanvas:pastCount 二分 + endIndex 传参,消除每帧 filter+map 数组分配;allPositions 按 points 引用缓存
   - mechanicalWaveScenes:粒子数按画布宽度自适应(每 11px 一个),每帧仅对 tracked 质点各取一次帧 + 游标线性插值(替代每粒子多次二分 getFrame)
   - molecularKineticScenes:扩散粒子数按区域面积自适应 + 16 级颜色阶梯缓存(消除每帧 200 次字符串 fillStyle);布朗 trail 分 8 档合并 stroke
   - 验证:viz 545 全绿,typecheck/lint/prettier 通过,E-1 冒烟(scripts/verify-e1-render-smoke.cjs 5 场景含播放)+ 3D 冒烟 14 场景 × 2 轮零错误
2. **测试数同步**:README 顶部 core/viz/total 每次变更后更新
3. **文档维护**:`docs/rendering-physics-audit.md` 迁移进展表随迁移同步更新
4. **OCR**:支持图片多题分离、识别结果结构化 — ✅ (见 E-4)
   - 后端:Prompt 改为返回 `{ problems: [...] }` 多题结构,每题含 index/type(单选/多选/填空/解答)/options/answer/given/formulas;`server/ocr-utils.ts` 纯函数归一化(兼容旧单题对象与数组形态,非法项过滤,题号补齐);解析失败 502
   - 前端:OCRPanel 多题导航(题号按钮组 + active 高亮)、题型标签、公式展示;场景/参数映射抽为 `ocrUtils.ts` 纯函数;后端健康检查改为面板打开时进行(避免页面加载的网络噪音)
   - 入口:OCRPanel 挂载到顶栏(此前为孤儿组件,README 声称的入口实际不可达)
   - 测试:server/ocr-utils.test.ts 12 例 + 前端 ocrUtils.test.ts 10 例;冒烟 scripts/verify-ocr-mount.cjs(入口/打开/关闭/零错误)
   - 测试数:core 923 + viz 567 = 1490
5. **实验导学**:场景步骤引导模式 — ✅ (见 E-5)
   - `src/scenes/guidance.ts`:12 个核心场景精编「目标 + 分步引导」(操作/观察/关联参数),其余场景自动生成 4 步通用引导(基于场景名与参数);paramFocus 由测试强制校验必须存在于场景参数
   - `src/components/guidance/GuidancePanel.tsx`(portal 到 body,规避顶栏 backdrop-filter containing block):顶栏「📖 导学」入口,面板含实验目标、进度条、上一步/下一步/重新开始、参数 chips;切场景自动重置到第 1 步
   - 测试:tests/guidance/guidance.test.ts 8 例(字段完整性/参数引用/回退/精编 id 真实存在);冒烟 scripts/verify-guidance-smoke.cjs(推进/回退/关闭/切回退场景)
   - 测试数:core 923 + viz 575 = 1498
6. **数据导出**:仿真结果 CSV/Excel — ✅ (见 E-6)
   - `src/utils/exportCsv.ts`:纯函数导出
     - `trajectoriesToCsv`:多物体轨迹合并(time + 每物体 x/y/vx/vy),缺帧留空,数字 6 位小数,非有限值转空
     - `chartsToCsv`:每个图表一个块(# 注释头 + header + 数据),块间空行分隔,ForceDiagram 自动跳过
     - `downloadCsv`:UTF-8 BOM 前缀,Excel 中文兼容
   - `src/components/export/ExportDataButton.tsx`:顶栏下拉菜单,三项(轨迹/图表/全部 CSV),按钮随 simulationResult enable/disable
   - 测试:tests/exportCsv.test.ts 13 例(格式化/转义/多物体/缺帧/图表块/ForceDiagram 跳过/下载流程)
   - 测试数:core 923 + viz 588 = 1511

---

## 验证与提交约定(每项任务通用)

- 门禁:`npm run precheck`(build:core → typecheck → lint → format:check → test → selfcheck);pre-push 钩子强制,不要 `--no-verify`
- PowerShell:`npx.cmd`;改 physics-core 后先 `cd physics-core && npm run build` 再跑可视化测试
- 提交格式:`<type>(<scope>): <概述>` + 详细要点;type 常用 fix/feat/refactor/test/docs/chore
- 代码审查:按 AGENTS.md 7 维度清单,commit 前必做
