# TASKS（GitHub Issue 本地镜像）

> Planner 每轮整体重写；Executor 改状态先 Issue、后同步本文件。权威来源：GitHub Issues（2026-10-24 · 第五十次滚动实拉，未降级）。
> 验收后开放 1 单：blocked 1（#44，冻结）；ready / in-progress / in-review / needs-info / P0 / P1 均为 0。
> 仓内映射：ready = `ready-for-agent`；done = CLOSED；`parked` 仅排程冻结属性，不是第二个生命周期状态。

## 昨日及最近交付验收

- 2026-10-23 日报的 #101 / #151 / #154 已在 D60 验收关闭，本轮查询仍全部 CLOSED；不重复验收或重开。M8 产品与收尾两个 GitHub Milestone 均 closed，各 2/2。
- 2026-10-24 会话 1 的 #155 已在 D63 验收关闭，本轮查询仍 CLOSED。
- **2026-10-24 会话 2 的 #156：通过 → done / CLOSED。** [执行报告](https://github.com/zhangjszs/physical-modelvis/issues/156#issuecomment-6384088450)；[本轮验收](https://github.com/zhangjszs/physical-modelvis/issues/156#issuecomment-6385943890)。
  - [x] 4 条目录说明齐备。独立读取 `21f665e` 完整 diff 与当前测试目录，composition / workbench / charts / utils 均存在，具名 hook 和工具用途与文件头一致。
  - [x] 范围正确。`git show --format=fuller --stat --patch 21f665e` → exit 0；唯一文件 AGENTS.md，新增 4 行、无删改。Standards 无规范缺口；Spec 无遗漏或越界。
  - [x] 验证与集成满足。Planner 本轮 `npm run format:check` → exit 0；CI `40092774812` 所有验证步骤 success，Deploy `40092999706` success，二者同属 `84b861b`。merge 双亲 `7d5b58f` / `21f665e`；`git merge-base --is-ancestor 21f665e main` → exit 0。
  - 本轮只在本地实跑格式检查；未声称重跑全套测试/浏览器，交付 SHA 的远程测试与四探针结果已直接核对。

## 今日队列（2026-10-24 · ready 0）

**无可领取任务。** #156 已验收完成；D61=A 维护态不立新功能，#44 不满足解冻条件。现有证据没有支持第二个或新的可执行任务；依 4.3「宁缺毋滥」保留空队列，不伪造 2–5 个 ready，不把冻结项挪入队列。

新增入口：nightly QA / CI 的实证缺陷、Executor auto-discovered 或用户具体需求；Planner 补齐范围、非目标、依赖及可判验收后才转 ready。当前无恢复项或疑似中断现场。

## 冻结 / 不可领取

### #44 · 暂缓 React 19 迁移（P2 · blocked · parked 属性）

- Issue：[暂缓 React 19](https://github.com/zhangjszs/physical-modelvis/issues/44)；Milestone：无。
- 冻结依据：D44=B 已确认；#140 / #141 已 CLOSED，并非尚未完成的技术依赖。
- 解除条件：用户改选 A/C、具体需求证明 React 19 功能收益，或 React 18 出现安全/兼容硬约束；目前未获新证据。不安装试升、不提高体积预算、不扩展至其他大版本。
- 维持开放跟踪已确认的成本约束，不作为普通 P3/P4 饥饿任务关闭；本轮不改变其状态或优先级。

## Pending 决策：0

- D61=A：维护模式，仅处理实证缺陷、文档与自动发现项，不启动新功能线。
- D62=A：组合台交互探针继续手动运行；不增加 CI 第 5 个探针。
- D44=B / D31 暂缓及真实发布红线维持。本轮无新用户答复或红线授权，无需重复提问。

## 本轮治理与信号回应

- 已逐一治理全部开放任务：#156 原 in-review 已验收关闭并摘除状态标签；余下 #44 冻结依据有效，无重复、方向冲突、待定级 auto-discovered 或无优先级项；P0/P1=0，无 in-progress 超时项。
- Executor 的 #156 信号已处理：独立目录列表核实 composition 为 9 个测试文件，Issue 正文 8→9；验收 checklist 已勾选。D63 的历史错误通过 D64 追加更正，不抹改历史；AGENTS.md 不固化测试数量。
- 当前 main 同步起点 `96a9be9`：CI `40093424297` / Deploy `40093611992` success；最近 QA `40027811873` success，但 QA 对应旧 SHA `a59596e`，不冒称对当前 HEAD 重跑。
- STATE / HANDOFF 仍写「#156 待验收」属于 Executor 快照滞后；已在验收 comment 告知下一次自行刷新，Planner 不代改。DIARY 历史保留。
- DECISIONS 顶部旧 D59 当前状态摘要由 Planner 修正为 D64；D59 返工记录保留为历史。
- 远程旧分支（issue-95 / issue-96）沿用只上报、不代删；串行不设锁，不以锁为开工前提。
