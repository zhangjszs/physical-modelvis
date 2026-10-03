# 开发路线图（PLAN）

> 规划者维护。每次会话滚动更新。决策依据见 `DECISIONS.md`。
> 执行 Agent 每轮只取一个 issue；**创建顺序即执行顺序**（同级按创建时间从早到晚）。
> 本文件曾随 `6214cbd` 开源化清理被误删，2026-10-02 规划者从 `d0d9e37` 恢复并滚动更新。
> 2026-10-02 二次滚动：**双规划会话并发冲突已仲裁**（串行合并，见 D9/D10/D11）——
> M2 保持 L5 场线，会话 A 的 B 类单源深化整批列为 **M3**，均未否决，仅排先后。
> 2026-10-02 三次滚动：**M2.5 · OCR 拍照解题功能线立单**（用户提出 API 多提供方扩展 +
> 举一反三 demo，全链审查缺口一并立单，见 D13）——插 M2 尾（#60/#68）之后、M3 之前。
> 2026-10-03 四次滚动：**M2.6 · 3D 性能底层线立单**（用户报告「越点越慢」并指令现在就建底层，见 D14）——
> 止血 #79 → 门禁 #80 → 根治 #81，插队可执行队列**首位**，M2 尾与 M2.5 顺延。
> 2026-10-03 五次滚动：**M2.7 · 引擎基础加固线立单**（foundation 三梯队评估，见 D15）——
> #83/#84/#85/#86 排 M2.6 后；**B1 #82（charts 类型化最小切片）插 M3 内部 #61 后 #62 前**（#62–#66 已挂 blocked_by #82）。
> 2026-10-03 六次滚动：**M2.6 三单由执行棒连做落地并经规划者验收关闭**（#79/#80/#81，见 D14 后续事实）；
> 巡检第 7/8 轮 #87/#88 自发现自修复关闭；执行棒移交的「巡检判据扩展」立为 #89 归 M2.7 尾。可执行队列首位 = **#83**。
> 2026-10-03 九次滚动：**执行棒（规划会话连任）从 #89 连续作业收官 M2.7**——#89 巡检判据扩展落地
> （抽屉覆盖 123/123 零问题 + 交互后一致性往返判定，红绿闭环，时长 +16.5%<20%）；
> 全量分诊 auto-discovered **#91**（赫兹场景频率域超引擎域真 bug，立单即修复关闭）；
> #90（#80 NaN 静默放行堵洞 + perfVisit 提取 + projectile 边界注释）验收关闭。
> **顺带修复存量事故**：setSlider 键名不匹配致巡检边界检查自诞生起空转（#89 红向验证暴露）。
> M2.7 六单 + #91 全部 CLOSED，可执行队列首位 = **#60**。
> 2026-10-03 十次滚动：**用户观察「巡检边界段只扫文本不扫错误横幅」摸底收官（D16）**——全量普查
> （123 场景 × 571 参数）坐实 3 处 #91 同类真实失配（audioFreq/q/epsilon）+ 1 处普查假阳性（collision 动态 model，
> 已转为 #92 实现警示）+ 61 处 default 脱网格（良性，未立单）；决策：**不补 scanBanners**，立静态边界门禁单
> **#92** 排 #61 后 #82 前。#76 的 `blocked` 标签漂移已补（D13 记录的原生边实际不存在）。

## 当前方向

**M2 · L5 组合实验台场线渲染收尾**（用户 2026-10-02 定夺，见 D6/D7；D10 补充前置）——
直通终极愿景（3D 引擎 + 拖拽组合实验台；基础层 L0-L2 `d387f21` / 组合层 L3 `f56b0f2` /
交互层 L4 `0c38f43` 已提交）。后继里程碑 **M3 · B 类数值单源深化**（D9：#61 守卫 → #92 参数域边界 → #82 B1 → #62–#66 五批）已串行排队。

| # | 主题 | 状态 | 优先级 | 验收标准（摘要） | 依赖 |
|---|---|---|---|---|---|
| [#67](https://github.com/zhangjszs/physical-modelvis/issues/67) | L5 场线渲染收尾：收编并发遗留 WIP（fieldLines/fieldLineSeeds + Stage 集成） | ✅ **CLOSED**（`83fa03e` + 验证收口，第 3 轮巡检收尾确认） | P1 | 剩余范围已收窄：推 `83fa03e` 并盯 CI/Deploy；UI 场线松手随动实测；确认走引擎 `traceFieldLine`；11 层自检与 count:check 绿 | —（清场已完成） |
| [#60](https://github.com/zhangjszs/physical-modelvis/issues/60) | 引擎单位记号统一（'deg'→'°'/'um'→'μm'）+ 门禁（D5/D5a 定夺） | 已建 | P2（由 P3 上调） | 四面口径归零（unit 13 + xUnit/yUnit 12 + explanation + 渲染 1 处）+ 门禁 + '°C' 排除 | — |
| [#68](https://github.com/zhangjszs/physical-modelvis/issues/68) | lint/format 门禁盲区收口（tests/scripts 纳入；PR #25 意图转内部，D8） | 已建 | P2 | lint/format 覆盖三目录全绿；scripts 按类型环境无假红；测试语义零改动 | 排 #67/#60 之后 |

**执行顺序**：**M2.7 加固线：#83 → #84 → #85 → #86 → #89 → #90**（全部 CLOSED，M2.7 收官；
#91 为执行中 auto-discovered 的赫兹场景域 bug，已修复关闭）
→ M2 尾巴 **#60（P2 小项）→ #68**（#67 已 CLOSED）
→ **M2.5 OCR 线：#74 → #75 → #76 → #77**（#76 被 #74 硬阻塞）
→ **M3：#61 → #92 → #82(B1) → #62–#66**（D12 排序口径不变；#92 为 D16 摸底新单插 #61 后 #82 前；
被 M2.6/M2.7/OCR 线顺延）。

**进度**：1/3（#67 ✅）

### #67 背景备忘（原「候选 A 详细」收编记录）

被收编的并发 WIP（stalled ~12h，用户 D7 确认收编、解除「勿动」，**仅限 8 个路径**）：
新文件 `fieldLines.ts`（`buildFieldLines`：traceFieldLine 物理坐标追踪 →
physicsToWorld 世界坐标折线，纯函数可单测）、`fieldLineSeeds.ts`（四类器材种子：
点电荷球面 12 / 极板网格双侧偏移 / 导线多半径圆周 / 线圈环向，避开源奇点）
+ 2 个测试文件；修改 CompositionLab(+19) / CompositionStage(+106) /
compositionStore(+39) / compositionStore.test(+40)。风险低：基于 L4 之后
的 main，冲突面小。

## M2.6 · 3D 性能底层线 ✅（2026-10-03 收口，执行棒三单连做 + 规划者验收关闭）

三步走「止血 → 门禁 → 根治」，核心重构在门禁保护下完成。根因排查证据链见 D14。
收官状态：**用户报告的「越点越慢」根治**——切换成本从「整上下文重建 + shader 重编译 + 渐进劣化」
变为「场景内容重建 350-420ms 恒定」（重 rig 场景 700-960ms 为自身复杂度）。

| # | 主题 | 状态 | 优先级 | 收口提交 |
|---|---|---|---|---|
| [#79](https://github.com/zhangjszs/physical-modelvis/issues/79) | 止血包：纹理释放 + rig 缓存 LRU 上限 8 + 暂停按需渲染 | ✅ CLOSED（验收 5/5） | P1 | `01ac2a3` |
| [#80](https://github.com/zhangjszs/physical-modelvis/issues/80) | 性能回归防护门禁：内存/耗时双趟判定 + dispose 契约 124 例 + 懒 chunk 硬门禁 | ✅ CLOSED（验收 4/4，红→绿闭环） | P2 | `a6e1173` |
| [#81](https://github.com/zhangjszs/physical-modelvis/issues/81) | 根治：WebGL 上下文跨场景复用（StageRenderer 注入式，方案一定案） | ✅ CLOSED（验收 6/6） | P1 | `85ca829` |

**后续注意**：阴影图参数回调（primitives.ts:209 保持 1024²）未做，如需回常值另行立单；
「多 3D 舞台同屏」未来需求须先扩展 StageRenderer 多实例 refcount；测试数 core 1114 / viz 1452 / total 2566。

## M2.7 · 引擎基础加固线（foundation 三梯队评估，用户 2026-10-03 拍板，D15）

判别标准「成本随代码量增长」。四单全部小而独立、低风险；K2 为设计调查单（实施单待产出后另立）。

| # | 主题 | 状态 | 优先级 | 验收标准（摘要） | 依赖 |
|---|---|---|---|---|---|
| [#83](https://github.com/zhangjszs/physical-modelvis/issues/83) | 引擎测试纳入 tsc（专用 typecheck 配置，24 处真实错误全修，门禁等效偏离已判定成立） | ✅ CLOSED | P2 | `d101b4d`+`1395b9d` |
| [#84](https://github.com/zhangjszs/physical-modelvis/issues/84) | 静态守卫：断言不得被空 catch 吞掉（AST 扫描入列；原「5 处」粗计数经审查纠偏为 0 违规） | ✅ CLOSED | P2 | `1752280` |
| [#85](https://github.com/zhangjszs/physical-modelvis/issues/85) | 4 大锤模型迁移窄钩子恢复守卫（#8 成果重新覆盖 4 模型，#63 前置就位） | ✅ CLOSED | P2 | `9ce41e3` |
| [#86](https://github.com/zhangjszs/physical-modelvis/issues/86) | K2 参数扫描数据通道**设计调查**（24 场景 A6/B2/C12/D4 分型 + sweeps 方案定案 + WARN 交集 7/24；实施单待 M4 前后据文档另立） | ✅ CLOSED | P3 | 设计文档在 issue |
| [#89](https://github.com/zhangjszs/physical-modelvis/issues/89) | 巡检判据扩展：数据抽屉覆盖 + 交互后一致性（#78 崩溃盲区教训固化，执行棒移交） | ✅ CLOSED（`ecb7bb0`；红绿闭环 + 全量 123 抽屉零问题 + 时长 +16.5%） | P3 | 顺带修复存量 setSlider 空转事故 |
| [#90](https://github.com/zhangjszs/physical-modelvis/issues/90) | Review 收尾：#80 性能判定 NaN 静默放行堵洞 + perfVisit 重复块提取等三处小收尾 | ✅ CLOSED（`187696a`；自检钩子红 exit 1/绿 exit 0） | P3 | — |
| [#91](https://github.com/zhangjszs/physical-modelvis/issues/91) | （auto-discovered，#89 分诊立单即修复）赫兹场景频率域 300MHz 超引擎 100MHz + 默认值不在步进网格 | ✅ CLOSED（`4d9803f`） | P2 | — |

**执行顺序**：#89 → #90 均已 CLOSED。**进度**：6/6，**M2.7 收官**。
**收官纪要**：#89 引入的两类判据（抽屉覆盖 / 交互后一致性往返）成为巡检常驻能力；
实测绿基线 = ERROR 0 / WARN 51 / OK 72（`.scratch/qa-sweep-89-final.json` 起）。
**遗留观察（未立单）**：巡检边界段每参数只 scanText 不 scanBanners，「边界值触发引擎错误横幅」
类问题 interaction 判定撞见过、边界段看不见（#91 即此类）。**2026-10-03 十次滚动已摸底并处置（D16）**：
全量普查坐实 3 处 #91 同类真实失配，决策「不补 scanBanners、立静态门禁单 #92」——本观察闭环，后续看 #92。

## M2.5 · OCR 拍照解题功能线（用户 2026-10-02 提出，D13）

OCR 链路（E-4 已完成）全链审查后立单：多提供方扩展 + 质量收口 + 举一反三 demo + 孤儿模块处置。
改动面 = visualization/server + OCR 组件，与 M2（场线）/M3（渲染 draw 函数）零冲突。

| # | 主题 | 状态 | 优先级 | 验收标准（摘要） | 依赖 |
|---|---|---|---|---|---|
| [#74](https://github.com/zhangjszs/physical-modelvis/issues/74) | 多提供方扩展：VisionProvider 抽象 + OpenAI 兼容适配器 + 前端配置收口（顺带收口硬编码 `localhost:3001` / placeholder "gpt-4o" 误导 / 模型静默回落三缺口） | 已建 | P2 | OpenAI 兼容 env 可识别出题且 schema 一致；Anthropic 路径回归全绿；前端可选提供方、回落有提示；冒烟不回归 | — |
| [#75](https://github.com/zhangjszs/physical-modelvis/issues/75) | 质量收口：OCRPanel 组件测试 + 代理 HTTP 层测试 + 巡检覆盖 + 组合台模式切换修复 | 已建 | P3 | 组件测试 ≥5 例；HTTP 400/429/502/504/成功 5 路径；巡检判定生效；组合台加载仿真切回教材模式 | 建议 #74 后（避免测试返工） |
| [#76](https://github.com/zhangjszs/physical-modelvis/issues/76) | 「举一反三」demo（自动写题）：`/api/problems/generate` + 题卡按钮 → 变式题可加载仿真 | 已建 | P3 | curl 出 ≥1 道合法变式（schema 同 recognize）；前端按钮→生成→加载仿真链路通（demo 质量档，不设变式质量门禁） | **#74**（本轮补挂 `blocked` 标签，D16 治理记录） |
| [#77](https://github.com/zhangjszs/physical-modelvis/issues/77) | problemAnalyzer 孤儿模块处置：接线「粘贴题干→自动建模」或归档 | 已建 | P3 | 不留孤儿——要么被 UI 消费（含测试），要么模块删除/归档注明 | 无硬依赖 |

**执行顺序**：#74 → #75 → #76 → #77。**进度**：0/4

## 已完成里程碑（存档）

### M2.6 · 3D 性能底层线 ✅（2026-10-03 收口）
#79 止血（`01ac2a3`）/ #80 门禁（`a6e1173`）/ #81 根治·StageRenderer 注入式（`85ca829`），
规划者验收关闭，详见上方 M2.6 节与 D14 后续事实。同日 QA 巡检第 7/8 轮自发现自修复：
**#87** 抛体落地截断（`83f2632`）、**#88** 参数滞后过期闭包（`fdca402`），均已规范关闭。

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
| [#61](https://github.com/zhangjszs/physical-modelvis/issues/61) | 前置守卫：「渲染消费引擎结果」快照豁免表 + 迁移/契约差集自动化（自检仍 11 层） | 已建（blocked_by #67 已随其 CLOSED 摘除） | P1 | — |
| [#82](https://github.com/zhangjszs/physical-modelvis/issues/82) | **B1 前置**：charts 类型化访问层最小切片（每模型 typed accessor）——五批迁移写新 API 不返工 | 已建 | P1 | #61 |
| [#92](https://github.com/zhangjszs/physical-modelvis/issues/92) | **参数域边界门禁**（D16 用户观察摸底）：每场景每参数 min/max 边界值须过引擎 validate（并入 L2 家族）+ 存量 3 处 #91 同类失配修复（audioFreq 200→20kHz / q min 负电荷方向裁决 / epsilon min 0.1） | 已建 | P2 | 无（排 #61 后） |
| [#62](https://github.com/zhangjszs/physical-modelvis/issues/62) | 批次 1 光学波动 + 波粒二象（5）：diffraction-grating / polarization-malus / interference / doppler / photoelectric | 已建 · blocked（← #61/#82） | P2 | #61 · #82 |
| [#63](https://github.com/zhangjszs/physical-modelvis/issues/63) | 批次 2 传感器元件（4）：**thermistor 已坐实双源** / hall-effect / photoresistor / strain-gauge | 已建 · blocked（← #61/#82） | P2 | #61 · #82 |
| [#64](https://github.com/zhangjszs/physical-modelvis/issues/64) | 批次 3 热学定律（5）：heat-direction / perpetuum-mobile 沿用阶段 C 既有豁免结论 | 已建 · blocked（← #61/#82） | P2 | #61 · #82 |
| [#65](https://github.com/zhangjszs/physical-modelvis/issues/65) | 批次 4 气体分子 / 静能 / 核（4）：gas-law（249 行自算）/ capacitor-charge / radioactive / liquid-mixing | 已建 · blocked（← #61/#82） | P2 | #61 · #82 |
| [#66](https://github.com/zhangjszs/physical-modelvis/issues/66) | 批次 5 电路 + 测量仪器（4）· **收口批**：附带改写 audit/plan 的 B3「保留自算」旧口径 | 已建 · blocked（← #61/#82） | P2 | #61 · #82 |

**进度**：0/8 · **执行顺序**：#61 必须最先（先建豁免表与差集守卫，再逐批迁移，红→绿）→ **#92 参数域边界门禁**
（D16：#91 同类存量 3 处修复 + L2 家族边界守卫，护卫后续迁移批次参数域不回退）→ **#82 B1**
（charts 类型化访问层）→ #62–#66 同为 P2，按创建时间从早到晚依次接手。
**已定稿口径（D12，用户 2026-10-02 复核确认，勿重议）**：M3 不早于 #67 CLOSED；#61 用「函数体直接文本引用」
的保守快照口径（已知局限写注释），经 helper 间接消费的误报留给 #62–#66 逐场景复核。

**优先级纪律说明**：M3 实质主干只留 2 个 P1（#61 前置守卫 + #82 B1 类型化），5 个批次 + #92 参数域边界门禁均 P2 —— 避免 P1 通胀；
M2+M3 开放 P1 = 2（#61 / #82），均在 M3 序列内串行（#61 先、#82 后），不产生争抢。
发现漂移时规划者负责降级并在 issue 留言。

**blocked 现状一览（摘除全归规划者）**：#62–#66 ← #61/#82（原生边已核验）；#76 ← #74（**本轮补挂 `blocked` 标签**——
D13 记录的「原生 blocked_by」在 GitHub API 侧不存在，历轮靠队列序维持，本轮按 #62–#66 同口径补标签恢复一致）。
#61 的 blocked 已随 #67 CLOSED 摘除（2026-10-03 API 复核：0 阻塞边）。当前可执行队列 =
**#60 → #68 → #74 → #75 → #76 → #77 → #61 → #92 → #82 → #62–#66**（#89/#90 已 CLOSED，M2.7 收官；
#92 为 D16 摸底新单，插 #61 后 #82 前）。

**遗留观察（未立单）**：**61/571 参数的 default 不在 step 网格**（D16 普查，良性类）——首次交互时滑块吸附到
网格点造成小幅静默漂移（如 spring.k 10→10.1）；灾难性组合（吸附值超引擎域）已被 #92 门禁阻止
（场景域⊆引擎域 ⇒ 吸附值≤引擎上界）。若将来要做「参数初值精确呈现」UX 收口，从此观察立项，
治理面 = 逐场景把 default 移上网格或把 min 对齐网格，需评估画面初值变化，暂不做。
⚠️ 工作树干净，README 测试数 = core 1118 / viz 1452 / total 2570（2026-10-03 与 count:check 一致），
执行棒恢复正常全量 `precheck`（含 count:sync）纪律。

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
- **测试数门禁盲区**：`npm run count:check` 在脏树（存在未跟踪测试文件）下不可信。
  **2026-10-03 评估**：#67 后树持续干净 + 执行棒 precheck 纪律恢复，误判风险实际未发生；
  不建「树必须干净」前置断言（避免误伤合法场景：如正在新增测试的执行中途），
  若将来出现脏树 count 误判实例再立单。此项闭环。

## 已放弃的方向及原因

- **文档数字漂移批量清理**（D2 隐含）：#46–#50 五轮已把可发现的漂移扫尽，
  剩余属历史快照与冻结归档，无收益。转向有物理正确性影响的工作。
- **σ 单独加 LITERAL_PATTERNS 门禁**（#58 两根执行棒一致结论）：用「既有 it 内加断言」
  锁定，避免门禁面扩大 + 需补 PATTERN_SAMPLES。
