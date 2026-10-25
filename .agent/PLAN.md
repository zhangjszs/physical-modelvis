# PLAN

> Planner 当前快照 · 2026-10-25 · D66。任务权威：GitHub Issues；TASKS.md 为本轮整体重写镜像。

## 当前方向

收敛用户报告的两项课堂核心场景缺陷，不开启新产品线。#157 默认下落已经修复，但新增释放架/接料垫相交、标牌裁切及交付证据未收口，首次验收部分通过并退回；#158 保留既有执行现场。CI/QA 绿色不替代真实球心与器材接触验证。

同步事实：`git fetch --all --prune` 成功；`git pull --rebase` 因既有未提交 STATE.md / TASKS.md 退出 128，未自动 stash。当前分支 `agent/issue-158-inclined-plane-rig`，起点 HEAD 与 origin/main 均为 `fc2e731e903b3783df44ed756b6dc4b3fc0c3741`（左右提交差 0/0）。保留 Executor 的 STATE.md，不代提交、不切换其分支；本轮 Planner 三文件单独提交，并以快进方式推送 main。

## 昨日验收与跨天交付

- 10-24 日报两会话 #155 / #156 已于 D63 / D64 验收 CLOSED，本轮远程状态仍 CLOSED，不重复关闭。10-23 日报的 #101 / #151 / #154 也已收官。
- #157 执行报告已于本地 10-25 发布，但 10-24 日报无该交付，10-25 日报缺失；**该交付已用 Issue 报告、Git 与 STATE 反推**。STATE 的验证块与 HANDOFF 仍残留 #156 内容，不将其当作 #157 证据；由 Executor 更新，不改写历史。
- #157：**部分通过 → in-progress，首次退回**；[逐条验收](https://github.com/zhangjszs/physical-modelvis/issues/157#issuecomment-6398555835)。默认真实 mesh 在 t=0/0.5/1/2.5s 的 y 为 3.42 / 3.224003136 / 2.63600784 / 0.22；播放、暂停拖时、切 free-fall 返回正常。认可默认运动、参数矩阵、教案语义及既有集成成果，不要求重做。
- 尚缺：释放架实心圆柱及侧臂侵入球体；垫面 y≈0.06 而落地球底 y=0；默认最高点标牌需 431.43px、纹理仅 384px；README 同行展示 2963/2967；先红日志首先失败于名称，须补真实行为失败与可追溯截图，而不是只回显 userData 文本。
- 本轮实跑：相关四文件 **167 tests passed**；生产 preview 实测真实球/轨迹/残影与器材 mesh，页面错误 0。核对 merge `fc2e731` 双亲与 CI `40113595479` / Deploy `40113808015` 同 SHA success；最近 QA `40132713389` 同 SHA success。未把远程记录写成本机重跑全量。

## 今日目标（2026-10-25）

1. 恢复当前 #158，完成原有斜面坐标、全程支撑与真实浏览器验收。
2. 修完 #157 五项有界验收差距后重新提交完整报告，补齐执行现场与追加式日报。

## 当前 Milestone：M9 课堂核心场景坐标纠错（进度：0 / 2）

[GitHub Milestone 3](https://github.com/zhangjszs/physical-modelvis/milestone/3)：真实关联 #157 / #158 均 OPEN，open_issues=2 / closed_issues=0。已合并实现不等于已验收完成。

### 目标与验收

- #157：真实初始高度驱动零/负/正初速竖直运动；球、释放架、标尺、最高点及接料面无穿模；必要教学标牌真实完整可读；默认运动、落地与场景往返有实际表面证据。
- #158：实际引擎 XY 仅等比缩放平移，不二次投影；球心与板上表面接触，展示板覆盖本次真实完整有向轨迹，静止状态 a 标签与引擎一致。
- 两单重新交付均需行为红绿、生产浏览器、precheck、计数、main --no-ff 与同交付 SHA CI/Deploy，报告后只转 in-review，由 Planner 验收关闭。

### 完成信号（Success signal）

两单所有原验收标准及退回差距有真实证据、Issue CLOSED，Milestone open_issues=0；PLAN / TASKS / DECISIONS 与追加式日报一致。只有单测全绿、计时推进或合并记录不算收敛。

### 明确非目标（Non-goals）

不新增场景、器材或模板；不删/合并 free-fall 入口；不改公共引擎 API、物理轨迹或碰撞模型；不全仓重构 rig / 文字系统；不升级依赖、抬预算或改变主要 CI/CD。

### 执行队列

**新增 ready=0；恢复任务 2 个。** 两个任务已经 in-progress，依所有权契约不重置成 ready，也不制造重复单凑足 2–5 个 ready。按“宁缺毋滥”明确记录本轮例外。

1. **恢复 [#158](https://github.com/zhangjszs/physical-modelvis/issues/158)**（P1 · in-progress）：沿当前分支继续，原范围与验收不变；[本轮治理与交接](https://github.com/zhangjszs/physical-modelvis/issues/158#issuecomment-6398560039)。
2. **返工 [#157](https://github.com/zhangjszs/physical-modelvis/issues/157)**（P1 · in-progress）：只处理五项退回差距，不重做已认可部分。下一次仍验收不通过必须拆小或重定标准，不第三次盲试。

建议顺序用于保留当前 #158 现场，**不是**等待 #158 CLOSED 的硬依赖；两单不存在关闭互等。完整任务以 Issue 正文与验收 comment 为准。

## 已知阻塞与依赖

- #157 / #158 无外部或产品阻塞，pending=0。#158 最近领取记录未达 24 小时，不标疑似中断；后续按真实日报与领取时间判断。
- #44：P2 blocked / parked；D44=B 的成本约束仍生效，#140/#141 已完成不自动解冻。无安全/兼容或新需求证据，不做安装试验。
- 工作区未提交 STATE.md 由 Executor 负责；恢复前自行保存执行文档，再按既有 Git 纪律同步本轮规划提交，Planner 不代 stash 或丢弃现场。
- #157 Spec 子审查遇服务 capacity 失败，父 Planner 已亲自完成该轴；不因此省略验收。规范轴完成，三项实质显示问题已实测核实。

## 已完成阶段与下一阶段

M6 7/7、M7 3/3、M8 产品 2/2 与收尾 2/2、#155/#156 文档收尾维持历史结论，不泛化为 123 场景物理视觉都已正确。M9 收敛后沿 D61=A 维护态，仅按实证缺陷或用户需求排程。

## 已放弃 / 暂缓的方向

- #103 派生大重构：D31 暂缓。
- React 19 自动升级：D44=B 暂缓。
- M5 整包立项：D19 否决，授权调查已完成。
- 组合台交互探针接入 CI：D62=A 不接入。

## 给 Executor 的指令

先恢复 #158，再逐项收口 #157；几何净空、接触距离和纹理实际可读性必须测真实表面，不用 userData / 不抛错代替。更新自己的 STATE/HANDOFF 并在正确日期追加 DIARY，代码与 .agent 文档分开提交，交付不自行关闭 Issue。
