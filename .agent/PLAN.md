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
> 2026-10-08 二十一次滚动：**#65 + #66 + #108 三单验收 CLOSED —— M3 · B 类数值单源深化 8/8 收官**，in-review 清零。
> 规划者实跑复核（定向三件套 **122 passed · exit 0**、`count:check` exit 0 = core 1137/viz 1586/**total 2723**、
> 豁免表 22→**2**（无「待迁」）、M3 五批契约共 +40（本两批各 +8）、audit「M3 批次 4/5」节 + 收口记在案、
> **#65/#66 零引擎改动**、零 charts 强转、#108 门禁 42 passed + models 内联 grep 为空；CI/Deploy @ `d5d011f` success、QA 巡检 success）。
> **执行者信号升格立单**：#109（P2，m_e/G/kB 常量门禁打包扩面 + bWien 真源条目 + 普查补漏 blackBodyRig）、
> #110（P3，R 精度误述 3 处订正——#65 更正 claim 作废、结构收敛成立）。**队首 = #107**（发布 dry-run）。
> 2026-10-10 二十二次滚动：**in-review 积压 6 单全部验收 CLOSED（#107/#110/#93/#94/#95/#96）**，in-review 清零。
> 规划者独立复核：#107 dry-run 门禁实跑 exit 0 + 零 tarball 副作用 + `check:publish` 入 precheck 链；
> #110 grep 5e-5 双文件无残留；#93 tests/composition 50 passed + 闭环/性能证据链 + **verify-3d-smoke 前置性
> 匹配缺陷修复认可**（「精讲」徽章 span 致 5 场景永久匹配不到，对齐 qa-sweep 口径；遗留观察留痕不立单）；
> #94 文档 164 行 + 源码零改动 stat 核实（实施单待 M4 收官后据其 §5 立项）；
> #95 shadow-quality 17 passed；#96 parameter-ranges 7 passed + **f73f21a default 行增删为零**
> （default 零变化强验证）+ CI @ `a0e01c4` 复核绿（上棒遗留 in_progress 项）。`count:check` 2753 一致。
> **M4 进度 4/5**。**#97 执行现场（in-progress，规划者不代动）**：分支 `agent/issue-97-readme-screenshots`
> + 未提交产物 `scripts/capture-screenshots.mjs` / `docs/screenshots/`（2026-10-09 23:44 领取，
> 无 LOCK 无报告，距本轮未满 24h 不标记中断，现场归执行者自行恢复或放弃）。
> 2026-10-10 二十三次滚动：**#97 验收部分通过→关闭（README 演示物料交付合格；确定性收尾转 #115）——M4 5/5 收官**。
> 规划者独立复跑截图脚本（干净态 + 污染态对照，三方 md5 + PIL 像素分析）：01/02/03/06 **跨会话逐字节复现**，
> 04 不可见级差（6 像素、max 3/255）、05 内容级漂移（2.1%、max 169，晨/午会话稳定环境差）——
> 执行者「会话内三遍一致」报告属实（hash-A4/B4/C4 核对在案），README「两遍逐字节一致」声明对 05/04 不精确 → **#115**（P3）。
> **#111 定级 P1 · ready · 队首**（生产构建首屏 3D 空白，规划者 probe4 实跑复验：线上/本地空白截图 md5 逐字节一致）；
> **#112 立单**（OCR 弹窗 backdrop-filter 包含块溢出视口，P2）；**#113/#114 立单**（#94 推荐批：条形磁铁 + 匀强磁场区，P2）。
> **队列：#111 → #112 → #109 → #113 → #114，尾 #106 / #115**。
> 2026-10-11 二十四次滚动（治理轮，**无 in-review、无 in-progress、LOCK 不存在**：Executor 空闲）——
> in-review 清零状态维持（#97 已于上轮规范关闭）；CI/Deploy/QA 巡检 @ `8dde348` 均为 success；
> backlog 逐单过检：无重复、无方向冲突、P0=0/P1 仅 #111（容量合规）、#99/#105 维持 needs-info（D20/D21）、
> #100–#104 维持 parked（D19）、#44 人类持有勿动；#111 定级评论在案，ready 门禁维持。
> **队列不变，队首仍 #111**。
> 2026-10-12 二十五次滚动：**in-review 积压 3 单（#111/#112/#109）全部验收 CLOSED**，in-review 清零——
> 规划者逐单核查真实证据：#111 生产构建首屏 3D 空白根因坐实（useSceneSimulation 补 scenes 依赖 + EquipmentStage RO 回调补帧，回归测试 3 例通过，探针采样一致，CI success）；
> #112 OCR 弹窗 portal 渲染（createPortal(document.body) 挂载彻底修复 backdrop-filter 包含块溢出，Playwright 双视口探针与组件测试双绿）；
> #109 常量门禁扩面与全仓收敛（m_e/G/kB 模式扩面 + bWien 落地 + 引擎/渲染/3D rig 全量收敛 + 红绿反向证据链确凿 + 自检 11 层全 PASS，测试数 2782 一致）。
> **队列推进：由 L6 器材推荐批接棒，队首 = #113（条形磁铁 3D 器材组件）→ #114（匀强磁场区器材组件）→ #106（冒烟脚本参数化收口）→ #115（截图确定性收尾）**。
> 2026-10-13 二十六次滚动（**每日规划首轮**）：**in-review 积压 4 单（#113/#114/#106/#115）全部验收 CLOSED**，in-review 清零——
> 规划者逐单独立复核（非只信报告文字）：#113/#114 引擎 33 + viz 组合台 58 本轮重跑全绿、偶极轴上值独立复算
> 1.25e-4T 与报告一致、#114 硬边界注释与 README 双器材在源码确认；#106 独立端到端 `BASE_URL=:3220 +
> SMOKE_BROWSER_CHANNEL=''` 跑 verify-ocr-mount exit 0、三脚本 node --check 过；#115 (b) 属授权二选一，
> README/脚本头措辞、ball.rotation 代码行、10-10 零变更时间线逐项复核，/tmp 像素证据在案；CI/Deploy 截至
> `82a4f73` 全绿。**L6 2/2 收官；ready 队列随之清空**（#100–#104 维持 parked/D19，#99/#105 维持
> needs-info/D20/D21）。新建 **#116**（P2，截图重采：04 仍展示 #112 修复前溢出 bug，06 缺新器材）、
> **#117**（P3，依赖审计只报告不升级）；**队首 = #116 → #117**。另：本轮起建 `TASKS.md`（Issue 只读镜像，
> 标签沿用 `ready-for-agent`≡ready 不另起新标签）；`.agent/DIARY/` 缺失（执行者未写，昨日工作已用
> git log + comment + STATE 反推，见 D28）。**待用户决策 D29**：M 系全收官后路线方向。
> 2026-10-13 二十七次滚动：**D29 用户定夺 B——重启 M5，先放行 #102–#104 调查类拿数据、实施另议**。
> 三单正文已按 ready 门禁复核通过（均为调查不出实现，验收可判定），各单已留放行 comment；
> 派生实施仍属红线，另立另议。**队首 = #103 → #116 → #102 → #104 → #117**（P 优先、同级按创建时间，5 个）。
> 2026-10-14 二十八次滚动（每日规划批次二）：**in-review 积压 5 单（#103/#116/#102/#104/#117）全部验收 CLOSED**，in-review 清零——
> 规划者逐单独立复核（非只信报告）：#116 提交 `67f5d0c` 仅 3 个 png，01/02/03 与前一版**逐字节一致**（git 对象 md5 实测）、CI/Deploy 双 success；
> #102 复跑 `.scratch/102-bench.mjs` exit 0（标量重写 **8.60×**、等价 1.16e-14，与报告 8.68× 同量级）；
> #104 抽查 116 接口 / 1883 行 / `ConstraintConfig` 875 起 107 readonly / 3 幽灵字面量各仅声明处 / `typed-charts.test.ts:73`「113 键」确为陈旧 /
> `problem.ts:1440`「minimal declarations」注释与代码不符（全仓无第二份）——三处口径纠正均属实，**PLAN 无「每模型 5 处」口径**（grep 复核无出处）；
> #103 抽查 `drawMiniChart` 3 定义 + 三巨型文件 2894/2215/1886 全吻合；#117 复跑 `npm audit --omit=dev` exit 0 + JSON metadata 全 0、lockfile 仍 `ad7a1d5`。
> **治理**：#118 定级 **P2**（#112 的**样式维度**回归，不 reopen #112），方向定 **方案 A（令牌上移 `:root`）**，入队首；
> 新建 **#119**（#102-C1 引擎零分配标量重写）、**#120**（#104-C 点状收口 + 两处陈旧注释订正）、**#121**（#103 调查落档 docs/）；
> **LOCK 口径冲突裁决 = 契约 1.2 为准**（串行不设锁；PLAN 指令 2 已改齐；`.agent/LOCK` 无残留）；
> **D30 落盘**：两条最小切片默认放行（可叫停）+ #104 §5.4/§5.5 双标准边界与 A/B 重启触发条件 + 审计常态化暂不纳 CI。
> **待用户决策 D31**：#103 三张重构实施单是否放行（推荐/默认：暂缓）。今日队列 = **#118 → #119 → #120 → #121**。
> 2026-10-14 二十九次滚动（每日规划批次三）：**in-review 积压 4 单（#118/#119/#120/#121）全部验收 CLOSED**，in-review 清零——
> 规划者逐单独立复核（非只信报告）：#118 `:root`/`:root.light` + `App.tsx:36` 镜像在位（亮色 JS 增补为必要偏离，认可）、探针 115 行入库不入 CI、
> 仅 04/05 两图变更；#119 定向三文件 54 passed 复跑 + `COIL_TRIG_CACHE` 在位（查表位等价取舍正确）；#120 幽灵零残留 + `ConstraintFieldName`
> 在位（#104 C3「零迁移成本」漏计 tests/ 消费者，口径修正记 D32）；#121 文档 168 行 + drawMiniChart=3 复核。
> **治理**：L320 触发 → 立 **#122**（P3，门禁稳定性：vitest 首跑抖动累计第 4 次，禁改 workflows/）；立 **#123**（P3，docs 索引补两份 survey，
> 本仓无 P4 标签）；**D32 落盘**；**D31 维持 pending（第 1 天，同日）**。今日队列 = **#122 → #123**。
> 2026-10-15 三十次滚动（每日规划）：**in-review 积压 2 单（#122/#123）全部验收 CLOSED**，in-review 清零——
> 规划者逐单独立复核（非只信报告）：#122 取括号路线「不可复现→转观测」（12/12 绿计数在案，未硬造根因；
> `.husky/pre-push` 失败归档 + `sh -e` 兼容修复已在 main 实测文件确认；CI/Deploy @ `2fd64c6`/`f946b0c` success，
> L320 记“观测中”）；#123 §4 表 62/63 行两份 survey 条目直接读文件复核在位。
> **治理**：ready 队列已空（#100/#101 维持 parked/D19，#99/#105 维持 needs-info/D20/D21，#44 人类持有，D31 仍 pending）；
> 按 PLAN 遗留观察立 **#124**（P3，extra/meta 四处强转类型化，#82 未覆盖面）与 **#125**（P3，光敏电阻面板公式对齐温度项，
> #63 遗留观察）——两单均为在册小单转化，无新方向；**D33 落盘**；**D31 维持 pending（第 2 天）**。今日队列 = **#124 → #125**。
> 2026-10-16 三十一次滚动（每日规划）：**in-review 积压 2 单（#124/#125）全部验收 CLOSED**，in-review 清零——
> 规划者独立复核：#124 4 目标站点全消解（本轮 grep 实测：`visualization/src/rendering` 下 `as unknown as` = **0**）；
> 新守卫文件 `engineExtraAccess.ts` 125 行 + 新测试 `typed-extra.test.ts` 14 例均在位；
> CI 38753146548 · Deploy 38756623425 · 后续 chore(agent) push 38757516722 · QA schedule 38811555624 全 success。
> **验收口径修订**（Planner 单内自纠）：原验收标准第 1 条字面写 “visualization/src 零命中”与实际范围4站点相矛——
> 本轮写入 comment 将口径修订为**「4 目标站点逐一消解 + `src/rendering` 子目录零命中」**（本轮实测达成）；
> 余 225 处属 rig handles 非 #124 范围→已 auto-discovered **#126**，本轮定级 P3 needs-info，新建 D34 pending（默认 C 维持现状，同 D31 先例）。
> #125 选 A 路线（面板公式补温度项），三处均在位（`sensorElementScenes.ts:446–457/480` 本轮直读源码复核）；
> `TEMP_COEFF=0.02` 与引擎 `photoresistor.ts:72` 同源；新测试 4 例 + 红/绿自验 + 浏览器行宽探针 209.8 px；
> CI 38756353803 · Deploy 38756623425 success。**FormulaPanel.tsx:830/835 同场景另一处幂律错式**→新立 **#128**（P3 ready · 今日队列次位）；
> 引擎 `explanation.steps[].formula` 不含温度项属文案层，本轮不立，归遗留观察。
> **治理**：#127（auto-discovered pre-push 沙箱 `/tmp` 只读时无归档）定级 P3 ready（今日队列首位）——
> 不触 1.10（非 workflows 层），仅改 `.husky/pre-push` 归档优先仓库内；补充 4 条验收标准（沙箱能拿证据/非沙箱行为不变/precheck 全绿）。
> #125 执行棒信号 ④（AGENTS.md 补 extra/meta 访问守卫）响应新立 **#129**（P3 ready · 今日队列末位，纯文档）。
> **D31 默认转正**（连续 3 天无用户答复且默认无异常，方案 C 暂缓转已确认）；**D34 新建 pending（第 1 天，#126）**；**D35 落盘**。
> 今日队列 = **#127 → #128 → #129**。
> 同日规划续：用户明确选择 **D36 方案 A**，放行 #126 的 `Rig<H>` 一次性泛型化；#126 已摘 `needs-info`、加 `ready-for-agent`，排在 #127 → #128 → #129 之后。D34 默认 C 由 D36 取代，当前无 pending 决策。
> 用户随后明确新方向：优先统一外部界面风格、提升组件复用能力，为“物理世界盒子”铺路。新建 #130/#131；#131 先做组件复用边界调查，#130 做 UI 视觉规范调查；#126 D36 保持授权但实施前置 #131，暂标 blocked。
> 2026-10-17 三十二次滚动（每日规划）：**in-review 积压 5 单（#131/#130/#127/#128/#129）全部验收 CLOSED**，in-review 清零——
> 规划者独立复核（非只信报告）：#131 文档 330 行（7 组候选 A–G 行号证据 + 6 接口草案 + 3 实施单 α→β→γ，§6 明确不动 rig 生命周期与引擎 API）、
> #130 文档 249 行（7 类分歧附行号 + token 六类全表 + 3 验证组件），两 commit stat 均为单一文档（`1d91367` +330 / `855b2cf` +249）；
> #127 `.husky/pre-push` 三级回退实读复核（TMPDIR → `.scratch/tmp/` → 显式警告），非沙箱行为不变有 `6ce58ae` push 现场证据「归档源: system」；
> #128 指数式 `exp(−k·E − 0.02(T−25))` 在位、幂律旧式 grep **0** 命中、新测试 71 行 4 例本轮独立重跑 passed；
> #129 AGENTS.md 关键陷阱单行追加（L45）与 #82 charts 条目并列双柱。CI/Deploy 于 HEAD `a56a795` success（本轮 gh run list 复核，非 5 单 commit 当时的 CI 即已被后续 push 替代验证）。
> **决策落盘**：用户 2026-10-16 两轮拍板镜像入 D38/D39/D40——#99 改写「只加 CI dry-run 门禁」摘 needs-info 转 ready；
> #105 改写「英文摘要 + badge + first-contribution（不整篇双语、剔除 npm i 示例、入门路径 = TASKS.md/维护者认领）」摘 needs-info 转 ready；
> #44 决策已定（vendor-react 懒拆保 70kB + 首帧探针硬前提），**维持非 ready**，拆单排程留待下一轮；
> #100/#101 本轮**建 `parked` 标签并摘 `ready-for-agent`**（消除执行棒两轮指出的标签-排程背离，D19 维持）；
> **#126 摘 `blocked` 转 ready**（前置 #131 已验收，其 §6 与此单正交，D36 授权兑现）。
> **新立**：**#132**（P2 · #131 实施单 α：PanelSection + LazyPanel 抽取与 DataDrawer/WorkbenchScene 迁移）、**#133**（P3 · docs/README.md 索引补 #131/#130 两行，同 #123 先例）。
> β/γ 依赖 α 产出暂不建单；#130 token 4 切片（补 token / 消硬编码 / 控件状态 / 遮罩统一）收进派生 backlog 待下一轮定夺——避免与 #126 同窗期的多线并发（虽无文件交叠，串行棒须逐个消化）。
> 今日队列 = **#99 → #105 → #132(α) → #133(索引) → #126**。
> 2026-10-17 三十三次滚动（每日规划）：**三十二次滚动队列 5 单验收**——规划者逐单独立核对证据（非只信报告）后分两类处置：
> **#99 验收 CLOSED**（零代码变更，交付物 dry-run 门禁**已在 main**：`check-publish-dryrun.mjs` 156 行 + `ci.yml:68` + precheck 链含 `check:publish`；无分支待合，D38 兑现）。
> **#105/#132/#133/#126 内容验收通过但未合入 main**——`git merge-base --is-ancestor <tip> main` 四条均为否（4 分支都基于 `c23e5b9`，main HEAD `14c280b`）；
> 独立核验：#105 README 英文块+badge+CONTRIBUTING 第一次贡献（`npm i physics-core` grep=0）、#132 PanelSection(57≤60)/LazyPanel(55≤80)+DataDrawer/WorkbenchScene ErrorBoundary=0+8 例测试+common/ 零强转、#133 docs/README +2 行且目标文件在 main、#126 rigs/ `as unknown as` **220→1**（余 1 为范围外 THREE.Mesh）。
> **规划者不 merge（D41）**：合入属改代码/内容的执行动作（README 交叉改动 + count:sync + precheck），越契约 9 边界；且历史全部 CLOSED 单 commit 均在 main。故建 **#134（P1 · 今日队首）** 统一协调合入 4 分支 + count:sync（预期 viz 1671/total 2840）+ 完整 CI + 删分支；**#105/#132/#133/#126 维持 in-review，其 commit 成 main 祖先后下轮关闭**。
> **#126 `handles: unknown` 方案裁定接受**（等价 D36「`Rig<H>` 或等价单一泛型契约」；#134 合入时补红向探针：不存在 handle key → tsc TS2339）。
> **纪律偏差登记**（D41）：#133 `--no-verify` 跳门禁 + 收尾 chore 提交 `12edbe6` force-push（现 `64fa099`）——执行棒均如实自陈，不判失实、不另立整改单，PLAN 指令重申红线。
> **β/γ/#130 token 切片均依赖 α 落 main（=#134）故不入今日 ready**；今日队列实际唯一可开工关键路径项 = **#134**（队列 1 项，宁缺毋滥，β/γ 待下轮 α 落地后建单）。
> 2026-10-17 三十四次滚动（`executor-20261017b` 完成 #134 后追加规划）：**#134 验收 CLOSED**——规划者独立核对 main HEAD `b0fa7de`：4 交付 commit（`c7e20ed`/`6d5868a`/`202417f`/`83da967`）经 `git merge-base --is-ancestor` 均为 main 祖先；README L22 `1169/1671/2840` 与 docs/plan 同值且 CI count:check 绿；rigs/ 强转=1；docs 索引两行在位；**CI+Deploy @ `916ec05`+`b0fa7de` success**；#126 红向探针 TS2339 已实测。**据 D41 关闭 #105/#132/#133/#126**（commit 已入 main、内容前轮已验收）——in-review 清零。
> **集成口径确立（D42）**：本棒执行者选 `--no-ff` 保原 SHA 成祖先（非 rebase——重写哈希会破验收标准第 1 条）；后续 β/γ 合入均沿用「成 main 祖先 + CI 绿」双证。
> **α 落 main 解锁 β/γ**：据 `docs/composition-reuse-boundary.md` §β/§γ 建 **#135（P2 · NumberField 统一 + CompositionLab/ParameterPanel 迁移）** 与 **#136（P2 · StepWizard+OverlayDrawer 抽离，中风险需 Playwright 双视口）**——两单相互独立。#44 vendor-react 拆单 + #130 token 切片本轮未拆（优先复用线 β/γ）。今日队列 = **#135 → #136**。

> 2026-10-18 三十五次滚动（每日规划）：**in-review 积压 2 单（#135/#136）全部验收 CLOSED**，in-review 清零——
> Planner 独立复核（不只信报告）：#135 `4244b32` 已成 main 祖先；NumberField 99 行 / 强转 0；CompositionLab 本地定义已删、ParameterPanel 仅换 JSX；
> 定向重跑 21 passed + composition/guidance/parameter-ranges 80 passed；count:check 2861；CI `39043881529` + Deploy `39044065412` @ `a8dc71f` 双绿。
> #136 `829f990` 已成 main 祖先；StepWizard 120 / OverlayDrawer 78 行、强转 0；三处迁移在位；wizard-overlay 11 passed；
> **本轮独立重跑 Playwright 双视口冒烟 exit 0**（guidance+formula × 1440×900/1024×768：portal/不溢出/遮罩关闭/零 console error）；
> CI `39048587934` + Deploy `39048748078` @ `10dbba9` 双绿。两单验收标准均逐条满足。
> **附带发现（非 #136 差距）**：1024×768 下 `.classroom-inspector` 覆盖 `.stage-actions` 的「公式推导」按钮，Planner 复测 `elementFromPoint` 命中 ASIDE、真实点击不可达（#136 用程序化 DOM click 绕过，已在报告如实登记）→ 新立 **#137**（P2）修复。
> **新立**：**#138**（P2，#130 token 切片 1：补 `:root` 语义 token + 修 `--surface` 未定义；Planner 静态审计 33 个自定义属性中 `--surface` 被用 6 处但从未定义，亮色 guidance/export 回退深色、4 处面板背景透明）、
> **#139**（P3，PanelSection 壳迁移 7 文件 14 处）、**#140**（P2，D40 vendor-react 懒拆/预加载 + 生产构建 headless 首帧探针，解锁 #44）。
> **治理**：#44 正文按现状重写（vite 8.3.1 / express 5.2.1 / TS 7.0.0 / vitest 5.0.3 已在大版本线；剩余 React 19 + recharts 3 / three 0.186 / jsdom 30 / jest-dom 7 / eslint 10 / @types/node 26 逐项另议），加 `blocked`（依赖 #140）。
> **M6 立**：物理世界盒子 UI 统一与组件复用收口（进度 0/6；今日队列 #137→#138→#139）。**D43 落盘**；pending 区维持为空。
> 今日队列 = **#137 → #138 → #139**；#140 为下一批首项（不领今日队列）。

> 2026-10-18 三十六次滚动（队列巡检与就绪复核）：**无新增 in-review 待验收**（自三十五次滚动验收关闭 #135/#136 后 Executor 尚未开工；CI 及定时 QA 场景巡检在 main @ `aa471c9` 全绿）。
> 权威 GitHub Issues 与 TASKS.md 镜像一致无漂移。
> **今日队列确认**：维持 **#137 → #138 → #139**（3 单均通过 4.2 ready 门禁，清晰自包含；Executor 可直接自队首 #137 领取开工）。#140 维持下一批首项（今日不领）；pending 决策维持为 0。

> 2026-10-18 三十七次滚动（每日规划 · 验收轮）：**in-review 积压 4 单（#137/#138/#139/#140）全部验收 CLOSED**，in-review 清零——
> Planner 逐单独立取证（不只信报告）：四个交付 commit（`e99f056`/`76ec878`/`5fab11f`/`c7717f8`）经 `git merge-base --is-ancestor` 均为 main 祖先；
> **本轮在生产构建（`vite preview` :4173）亲自复跑浏览器探针**——`verify-overlay-drawer-smoke.cjs` ×3 exit 0（#137 双视口真实 click / elementFromPoint / 零重叠 / 无水平滚动 / 双主题）、
> `verify-first-frame-smoke.cjs` ×3 exit 0（#140 首帧 1096/951/1043 ms ≤3000 ms，WebGL 826×690 + 2D 板书非空，0 console error）、`verify-portal-tokens.mjs` exit 0（#138 消费者实际背景）；
> `vitest run token-contract common-components` → 14 passed；`check:bundle` → 9.7 kB/70 kB · vendor-react 43.7/55；`count:check` → 2867 一致；CI+Deploy 四单 @ 各 merge SHA 双绿。
> **#139 逐文件复核**：`grep -c 'className="panel-section'` 7 目标文件全 0，`<PanelSection` 计数 1+1+5+1+2+2+2 = **14** 与正文表格一一对应；DOM 等价性抽查（标题文案逐字不变、PhotogateTimer 附加 class 保留）。
> **验收纠正项（登记，不 reopen）**：#140 报告与 HANDOFF 称「首屏包体积从 67.9 kB 锐减至 9.7 kB = 大幅优化 / 已清除 React 19 瓶颈」——**实测否决**：
> 挂载前必需下载 ≈ **68.8 kB gzip**（index.html 0.6 + 入口 js 1.1 + css 8.1 + bootstrap 14.1 + vendor-react 43.7 + 3 个 <1 kB runtime），而 #140 前门禁值即 **68.0 kB**（CI run `39125798785` 明细可查）。
> 用户侧成本基本没变（68.0 → 68.8 kB），变的是**计量范围**：`check-bundle-size.mjs` 只解析 `index.html` 的 `src|href`，#140 前 Vite 注入的 vendor-react `modulepreload` link 使其一直计入判定，改动态 `import()` 后 link 消失 → React 与 App 双双退出判定。**D40 的 70 kB 首屏保护自此被架空**。
> **#138 两处口径修正**（Planner 立案不严谨，非执行差距）：① 标准「`.app.dark ... #1e293b` 等价重复 = 0」字面未清零，实测仍有 3 处（L1703 `.badge-script` / L2207 `.script-badge` / L2479 `.tool-btn:hover`），契约测试只守了实现范围点名的 2 处；② `--text-*` 实现为 size-only，规范 §2.5 定义为 size+weight 一体，且五族新 token **消费者数为 0**。
> **新立**：**#141**（P2 · ready，挂载前必需资源度量 + 门禁注释/AGENTS.md 现状数字纠偏，**只观测不改判定**，#44 的前置度量件）、
> **#142**（P3 · ready，token 首批等值消费 + 3 处 `.app.dark` 同值硬编码收口 + 规范 §5 盘点按实测修正）、
> **#143**（P2 · **needs-info**，4 个 headless 探针是否接入 CI —— 契约 1.10「主要 CI/CD 流程变化」红线，推荐 A/默认 C，待用户拍板）。
> **治理**：**#44 摘 `blocked` 转 `needs-info`**——技术前置（#140）确已达成，但其验收标准第 1 条「首屏 `check:bundle` ≤70 kB」在 #140 后已不构成约束，React 19 的 +23 kB 将落在不被门禁统计的懒 chunk；按现状盲做会得出「门禁绿 + 真实首屏 +34%」的实质反 D40 结果 → **D44 pending** 前不排。
> 规范 §5 切片 3/4 **暂不建单**：`docs/ui-visual-token-spec.md` 的「~30 处」盘点已失真（CompositionLab 10 / DataDrawer 0 / WorkbenchScene 0；SimulationCanvas 37、PhotogateTimer 17 多数是 canvas 绘制色 / SVG presentation attribute / JS 主题三元，**不可用 `var()` 替换`**）→ 由 #142 先产出实测盘点，再据此拆单。
> **M6 进度 3 / 6**（#137/#138/#139 CLOSED；#142 = 切片 2 首批落地；切片 3/4 待实测盘点）。**D44（pending）+ D45（Planner 自决：`--text-*` 维持 size-only）落盘**。
> 今日队列 = **#141 → #142**（2 单，均过 4.2 门禁；#44/#143 待 D44/探针决策，今日不排）。

> 2026-10-18 三十七次滚动·续（用户同日答复 D44/D46，队列扩容）：用户对两个红线问题统一答复「**按照推荐的来吧**」→ **D44 = B**（先补度量、暂不升 React 19）、**D46 = A**（4 个 headless 探针接入 CI），pending 区**清零**（落实记录 D47）。
> 排程随之变化：**#44 `needs-info → parked`**（解除条件三条写入 Issue comment：用户改选 A/C / React 19 出现已验证功能收益 / react 18 遇安全兼容硬约束）；
> **#143 `needs-info → ready-for-agent`**，正文按 `.github/workflows/ci.yml` 实况重写——实测该 workflow **只有一个 `ci` job**（node 24、根 devDependencies 已含 `playwright@^1.61.1`）故改为**同 job 追加步骤**复用已构建 dist；
> 并登记本单最大的坑：CI 构建带 `VITE_BASE_PATH: /physical-modelvis/`，`vite preview` 按该 base 服务，探针 `BASE_URL` 不含子路径就会**四单全红**（列为必答证据项）；重试用 bash 循环、**零新依赖**；WebGL 若在 runner 不可用**立即停单转 blocked，不得放宽断言**。
> **门禁数值一律未动**（`BUDGET_KB` 70 kB / `vendor-react-` 55 kB），首帧步骤按 B 案**只判时间/画布/console error，挂载前体积合计只打印不判定**。
> 今日队列扩容为 **#141 → #143 → #142**（3 单；#143 依赖 #141 先改 `verify-first-frame-smoke.cjs`，顺序即依赖序）。

> 2026-10-19 三十八次滚动（**治理轮 · 无 in-review**）：昨日 22:33 落盘后 **main HEAD 未变（`cefe669`）、四单已 CLOSED、in-review = 0**，本轮不产验收结论，改为把今日队列三单**逐条重过契约 4.2**并独立实测其事实前提（只读命令，未动代码）。基线三线全绿：CI `39136649170` · Deploy `39136800308` · QA 巡检 `39165693099`。
> **#141 前提坐实**：不依赖浏览器、直接对 `visualization/dist/assets` 逐文件 `gzipSync` 求和 = **68.82 kB**（0.60 入口 html + 1.09 入口 js + 8.08 css + 14.1 bootstrap + 43.7 vendor-react + 0.42/0.42/0.41 三个小 chunk）→ 昨日「≈68.8 kB」结论成立，验收容差 **±3 kB 收紧为 ±1 kB**；度量锚点 `#root` + `#app-loading` 已核实在 `visualization/index.html` L12–13。两处行号误记已改（取数逻辑 L65–74 非 L63–70；头注释过期表述 L10–12 非 L12–16）。
> **#143 补两条「不补就大概率四单全红」的硬前提**：① **4 个探针里只有首帧探针会自启服务**（`ensureServer()` L40），其余三个（`verify-overlay-drawer-smoke.cjs:16` / `verify-portal-tokens.mjs:15` / `verify-guidance-smoke.cjs:11`）只读 `BASE_URL` 且缺省指向 dev 端口 `:3000` → CI 必须显式后台起 `vite preview --port 4173` + 就绪轮询；② `verify-guidance-smoke.cjs:13` 缺省是 **`msedge` 渠道**（另三个为 `''`），而 `playwright install --with-deps chromium` 只装 chromium → 四步骤须共用 `SMOKE_BROWSER_CHANNEL: ""`。另附一条误诊预防：首帧探针 `isServerRunning()` 把 **404 也判为「已就绪」**（`res.status < 500`），BASE_URL 少子路径时不会自启补救、只会把错报成「画布为空/超时」。
> **#143 的两条实况补充（不扩范围）**：本仓**已有浏览器 CI 先例** `qa-sweep.yml`（L53–54 装 chromium / L56–58 后台起服务 / L60–71 curl 轮询）→ 安装与后台服务照抄，但本单必须跑**生产 preview**、且**不并入 qa-sweep、不新建 workflow**（那超出 D46=A 放行范围）；实测现有 `ci` job ≈**2 分钟**（run `39136649170`，20 步）→ 加浏览器步骤后预期 4–6 分钟，本单补 `timeout-minutes: 20`（现无 timeout，默认 6 小时）。**红向触发方式核准**：`ci.yml` 只在 `push:[main]` / `pull_request:[main]` 触发，**临时分支 push 不跑 CI** → 须开 draft PR 触发、报红后关闭不合并。**一处误读已自我否决**：原想把 nightly 巡检全绿当作 WebGL 在 runner 可用的旁证，读码发现 `verify-qa-sweep.cjs` L129/L145 **明确跳过 WebGL 画布** → WebGL 仍是真未知（本单为第一次真检验）；该文件 L80 另记 headless **WebGL 上下文数量上限**的既往假红源 → 裁定 4 探针保持各自独立 `chromium.launch()`，禁止为省时间共享实例。
> **#142 坐实 + 两处误记校正 + 一条新裁定**：`background: #1e293b` 在 `visualization/src` **恰好 3 处**（L1703/L2207/L2479），五族 token `var()` 消费**全为 0**（`--surface` 已有 8+4 消费者），等值关系逐条核到行号（`--space-lg` L68 / `--text-h3` L87 / `--text-body` L88 / `--text-small` L89 / `--radius-xs` L72 ↔ `.panel-section` L298 / `.panel-title` L301 / `.param-label` L333 / `.param-desc` L371 / badge 圆角 **L1697·L2201 在基规则、不在 `.app.dark` 块内**）。校正：L2086 的 `rgba(15,23,42,0.2)` 属 **`.formula-drawer`**（L2077），首稿误写 `.classroom-inspector`；验收判据换成单行可跑的 `grep -rn "background: #1e293b" visualization/src`（原跨行正则恒返回 0，会被误读为「本来就干净」）。**新裁定**：`.panel-title`/`.param-label` 的 4 处 `@media` 覆盖（L1413/L1416/L1463/**L1466=14px**）**本轮不动**——14px 无等值 token，顺手替换必然改数值、直接撞非目标。
> **治理附带**：`origin/agent/issue-95-shadow-adaptive` / `origin/agent/issue-96-default-on-grid` 两分支已是 main 祖先且 Issue CLOSED，属 §1.9 未执行的分支清理——删远程分支影响共享状态且契约禁止 agent 删他人分支，**只上报不删**。**M6 进度维持 3 / 6**；**pending 区维持清零**；队列与优先级**未变**（#141 → #143 → #142），D48 登记本轮裁定。

> 2026-10-19 三十九次滚动（每日规划 · 验收与排程轮）：**in-review 积压 3 单（#141/#143/#142）全部验收 CLOSED**，in-review 清零——
> Planner 独立实测复核真实证据：
> #141（首屏必需资源度量）：`verify-first-frame-smoke.cjs` 连续 3 次通过（793~1360ms），挂载前必需资源实测 68.4 kB gzip（与参照值 68.8 kB 仅差 0.4 kB，在 ±1 kB 容差内）；红向验证 `MEASURE_BOUNDARY=networkidle` 显著上升至 458.2 kB 并超时报错；`check-bundle-size.mjs` 门禁与 `BUDGET_KB`/`LAZY_BUDGETS` 零改动、入口 9.8 kB；注释与 `AGENTS.md` 对齐实测双数；CI `39195735459` + Deploy `39195904480` 双绿。
> #143（4 个 headless 浏览器探针接入 CI）：`ci.yml` 单个 `ci` job 内成功追加 preview 服务启动、就绪探测与 4 探针执行；子路径 `/${{ github.event.repository.name }}/` 与 `SMOKE_BROWSER_CHANNEL: ""` 全探针生效；Ubuntu runner 上 WebGL 画布（826x690）首次真检验通过；Draft PR #144 红绿闭环证实拦截能力有效（注入 `top: 84px` 报错阻断 Deploy，revert 后转绿并按契约关闭未合并）；CI `39198883919` + Deploy `39199156200` 双绿。
> #142（Token 首批等值消费与硬编码收口）：`grep -rn "background: #1e293b" visualization/src` 0 命中；`token-contract.test.ts` 6 passed 且改回 #1e293b 报红有效；五族 token 消费数各 ≥1；响应式断点与 `--shadow-drawer` 维持字面量不变，未越界发明 token；`docs/ui-visual-token-spec.md` §2.5 追加 size-only 说明，§5 按四类实测重写并盘点切片 4 遮罩清单；测试数真值 2869，`count:check` exit 0；CI `39200369677` + Deploy `39200610064` 双绿。
> **M6 进度推进至 4 / 7**。基于 #142 产出的实测盘点，**立单推进 M6 收尾**：
> **#145**（P2 · 切片 4：浮层遮罩与侧栏抽屉统一，4 处 overlay 换 `var(--overlay-bg)`，抽屉换 `var(--shadow-drawer)`，z-index 对齐）；
> **#146**（P2 · 切片 3：控件交互状态规范落地，NumberField / param-input / slider / button 对齐 hover/focus-visible/disabled）；
> **#147**（P3 · 切片 2 延伸：消除 DOM inline style 硬编码色，CompositionLab 10 处及弹窗外层内联样式迁移至 Token）。
> 今日队列 = **#145 → #146 → #147**（3 单，全部过 4.2 ready 门禁）。

> 2026-10-20 四十次滚动（每日规划 · 验收与排程轮）：**M6 收官 7/7**——in-review 3 单（#145/#146/#147）全部独立复核 CLOSED，
> 4 处 overlay 消费 `var(--overlay-bg)`、`.formula-drawer` 消费 `var(--shadow-drawer)`、z-index 梯队 1000/900、控件状态选择器齐全、
> CompositionLab 内联 style 清零、OCRPanel 颜色字面量清零均实测坐实；定向测试 20 passed，count:check 2873 一致；CI `39289347764` + Deploy `39289820909` 双绿。
> **M7 立**（Planner 自决，低风险 UI 基础收口，见 D50）：浮层可访问性 #148 · 主题色 JS 单一真源切片 1 #149（今日队列）；
> 切片 2 #150 依赖 #149，标 `blocked` 不进今日队列。open 共 6 单 = ready 2 + blocked 1 + parked 3，Issue ↔ TASKS.md 零漂移。
> 分支清理观察继续（两个已合并远程分支只上报不代删）；D51 同轮获用户答复：**先完成 M7，收官后解冻 #100/#101 转产品功能线（#100 → #101）**，pending 清零。

> 2026-10-20 四十一次滚动（每日规划 · 验收与排程轮）：**M7 推进 2/3 + #150 解锁入队**——in-review 2 单（#148/#149）全部独立复核 CLOSED：
> #148 浮层可访问性（Esc 关闭 + 初始焦点 + 焦点归还 + Tab 约束 + OCR dialog 语义）交付 `01c03fa`/merge `fc029e7` 入 main；定向单测 35 passed；
> #149 主题色 JS 单一真源切片 1（`themeTokens.ts` 25 键 + 19 个新 CSS 变量 + GraphPanel/PhotogateTimer 颜色三元与 hex 清零）交付 `dfb68d3`/merge `4c07f43` 入 main；
> 契约测试 7 passed，红向反例 exit 1 拦截；测试数真值 2888（+15 viz）；CI `39416415976` + Deploy `39416691193` 双绿。
> **前置就绪，解除 #150 的 `blocked` 标签转入 `ready-for-agent`**，作为今日队列唯一核心单，收尾 M7。
> open 共 **4 单** = ready 1（#150）+ parked 3（#44/#100/#101），Issue ↔ TASKS.md 零漂移。
> 远程分支清理观察继续；D51 约定维持：M7 收官后立即解冻 #100/#101 转产品功能线，pending 维持清零。

> 2026-10-21 四十二次滚动（每日规划 · 验收与排程轮）：**无 in-review 积压，M7 终局 #150 单骑收官**——上一轮 in-review 2 单（#148/#149）已于四十一次滚动关闭；
> 本轮独立抽查：定向 42 例（theme-tokens 7 + wizard-overlay 15 + ocr-panel 20）全绿，`useDialogAccessibility` 双组件接入在位，`themeTokens.ts` 双主题表在位；
> HEAD `4fc7cab` 的 CI 与 Deploy 均 success；#148/#149 残留 `in-review` 标签已清理。
> **今日队列仅 #150（P3 · ready）**：实测基线 `SimulationCanvas.tsx` `isDark ?` 47 处、`EquipmentStage.tsx` L167/L186 写死 `0x0b1020`/`0xf8fafc`；#150 正文测试文件名 `.test.ts` 已更正为 `.test.tsx`，并留基线 comment（6296452544）。
> open 共 **4 单** = ready 1（#150）+ parked 3（#44/#100/#101），Issue ↔ TASKS.md 零漂移；ready 仅 1 单**系有意不凑数**：M7 收官前 #100/#101 按 D51 不得解冻。
> 验收 #150 后 M7 3/3 收官；**下一轮规划**按 D51 解冻 #100 → #101 转产品功能线。远程分支清理观察继续（只上报不代删）；pending 维持清零。

> 2026-10-21 07:24 执行前复核（同日第二次规划会话，**非新规划轮**）：01:01 排程后至复核时**无 Executor 会话、无新提交**；main = origin/main = `1c497f5`，working tree clean；CI / Deploy / QA 场景巡检三绿；#150 基线复核（`SimulationCanvas.tsx` `isDark ?` 47 处且全部为颜色值、`EquipmentStage.tsx` L167/L186、`theme-tokens.test.tsx` 在位）与定向 42 例复跑均无变化；open 4 单、今日队列维持 #150、pending 清零。**不重复排程、不新增任务、不改 #150 正文。**

> 2026-10-21 四十三次滚动（每日规划 · 验收与解冻轮）：**#150 验收 CLOSED —— M7 3/3 收官；D51 兑现，#100/#101 解冻入队**。
> Planner 独立取证（非只信报告）：批次 A/B/C 三 commit + merge `1bdf60e` 经 `git merge-base --is-ancestor` **四条全 YES**；
> `grep -c "isDark ?" SimulationCanvas.tsx` = **0**（含 `isDarkRef.current ?` = 0）、`EquipmentStage.tsx` 写死 `0x0b1020`/`0xf8fafc` = **0**、`getThemeTokens` 消费点 10 处；
> styles.css 批次 A diff 纯新增（31 个 `canvas*` + `--stage3d-bg` 双主题变量），「迁移前字面量回归表」锁定取值零漂移，亮色无语义化调整；
> **定向 58 例本轮独立重跑全绿**（theme-tokens + equipment-stage）；`count:check` exit 0 = core 1169 / viz 1759 / **total 2928**；
> CI `39519139867` + Deploy `39519497003` @ HEAD `72ffeb8` 双绿（验收评论 issuecomment-6306565989）。
> **M8 立（Planner 自决兑现 D51，非新方向）**：组合实验台产品功能线——#100（器材旋转编辑 + 轨迹回放控制，队首）→ #101（预设实验模板，次位）。
> 两单正文已重写（保留原三条 + 补键盘路径 / **产品交互验收（Playwright 浏览器实测，双证据）** / precheck+CI 双绿 / count:sync / 明确不包含与依赖节），摘 `parked` 加 `ready-for-agent`（解冻 comment 在案）。
> 今日队列 = **#100 → #101**；#44 维持 parked（D44=B）；pending 清零。

> 2026-10-21 四十四次滚动（每日规划 · #100 验收轮）：**#100 验收 CLOSED —— M8 进度 1/2；#101 转 P2 即日开工**。
> Planner 独立取证（非只信报告）：`9b020c0` + merge `4d3ef08` 经 `git merge-base --is-ancestor` 均 exit 0（merge 为 `--no-ff`）；
> 定向 36 例（directionUtils 10 + directionEditor 6 + compositionPlayback 7 + compositionStore 13）**本轮独立重跑全绿**；
> `verify-composition-interaction.mjs` **独立重跑 OK**（10 项断言、零 console error）；`count:check` exit 0 = core 1169 / viz 1783 / **total 2952**；
> CI `39596743691` + Deploy `39597035981` @ `4d3ef08` 双绿；源码抽查方向字段四类覆盖、键盘焦点保护、`dirtyRef` 按需渲染门控。
> **证据强度缺口**：探针画布断言仍是 DOM 读数/时间标签级（未做像素差异），与「画布随动重画/静止/跳转」原始意图有差距 → 已立 **#151（P3）** 承接，排在 #101 后。
> **治理**：#101 P3 → **P2**（4.3 普通功能）；开工口径 comment 在案（3 模板保底 / 0.25m 网格 / 单次 commit / 真实截图+像素断言）。
> 今日队列 = **#101 → #151（#101 关闭后）**；#44 维持 parked；pending 清零。

## 当前方向

**四十四次滚动（2026-10-21 · 验收轮）**：**#100 验收 CLOSED —— M8 进度 1/2**。
**今天最重要的事**：完成 **M8 最后一单 #101（P2 · 预设实验模板）**，打通「打开 → 点模板 → 30 秒进入标准实验」课堂主路径：
- **#101（P2 · ready · 队首）**：≥3 个模板一键加载（速度选择器/质谱仪/平行板偏转，磁聚焦可选）、单次 commit、store 测试 + 真实截图/画布像素证据。
- **#151（P3 · ready · 次位）**：浏览器探针像素断言强化（承接 #100 证据强度缺口），在 #101 关闭后开工，避免同文件并发。
**明确不在今天**：#44 React 19（parked，D44=B）；场景 Canvas 调色板迁移（D45 第 ② 类）；#103 派生重构（D31 暂缓）。
**下一轮展望**：M8 收官后回到缺陷/体验收口或按用户新方向规划。

## 今日目标（2026-10-21 · 四十四次滚动）

- **#101（队首）**：≥3 个预设模板一键加载出正确物理图像（直线/圆弧/抛物线），单次 commit 不逐器材重仿真，模板参数过 `validateComposition` 且落 0.25m 网格，store 层测试 + 真实截图。
- **#151（#101 关闭后，余量时）**：交互探针补画布像素级断言（改角度重画 / 暂停静止 / 跳帧 / 倍速推进比），红向验证可拦截。
- 交付 commit 以 `--no-ff` 入 main 成祖先，CI+Deploy 双绿，precheck（含 11 层自检）pass。

## 已完成 Milestone：M6 · 物理世界盒子 UI 统一与组件复用收口（7 / 7 · 2026-10-20 收官）
- #137 / #138 / #139 / #142 / #145 / #146 / #147 全部 CLOSED；验收证据见各 Issue 的 Planner 验收 comment。

## 已完成 Milestone：M7 · UI 基础质量收口：浮层可访问性与主题色单一真源（3 / 3 · 2026-10-21 四十三次滚动收官）
- #148（Esc/焦点/dialog 语义）、#149（themeTokens 切片 1）、#150（SimulationCanvas 47 处 `isDark ?` 清零 + EquipmentStage 3D 背景 token 化）全部 CLOSED；验收证据见各 Issue 的 Planner 验收 comment。
- 完成信号达成：`theme-tokens.test.tsx` 逐项对齐 `styles.css`、红向改值必报红；GraphPanel / PhotogateTimer / SimulationCanvas / EquipmentStage 无散落颜色三元与硬编码 hex；precheck 全绿 + 4 探针 exit 0 + CI/Deploy 双绿。

## 当前 Milestone：M8 · 组合实验台产品功能线（进度：1 / 2 · 2026-10-21 四十四次滚动验收 #100）

### 目标与验收
- [x] **#100**（P2 · ✅ CLOSED 四十四次滚动）：器材旋转编辑（线圈 axis / 极板 normal / 导线 direction 预设轴 + 角度）+ 轨迹回放控制（播/暂停、倍速 0.25×–2×、进度滑块）+ 空格/Delete 键盘路径；Playwright 探针独立重跑 10 项全过、零 console error（证据强度缺口转 #151）。
- [ ] **#101**（P2 · ready · 队首）：3–4 个预设实验模板一键加载出正确物理图像；模板加载单次 commit；每模板 ≥1 个 store 层测试；浏览器实测 + 真实截图 + 画布像素变化断言。

### 完成信号（Success signal）
- 老师「停在最高点讲受力」：回放可暂停在任意帧、倍速可调、暂停时 rAF 不空转（与 #79 按需渲染约定一致）。
- 课堂主路径达成：打开组合台 → 点模板 → 30 秒内进入标准实验（浏览器实测截图存证，零 console error）。
- precheck（含 11 层自检）全绿，CI + Deploy 双绿。

### 明确非目标（Non-goals）
- 不做自由向量输入控件；不改 fields3d 引擎接口与数值语义。
- 不含螺线管等新器材类型（#94 §5 第二波后备，按需另立）；不做模板导入导出/分享。
- 不升 React 19（#44 parked）；不做场景 Canvas 调色板迁移（D45 第 ② 类）；不拆 FormulaPanel（D31 暂缓）。

### 执行队列（给 Executor 的建议顺序，2 个 ready）
1. **#101** 预设实验模板（P2 · area:render · ready-for-agent）——队首，D51 依赖已解除。
2. **#151** 浏览器探针像素断言强化（P3 · area:render · ready-for-agent）——次位，在 #101 验收关闭之后开工（同文件并发保护）。

## 已知阻塞与依赖
- **#101**：#100 已 CLOSED，依赖解除，可即日开工。
- **#151**：依赖 #101 关闭（两者都可能修改 `scripts/verify-composition-interaction.mjs`）。
- **#44（React 19）**：parked（D44=B）勿领，解除条件三条见 Issue comment。
- **分支清理（需用户点头，默认不做）**：`origin/agent/issue-95-shadow-adaptive` / `origin/agent/issue-96-default-on-grid` 均为 main 祖先且 Issue CLOSED，继续只上报不代删。
## 下一阶段
- M8 两单收官后，组合实验台具备「旋转编辑 + 回放控制 + 预设模板」完整课堂链路。
- 届时方向：回到缺陷/体验收口（按巡检发现立单），或按用户新方向规划（#103 派生重构、#44 解除条件等均需用户拍板）。
## 已放弃的方向
- M5 立项（D19 用户已定不立项；#100–#104 维持 parked）。
- #103 派生三张重构实施单（D31 默认转正：长期暂缓）。

| # | 主题 | 状态 | 优先级 | 验收标准（摘要） | 依赖 |
|---|---|---|---|---|---|
| [#67](https://github.com/zhangjszs/physical-modelvis/issues/67) | L5 场线渲染收尾：收编并发遗留 WIP（fieldLines/fieldLineSeeds + Stage 集成） | ✅ **CLOSED**（`83fa03e` + 验证收口，第 3 轮巡检收尾确认） | P1 | 剩余范围已收窄：推 `83fa03e` 并盯 CI/Deploy；UI 场线松手随动实测；确认走引擎 `traceFieldLine`；11 层自检与 count:check 绿 | —（清场已完成） |
| [#60](https://github.com/zhangjszs/physical-modelvis/issues/60) | 引擎单位记号统一（'deg'→'°'/'um'→'μm'）+ 门禁（D5/D5a 定夺） | ✅ **CLOSED**（`fff307f`；29 处替换 25 deg+4 um+渲染 1 处，双包门禁各 +1 it，验收 11/11） | P2（由 P3 上调） | — |
| [#68](https://github.com/zhangjszs/physical-modelvis/issues/68) | lint/format 门禁盲区收口（tests/scripts 纳入；PR #25 意图转内部，D8） | ✅ **CLOSED**（范围已于 2026-09-28 由 #14 两 commit 完整落地：`2d4c66f` tests 覆盖+any→warn / `36aed93` scripts 按类型环境+prettier 复排；本轮实测 lint 0 错 19 warn、format:check 全过后按「重复」关闭） | P2 | 无 |

**执行顺序（历史）**：**M2.7 加固线：#83 → #84 → #85 → #86 → #89 → #90**（全部 CLOSED，M2.7 收官；
#91 为执行中 auto-discovered 的赫兹场景域 bug，已修复关闭）
→ M2 尾巴 **#60 → #68**（均已 CLOSED，#68 范围经 #14 提前落地）
→ **M2.5 OCR 线：#74 → #75 → #76 → #77**（**全部 CLOSED，OCR 线 4/4 收官**）
→ 验证基础设施 **#98**（✅ CLOSED；残留转 #106）
→ **M3：#61 → #92 → #82(B1) → #62 → #63 → #64 → #65 → #66**（**8/8 全 CLOSED，二十一次滚动收官**）
→ **M4：#93 → #94 → #95 → #96 → #97**（**5/5 全 CLOSED，二十三次滚动收官**）
→ **缺陷与门禁收口：#107 → #110 → #111 → #112 → #109**（**全 CLOSED，二十五次滚动收尾**）
→ **L6 器材扩展：#113 → #114**（**2/2 全 CLOSED，二十六次滚动收官**）
→ **验证与物料收尾：#106 → #115**（**全 CLOSED，二十六次滚动收官**）。

**进度**：M2 3/3 + M2.5 4/4 + M3 8/8 + M4 5/5 + L6 2/2 全收官；#107/#110/#111/#112/#109/#106/#115 缺陷门禁物料全部验收 CLOSED。
当前 = **M8 · 组合实验台产品功能线**（2026-10-21 四十四次滚动，进度 **1/2**）：#100 已验收 CLOSED；M7 已 3/3 收官（#148/#149/#150 全 CLOSED）；M6 已 7/7 收官（#137/#138/#139/#142/#145/#146/#147 全 CLOSED）；今日队列 = **#101 → #151（#101 关闭后）**；D51 已兑现，pending 清零。

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
| [#65](https://github.com/zhangjszs/physical-modelvis/issues/65) | 批次 4 气体分子 / 静能 / 核（4）：gas-law（249 行自算）/ capacitor-charge / radioactive / liquid-mixing | ✅ **CLOSED**（`0a86988`；二十一次滚动验收 9/9：4 景全 B、契约 +8 独立复算、liquid-mixing 真漂移修复、R 结构双源收敛——「5e-5 数值差」执行者更正后作废） | P2 | ~~#61~~ |
| [#66](https://github.com/zhangjszs/physical-modelvis/issues/66) | 批次 5 电路 + 测量仪器（4）· **收口批**：附带改写 audit/plan 的 B3「保留自算」旧口径 | ✅ **CLOSED**（`67c920a`；二十一次滚动验收：4 景全 B（仪器类 C 猜想证伪）、三处真漂移修复（kΩ/铁档铝值/未量化）、契约 +8、豁免表无「待迁」、**M3 收口记**） | P2 | ~~#61~~ |

**进度**：**8/8 · M3 收官（二十一次滚动）**（#61 ✅ / #92 ✅ / #82 ✅ / #62 ✅ / #63 ✅ / #64 ✅ / #65 ✅ / #66 ✅）——
**豁免表 22→2**（迁 B 20 景 + 带理由 C 保留 2 景：heat-direction / perpetuum-mobile），差集守卫 7 项例外不变，audit B 类计数 36/30/60 未动。
**收官纪要**：五批共迁移 20 景、契约用例 +40（10+8+6+8+8）；发现并修复真漂移 4 处（thermistor 双源 / photoresistor 漏温度项 /
liquid-mixing 摩尔分数 / resistance-law 铁档铝值 / load-voltage kΩ 与中点、vernier 未量化）；期间同步建成前置三件套
（#61 守卫 / #92 边界门禁 / #82 charts 类型化）。**M3 主线自此关闭**，后续同类问题走常规建单。
**已定稿口径（D12，用户 2026-10-02 复核确认）**：M3 排序与 #61 保守快照口径——已随本线收官，历史依据留档于 D12/D24。
**M3 验收遗留**：#65 的 R 误述残留 3 处 → **#110**（P3 订正）；#108 常量门禁普查的 m_e/G/kB 打包 → **#109**（P2）。

**优先级纪律说明**：M3 实质主干曾留 2 个 P1（#61 前置守卫 + #82 B1 类型化），5 个批次 + #92 参数域边界门禁均 P2 —— 避免 P1 通胀；
**M3 开放 P1 = 0**（#61/#82 均已 CLOSED，十五次滚动），剩余批次全 P2。
发现漂移时规划者负责降级并在 issue 留言。

> **以下为历史快照，非当前状态**（三十八次滚动标注；当前队列见本文件「执行队列」节：#148 → #149；#150 blocked by #149；#44 现状为 **parked**（D44=B），#140 已 CLOSED）。
**blocked 现状一览**：**#44 blocked**（React 19 专项，依赖 #140）；#100/#101 parked（D19）；#130 §5 切片 2–4 未建单（待 #138 后拆）。
**#99 / #105 → 已 CLOSED**（D38 dry-run 切片 / D39 英文物料先行；真实 npm 发布仍未放行）。
当前可执行队列以最新滚动为准（2026-10-18 三十五次滚动）：**#137 → #138 → #139**；**#140** 下一批首项；**#44** blocked by #140；#100/#101 parked（D19）；#130 §5 切片 2–4 待 #138 后拆单。
历史上二十八次滚动队列 = **#118 → #119 → #120 → #121**（已全 CLOSED，二十九次滚动验收）。
（**#111** 生产构建首屏 3D 空白（P1，规划者 probe4 实跑复验在案：线上/本地空白截图 md5 逐字节一致）；
**#112** OCR 弹窗 backdrop-filter 包含块溢出视口（#97 移交信号立单，源码坐标规划者复核）；
**#109** m_e/G/kB 常量门禁打包扩面（P2，2026-10-08 由 #108 执行者信号升格立单，
含 bWien 真源条目与普查补漏 blackBodyRig）；**#113/#114** #94 推荐批器材（条形磁铁 / 匀强磁场区，见 L6 节）；
#100–#104 为 M5 候选，**D19 已定 parked 不领**；#106 验证基础设施尾部、#115 截图确定性收尾，均 P3）。

## 验证基础设施 / 常量门禁单（非里程碑）

| # | 主题 | 状态 | 优先级 | 定级纪要 |
|---|---|---|---|---|
| [#98](https://github.com/zhangjszs/physical-modelvis/issues/98) | verify-*.cjs 冒烟脚本 msedge 通道参数化（方案 A：`SMOKE_BROWSER_CHANNEL` env，对齐 sweep 既有 `QA_CHANNEL`） | ✅ **CLOSED**（`5a01f2b`/`8622dd8`；2026-10-07 验收 3/3：4 脚本 grep 复核参数化 + 红/绿向证据 + CI/Deploy success） | P3 | 残留（BASE_URL/通道变量名统一）已转 #106 |
| [#106](https://github.com/zhangjszs/physical-modelvis/issues/106) | 冒烟脚本参数化收口：3 脚本 BASE_URL env 化 + 通道变量名统一评估（#98 后续） | 已建 · ready（2026-10-07 十四次滚动） | P3 | 队列末位；~10 行低风险，响应 #98 报告移交信号而建 |
| [#107](https://github.com/zhangjszs/physical-modelvis/issues/107) | physics-core 发布 dry-run CI 门禁：publish --dry-run + files/体积/元数据断言（**无外部发布、不触网、不需 token**，#99 安全切片） | ✅ **CLOSED**（`77246b4`；2026-10-10 验收 4/4：dry-run 实跑 exit 0 + 零 tarball 副作用 + 红向探针 A/B 在案 + precheck/CI 接入门禁顺序不变） | P2 | **D20 用户授权切片**；真实发布仍属 #99 needs-info |
| [#108](https://github.com/zhangjszs/physical-modelvis/issues/108) | 常量门禁补漏：h / σ / eV 入列 + 引擎 8 处收敛 | ✅ **CLOSED**（`3c3a545`；二十一次滚动验收：42 passed + models 内联 grep 为空 + 模式样例正/负全过 + CI/Deploy success） | P2 | 纳入 h/σ/eV（零渲染暴露）；m_e/G/kB 打包转 #109 |
| [#109](https://github.com/zhangjszs/physical-modelvis/issues/109) | 常量门禁扩面：m_e / G / kB 纳入 LITERAL_PATTERNS + 引擎/渲染双面收敛（含 bWien 真源条目处置） | 已建 · **ready**（2026-10-08 二十一次滚动立单） | P2 | #108 执行者信号升格（HANDOFF + 普查评论）；含普查补漏 blackBodyRig bWien；#97 后 |
| [#110](https://github.com/zhangjszs/physical-modelvis/issues/110) | 订正 R 精度误述残留 3 处（audit 批次 4 ×2 + gasThermalScenes 注释） | ✅ **CLOSED**（`a91ee5a`；2026-10-10 验收 4/4：grep 5e-5 无残留 + 纯 docs/注释 + 契约 89 绿 + CI success） | P3 | #65 执行者更正（5e-5 claim 作废）后残句清零 |

**遗留观察（未立单，#93 顺带修复已认可）**：**verify-3d-smoke.cjs 目录行匹配缺陷已修复**（随 #93 落地：
目录行含「精讲」徽章 span 致 5 场景永久匹配不到，属前置性验收工具缺陷非 #93 引入；修复改行首名字 span 口径，
对齐 verify-qa-sweep.cjs 既有约定，修复后 14 场景 ×2 轮全绿）。规划者裁定认可、不另立单。
**遗留观察（未立单）**：**61/571 参数的 default 不在 step 网格**（D16 普查，良性类）——首次交互时滑块吸附到
网格点造成小幅静默漂移（如 spring.k 10→10.1）；灾难性组合（吸附值超引擎域）已被 #92 门禁阻止
（场景域⊆引擎域 ⇒ 吸附值≤引擎上界）。若将来要做「参数初值精确呈现」UX 收口，从此观察立项，
治理面 = 逐场景把 default 移上网格或把 min 对齐网格，需评估画面初值变化，暂不做。
**遗留观察**：**canvas 公式标注与计算式粒度不一**（#63 验收记录）——光敏电阻面板式仍写
`R(E) = R_dark · exp(−k·E)`（`sensorElementScenes.ts:450`）而计算已含引擎温度项 `R_dark(T)=R_dark·exp(−0.02(T−25))`；
T=25℃ 时二者等价，无正确性影响，属「面板公式与算法严格对齐」类 UX 收口，将来从此观察立项。
（→ 已立 **#125**，三十次滚动，本观察闭环。）
**新观察·同场景另一处面板不一致**：引导公式面板 `visualization/src/components/formula/FormulaPanel.tsx:830/835`
仍用教科书幂律 `R = R₀·(E/E₀)^{−α}`，与引擎/画布的指数式不同。
（→ 已立 **#128**，三十一次滚动，与 #125 同精神收口。）
**新观察·引擎 explanation 文案**：`physics-core/src/models/photoresistor.ts` 的 `explanation.steps[].formula` 不含温度项（属引擎文案层，与 #125 相邻）。
本轮不立单；若后续同类引擎文案与算法不对齐观察再现，统一打包立项。
**遗留观察（未立单）**：渲染层仍有 **4 处 `as unknown as`** 作用于 `simulationResult.extra`（`electrostaticFieldScenes.ts:414` /
`magneticFieldScenes.ts:163`）与 `.meta`（`emEquipmentScenes.ts:225/1179`）——**非 charts**，属 D15 为 #82 划定的「最小切片未覆盖面」，
**不构成 #82 回归**；extra/meta 的类型化归 **#104**（M5 parked，D19 已定不立项）范畴，若将来 M3 收尾后想先把这一小面收掉，
可从本观察直接立 P3 单（改动面小、与 M3 批次零冲突），暂不预支。（→ 已立 **#124**，三十次滚动，本观察闭环）
**遗留观察（未立单，含触发条件）**：**pre-push 钩子 core vitest 首跑抖动**（#64 棒 2026-10-07 遇 1 次：首跑失败、本地复跑
`npm test` exit 0 确认非改动引入 → 重试推送钩子通过，**未用 `--no-verify`**，处置合规；本批未改引擎、无新增 core 用例）。
现行证据仅单次，**不立单**；**触发条件 = 再出现第 2 次（任何棒）即立「门禁稳定性」单**，错点参考：`npm error ... vitest run ... core-tests.json`。
下一棒遇钩子首跑红时先本地复跑确认真伪，勿贸然跳钩子。
**遗留观察·pre-push 沙箱 /tmp 只读时无归档**（#125 棒 2026-10-15 遇 1 次，bwrap 沙箱 mktemp 失败降级为直播无归档，复跑同 HEAD exit 0）——执行棒登记 auto-discovered #127。
（→ 已立 **#127** 三十一次滚动 ready · 今日队列首位，归档优先仓库内，不触 1.10。）
⚠️ 工作树干净，README 测试数（三十二次滚动实测口径）= core **1169** / viz **1663** / total **2832**（与 STATE/DIARY/docs/plan 四处一致；#128 守卫测试 +4，count:sync 已回写），执行棒以实跑
`npm run count:check` 为准；此前的 1137/1586/2723 为二十一次滚动历史快照。

## 生产缺陷与确定性收尾（非里程碑 · 2026-10-10 二十三次滚动立单）

| # | 主题 | 状态 | 优先级 | 定级纪要 |
|---|---|---|---|---|
| [#111](https://github.com/zhangjszs/physical-modelvis/issues/111) | 生产构建 3D 舞台空白：首屏默认场景不渲染 + 暂停态开数据抽屉永不补帧（#97 执行者 auto-discovered） | 已建 · **ready**（规划者定级评论含范围 + 6 条验收标准） | **P1** | 规划者 probe4 实跑复验：线上/本地空白截图 md5 逐字节一致、点击场景后出画面；可一键恢复故不判 P0；队首 |
| [#112](https://github.com/zhangjszs/physical-modelvis/issues/112) | 修复 OCR「拍照解题」弹窗溢出视口顶部（backdrop-filter 包含块致 fixed 弹窗上半不可见） | 已建 · **ready** | P2 | #97 执行报告移交信号，规划者复核源码坐标属实（OCRPanel 无 portal / top-bar backdrop-filter / overlay fixed）；修复方向 createPortal 对齐 GuidancePanel |
| [#115](https://github.com/zhangjszs/physical-modelvis/issues/115) | 截图确定性收尾：#97 复采脚本 04/05 跨会话漂移定位 + README 确定性声明措辞校正 | 已建 · **ready** | P3 | #97 验收「部分通过」的剩余量转立；规划者三方 md5 + PIL 像素证据已写入 issue |

## M4 · 组合实验台深化与体验收尾（3D 愿景延伸 · 2026-10-04 立单 · **5/5 已收官**，2026-10-10 二十三次滚动）

用户 2026-10-04 授权扩充 backlog（D17）。3D 愿景（组合实验台）的下一梯队 + 三项体验/物料收口。
五单全部由 PLAN 既有候选与遗留观察转化而来，**无新方向、无未决产品取舍**。
**前置队列**：#107（发布 dry-run）→ #110（R 误述订正）之后开工；M4 已 **5/5 收官**（二十三次滚动），
后续接 #111 → #112 → #109 → #113 → #114，尾 #106/#115。

| # | 主题 | 状态 | 优先级 | 依赖 |
|---|---|---|---|---|
| [#93](https://github.com/zhangjszs/physical-modelvis/issues/93) | 场线交互深化：密度可调 + 磁感线闭合环成型（#67 已交付 E/B 显隐开关；密度/闭合环为 PLAN 原候选剩余两项） | ✅ **CLOSED**（`b8074c5`；2026-10-10 验收 5/5：composition 50 passed + 三档密度 + 闭环封口/切向箭头 + 拖拽封顶护栏 + 性能实测在案；顺带修复 verify-3d-smoke 匹配缺陷已认可） | P2 | 无 |
| [#94](https://github.com/zhangjszs/physical-modelvis/issues/94) | **调查单**（#86 K2 同款粒度）：L6 候选器材类型评估——fields3d 四类场源之外的扩展优先级，输出可立项的拆分建议 | ✅ **CLOSED**（`dae7557`；2026-10-10 验收 4/4：164 行调查文档（7 候选 × 5 维度，推荐批 = 条形磁铁 + 匀强磁场区）+ 源码零改动 stat 核实） | P3 | 器材扩展**实施单待 M4 收官后据其文档 §5 立项** |
| [#95](https://github.com/zhangjszs/physical-modelvis/issues/95) | 3D 阴影贴图固定 1024² 改自适应分辨率（M2.6 收官观察立单；护栏以 #80 门禁为准） | ✅ **CLOSED**（`b692154`；2026-10-10 验收 5/5：shadow-quality 17 passed + 三档分档 medium 兜底 + 两处 1024² 收口 + CI success + 测试数 2753） | P3 | 无 |
| [#96](https://github.com/zhangjszs/physical-modelvis/issues/96) | 参数初值脱网格治理：61/571 处 default 吸附漂移修复 + default-on-grid 静态门禁（D16 普查 B 类，default 值零变化） | ✅ **CLOSED**（`a0e01c4`；2026-10-10 验收 5/5：parameter-ranges 7 passed + **default 行增删为零**强验证 + 61 处治理 + 13 处 #92 联动修正 + CI 复核绿） | P3 | 无 |
| [#97](https://github.com/zhangjszs/physical-modelvis/issues/97) | README 开源演示物料：playwright 一键截图脚本 + ≥6 张关键界面（远景 D 的无争议切片；英文化/publish 仍未决不做） | ✅ **CLOSED**（`47903fe`；二十三次滚动验收：4 条标准全过 + 干净态跨会话 4/6 逐字节复现；04/05 确定性收尾转 #115；验收评论在案） | P3 | 无 |

**执行顺序**：#93 → #94 → #95 → #96 → #97 均已 CLOSED（#97 于 2026-10-10 二十三次滚动验收）。
**M4 5/5 收官**。M4 完结接 #111 → #112 → #109 → #113 → #114，尾 #106/#115；
#94 的实施单已据其文档 §5 立项为 **#113/#114**（L6 器材扩展批，见下节）。

## L6 器材扩展批（#94 推荐批 · 2026-10-10 二十三次滚动立项）

#94 调查（`docs/composition-l6-equipment-survey.md`，164 行，二十二次滚动验收）推荐批的直接实施单：
与现四类场源（点电荷/平板/直导线/线圈）零重叠、低成本闭式/常量场，覆盖人教社必修三 13.1 磁感线 /
选必二第一章匀强场实验。朝向编辑依赖 #100（M5 parked，D19 用户已定不立项），故两单均固定朝向 +y。

| # | 主题 | 状态 | 优先级 | 依赖 |
|---|---|---|---|---|
| [#113](https://github.com/zhangjszs/physical-modelvis/issues/113) | 条形磁铁（磁偶极子）：`fields3d` 引擎原型 + 偶极种子/N/S 端色渲染 + 磁矩尺寸参数 | ✅ **CLOSED**（`ced3cce`/`d619060`；二十六次滚动验收：33+58 重跑绿 + 偶极值独立复算 1.25e-4T + CI 后继绿） | P2 | — |
| [#114](https://github.com/zhangjszs/physical-modelvis/issues/114) | 匀强磁场区：盒区常量 B + 边界语义（过渡带/越界即停二选一单内定并文档化）+ 平行种子/盒网格渲染 + 三轴尺寸 | ✅ **CLOSED**（`2bcbfe2`/`8d4996b`；二十六次滚动验收：33+58 重跑绿 + 硬边界注释在案 + B=0 空盒为范围外已知行为 + CI 后继绿） | P2 | — |

**第二波后备（#94 文档 §5，未立项）**：螺线管（建议先并入 #101 预设模板观察需求）/ 带电球壳 /
矩形线框（先决「有限长直段」原型单）/ 接地导体平面（调查不推荐）。将来立项时直接从调查文档取用，无需重新摸底。

## M5（候选）· 组合实验台深化 + 架构治理（D18 带外收编 · 2026-10-07 入图，**用户 D19 已定：不立项、维持 parked**）

背景：#100–#105 于 2026-10-06 16:16Z 绕过规划落盘纪律批量建立（PLAN/DECISIONS 无载），内容为远景 B/C/D（D6
『未选未放弃』）+ M4 延伸。规划者十四次滚动收编：保留不删、纳入本候选节（尾部排队，不进当前执行队列）。
**D19 已由用户定夺（十六次滚动补落盘）：不立项 M5，#100–#104 长期 parked，专注 M3+M4**；方向本身未被否决（D6
『未放弃』仍维持），M3+M4 收口后若要重启，本节单张可直接取用，无需重新摸底。

| # | 主题 | 状态 | 优先级 | 红线裁定 |
|---|---|---|---|---|
| [#100](https://github.com/zhangjszs/physical-modelvis/issues/100) | 组合实验台交互增强：器材旋转编辑 + 轨迹回放控制（播/暂停/倍速） | ✅ **CLOSED**（四十四次滚动验收：定向 36 例 + 交互探针独立重跑 + count 2952 + CI/Deploy 双绿；证据强度缺口转 #151） | P2 | 属 D6 已确认愿景内，低风险 |
| [#101](https://github.com/zhangjszs/physical-modelvis/issues/101) | 组合实验台预设实验模板：高频电磁场景一键布置 | **ready-for-agent（P2）**（四十四次滚动：#100 关闭后解依赖，即日队首；开工口径 comment issuecomment-6318541200） | P2 | 同上 |
| [#151](https://github.com/zhangjszs/physical-modelvis/issues/151) | 浏览器探针视觉断言强化：#100 交互探针补画布像素级证据 | **ready-for-agent（P3）**（四十四次滚动新建；依赖 #101 关闭后开工，避免同文件冲突） | P3 | 测试基础设施，低风险 |
| [#102](https://github.com/zhangjszs/physical-modelvis/issues/102) | **调查**：多线圈场求值性能（Biot-Savart × Worker 化评估） | ✅ **CLOSED**（二十八次滚动验收：复跑 bench exit 0，**8.60×** / 1.16e-14） | P3 | C1 → **#119**（最小切片放行）；Worker 化不立项 |
| [#103](https://github.com/zhangjszs/physical-modelvis/issues/103) | **调查**：渲染层结构治理（按机制抽 primitives + 巨型文件拆分路线） | ✅ **CLOSED**（二十八次滚动验收：坐标抽查全吻合） | P2 | 落档 → **#121**；14 批实施**已按 D31 暂缓** |
| [#104](https://github.com/zhangjszs/physical-modelvis/issues/104) | **调查**：引擎契约上帝对象治理（ConstraintConfig 拆分 + charts 键名规范） | ✅ **CLOSED**（二十八次滚动验收：三处口径纠正属实） | P3 | A/B 不立项；C → **#120**（最小切片放行）；§5.4/§5.5 落 D30 |
| [#99](https://github.com/zhangjszs/physical-modelvis/issues/99) | 发布门禁切片：CI `npm publish --dry-run` + files/类型入口/体积断言（真实发布暂缓） | ✅ **CLOSED**（三十三次滚动：D38 用户两轮拍板——包名保持 / 不真发布 / 版本手动 bump+tag 仅登记；交付物 dry-run 门禁已合入 main） | P2 | real publish 仍属 **1.10 红线**，不经用户放行不动；已授权切片仅新增 dry-run job |
| [#105](https://github.com/zhangjszs/physical-modelvis/issues/105) | 外部入口齐备：README 英文摘要 + badge 行 + CONTRIBUTING first-contribution（不整篇双语） | ✅ **CLOSED**（三十四次滚动：D39 拍板——英文物料先行取代 D21「随发布走」；剔除 npm i 示例；交付 commit 成 main 祖先） | P3 | 原「硬依赖 #99 发布决策」解除；#100/#101 已解冻入 M8 |

**执行顺序**：**#102–#104 调查三单已 CLOSED**（二十八次滚动）；#100/#101 维持 parked（D19）、#99/#105 已按 D38/D39 落地并 CLOSED，执行棒不领。#103 派生的**重构实施单已按 D31 默认转正暂缓**；#102-C1/#104-C 按最小切片放行（D30，已兑现）。

## 给 Executor 的指令

1. **队首 = #101**（P2，组合实验台预设实验模板；#100 已验收关闭，D51 依赖解除）。#151（探针像素断言强化）在 #101 关闭后开工。
   **硬边界**：≥3 模板保底（速度选择器/质谱仪/平行板偏转，磁聚焦可选）；模板位置/尺寸落 0.25m 网格（`snapVector` 口径）；参数全过 `validateComposition`；加载单次 commit；不含螺线管等新器材；不引入新依赖。
   **#44 维持 parked 勿领**（D44=B，解除条件三条在 Issue comment）。
   沿 D42 集成口径（`--no-ff` 使交付 SHA 成 main 祖先 + CI 绿双证），新增测试后 `count:sync` 回写；**全程禁 `--no-verify` / 禁 force-push**。
   **报告口径提醒**：#101 产品交互验收必须给 Playwright 浏览器实测证据 + **真实截图 + 画布像素变化断言**；不要把「单测绿」写成「交互已实测」。#100 的 DOM 级探针缺口已由 #151 承接，不得在 #101 报告中再次以 DOM 读数冒充画布证据。
2. **标签流转纪律（LOCK 已裁决废止）**：继续规范执行 领取 `in-progress` → 完工 `in-review`；
   **不设锁**——契约 1.2 串行口径为准（2026-10-14 二十八次滚动裁决，见 D30；`.agent/LOCK` 现无残留，若再见直接删除）。
3. **无凭证环境注意**（继承 #75 轮）：OCR demo 链路的端到端验证用 mock 上游（参照 tests/ocr/
   ocr-proxy-http.test.ts 与 .scratch/e2e-74.mjs 模式），真实上游凭证不在本机。
4. **长期硬口径（M3 收官后仍生效）**：audit B 类**总计数 36/30/去重 60 不得改动**；
   渲染层收敛常量时**回退分支常数必须同源**（#58 模式）；改完渲染先 `prettier --write` 再复跑契约测试
   （源码断言读字符串，防重排）；插值处沿用 `Number.isFinite` 守卫（超声速 NaN）；
   viz tsconfig 开 `noUncheckedIndexedAccess` → `maxValues.xxx` 算术需 `?? 0`。
5. **环境与工具链约定（用户指令）**：若未来工作涉及 Rust 模块，统一使用 `mise` 进行 Rust 工具链安装与版本管理。


## M2 之后的场线延伸（已转 M4：#93 / #94）

M2 主线为 L5 场线渲染（#67）。原候选「场线交互深化 / L6 器材扩展」已于 2026-10-04 立单归入
**M4**（#93 = 密度调节 + 磁感线闭合环样式，显隐开关已随 #67 交付；#94 = L6 器材调查），
不再作为 M2 悬留项；后续器材实施单由 #94 结论产出后另立。

## 远景（粗粒度）

- **开源化技术债三候选**（架构评审口径，用户 2026-10-02 未选、未放弃，D6）——**已于 2026-10-06 带外建单、十四次滚动收编为 M5 候选（D18）**：
  - **B. 引擎契约类型化**（charts schema 化 / problem.ts 1883 行上帝对象 / units 层）→ **调查单 #104**（实施重构属红线，需据结论另请示）。
  - **C. 渲染 primitives 重组**（27 个按章节巨型文件）→ **调查单 #103**（同上红线约束）。
  - **D. 开源发布面**（npm publish / private:true / README 英文化）→ **#99**（已 CLOSED，D38 dry-run 切片）+ **#105**（已 CLOSED，D39 英文物料先行）；截图物料已入 M4 #97。
  - **裁定状态**：D6『未选未放弃』维持——调查（#103/#104）已收官；#99/#105 已按 D38/D39 落地；#103/#104 派生重构按 D31 暂缓；真实发布/全量重构仍须用户另定。
- **#44 React 19 专项**（决策已定，D40，2026-10-16 用户拍板）：**vendor-react 懒拆/预加载，保住 70kB 门禁不抬预算**；前置 **#140** 已于 2026-10-18 拆单（P2 ready，下一批首项），#44 转 `blocked`；验收必须含「生产构建 + headless 首帧探针」（#111 教训）。vite 8 / express 5 / TS 7 已落地，其余大版本逐项另议。
- **B3 深化与契约差集守卫**：已由 **M3 承接并收官**（#61 ✅ 守卫固化 `grep | comm` 为 `single-source-coverage.test.ts`；
  #62–#66 五批 ✅ 完成「B 类渲染公式与引擎 charts 一致性」逐量决策，迁移 20 / 豁免 2）——此项闭环，不再作为远景模糊项。
- **测试数门禁盲区**：`npm run count:check` 在脏树（存在未跟踪测试文件）下不可信。
  **2026-10-03 评估**：#67 后树持续干净 + 执行棒 precheck 纪律恢复，误判风险实际未发生；
  不建「树必须干净」前置断言（避免误伤合法场景：如正在新增测试的执行中途），
  若将来出现脏树 count 误判实例再立单。此项闭环。

## 已放弃的方向及原因

- **文档数字漂移批量清理**（D2 隐含）：#46–#50 五轮已把可发现的漂移扫尽，
  剩余属历史快照与冻结归档，无收益。转向有物理正确性影响的工作。
- **σ 单独加 LITERAL_PATTERNS 门禁**（#58 两根执行棒一致结论）：用「既有 it 内加断言」
  锁定，避免门禁面扩大 + 需补 PATTERN_SAMPLES。
