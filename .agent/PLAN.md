# 开发路线图（PLAN）

> 规划者维护。每次会话滚动更新。决策依据见 `DECISIONS.md`。
> 执行 Agent 每轮只取一个 issue；**创建顺序即执行顺序**（同级按创建时间从早到晚）。
> 本文件曾随 `6214cbd` 开源化清理被误删，2026-10-02 规划者从 `d0d9e37` 恢复并滚动更新。
> 2026-10-02 二次滚动：**双规划会话并发冲突已仲裁**（串行合并，见 D9/D10/D11）——
> M2 保持 L5 场线，会话 A 的 B 类单源深化整批列为 **M3**，均未否决，仅排先后。

## 当前方向

**M2 · L5 组合实验台场线渲染收尾**（用户 2026-10-02 定夺，见 D6/D7；D10 补充前置）——
直通终极愿景（3D 引擎 + 拖拽组合实验台；基础层 L0-L2 `d387f21` / 组合层 L3 `f56b0f2` /
交互层 L4 `0c38f43` 已提交）。后继里程碑 **M3 · B 类数值单源深化**（D9，#61–#66）已串行排队。

| # | 主题 | 状态 | 优先级 | 验收标准（摘要） | 依赖 |
|---|---|---|---|---|---|
| [#67](https://github.com/zhangjszs/physical-modelvis/issues/67) | L5 场线渲染收尾：收编并发遗留 WIP（fieldLines/fieldLineSeeds + Stage 集成） | WIP **已由用户提交为 `83fa03e`**（+688/−13，10 文件）· blocked 已摘 · **可执行队列首位** | P1 | 剩余范围已收窄：推 `83fa03e` 并盯 CI/Deploy；UI 场线松手随动实测；确认走引擎 `traceFieldLine`；11 层自检与 count:check 绿 | —（清场已完成） |
| [#60](https://github.com/zhangjszs/physical-modelvis/issues/60) | 引擎单位记号统一（'deg'→'°'/'um'→'μm'）+ 门禁（D5/D5a 定夺） | 已建 | P2（由 P3 上调） | 四面口径归零（unit 13 + xUnit/yUnit 12 + explanation + 渲染 1 处）+ 门禁 + '°C' 排除 | — |
| [#68](https://github.com/zhangjszs/physical-modelvis/issues/68) | lint/format 门禁盲区收口（tests/scripts 纳入；PR #25 意图转内部，D8） | 已建 | P2 | lint/format 覆盖三目录全绿；scripts 按类型环境无假红；测试语义零改动 | 排 #67/#60 之后 |

**执行顺序**：#67（M2 主线；代码已落地 `83fa03e`，本地领先 origin 1 个提交、CI 未跑——剩余=推 CI + UI 实测）
→ #60（P2 小项）→ #68（机械改动面大，避免与功能改动叠加）。

**进度**：0/3

### #67 背景备忘（原「候选 A 详细」收编记录）

被收编的并发 WIP（stalled ~12h，用户 D7 确认收编、解除「勿动」，**仅限 8 个路径**）：
新文件 `fieldLines.ts`（`buildFieldLines`：traceFieldLine 物理坐标追踪 →
physicsToWorld 世界坐标折线，纯函数可单测）、`fieldLineSeeds.ts`（四类器材种子：
点电荷球面 12 / 极板网格双侧偏移 / 导线多半径圆周 / 线圈环向，避开源奇点）
+ 2 个测试文件；修改 CompositionLab(+19) / CompositionStage(+106) /
compositionStore(+39) / compositionStore.test(+40)。风险低：基于 L4 之后
的 main，冲突面小。

## 已完成里程碑（存档）

### M1 · 常量单一真源全链路收口 ✅（2026-10-01 收口）
#51 门禁堵漏 / #52 渲染层 24 处收敛 / #53 渲染门禁（自检 10→11 层）/ #54 跨包双源消除 /
#55 B3 清单核对，全部 CLOSED；后续 #57 Deploy 修复、#58 σ_水 三方取值统一亦收口。

### M1.5 · 3D 物理基础层收口 ✅（#56，`2e9ccf1`）
TrajectoryPoint3D 方案 A（独立通道，不并入 SimulationResult）+ L1/L8 接入 3D 自检 +
2D 解析解 vs 3D Boris 边界文档。

### B3 · B 类清单与计数收口 ✅（#55 + #59）
B-静态 36 / B-数值 30 / 去重 60（#59 移除幻影 double-slit 后口径）。

## M3 · B 类数值单源深化（#61 守卫 → #62–#66 五批，串行排在 M2 之后）

**主题**（D9）：把单一真源约定从「常量」（M1 已收口）推到「数值」——
B-数值 30 场景中 **22 个**的 draw 函数拿到 `simulationResult` 却从不读，自行重算物理。
#58（σ 三方不一致）就是这一类靠人工核对才撞上的真 bug。

| # | 主题 | 状态 | 优先级 | 依赖 |
|---|---|---|---|---|
| [#61](https://github.com/zhangjszs/physical-modelvis/issues/61) | 前置守卫：「渲染消费引擎结果」快照豁免表 + 迁移/契约差集自动化（自检仍 11 层） | 已建 · **blocked**（blocked_by #67） | P1 | #67 |
| [#62](https://github.com/zhangjszs/physical-modelvis/issues/62) | 批次 1 光学波动 + 波粒二象（5）：diffraction-grating / polarization-malus / interference / doppler / photoelectric | 已建 · blocked | P2 | #61 |
| [#63](https://github.com/zhangjszs/physical-modelvis/issues/63) | 批次 2 传感器元件（4）：**thermistor 已坐实双源** / hall-effect / photoresistor / strain-gauge | 已建 · blocked | P2 | #61 |
| [#64](https://github.com/zhangjszs/physical-modelvis/issues/64) | 批次 3 热学定律（5）：heat-direction / perpetuum-mobile 沿用阶段 C 既有豁免结论 | 已建 · blocked | P2 | #61 |
| [#65](https://github.com/zhangjszs/physical-modelvis/issues/65) | 批次 4 气体分子 / 静能 / 核（4）：gas-law（249 行自算）/ capacitor-charge / radioactive / liquid-mixing | 已建 · blocked | P2 | #61 |
| [#66](https://github.com/zhangjszs/physical-modelvis/issues/66) | 批次 5 电路 + 测量仪器（4）· **收口批**：附带改写 audit/plan 的 B3「保留自算」旧口径 | 已建 · blocked | P2 | #61 |

**进度**：0/6 · **执行顺序**：#61 必须最先（先建豁免表与差集守卫，再逐批迁移，红→绿）。#62–#66 同为 P2，
按创建时间从早到晚依次接手。
**已定稿口径（D12，用户 2026-10-02 复核确认，勿重议）**：M3 不早于 #67 CLOSED；#61 用「函数体直接文本引用」
的保守快照口径（已知局限写注释），经 helper 间接消费的误报留给 #62–#66 逐场景复核。

**优先级纪律说明**：M3 实质主干只留 1 个 P1（#61），5 个批次均 P2 —— 避免 P1 通胀；
M2+M3 合计开放 P1 = 2（#67 / #61），但只有 #67 处于可开工状态（#61 带 `blocked`）→ 不产生争抢。
发现漂移时规划者负责降级并在 issue 留言。

**blocked 现状一览（摘除全归规划者）**：#61 ← #67（#67 尚OPEN）；#62–#66 ← #61。
D10 的人工前置（用户清场）**已达成**，#67 的 blocked 已摘。当前可执行队列 = **#67 → #60 → #68**。
⚠️ 工作树现已干净（README 已记 viz 1302），执行棒恢复正常全量 `precheck`（含 count:sync）纪律。

## M2 之后的场线延伸（#67 收编完成后定）

M2 主线为 L5 场线渲染（#67）。收编落地后，M2 是否继续包含以下子项由届时 backlog 决定：
- 场线交互深化（按需：场线显隐开关 / 密度调节 / 磁感线闭合环样式）
- L6 候选：更多器材类型接入组合实验台（引擎 fields3d 已支持点电荷/极板/导线/线圈）

## 远景（粗粒度）

- **开源化技术债三候选**（架构评审口径，用户 2026-10-02 未选、未放弃，D6）：
  - **B. P1 引擎契约类型化**：charts schema 化（types/result.ts ~100 optional 键 +
    渲染层 `as unknown as` 强转）、约束接口下沉（problem.ts 1883 行上帝对象）、units 层去留。
  - **C. P2 渲染 primitives 重组**：27 个按章节巨型文件（CanvasRenderer 1886 行等）
    重组为按绘制机制共享的 primitives 层。
  - **D. P3 开源发布面**：physics-core 是否实际 npm publish、visualization `private:true`
    去留、README 英文化/截图/GIF 等发布物料。
- **#44 React 19 专项**（人类持有，勿动）：首屏 +23kB（react-dom 19）破 70kB 门禁，
  需先定预算策略（重议 ≥90kB 或 vendor-react 懒拆）。无论 M2 选哪个方向都不并行做它。
- **B3 深化与契约差集守卫**：已由 **M3 承接**（#61 把 audit 末尾手工 `grep | comm` 固化为断言；
  #62–#66 做「B 类渲染公式与引擎 charts 一致性」逐量决策）——不再作为远景模糊项。
- **测试数门禁盲区**：`npm run count:check` 在脏树（存在未跟踪测试文件）下不可信；
  #67 收编提交后树转干净，届时评估是否给 count:check 加「树必须干净」前置断言。

## 已放弃的方向及原因

- **文档数字漂移批量清理**（D2 隐含）：#46–#50 五轮已把可发现的漂移扫尽，
  剩余属历史快照与冻结归档，无收益。转向有物理正确性影响的工作。
- **σ 单独加 LITERAL_PATTERNS 门禁**（#58 两根执行棒一致结论）：用「既有 it 内加断言」
  锁定，避免门禁面扩大 + 需补 PATTERN_SAMPLES。
