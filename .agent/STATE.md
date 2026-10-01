# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261001T171000Z`（**执行者**）
- 会话开始: 2026-10-01T17:10:00Z (UTC)
- 本轮代码 commit: `abc4a72`（docs #59 清单修正）· CI 绿（`36897959114`）· 纯文档
- 脉络：规划者 `claude-opus-5-…` 建 M1；执行棒 …→ T163330Z(#55步骤2, CLOSED) → 本棒 T171000Z(#59 CLOSED)。**M1 + M1.5 + B3(#55/#59) 全部代码+文档收口**。

## 接力载体
- `.agent/` 随仓库提交（根 .gitignore 放行 `.agent/`；`.agent/.gitignore` 仅排 `LOCK`）。ENV.md 记录自检 11 层。人工可编辑 ENV.md 覆盖。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261001T171000Z | #59 | 2026-10-01T17:10:00Z |

## 当前活跃
**本轮无活跃未完成任务**（#59 已 CLOSED）。M1 + M1.5 + B3（#51/#52/#53/#54/#55/#56/#57/#59）**全部收口**。

**下一棒可做的：**
- **#58**（P2·type:bug·**ready-for-agent**）：surface-tension σ_水 三方取值不一致 + 渲染 headline 值自算未消费引擎。**唯一实质代码项**。
  - 取值决策（本棒已研究）：统一到 **0.0728**（IAPWS，且被 `renderers.test.ts` L3 `SIGMA_WATER_20C∈(0.072,0.073)` 严格 >0.072 所认可 → 0.072 会挂）。
  - 建议路径：`PHYSICS_CONSTANTS` 新增 σ_water（0.0728）→ 引擎 `surface-tension.ts`/`capillary.ts` + viz `constants.ts SIGMA_WATER_20C` 均引用之（单一真源）；`drawSurfaceTensionScene`/`drawCapillaryScene` headline σ/F 改读引擎 charts（`interpSeries`/`getFrame`），无结果再回退。**注意**：改 core src → 先 `npm run build:core`；改数值后引擎 surface-tension/capillary 测试 + viz renderers 测试须重跑（可 `vitest run <单文件>` 隔离，避 phantom）；count:sync 以 CI 干净树为准。
- **#60**（P3·type:chore·**needs-triage**）：引擎 `ParameterSpec.unit` 记号 split（'deg'(13)/'°'(17)、'um'(2)/'μm'(1)）。**待规划者定夺**是否统一/建门禁，非 agent 自动执行项。

### 本轮已做（#59，CLOSED）
移除幻影 sceneId `double-slit`（abc4a72，纯文档）：`visualization/src` 无 `id:'double-slit'`（真实"双缝干涉"=`interference`，已在 B-数值；`getAllScenes()` 探针 61 id 中恰此 1 个匹配不到）。B-静态清单 37→**36**、并集 61→**60**；`docs/rendering-physics-audit.md` 分类统计表/段标题/去重说明/step2 F1 同步，`docs/plan.md` B3 计数同步。不改数值、不动历史测试数快照、测试数不变。

## 已完成（最近，≤20 条）
- **#59** 移除幻影 double-slit，B 类清单/计数 61→60（B-静态 37→36）— abc4a72，**本轮 CLOSED**
- **#55** B3 清单数字修正 + 61 场景常量/单位核对（步骤1 `2a0e312` + 步骤2 `8eda01b`）；发现外化 #58/#59/#60 — T163330Z CLOSED
- **#56** 3D 基础层收口：TrajectoryPoint3D 方案A + L1/L8 接入 3D 自检(仍 11 层) + runLayer 路径修正 + 2D/3D 边界文档 — 2e9ccf1
- **#54** 跨包双源消除：rendering/constants.ts 5 项→PHYSICS_CONSTANTS（零值变化；bundle 62.4kB 持平）— 3ea8ced
- **#53** 渲染层常量门禁（constantPatterns + L11 + 24 例测试 + 8 处文档 10→11）— 04241b2
- **#52** 渲染层 24 处内联 g/R/e/c 收敛到 rendering/constants.ts — 5ec7122
- **#51** 电荷模式加严 + 引擎 8 处内联收敛 — 89910d1
- **#57** Deploy 修复（deploy.yml 子目录 npm ci + YAML 冒号）— 89b7dcc/d45cd39
- README/plan.md 测试数 **core 1107 / viz 1283(40 files) / total 2390**（干净树真值，本两棒未变）

## 阻塞项 / 风险
- **#44 React19/vite8/express5/TS7**：保持 open（已有人 assignee），**不要重试/不要抢**（react-dom 19 +23kB 破 #42 70kB 门禁）。
- **并发未提交 viz 测试污染 count**：`visualization/{src/components/composition,src/store/compositionStore,tests/composition}`（含 fieldLines/fieldLineSeeds，mtime 仍 ~11:51Z，**stalled ~5.5h**）。**勿动、勿 `git add -A`/stash**。存在时本地 `count:sync`/`precheck` 的 count:check 不可信（phantom）；手算/以 CI 干净树为准。**#58 尤其受影响**（改数值可能要动测试数）。
- **sandbox**：后台跑 test/precheck 需 required_permissions=all（`/tmp` 只读 → vitest 假红）。
- **#60 记号 split**：'deg'(13)/'°'(17)、'um'(2)/'μm'(1) 引擎侧并存；正则可检出；属 needs-triage，交规划者。
- **dist 新鲜度**：本轮**未改** physics-core/src 或 visualization/src（纯 docs）→ 无需 build:core；#58 若改 core 必须先 build:core。
