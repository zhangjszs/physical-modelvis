# PLAN

> Planner 当前快照 · 2026-10-23 · 四十八次滚动。权威任务总线：GitHub Issues；逐项标准见 Issue 与 `TASKS.md`。决策/历史见 `DECISIONS.md` D60。

## 当前方向

M8（组合实验台产品功能线 + 交互证据/演示物料）已验收收官。项目进入**维护态**（D61=A，用户已确认）：没有实证缺陷或用户新需求时不立功能单。当前唯一可执行项是文档纠偏 #155（`docs/plan.md` 快照停在 2026-08-11、AGENTS.md 缺组合台架构条目）。

同步起点：main，`5dea4dc`；fetch/pull --rebase → Already up to date。HEAD 的 CI `39967081302` / Deploy `39968917328` success；最近 nightly QA `39860609121` success（堆增长 4MB/12MB，最慢切换 1044ms/10000ms）。

## 昨日验收（日报 2026-10-23）

| 任务 | 结论 | 证据 |
| --- | --- | --- |
| #101 组合台预设模板返工 | **通过 → CLOSED** | 祖先校验；读 store 与两份测试（独立推导期望）；复跑 `vitest run tests/composition` 93 passed；复跑交互探针 exit 0 |
| #151 探针像素断言强化 | **通过 → CLOSED** | 复跑探针 exit 0：7.19% / 1.00% / 0 / 3.92:1 / 293px，与报告一致 |
| #154 演示截图与 OCR 绕行 | **通过 → CLOSED** | 读 04/06 图；6 张合计 1,615,438 B；diff 范围正确；报告内两处体积数字不一致（仅记录） |

## 今日目标（2026-10-23）

- 验收三单并关闭 M8 两个里程碑（已完成）。
- 执行 #155 文档刷新（1 个 ready）。
- D61 / D62 已获用户答复（均选 A），pending 清零。

## 当前 Milestone：无（M8 两个里程碑均已 close）

- M8 产品功能线 2/2：#100、#101 CLOSED。
- M8 收尾 2/2：#151、#154 CLOSED。
- 不为 #155 一单新开里程碑；用户改选 B/C 时再按方向建立。

### 执行队列（1 个 ready）

1. [#155](https://github.com/zhangjszs/physical-modelvis/issues/155) 刷新 plan.md 快照 + AGENTS.md 组合台架构条目（P3 · docs）

只有 1 个而非 2–5：docs 索引齐全、src 无 TODO/FIXME、nightly QA 无失败，缺实证候选；不凑数（D60）。

## 已知阻塞与依赖

- **#44（P2 · blocked · parked 属性）**：D44=B 暂不升 React 19；仅在用户改选 A/C、真实功能收益或 React 18 安全/兼容硬约束出现时重议。
- **pending 0**：D61=A / D62=A 已确认；不产生新 ready。
- 远程旧分支（issue-95 / issue-96）只上报不代删。串行不设锁，历史 LOCK 不是开工门禁（本轮未发现）。

## 已完成阶段（索引）

M1 常量真源、M1.5 3D 边界、M2 场线、M2.5 OCR、M2.6 性能、M2.7 引擎加固、M3 B 类单源、M4 体验、L6 器材扩展、M6 UI/复用、M7 基础质量、M8 组合台产品线 + 证据/物料。证据见 Git / Issues / DECISIONS。

## 下一阶段

D61=A：维护态。出现实证缺陷（nightly QA / CI / 用户报告）或用户新需求再立单；真实 npm 发布、React 19、#103/#104 派生大重构仍需既定红线授权，不自动解冻。

## 已放弃 / 暂缓的方向

- #103 派生大规模重构：D31 默认转正暂缓。
- React 19 自动升级：D44=B 暂缓。
- M5 作为大包整批立项：D19 否决；其中调查已完成。

## 给 Executor 的指令

领 #155，只改 `docs/plan.md` 与 `AGENTS.md`（后者仅追加行），事实来自 `gh issue`/`git log`；报告数字同源，不 close。
