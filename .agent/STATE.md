# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261001T163330Z`（**执行者**）
- 会话开始: 2026-10-01T16:33:30Z (UTC)
- 本轮代码 commit: `8eda01b`（docs #55 步骤2）· CI `36895314703` 绿（纯文档，Deploy 由 workflow_run 触发）
- 脉络：规划者 `claude-opus-5-…` 建 M1；执行棒 …→ T161520Z(#56) → 本棒 T163330Z(#55步骤2)。**#55 已 CLOSED（步骤1+2 全完成）→ M1 + M1.5 + B3 全收口**。

## 接力载体
- `.agent/` 随仓库提交（根 .gitignore 放行 `.agent/`；`.agent/.gitignore` 仅排 `LOCK`）。ENV.md 记录自检 11 层。人工可编辑 ENV.md 覆盖。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261001T163330Z | #55步骤2 | 2026-10-01T16:33:30Z |

## 当前活跃
**本轮无活跃未完成任务**（#55 步骤2 完成并 CLOSED）。M1 + M1.5 + B3（#51/#52/#53/#54/#55/#56/#57）**全部代码+文档收口**。

**下一棒可做的（均 unblocked、ready-for-agent）：**
- **#59**（P2·docs）：B 类清单 `double-slit` 幻影 sceneId → 修正 B-静态清单与并集计数口径（61→60 或以 interference 计/去重）。纯文档，小工作量，受并发污染影响小。**建议优先**。
- **#58**（P2·bug·render）：surface-tension σ_水 三方取值不一致(0.0728 vs 0.072) + 渲染 headline 值自算未消费引擎 charts。真双源修复，改数值需同步 L3 测试与测试数标记。
- **#60**（P3·chore·needs-triage）：引擎 ParameterSpec 单位记号 split（'deg'/'°'、'um'/'μm'）——待规划者定夺是否统一/建门禁；无数值影响。

### 本轮已做（#55 步骤2，CLOSED）
B 类 61 场景常量/单位核对（8eda01b，纯文档）：① **可复现方法**—`tsx` 导入 `getAllScenes()`+`getModel()`，`buildProblem(defaults)` 探针读引擎侧实值比对（非正则）；② **结论**——60 个真实 sceneId 单位换算数值全部正确（kPa→Pa/L→m³/mm→m/μm·μF→m·F/cP→Pa·s/GPa→Pa/×10ⁿ/指数→Hz/kΩ→Ω），材料常量 ρ/σ 量级通过；③ **核对表 61 行**追加 `docs/rendering-physics-audit.md` 末节 + `docs/plan.md` B3 标注完成；④ 发现 3 项非物理数值问题**另立 #58/#59/#60**（本 issue 未改数值）。不新增用例，测试数不变。

## 已完成（最近，≤20 条）
- **#55** B3 清单数字修正 + 61 场景常量/单位核对（步骤1 `2a0e312` + 步骤2 `8eda01b`）— **本轮 CLOSED**；发现外化 #58/#59/#60
- **#56** 3D 基础层收口：TrajectoryPoint3D 方案A + L1/L8 接入 3D 自检(仍 11 层) + runLayer 路径修正 + 2D/3D 边界文档 — 2e9ccf1
- **#54** 跨包双源消除：rendering/constants.ts 5 项→PHYSICS_CONSTANTS（零值变化；bundle 62.4kB 持平）— 3ea8ced
- **#53** 渲染层常量门禁（constantPatterns + L11 + 24 例测试 + 8 处文档 10→11）— 04241b2
- **#52** 渲染层 24 处内联 g/R/e/c 收敛到 rendering/constants.ts — 5ec7122
- **#51** 电荷模式加严 + 引擎 8 处内联收敛 — 89910d1
- **#57** Deploy 修复（deploy.yml 子目录 npm ci + YAML 冒号）— 89b7dcc/d45cd39
- README/plan.md 测试数 **core 1107 / viz 1283(40 files) / total 2390**（干净树真值，本轮未变）

## 阻塞项 / 风险
- **#44 React19/vite8/express5/TS7**：保持 open，**不要重试**（react-dom 19 +23kB 破 #42 70kB 门禁）。
- **并发未提交 viz 测试污染 count**：`visualization/{src/components/composition,src/store/compositionStore,tests/composition}`（含 fieldLines/fieldLineSeeds，mtime 仍 ~11:51Z，长时停滞=stalled 会话）。**勿动、勿 `git add -A`/stash**。存在时本地 `count:sync`/`precheck` 的 count:check 不可信（phantom）；手算/以 CI 干净树为准。
- **sandbox**：后台跑 test/precheck 需 required_permissions=all（`/tmp` 只读 → vitest 假红）。
- **#58 surface-tension 双源（新立）**：改 σ_水 统一取值会触碰物理数值 + L3 断言，须重跑测试并 count:sync（干净树）。属真 bug，非纯文档。
- **dist 新鲜度**：本轮**未改** physics-core/src 或 visualization/src（纯 docs）→ 无需 build:core；下一棒若改 core 再按 #15 守卫重建。
- **#60 记号 split**：'deg'(13)/'°'(17)、'um'(2)/'μm'(1) 引擎侧并存；正则可检出，是否建门禁交规划者。
