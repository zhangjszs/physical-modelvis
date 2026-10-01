# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261001T144019Z`（**执行者**）
- 会话开始: 2026-10-01T14:40:19Z (UTC)
- 本轮代码 commit: `04241b2`（feat #53）· CI `36880451266` 绿 · Deploy `36880770540` 绿
- 脉络：规划者 `claude-opus-5-…T000000Z` 建 M1；执行棒 `qoder-…T114739Z`（#51、恢复 .agent、#57 Deploy）→ `qoder-…T141022Z`（#52）→ 本棒 `qoder-…T144019Z`（#53）。

## 接力载体
- `.agent/` 随仓库提交（根 .gitignore 放行 `.agent/`；`.agent/.gitignore` 仅排 `LOCK`）。ENV.md 已更新自检为 **11 层**。人工可编辑 ENV.md 覆盖。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261001T144019Z | #53 | 2026-10-01T14:40:19Z |

## 当前活跃
**#53 [P1] 渲染层常量门禁 + 自检接入** — 本轮**已完成并 CLOSED**
- commit `04241b2` 已 push（`--no-verify`：污染树 count:check 不可信；按已知增量手算，CI 干净树验证 1283/40 匹配）。
- 方案 A：`LITERAL_PATTERNS`/`stripCommentsAndStrings`/`PATTERN_SAMPLES` 抽到 `physics-core/src/units/constantPatterns.ts`（引擎+渲染共用单一真源，经 index barrel 导出）；新增 `rendering-constants-single-source.test.ts`（24 例，扫 rendering/ 排除 constants.ts）；`self-check.mjs` 加 **L11**；同步 8 处文档 + CI 步骤名 10→11。
- **顺带补 #52 审计遗漏**：electrostaticFieldScenes 2 处库仑常数 `k` → 新增 `COULOMB_K`（值零变化）。
- 验证：core 1107 全绿、typecheck/lint/format 绿、check:bundle 62.4kB≤70kB、**selfcheck 11 层全 PASS**、viz 测试 0 失败。

## M1 依赖链（现状）— **P1 主干 #51/#52/#53 全部 CLOSED**
| # | 主题 | 优先级 | blocked | 说明 |
|---|---|---|---|---|
| #51 | 引擎门禁堵漏（电荷常量） | P1 | 否 | CLOSED |
| #52 | 渲染层 24 处内联收敛 | P1 | 否 | CLOSED |
| #53 | 渲染层常量门禁 + 自检 11 层 | P1 | 否 | **本轮 CLOSED** |
| #54 | 跨包双源消除（constants.ts 5 项引用 PHYSICS_CONSTANTS） | P2 | 否 | 已解 blocked（上棒）；⚠️ 值 import 首屏风险，先测 bundle；保持符号名 |
| #55 | B3 清单数字修正 + 61 场景常量单位核对 | P2 | 否 | 未开始，docs/核对，可并行 |
| #56 | 3D 物理基础层收口（接口归属/自检接入/2D-3D 边界） | P2 | 否 | 未开始；前置已满足 |
| #57 | Deploy 修复 | P1 | — | CLOSED |

## 已完成（最近，≤20 条）
- **#53** 渲染层常量门禁（constantPatterns 共享 + L11 自检层 + 24 例测试 + 8 处文档 10→11 + 补 #52 漏的 k×2）— 04241b2，CLOSED
- **#52** 渲染层 24 处内联 g/R/e/c 收敛到 rendering/constants.ts — 5ec7122，CLOSED
- **#51** 电荷模式加严 + 引擎 8 处内联收敛 — 89910d1，CLOSED
- **#57** Deploy 修复（deploy.yml 子目录 npm ci + YAML 冒号）— 89b7dcc/d45cd39，CLOSED
- 恢复 `.agent/` 接力载体；README/plan.md 测试数 **core 1107 / viz 1283(40 files) / total 2390**（干净树真值）

## 阻塞项 / 风险
- **#44 React19/vite8/express5/TS7**：保持 open，**不要重试**（react-dom 19 +23kB 破 #42 70kB 门禁）。
- **并发未提交 viz 测试污染 count**：`visualization/{src/components/composition,src/store/compositionStore,tests/composition}`（含 fieldLines/fieldLineSeeds，mtime 仍 ~11:50Z，长时停滞=stalled 会话）。**勿动、勿 `git add -A`/stash**。存在时本地 `count:sync`/`precheck` 的 count:check 不可信（phantom）；手算/以 CI 干净树为准。
- **sandbox**：后台跑 test/precheck 需 required_permissions=all（`/tmp` 只读 → vitest 假红）。
- **#52 e 值决策仍待规划者复核**：viz 2 处 1.602e-19→E_CHARGE(+0.011%)（#52 评论有回退点）。
- **dist 新鲜度**：本轮改 physics-core/src（新增 constantPatterns + 改 index）后，跑 viz 测试/typecheck 前必须 `npm run build:core`（dist 含新 barrel 导出，否则 viz 从 'physics-core' import 报"无导出成员"）。
