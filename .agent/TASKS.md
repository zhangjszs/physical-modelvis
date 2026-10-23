# TASKS（GitHub Issue 本地镜像）

> Planner 每轮整体重写；Executor 改状态先 Issue、后本文件对应条目。权威来源：GitHub Issues（2026-10-23 · 四十八次滚动实拉，未降级）。
> 开放 2 单：ready 1（#155）+ blocked 1（#44，已确认冻结）。in-progress / in-review / needs-info / P0 / P1 均为 0。
> 状态沿用仓内映射：ready = `ready-for-agent`；done = CLOSED；`parked` 仅排程属性，不是第二个生命周期状态。完整验收标准以 Issue 正文为准。

## 昨日验收（2026-10-23 日报 → 2026-10-23 夜间复核）

- **#101：通过 → CLOSED。** 独立复核：祖先 `6d164c9`/`8622ea0`；读 `compositionStore.ts` 与两份测试（独立常量推导的二次位移/圆弧半径/Kåsa 圆残差，3/3/2/1 精确源数）；复跑 `vitest run tests/composition` exit 0（93 tests）。D59 四项差距全部关闭。[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/101)
- **#151：通过 → CLOSED。** 本轮复跑 `verify-composition-interaction.mjs` exit 0：7.19% / 1.00% / 0 / 3.92:1 / 293px，与报告一致。备注：倍速比按各自墙钟归一化、容差 [3.0,5.2] 偏宽，接受。
- **#154：通过 → CLOSED。** 读 04/06 真实图；磁盘实测 6 张合计 1,615,438 B（≈1.54 MiB）；diff 仅 README 2 行 + 04/06 + 脚本。报告内 1.48/1.54MB、291/305KB 两种数字并存，以实测为准，仅记录。
- Milestone：M8 产品功能线 2/2、M8 收尾 2/2，均已 close。

## 今日队列（2026-10-23 · 1 个 ready）

### 1. #155 · 刷新 docs/plan.md 快照并补 AGENTS.md 组合台架构条目（P3 · docs）

- Issue：[#155](https://github.com/zhangjszs/physical-modelvis/issues/155)
- 状态：**ready**；Milestone：无（M8 已收官；不为一单新开里程碑）。
- 范围：`docs/plan.md` §0 快照追加 M6/M7/M8 事实性条目并更新日期；`AGENTS.md` Architecture 树仅追加组合实验台相关条目。
- 不包含：不改源码/测试/脚本；不重写 plan.md 历史阶段；不动 AGENTS.md 规则条款与「关键陷阱」；不新增文档文件；不碰 `<!-- test-count -->` 标记行。
- 依赖：无。
- 验收标准（摘要）：
  - [ ] plan.md §0 标题日期更新；M6/M7/M8 各有带 Issue 号的完成记录，Issue 号均 CLOSED。
  - [ ] AGENTS.md 新增 composition 条目，路径逐个真实存在；diff 仅新增行。
  - [ ] `git diff --stat` 仅涉及两文件；`count:check` / `format:check` / precheck exit 0；CI/Deploy 双绿；--no-ff 祖先。
- 为什么只有 1 个：见 D60「今日队列只有 1 个 ready」——docs 索引齐全、src 中 TODO/FIXME=0、nightly QA 无失败项，没有实证撑起第二个任务；不凑数。

## 冻结 / 不可领取

- **#44 · blocked · P2 · parked 属性**：[暂缓 React 19](https://github.com/zhangjszs/physical-modelvis/issues/44)。D44=B 已确认；只有用户改选 A/C、具体功能收益或 React 18 安全/兼容硬约束才重议。无 pending，勿安装试升、勿抬预算。
- 远程旧分支 `origin/agent/issue-95-shadow-adaptive`、`origin/agent/issue-96-default-on-grid`：沿既定决定只上报、不代删。

## Pending 决策：0（D61 / D62 已获用户答复「按照推荐的来」）

- **D61 = A**：维持维护模式，不立新功能（D60 后追加条目）。
- **D62 = A**：不接入 CI 第 5 个探针，维持手动运行。
- 据此不向 ready 放新功能或 CI 改动。

## 执行握手与本轮治理

- Executor 领取 #155 走 Issue comment，in-progress → in-review，**不 close**；代码/文档提交与 `.agent/` 提交分属不同 commit。
- 报告数字请同源（取同一次命令输出），避免 #154 式前后不一致。
- 治理清单：无重复/方向冲突；P0/P1 均 0；无待定级 auto-discovered；无超 24h 缺日报的在途任务；#155 七项 ready 门禁通过。
- 不设锁、不读取或创建锁；本轮未发现 `.agent/LOCK`。
