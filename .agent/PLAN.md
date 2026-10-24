# PLAN

> Planner 当前快照 · 2026-10-24 · 四十九次滚动。权威任务总线：GitHub Issues；逐项标准见 Issue 与 `TASKS.md`。决策/历史见 `DECISIONS.md` D63。

## 当前方向

维护态（D61=A）。#155（docs/plan.md 快照刷新 + AGENTS.md 组合台架构条目）已验收 CLOSED，M6/M7/M8 收官记录正式落档。当前唯一可执行项是 #156（AGENTS.md 测试目录条目补全，由 Executor 验收信号转化而来）。无活跃 Milestone；不为单据新开。

同步起点：main，`5035db8`；fetch/pull --rebase → Already up to date。main 最新 CI `40029366121` / Deploy `40029771873` / QA 场景巡检 `40027811873` 均 success。

## 昨日验收（今晨 executor-20261024 交付 · 日报 2026-10-24）

| 任务 | 结论 | 证据 |
| --- | --- | --- |
| #155 plan.md 快照 + AGENTS.md 组合台条目 | **通过 → CLOSED** | diff 仅两文件（AGENTS.md 纯增 3 行）；grep 复验（旧日期 0 命中 / M8=1 / composition 3 命中）；20 个被引 Issue 全 CLOSED；8 个 merge 哈希抽查一一对应；CI `40028604667` + Deploy `40028873539` 双绿 @ `fe229ee`，--no-ff 成立 |

## 今日目标（2026-10-24）

- 验收 #155 并关闭（已完成）。
- 执行 #156 文档补全（1 个 ready）。
- 维护态巡检：CI / Deploy / QA 全绿，无实证缺陷，不立功能单。

## 当前 Milestone：无

- M6 7/7、M7 3/3、M8 2+2 均收官，已录入 docs/plan.md §0（#155 落档）。
- #156 属文档纠偏尾差，不新开里程碑。

### 执行队列（1 个 ready）

1. [#156](https://github.com/zhangjszs/physical-modelvis/issues/156) 补 AGENTS.md Architecture 树缺失的 visualization 测试目录条目（P3 · docs）

只有 1 个而非 2–5：巡检全绿、src TODO/FIXME=0、docs 索引完整，无第二实证候选；不凑数（D60/D63）。

## 已知阻塞与依赖

- **#44（P2 · blocked · parked 属性）**：D44=B 暂不升 React 19；仅在用户改选 A/C、真实功能收益或 React 18 安全/兼容硬约束出现时重议。
- **pending 0**：D61=A / D62=A 已确认；不产生新 ready。
- 远程旧分支（issue-95 / issue-96）只上报不代删。串行不设锁（本轮未发现残留）。

## 已完成阶段（索引）

M1 常量真源、M1.5 3D 边界、M2 场线、M2.5 OCR、M2.6 性能、M2.7 引擎加固、M3 B 类单源、M4 体验、L6 器材扩展、M6 UI/复用、M7 基础质量、M8 组合台产品线 + 证据/物料。证据见 Git / Issues / DECISIONS。

## 下一阶段

维持 D61=A 维护态：出现实证缺陷（nightly QA / CI / 用户报告）或用户新需求再立单；真实 npm 发布、React 19、#103/#104 派生大重构仍需既定红线授权，不自动解冻。

## 已放弃 / 暂缓的方向

- #103 派生大规模重构：D31 默认转正暂缓。
- React 19 自动升级：D44=B 暂缓。
- M5 作为大包整批立项：D19 否决；其中调查已完成。

## 给 Executor 的指令

领 #156：只改 AGENTS.md Architecture 树（仅追加测试目录行），验收标准以 Issue 正文为准；报告数字同源，不 close。
