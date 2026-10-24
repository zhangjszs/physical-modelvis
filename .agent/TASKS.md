# TASKS（GitHub Issue 本地镜像）

> Planner 每轮整体重写；Executor 改状态先 Issue、后本文件对应条目。权威来源：GitHub Issues（2026-10-24 · 四十九次滚动实拉，未降级）。
> 开放 2 单：ready 1（#156，本轮新建）+ blocked 1（#44，已确认冻结）。in-review / in-progress / needs-info / P0 / P1 均为 0（#155 已于本轮验收 CLOSED）。
> 状态沿用仓内映射：ready = `ready-for-agent`；done = CLOSED；`parked` 仅排程属性，不是第二个生命周期状态。完整验收标准以 Issue 正文为准。

## 昨日验收（今晨 executor-20261024 交付 · 日报 2026-10-24 → 本轮复核）

- **#155：通过 → CLOSED（四十九次滚动验收）。** 独立复核：`git show c6c0e2f --stat` 仅 AGENTS.md +3（纯新增）+ docs/plan.md +7−1；`fe229ee` 双亲 + c6c0e2f 为其祖先（--no-ff）；grep 复验旧日期 0 命中 / M8=1 / composition 3 命中；20 个被引 Issue 全 CLOSED；8 个 merge 哈希抽查一一对应；CI `40028604667` + Deploy `40028873539` 双绿 @ `fe229ee`。报告数字同源，无失实点。[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/155#issuecomment-6383684408)

## 今日队列（2026-10-24 · 1 个 ready）

### 1. #156 · 补 AGENTS.md Architecture 树缺失的 visualization 测试目录条目（P3 · docs）

- Issue：[#156](https://github.com/zhangjszs/physical-modelvis/issues/156)
- 状态：**ready**（2026-10-24 四十九次滚动新建，承接 #155 验收时 Executor 的信号）；Milestone：无（不为一单新开里程碑）。
- 范围：AGENTS.md Architecture 树 visualization 段仅追加 4 行测试目录条目（`tests/composition`、`tests/workbench`、`tests/charts`、`tests/utils`），风格与既有条目一致。
- 不包含：不改源码/测试/脚本；不动规则条款与「关键陷阱」；不重排/改写既有行；不新增文档文件；不改 docs/plan.md。
- 依赖：无（#155 已 CLOSED）。
- 验收标准（摘要）：
  - [ ] 4 个新条目齐备（`grep -n "tests/composition" AGENTS.md` 等各 ≥1 命中）
  - [ ] `git diff AGENTS.md` 仅新增行（删改行计数 0）；`git diff --stat` 仅涉及 AGENTS.md 一个文件
  - [ ] `npm run format:check` exit 0；CI / Deploy 双绿；--no-ff 祖先
- 为什么只有 1 个：巡检全绿、src TODO/FIXME=0、docs 索引完整，无第二实证候选；不凑数（D60/D63）。

## 冻结 / 不可领取

- **#44 · blocked · P2 · parked 属性**：[暂缓 React 19](https://github.com/zhangjszs/physical-modelvis/issues/44)。D44=B 已确认；只有用户改选 A/C、具体功能收益或 React 18 安全/兼容硬约束才重议。无 pending，勿安装试升、勿抬预算。
- 远程旧分支 `origin/agent/issue-95-shadow-adaptive`、`origin/agent/issue-96-default-on-grid`：沿既定决定只上报、不代删。

## Pending 决策：0（D61=A / D62=A 已确认；四十九次滚动复核维持 0）

- **D61 = A**：维持维护模式，不立新功能。
- **D62 = A**：不接入 CI 第 5 个探针，维持手动运行。
- 据此不向 ready 放新功能或 CI 改动。

## 执行握手与本轮治理

- Executor 领取 #156 走 Issue comment，in-progress → in-review，**不 close**；代码/文档提交与 `.agent/` 提交分属不同 commit。
- 报告数字请同源（取同一次命令输出），避免 #154 式前后不一致。
- 治理清单：无重复/方向冲突；P0/P1 均 0；无待定级 auto-discovered；无超 24h 缺日报的在途任务；#156 七项 ready 门禁通过（目标明确 / 范围清楚 / 依赖满足 / 无未决产品取舍 / 标准可判定 / 不涉红线 / 无需发明决策即可开工）。
- 不设锁、不读取或创建锁；本轮未发现 `.agent/LOCK`。
