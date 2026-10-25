# TASKS（GitHub Issue 本地镜像）

> Planner 整体重写 · 2026-10-25 · D66。GitHub Issues 可读写，为唯一权威；Executor 先改 Issue，再同步本文件状态。
> 开放 3 单：in-review 2（#157 / #158）+ blocked 1（#44）；ready / in-progress / needs-info / P0=0，P1=2。
> ready 对应 `ready-for-agent`，done 对应 CLOSED；parked 只是冻结属性，不是第二生命周期。

## 本轮验收与来源

- 10-24 日报 #155 / #156 已在 D63 / D64 验收 CLOSED；10-23 日报 #101 / #151 / #154 也已验收，本轮核对去重，不重开旧文档单。
- #157 执行报告已发布但没有对应交付日报：10-24 日报无该交付、10-25 日报未见。已用 Issue 报告、Git、STATE 反推；STATE 旧验证块/HANDOFF 仍是 #156，已在 #157 验收 comment 要求 Executor 自行刷新并追加正确日期 DIARY，历史不覆盖。
- #157 默认运动修复已验证，但几何、标牌与证据差距未关，结论部分通过 → in-progress（首次退回），不关闭。M9 保持 0/2。

## 今日队列（2026-10-25）

**新增 ready=0，以下为两个已有 in-progress 的恢复顺序，不冒充 ready。** 依契约不重置执行现场、不重复立单；在 D61=A 维护态按“宁缺毋滥”接受低于 2–5 个 ready 的例外，无新增功能取舍。

### 1. 恢复 #158 · 修复斜面板与球轨迹错位、二次投影及全程支撑范围

- Issue：[#158](https://github.com/zhangjszs/physical-modelvis/issues/158)；状态：**in-review**（Executor 已交付，报告见 issuecomment-6399039638）；优先级：**P1**；Milestone：**M9 课堂核心场景坐标纠错**。
- 现场：`agent/issue-158-inclined-plane-rig`，基于 `fc2e731`；领取记录 `2026-10-24T16:58:38Z`，本轮尚未达 24h，不判疑似中断。没有交付报告，Planner 不代实施、不重置状态。
- 当前问题：真实目标 `inclined-plane`，不是 `galileo-incline`。D65 已确认默认30°球心距板上表面为负值 −0.684115427 world，实际应为球半径 +0.18；引擎已输出笛卡尔 XY，旧 rig 再投影造成切向位移缩水；默认3s真实沿面长度3.528 world 超过旧板3.2。
- 做什么：板角/长度/端点/厚度单一几何；实际引擎 XY 等比缩放平移，法向偏移半板厚+球半径。展示板根据真实完整有向采样覆盖全程，不被地面夹高改变轨迹；移除无碰撞语义的装饰红挡板；a 标签读引擎。只允许必要的最小内部结果上下文接缝，更新受影响审计/进度。
- 不做什么：不改公共引擎 API、初速/摩擦语义或轨迹，不新增碰撞/离板/落地模型，不渲染层假停，不扩其他场景、依赖、CI 或预算。
- 依赖：无未满足硬依赖；本轮建议 #158 → #157 只为保留当前现场，不等待任一 Issue 关闭。
- 验收（完整原文以 Issue 为准）：
  - [ ] 真实 scene→engine→rig/mesh，在30°及5°/85°、build/update/变角后，真实采样球心板面局部 y=halfThickness+radius（误差≤1e−5 world），切向坐标在实际板长内。
  - [ ] t0/.5/1/3 秒等采样，视觉切向位移=引擎有向沿面位移×worldScale，无额外cos；默认全程及 μ0滑动、μ≥tanθ/v0=0静止贴面，a 标签与引擎一致。
  - [ ] 真实生产浏览器播放/暂停/拖时/改角/切回；初始、中段、末段截图和实际法向间隙/切向数值，无穿板、失支撑、假停或console error。
  - [ ] 接触距离/位移行为回归旧实现失败、修复通过；precheck/计数/--no-ff/同交付SHA CI+Deploy及完整执行报告齐备后转in-review。
- 测试要求：实际 Three.js 几何矩阵与真实引擎采样，覆盖边界、变参、全程；不以有限数、不抛错、整图哈希或计时条代替。
- [本轮交接 comment](https://github.com/zhangjszs/physical-modelvis/issues/158#issuecomment-6398560039)。

### 2. 返工 #157 · 修复竖直自由落体默认播放静止及高度/教案坐标不一致

- Issue：[#157](https://github.com/zhangjszs/physical-modelvis/issues/157)；状态：**in-review**（Executor 首次退回返工已交付，报告见 issuecomment-6399428226）；优先级：**P1**；Milestone：**M9**。
- [执行报告](https://github.com/zhangjszs/physical-modelvis/issues/157#issuecomment-6386991445)；[逐条验收与五项差距](https://github.com/zhangjszs/physical-modelvis/issues/157#issuecomment-6398555835)。首次退回=1；若下一次仍不通过，Planner 必须拆小/重定标准，不让第三次盲试。
- 已认可：`uniform-accelerated`（不是相邻 free-fall）补 height 默认20m且保留 v0y0/正负范围；真实默认球心下落、参数矩阵、上抛高度语义、播放暂停/拖时/场景返回正确；实现 `438cbaf` 经 --no-ff merge `fc2e731` 入 main，同 SHA CI `40113595479` / Deploy `40113808015` success。
- Planner 实测：相关四文件 167 tests passed；生产 preview 的真实主球 t0/.5/1/2.5s 的 y=3.4200000000000004 / 3.2240031360000003 / 2.63600784 / .22；轨迹 minY=.2199999988079071（Float32精度），落地残影 y=.22；切 free-fall 再回来 t0/y3.42，页面错误0。解析期望与插值实测须分别标注，不冒称完全相等。
- 做什么：仅收口下面五项原验收差距；在现有竖直坐标约定内修实际几何/可读性，不重做已通过运动修复。
- 不做什么：不改公共物理模型、引擎轨迹或地面物理；不删/合并场景，不全仓重构标牌或 rig，不新增产品/主要CI变动。
- 依赖：无；建议在当前 #158 交付后返工，非关闭硬依赖。
- 返工验收（每项都须报告满足依据）：
  - [ ] **释放净空**：新增实心圆柱 radius .26/height .08/center z−.26 与半径.22球重叠，侧臂右端x−.175也侵入；调整为真实净空结构，初始化及经过释放高度均无实体交叠。
  - [ ] **接料面**：当前实际垫顶≈.06、落地球底0，穿入.06 world；统一实际垫面与既定球/轨迹/残影接触约定，用真实几何距离行为回归证明不穿模。
  - [ ] **标牌完整可读**：当前384px纹理容不下默认最高点431.43px全文（信息牌754.99px）；局部适配纹理/排版，覆盖零/负/正初速与高度边界，绝对/相对高度读数不被裁切，不以userData全文代替纹理证据。
  - [ ] **展示计数一致**：README:20 粗体2963与同行总计2967矛盾，修正相关实际展示值；保留count:check，不把其绿色当作未覆盖字段已正确。
  - [ ] **行为红绿与可追溯报告**：删除新增附带文案/默认值钉死断言及文本回显证明，保留运动/几何断言；旧行为由位移/接触失败触发RED、修复GREEN，提供真实mesh值和可复查截图。报告区分公式期望与实际采样，重新precheck/计数/同交付SHA CI+Deploy后只转in-review。
- 原验收仍适用：默认及 height1/20 × v0y负/0/正 × 两档g；主球/轨迹/残影一致，播放/暂停/重置/拖时/落地/场景往返，教案/导学语义正确。
- 收尾：Executor 在正确日期追加 DIARY，刷新自己的 STATE/HANDOFF；缺失交付链不能被陈旧 #156 验证块代替。Planner 不改其文件。

## 冻结 / 不可领取

### #44 · 暂缓 React 19 迁移

- [Issue #44](https://github.com/zhangjszs/physical-modelvis/issues/44)：**P2 · blocked · parked**，无 Milestone。
- D44=B 成本/产品约束未变；#140/#141 技术前置已完成，不再列为未完成依赖。
- 仅用户明确改选A/C、已验证功能收益或React18安全/兼容硬约束触发重新评估；冻结期间不做安装试验、不抬70kB/55kB预算、不因本轮Bug解冻。

## Milestone、决策与治理

- [M9](https://github.com/zhangjszs/physical-modelvis/milestone/3) **0/2**：#157/#158 OPEN；GitHub description 已与首次退回结论同步。M8两Milestone历史收官维持。
- 全部3个开放任务已过治理：无重复/方向冲突/无优先级/auto-discovered待定级；P0=0/P1=2与两项恢复容量一致；无needs-info；#44不属P3/P4饥饿项。#158未超24h，不擅自重置。
- 两修复单范围、非目标、依赖、无未决产品取舍、可判验收、无红线、无需凭空决策的七门禁仍明确；状态为in-progress，不伪装成ready。
- pending=0；D61=A维护态、D62=A不加CI探针、D44=B/D31/真实发布红线维持；无需要用户拍板事项。
- 同步冲突以Issue为准：本地旧TASKS称#157已全满足、今日ready2，与远程in-progress不符，本文件整体重写纠正。请Executor在HANDOFF记录此漂移；STATE未提交现场保留，不自动stash。串行不设锁，目录未见LOCK残留。
