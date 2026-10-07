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
> 2026-10-03 十一次滚动：**#60 执行验收关闭 + M2 收官**——执行棒（第六棒）完成 #60（29 处 Unicode 替换 +
> 双包门禁，`fff307f`，CI/Deploy 绿），规划者逐条独立复核（grep 零残留/'°C' 未误改/双门禁实跑 30+25 绿）后关闭；
> **#68 按「重复」关闭**——其全部范围已于 2026-09-28 由 #14 两 commit 落地（D8 立单时未交叉核验 #14 已关闭内容），
> lint 0 错误/19 warnings（tests any→warn 基线）、format:check 全过均为本轮实测；执行棒移交的「#68 存量 any」
> 顾虑经摸底消解（warnings 非新错、不阻塞）。队列首位 = **#74**。
> 执行棒流程提醒：#60 全程标签停留 ready-for-agent（未按契约 1.5 流转 in-progress/in-review），
> 下棒起遵守标签流转。
> 2026-10-03 十二次滚动：**无 in-review 待验收**（#60/#68 已于上轮规范关闭，规划者验收/治理评论在案）——
> 本轮为治理轮：**#82 补挂 `blocked`**（原生边 #61→#82 机器可见化：#82 硬性要求 1 的 charts 键覆盖清单
> 以 #61 差集守卫产出为准，D15 队列序不变，此前两轮漏挂，评论 5970803236 在案）；
> 队列门禁复核：#74/#92/#61/#82 正文逐条过 4.2 gate 通过；CI/Deploy 于 `75dbda9` 全绿；
> 队列首位仍为 **#74**（M2.5 OCR 线）。
> 2026-10-04 十二次滚动·续：**用户授权扩充 backlog，M4 立单 5 个**（#93 场线交互深化 / #94 L6 器材调查 /
> #95 阴影自适应 / #96 参数初值网格 / #97 README 演示物料，见 D17）——全部由 PLAN 既有候选与遗留观察
> 转化而来，无新方向；队列尾部接入，队首仍 #74。
> 2026-10-06 十三次滚动：**#74 与 #75 双双验收关闭（M2.5 进度 2/4）**——规划者独立复核
> （#74: OCR 82/82 实跑 + e2e/UI 探针证据链 + 源码抽查 URL 收口与 placeholder；
> #75: 组件 8/8 + HTTP 10/10 实跑 + 巡检红绿 JSON 复核 + appMode 源码抽查 + count:check 一致）。
> **#76 摘 blocked 转队首**；**#98 定级 P3 ready**（msedge 通道参数化，方案 A 定案，
> 证据修正：sweep 已 QA_CHANNEL 参数化，剩余 4 脚本）插 **#77 后、M3 前**。
> 2026-10-07 十四次滚动：**第十棒 in-review 积压 4（#76/#77/#98/#61）全部验收 CLOSED**——
> 规划者逐单独立复核（#61 守卫测试 7/7 实跑绿 + 豁免表 22/例外表 7 源码核对 + self-check L11 数组化 + audit 指引 + CI@ae15536；
> #76 端点/接口/前端消费者源码在案 + CI@e16f20b；#77 OCRPanel 消费 analyzePhysicsProblem 核实 + CI@deb8f91；
> #98 4 脚本参数化 grep 复核 + CI@8622dd8）。**M2.5 OCR 线 4/4 收官；#61 CLOSED → M3 进度 1/8 且解锁 #82（摘 blocked）**。
> **治理异常收编（D18）**：发现 #99–#105 共 7 单于 2026-10-06 16:16Z 绕过规划落盘纪律带外建立（PLAN 无载），
> 内容为远景 B/C/D + M4 延伸——已纳入新增 **M5（候选）** 节尾部排队；**#99（npm 发布/CI-CD 红线）+ #105（英文物料/D17 不做）降 needs-info**
> 待用户决策（D19/D20/D21）；新建 **#106**（#98 残留：冒烟脚本 BASE_URL/通道变量收口，P3 尾）。**队首 = #92**。
> 2026-10-07 十五次滚动：**第十一棒 #92/#82 双单验收 CLOSED——M3 前置三件套（#61 守卫/#92 门禁/#82 类型层）收官，进度 3/8**。
> 实跑复验：#92 边界门禁 5/5 绿（红基线 3 处与 D16 普查逐字吻合；**epsilon 0.1×1e-21 浮点落引擎域外** 9.99e-23<1e-22 为本轮新发现，
> 修 0.2 非 issue 预设 0.1；q 裁决场景对齐引擎域，引擎 |q| 无符号语义）；#82 charts 类型化（编译期红→绿 TS2345 常驻单测 +
> 渲染层强转 9 处清零 + 双向夹逼，31 模型登记表）。**#62–#66 blocked 已摘除**（十五次滚动，M3 迁移批次开工）。
> **用户 D20/D21 定夺落盘**（十四次滚动·续在 #107/#99/#105 记录）：dry-run 门禁先行 → **#107 入图 ready**（P2，真实发布暂缓、#99 维持 needs-info）；
> 英文物料随发布走（#105 维持 needs-info）。**D19（M5 立项）仍 pending**。AGENTS.md charts 强转陷阱条目已改写指向 chartsOf/getChart。
> **队首 = #62**。
> 2026-10-07 十六次滚动（本会话，与十五次滚动为**不同规划实例**，D22 已记并发）：**治理补落盘轮，无 in-review 待验收**
> （#92/#82 已由十五次滚动规范关闭，验收评论在案；本轮核 CI @ `fc083a3`/`8d7293e` = **CI+Deploy success**，
> 补齐第十一棒 HANDOFF 请求确认的未决项）。**D19（M5 立项）补落盘为已确认**——用户十四次滚动当轮已答
> 「维持现状专注 M3+M4」，当时仅 D20/D21 入档、**D19 漏记**（见 D19）；#100–#104 维持 parked、不立项 M5，
> **pending 区现已清空**。**现场：第十二棒 Executor 已领取 #62（`in-progress`，分支 `agent/issue-62-batch1-optics`）**——
> 本轮不动其现场；注：**#62 已领取但 `.agent/LOCK` 不存在**，下棒开工先补建锁并按 1.2 记心跳。
> 2026-10-07 十七次滚动：**M3 批次 1/2（#62 五景 + #63 四景）双单验收 CLOSED → 进度 5/8**，in-review 清零——
> 规划者实跑复核（定向三件套 **100 passed · exit 0**、`count:check` exit 0 = core 1125/viz 1552/**total 2677**、
> 豁免表精确计数 **22→13**、两批共 9 个 sceneId 已全部销名、5+4 个 draw 函数体抽源码确认真消费引擎数据且走 #82 `chartsOf`
> 类型层零强转、**两批均未改引擎**、CI/Deploy @ ac4ffb1/5205370 success）。**新立 #108（P2）**：#62 报告观察到的
> 引擎截断 `h=6.626e-34` 经查为 **`LITERAL_PATTERNS` 名单从未含 h**（同 #51 的 e 截断绕过同类），4 文件/5 处静默越过 M1 常量门禁；
> 执行棒判「不另立 issue」，**门禁面属规划者职责故立单**。另记 photoresistor **真双源修复**（旧渲染漏引擎暗电阻温度项，同 #58 性质）
> 印证 D9 立 M3 判断。**队首 = #64**。
> 2026-10-07 十八次滚动（治理轮，**无 in-review 待验收**、无执行棒运行）：对即将开工的批次三单补做 **ready 门禁质检**——
> #64 正文质量合格（阶段 C 豁免可核：audit「第 5 批 1c 覆盖抽查收尾」7 个可保留清单；双登记陷阱与「勿动 audit 总计数」均已写明）；
> 但查到一处**真实误导风险**：#64/#65/#66 均将「迁移套路」指向 #62 正文，而 #62 第 28 行仍存 **#82 之前的旧口径**
> （「访问需 `as unknown as Record<…>` 强转」）——AGENTS.md 已于 `d51fcf2` 改为禁用强转、走 chartsOf/getChart。
> 已给 **#64/#65/#66** 各发一条「口径更新」comment（不改已关闭单的历史正文）；新录 **遗留观察**：渲染层仍存 4 处
> `as unknown as`，但作用于 `simulationResult.extra`/`.meta` 而非 charts（属 D15 为 #82 划定的未覆盖面，归 #104 范畴）。**队列不变，队首仍 #64**。
> 2026-10-07 十九次滚动：**#64（M3 批次 3 热学定律）验收 CLOSED → 进度 6/8**，in-review 清零——
> 规划者实跑复核（定向三件套 **106 passed · exit 0** = coverage 7 + renderers 26 + contract 73；`count:check` exit 0 =
> core 1125/viz 1558/**total 2683**；**豁免表 13→10**（累计 22→10，已迁 12 景 + 2 景正式登 C）；三景 `maxValues` 消费抽源码核实、
> **零 `as unknown as Record` 强转（上一轮口径更新已生效）**；C 两项未写成 audit 表首列反引号行 grep=0；CI+Deploy @ c82ec34/fcf3ae9 success）。
> **两条经验提升为长期指令**（见下方 Executor 指令 4）：判 C 的场景不得进迁移进展表首列反引号行（否则破 7 项差集例外）；
> 输入参数读 `param` 即等价、不必从引擎消费（裁定适用 #65/#66，无需再问）。新录遗留观察：pre-push 钩子 core vitest 首跑抖动（1 次，未立单）。
> **队首 = #65**。

## 当前方向

**M2 · L5 组合实验台场线渲染收尾**（用户 2026-10-02 定夺，见 D6/D7；D10 补充前置）——
直通终极愿景（3D 引擎 + 拖拽组合实验台）。**M2 三单已全部收官（#67/#60/#68）、M2.5 · OCR 拍照解题功能线
也已 4/4 收官（#74/#75/#76/#77）**。当前方向为 **M3 · B 类数值单源深化**
（D9：#61 守卫 ✅ → #92 门禁 ✅ → #82 B1 ✅ → #62–#66 五批（#62/#63/#64 ✅）；**进度 6/8，队首 #65**，豁免表 22→10）。
其后 **M4 · 组合实验台深化与体验收尾**（#93–#97，D17）；**M5（候选）· 组合实验台深化 + 架构治理**
（#100–#104，D18 收编）——**用户 D19 已定：不立项、维持 parked**，M3+M4 收口前不领。

| # | 主题 | 状态 | 优先级 | 验收标准（摘要） | 依赖 |
|---|---|---|---|---|---|
| [#67](https://github.com/zhangjszs/physical-modelvis/issues/67) | L5 场线渲染收尾：收编并发遗留 WIP（fieldLines/fieldLineSeeds + Stage 集成） | ✅ **CLOSED**（`83fa03e` + 验证收口，第 3 轮巡检收尾确认） | P1 | 剩余范围已收窄：推 `83fa03e` 并盯 CI/Deploy；UI 场线松手随动实测；确认走引擎 `traceFieldLine`；11 层自检与 count:check 绿 | —（清场已完成） |
| [#60](https://github.com/zhangjszs/physical-modelvis/issues/60) | 引擎单位记号统一（'deg'→'°'/'um'→'μm'）+ 门禁（D5/D5a 定夺） | ✅ **CLOSED**（`fff307f`；29 处替换 25 deg+4 um+渲染 1 处，双包门禁各 +1 it，验收 11/11） | P2（由 P3 上调） | — |
| [#68](https://github.com/zhangjszs/physical-modelvis/issues/68) | lint/format 门禁盲区收口（tests/scripts 纳入；PR #25 意图转内部，D8） | ✅ **CLOSED**（范围已于 2026-09-28 由 #14 两 commit 完整落地：`2d4c66f` tests 覆盖+any→warn / `36aed93` scripts 按类型环境+prettier 复排；本轮实测 lint 0 错 19 warn、format:check 全过后按「重复」关闭） | P2 | 无 |

**执行顺序**：**M2.7 加固线：#83 → #84 → #85 → #86 → #89 → #90**（全部 CLOSED，M2.7 收官；
#91 为执行中 auto-discovered 的赫兹场景域 bug，已修复关闭）
→ M2 尾巴 **#60 → #68**（均已 CLOSED，#68 范围经 #14 提前落地）
→ **M2.5 OCR 线：#74 → #75 → #76 → #77**（**全部 CLOSED，OCR 线 4/4 收官**）
→ 验证基础设施 **#98**（msedge 通道参数化，✅ CLOSED；残留转 #106）
→ **M3：#61 → #92 → #82(B1) → #62–#66**（前置三件套 ✅ + 批次 1–3 ✅，**进度 6/8**；现队首 #65；D12 排序口径不变）。

**进度**：M2 3/3（#67 ✅ / #60 ✅ / #68 ✅）+ M2.5 4/4（#74/#75/#76/#77 ✅）—— **M2 + M2.5 均收官**，当前方向 **M3**（进度 6/8，队首 #65，豁免表 22→10）。

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
| [#74](https://github.com/zhangjszs/physical-modelvis/issues/74) | 多提供方扩展：VisionProvider 抽象 + OpenAI 兼容适配器 + 前端配置收口（顺带收口硬编码 `localhost:3001` / placeholder "gpt-4o" 误导 / 模型静默回落三缺口） | ✅ **CLOSED**（`ad7a1d5`；2026-10-06 验收：OCR 82/82 实跑 + e2e 30/30 + UI 探针 5/5 + 源码抽查） | P2 | — | — |
| [#75](https://github.com/zhangjszs/physical-modelvis/issues/75) | 质量收口：OCRPanel 组件测试 + 代理 HTTP 层测试 + 巡检覆盖 + 组合台模式切换修复 | ✅ **CLOSED**（`349d21d`+`5c8b8c0`+`2d83afb`；2026-10-06 验收：组件 8/8 + HTTP 10/10 实跑 + 巡检红绿 JSON 复核 + appMode 源码抽查） | P3 | — | — |
| [#76](https://github.com/zhangjszs/physical-modelvis/issues/76) | 「举一反三」demo（自动写题）：`/api/problems/generate` + 题卡按钮 → 变式题可加载仿真 | ✅ **CLOSED**（`08890ab`/`e16f20b`；2026-10-07 验收：端点/接口 `buildTextRequest`/前端消费者源码在案 + e2e 16/16 + CI/Deploy success） | P3 | — | ~~#74~~（已 CLOSED） |
| [#77](https://github.com/zhangjszs/physical-modelvis/issues/77) | problemAnalyzer 孤儿模块处置：接线「粘贴题干→自动建模」或归档 | ✅ **CLOSED**（`70405f0`/`deb8f91`；2026-10-07 验收：方案一接线，OCRPanel 消费 analyzePhysicsProblem + 组件测试 +3；不合并两套映射合理） | P3 | — | 无 |

**执行顺序**：#74 → #75 → #76 → #77 均已 CLOSED（**M2.5 OCR 线 4/4 收官**，2026-10-07 十四次滚动验收 #76/#77）。

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
| [#61](https://github.com/zhangjszs/physical-modelvis/issues/61) | 前置守卫：「渲染消费引擎结果」快照豁免表 + 迁移/契约差集自动化（自检仍 11 层） | ✅ **CLOSED**（`1bf9ff6`/`ae15536`；2026-10-07 验收 9/9：守卫 7/7 实跑绿 + 豁免 22/例外 7 核对 + L11 数组化） | P1 | — |
| [#82](https://github.com/zhangjszs/physical-modelvis/issues/82) | **B1 前置**：charts 类型化访问层最小切片（每模型 typed accessor）——五批迁移写新 API 不返工 | ✅ **CLOSED**（`7b93cda`/`fc083a3`；2026-10-07 验收：编译期红→绿 TS2345 常驻单测 6/6 + 渲染层强转 9 处清零 + 双向夹逼 + #61 守卫 7/7 兼容） | P1 | ~~#61~~（已 CLOSED） |
| [#92](https://github.com/zhangjszs/physical-modelvis/issues/92) | **参数域边界门禁**（D16 用户观察摸底）：每场景每参数 min/max 边界值须过引擎 validate（并入 L2 家族）+ 存量 3 处 #91 同类失配修复（audioFreq 200→20kHz / q min −10→0.1 / epsilon min 0.01→0.2） | ✅ **CLOSED**（`180261d`/`8d7293e`；2026-10-07 验收：5/5 实跑 + 红基线 3 处与普查逐字吻合；epsilon 0.1×1e-21 浮点落引擎域外为新发现，修 0.2） | P2 | 无 |
| [#62](https://github.com/zhangjszs/physical-modelvis/issues/62) | 批次 1 光学波动 + 波粒二象（5）：diffraction-grating / polarization-malus / interference / doppler / photoelectric | ✅ **CLOSED**（`ac4ffb1`；十七次滚动验收 9/9：4×B + 1×A 逐量决策、契约 +10、零强转走 chartsOf；未动 unit 记号、未改引擎） | P2 | — |
| [#63](https://github.com/zhangjszs/physical-modelvis/issues/63) | 批次 2 传感器元件（4）：**thermistor 已坐实双源** / hall-effect / photoresistor / strain-gauge | ✅ **CLOSED**（`5205370`；十七次滚动验收 9/9：**thermistor 落 B（硬条件达成）**、photoresistor 漏温度项 **真双源修复**、契约 +8、回退常数同源） | P2 | — |
| [#64](https://github.com/zhangjszs/physical-modelvis/issues/64) | 批次 3 热学定律（5）：heat-direction / perpetuum-mobile 沿用阶段 C 既有豁免结论 | ✅ **CLOSED**（`c82ec34`；十九次滚动验收 9/9：3 景迁 B + 2 景登 C（理由写实引用第 5 批）、契约 +6、**零强转**、audit 计数口径未动） | P2 | — |
| [#65](https://github.com/zhangjszs/physical-modelvis/issues/65) | 批次 4 气体分子 / 静能 / 核（4）：gas-law（249 行自算）/ capacitor-charge / radioactive / liquid-mixing | 已建 · **ready** | P2 | 同上 |
| [#66](https://github.com/zhangjszs/physical-modelvis/issues/66) | 批次 5 电路 + 测量仪器（4）· **收口批**：附带改写 audit/plan 的 B3「保留自算」旧口径 | 已建 · **ready** | P2 | 同上 |

**进度**：**6/8**（#61 ✅ / #92 ✅ / #82 ✅ / #62 ✅ / #63 ✅ / #64 ✅）· **执行顺序**：前置三件套（守卫/边界门禁/类型层）+ 批次 1–3 已收官，**豁免表 22→10**（已迁 12 景 + 2 景正式登 C）
→ **#65–#66 剩余两批（现队首 #65：气体分子/静能/核 4 景，含 gas-law 249 行自算）**，#66 为收口批（附带改写 audit/plan 的 B3 旧口径），
同为 P2 按创建时间依次接手；每迁一景：改渲染消费 `chartsOf` → 从 `EXEMPTION_TABLE` 销名 → 补契约用例，两道守卫 + 边界门禁自动把关。
**已定稿口径（D12，用户 2026-10-02 复核确认，勿重议）**：M3 不早于 #67 CLOSED；#61 用「函数体直接文本引用」
的保守快照口径（已知局限写注释），经 helper 间接消费的误报留给 #62–#66 逐场景复核。

**优先级纪律说明**：M3 实质主干曾留 2 个 P1（#61 前置守卫 + #82 B1 类型化），5 个批次 + #92 参数域边界门禁均 P2 —— 避免 P1 通胀；
**M3 开放 P1 = 0**（#61/#82 均已 CLOSED，十五次滚动），剩余批次全 P2。
发现漂移时规划者负责降级并在 issue 留言。

**blocked 现状一览（摘除全归规划者）**：M3 内 **无 blocked**——#62–#66 的 blocked 已随前置三件套 CLOSED 摘除（十五次滚动）；
#76/#61/#82 的历史 blocked 均已随前置 CLOSED 摘除。
**#99 / #105 → needs-info**（D20/D21 用户已定夺：真实发布暂缓、英文物料随发布走——两单维持 needs-info，真实发布重启前不领）。
当前可执行队列 = **#65 → #66 → #108 → #107 → #93–#97（M4）→ #100–#104（M5 候选，parked）→ #106**
（**#65 现队首**；**#108** 为十七次滚动新立的常量单一真源门禁补漏（h 未入 LITERAL_PATTERNS，P2），与剩余批次 #65–#66 的 8 个待迁场景**零重叠**，插批次后；
#107 为 D20 授权的发布 dry-run 安全切片，P2，插 M3 批次后 M4 前；
#93–#97 为 M4，D17 用户授权；#100–#104 为 D18 带外收编的 M5 候选，**D19 已定：parked 不立项，不领**；
#106 验证基础设施小单插尾部）。

## 验证基础设施单（非里程碑，十三次滚动定级）

| # | 主题 | 状态 | 优先级 | 定级纪要 |
|---|---|---|---|---|
| [#98](https://github.com/zhangjszs/physical-modelvis/issues/98) | verify-*.cjs 冒烟脚本 msedge 通道参数化（方案 A：`SMOKE_BROWSER_CHANNEL` env，对齐 sweep 既有 `QA_CHANNEL`） | ✅ **CLOSED**（`5a01f2b`/`8622dd8`；2026-10-07 验收 3/3：4 脚本 grep 复核参数化 + 红/绿向证据 + CI/Deploy success） | P3 | 残留（BASE_URL/通道变量名统一）已转 #106 |
| [#106](https://github.com/zhangjszs/physical-modelvis/issues/106) | 冒烟脚本参数化收口：3 脚本 BASE_URL env 化 + 通道变量名统一评估（#98 后续） | 已建 · ready（2026-10-07 十四次滚动） | P3 | 尾部排队，不入当前执行队列；~10 行低风险，响应 #98 报告移交信号而建 |
| [#107](https://github.com/zhangjszs/physical-modelvis/issues/107) | physics-core 发布 dry-run CI 门禁：publish --dry-run + files/体积/元数据断言（**无外部发布、不触网、不需 token**，#99 安全切片） | 已建 · **ready**（2026-10-07 十五次滚动入图） | P2 | **D20 用户授权切片**：真实发布暂缓、dry-run 先行；排 M3 批次后 M4 前；包名决策留待真实发布 |

**遗留观察（未立单）**：**61/571 参数的 default 不在 step 网格**（D16 普查，良性类）——首次交互时滑块吸附到
网格点造成小幅静默漂移（如 spring.k 10→10.1）；灾难性组合（吸附值超引擎域）已被 #92 门禁阻止
（场景域⊆引擎域 ⇒ 吸附值≤引擎上界）。若将来要做「参数初值精确呈现」UX 收口，从此观察立项，
治理面 = 逐场景把 default 移上网格或把 min 对齐网格，需评估画面初值变化，暂不做。
**遗留观察（未立单）**：**canvas 公式标注与计算式粒度不一**（#63 验收记录）——光敏电阻面板式仍写
`R(E) = R_dark · exp(−k·E)`（`sensorElementScenes.ts:450`）而计算已含引擎温度项 `R_dark(T)=R_dark·exp(−0.02(T−25))`；
T=25℃ 时二者等价，无正确性影响，属「面板公式与算法严格对齐」类 UX 收口，将来从此观察立项。
**遗留观察（未立单）**：渲染层仍有 **4 处 `as unknown as`** 作用于 `simulationResult.extra`（`electrostaticFieldScenes.ts:414` /
`magneticFieldScenes.ts:163`）与 `.meta`（`emEquipmentScenes.ts:225/1179`）——**非 charts**，属 D15 为 #82 划定的「最小切片未覆盖面」，
**不构成 #82 回归**；extra/meta 的类型化归 **#104**（M5 parked，D19 已定不立项）范畴，若将来 M3 收尾后想先把这一小面收掉，
可从本观察直接立 P3 单（改动面小、与 M3 批次零冲突），暂不预支。
**遗留观察（未立单，含触发条件）**：**pre-push 钩子 core vitest 首跑抖动**（#64 棒 2026-10-07 遇 1 次：首跑失败、本地复跑
`npm test` exit 0 确认非改动引入 → 重试推送钩子通过，**未用 `--no-verify`**，处置合规；本批未改引擎、无新增 core 用例）。
现行证据仅单次，**不立单**；**触发条件 = 再出现第 2 次（任何棒）即立「门禁稳定性」单**，错点参考：`npm error ... vitest run ... core-tests.json`。
下一棒遇钩子首跑红时先本地复跑确认真伪，勿贸然跳钩子。
⚠️ 工作树干净，README 测试数 = core **1125** / viz **1558** / total **2683**（#64 后 count:sync 已回写，
规划者十九次滚动实跑 `count:check` exit 0 一致），执行棒保持全量 `precheck`（含 count:sync）纪律。

## M4 · 组合实验台深化与体验收尾（3D 愿景延伸 · 2026-10-04 立单，排在 M3 后）

用户 2026-10-04 授权扩充 backlog（D17）。M2 收官后 3D 愿景（组合实验台）的下一梯队 + 三项体验/物料收口。
五单全部由 PLAN 既有候选与遗留观察转化而来，**无新方向、无未决产品取舍**。

| # | 主题 | 状态 | 优先级 | 依赖 |
|---|---|---|---|---|
| [#93](https://github.com/zhangjszs/physical-modelvis/issues/93) | 场线交互深化：密度可调 + 磁感线闭合环成型（#67 已交付 E/B 显隐开关；密度/闭合环为 PLAN 原候选剩余两项） | 已建 | P2 | 无 |
| [#94](https://github.com/zhangjszs/physical-modelvis/issues/94) | **调查单**（#86 K2 同款粒度）：L6 候选器材类型评估——fields3d 四类场源之外的扩展优先级，输出可立项的拆分建议 | 已建 | P3 | 无（器材扩展实施单的前置） |
| [#95](https://github.com/zhangjszs/physical-modelvis/issues/95) | 3D 阴影贴图固定 1024² 改自适应分辨率（M2.6 收官观察立单；护栏以 #80 门禁为准） | 已建 | P3 | 无 |
| [#96](https://github.com/zhangjszs/physical-modelvis/issues/96) | 参数初值脱网格治理：61/571 处 default 吸附漂移修复 + default-on-grid 静态门禁（D16 普查 B 类，default 值零变化） | 已建 | P3 | 无（建议排 #92 后复用其场景遍历模式） |
| [#97](https://github.com/zhangjszs/physical-modelvis/issues/97) | README 开源演示物料：playwright 一键截图脚本 + ≥6 张关键界面（远景 D 的无争议切片；英文化/publish 仍未决不做） | 已建 | P3 | 无 |

**执行顺序**：#93 → #94 → #95 → #96 → #97，均在 M3（#62–#66）之后。**#94 是器材扩展实施单的前置**——
其结论落地时由规划者据评估结论另立实施单（引擎原型 / 种子渲染 / 交互分期），不在本表预支。

## M5（候选）· 组合实验台深化 + 架构治理（D18 带外收编 · 2026-10-07 入图，**用户 D19 已定：不立项、维持 parked**）

背景：#100–#105 于 2026-10-06 16:16Z 绕过规划落盘纪律批量建立（PLAN/DECISIONS 无载），内容为远景 B/C/D（D6
『未选未放弃』）+ M4 延伸。规划者十四次滚动收编：保留不删、纳入本候选节（尾部排队，不进当前执行队列）。
**D19 已由用户定夺（十六次滚动补落盘）：不立项 M5，#100–#104 长期 parked，专注 M3+M4**；方向本身未被否决（D6
『未放弃』仍维持），M3+M4 收口后若要重启，本节单张可直接取用，无需重新摸底。

| # | 主题 | 状态 | 优先级 | 红线裁定 |
|---|---|---|---|---|
| [#100](https://github.com/zhangjszs/physical-modelvis/issues/100) | 组合实验台交互增强：器材旋转编辑 + 轨迹回放控制（播/暂停/倍速） | ready（parked） | P2 | 属 D6 已确认愿景内，低风险 |
| [#101](https://github.com/zhangjszs/physical-modelvis/issues/101) | 组合实验台预设实验模板：高频电磁场景一键布置 | ready（parked） | P3 | 同上 |
| [#102](https://github.com/zhangjszs/physical-modelvis/issues/102) | **调查**：多线圈场求值性能（Biot-Savart × Worker 化评估） | ready（parked） | P3 | 调查单，不动代码 |
| [#103](https://github.com/zhangjszs/physical-modelvis/issues/103) | **调查**：渲染层结构治理（按机制抽 primitives + 巨型文件拆分路线） | ready（parked） | P2 | 远景 C：调查安全；**实施重构属红线，需另请示** |
| [#104](https://github.com/zhangjszs/physical-modelvis/issues/104) | **调查**：引擎契约上帝对象治理（ConstraintConfig 拆分 + charts 键名规范） | ready（parked） | P3 | 远景 B：同 #103，实施需另请示；与 #82 不重叠 |
| [#99](https://github.com/zhangjszs/physical-modelvis/issues/99) | physics-core 发布流水线：npm publish + provenance + 包名决策 | ⚠️ **needs-info**（真实发布部分；**D20 已定夺：暂缓**，dry-run 切片已拆出 #107 ready） | P2 | **契约 1.8 红线**（外部不可逆 + CI/CD）——真实发布重启前不入 ready |
| [#105](https://github.com/zhangjszs/physical-modelvis/issues/105) | README 双语化 + CONTRIBUTING 外部贡献者视角补全 | ⚠️ **needs-info**（**D21 已定夺：英文物料随发布决策走**，发布暂缓故维持） | P3 | 触 D17「英文化明确不做」+ 硬依赖 #99 发布决策——维持 needs-info |

**执行顺序**：均在 M4（#93–#97）之后，**D19 已定：长期 parked、不立项，执行棒不领**。#99/#105 维持 needs-info（红线/未决）。
#103/#104 若将来重启，其派生的**实施重构**仍需据结论向用户请示后另立实施单（契约 1.8 红线）。

## 给 Executor 的指令

1. **队首 = #65**（M3 批次 4 气体分子/静能/核 4 景：gas-law（249 行自算）/ capacitor-charge / radioactive / liquid-mixing）
   → **#66**（收口批，附带改写 audit/plan 的 B3 旧口径）→ **#108**（常量门禁补漏）→ #107 → M4。
   迁移面已知坑（#63 报告交接）：viz tsconfig 开 `noUncheckedIndexedAccess` → `maxValues.xxx` 算术需 `?? 0`；
   改完渲染先 `prettier --write` 再复跑契约测试（源码断言读字符串，防重排）；插值处沿用 `Number.isFinite` 守卫（超声速 NaN）。
   **#100–#104 勿领**（D19 已定 parked）；#99/#105 维持 needs-info；领前先查本队列。
   ⚠️ **读 charts 只用 `chartsOf`/`getChart`，禁止新添 `as unknown as Record<…>` 强转**（AGENTS.md 硬口径；
   #62 正文的旧强转写法已作废，详见 #64/#65/#66 的「口径更新」comment）。
2. **标签流转纪律 + LOCK**：第十/十一棒均已规范完成 领取 `in-progress` → 完工 `in-review`，继续保持；
   **本轮发现 #62 已标 `in-progress` 但 `.agent/LOCK` 不存在**——领取时先建 LOCK（JSON: owner/acquired_at/issue/heartbeat_at），
   每完成一单刷一次心跳，收尾（含异常收尾）删锁；否则规划者无法区分「正在跑」与「已中断现场」。
3. **无凭证环境注意**（继承 #75 轮）：OCR demo 链路的端到端验证用 mock 上游（参照 tests/ocr/
   ocr-proxy-http.test.ts 与 .scratch/e2e-74.mjs 模式），真实上游凭证不在本机。
4. **M3 迁移两条已裁定口径（#64 验收时定下，#65/#66 直接沿用、无需再问）**：
   - **判 C 的场景不得写成 audit 迁移进展表的首列反引号行**（`` ^| `sceneId` `` 会被差集守卫计入迁移集→破 7 项例外）；
     改用**散文列出 + 豁免表 note 写实理由**（引用既有批次结论 + 一句具体依据），代码零改动；
   - **输入参数（回显型）读 `param` 即等价**，不必从引擎消费；只需把**计算量**改走 `maxValues`/`chartsOf`（B 局部迁移口径）。
   另有两项现行硬口径：读 charts 只用 `chartsOf`/`getChart`（禁新添强转）；audit B 类**总计数 36/30/去重 60 不得改动**。

## M2 之后的场线延伸（已转 M4：#93 / #94）

M2 主线为 L5 场线渲染（#67）。原候选「场线交互深化 / L6 器材扩展」已于 2026-10-04 立单归入
**M4**（#93 = 密度调节 + 磁感线闭合环样式，显隐开关已随 #67 交付；#94 = L6 器材调查），
不再作为 M2 悬留项；后续器材实施单由 #94 结论产出后另立。

## 远景（粗粒度）

- **开源化技术债三候选**（架构评审口径，用户 2026-10-02 未选、未放弃，D6）——**已于 2026-10-06 带外建单、十四次滚动收编为 M5 候选（D18）**：
  - **B. 引擎契约类型化**（charts schema 化 / problem.ts 1883 行上帝对象 / units 层）→ **调查单 #104**（实施重构属红线，需据结论另请示）。
  - **C. 渲染 primitives 重组**（27 个按章节巨型文件）→ **调查单 #103**（同上红线约束）。
  - **D. 开源发布面**（npm publish / private:true / README 英文化）→ **#99（needs-info/D20）** + **#105（needs-info/D21）**；截图物料已入 M4 #97。
  - **裁定状态**：D6『未选未放弃』维持——调查（#103/#104）低风险可先做以拿数据；发布/英文化/重构均为红线或未决，**用户定前不入 ready**。
- **#44 React 19 专项**（人类持有，勿动）：首屏 +23kB（react-dom 19）破 70kB 门禁，
  需先定预算策略（重议 ≥90kB 或 vendor-react 懒拆）。无论 M2 选哪个方向都不并行做它。
- **B3 深化与契约差集守卫**：已由 **M3 承接**（#61 ✅ CLOSED，把 audit 末尾手工 `grep | comm` 固化为 `single-source-coverage.test.ts` 断言；
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
