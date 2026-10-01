# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-01 · `qoder-20261001T171000Z` · 执行者）· 收尾 ~17:25 UTC

### 接手时状态
- main @ `d5c5f1c`（上棒 #55 步骤2 收尾），本地=origin；无 `LOCK` → 新建 `qoder-20261001T171000Z`。
- issue：M1 + M1.5 + B3 代码全 CLOSED；#55 步骤2 遗留 3 个外化项：**#59**（docs·double-slit 幻影）、**#58**（bug·surface-tension σ）、**#60**（chore·单位记号）；#44 保持 open（已有人 assignee，勿抢）。
- 并发会话未提交 viz 文件（composition/fieldLines/store）**仍停在 mtime ~11:51Z（stalled ~5.5h）**，持续污染本地 count。

### 本轮做了什么（#59，P2·docs — 清单/计数口径修正）— commit `abc4a72`，**CI `36897959114` 绿**
延续上棒 #55 步骤2 的 F1 发现。核实 `double-slit` 是**幻影 sceneId**：
1. **实证**：`grep id:'double-slit' visualization/src` 无命中；`getAllScenes()` 运行时探针 61 个 B 类 id 中恰此 1 个匹配不到场景（其余 60 个真实）。真实"双缝干涉（杨氏实验）"= `interference`（已在 B-数值清单）；`doubleSlitIntensity` 仅是 `rendering/constants.ts` 绘图辅助函数名。
2. **修正（方案 1：清单只列真实 sceneId）**：`docs/rendering-physics-audit.md` B-静态清单移除 `double-slit`（**37→36**）；分类统计表 B-静态 37→36；B 类段标题 + 去重说明 **并集 61→60**（36+30−6）；别名说明补记 `double-slit` 本身非注册 sceneId；#55 步骤2「核对发现 F1」标「✅ #59 已修」、核对表 double-slit 行结论改「F1→#59 已修」。`docs/plan.md` B3 计数 61→60 同步。
3. 纯文档口径修正，**不改任何物理数值**、不动各批次历史测试数快照、**测试数不变**（core 1107 / viz 1283 / total 2390）。#59 已 CLOSED。

### 验证（全绿）
- Prettier 对两个 .md 绿；纯文档 → 不动测试数（count:check 不受影响，无需本地 count:sync）。
- CI `36897959114`（干净树）：typecheck/lint/format/test/count:check/build/selfcheck/bundle 全过。

### 🔴 并发会话（仍勿动 / 勿 `git add -A`）
`visualization/src/components/composition/*`、`src/store/compositionStore.ts`、`tests/composition/*`（含 fieldLines/fieldLineSeeds），mtime 停在 ~11:51Z。所有 `git add` 用显式路径。若被合入/清场，工作树即干净，可正常跑完整 precheck。

### 下一步建议（优先级）
1. **#58（唯一实质代码项，ready-for-agent，P2·bug）**：surface-tension σ_水 三方取值不一致 + 渲染 headline 值自算未消费引擎。**取值决策已研究**：统一到 **0.0728**（IAPWS；`renderers.test.ts` L3 断言 `SIGMA_WATER_20C ∈ (0.072, 0.073)` 严格 >0.072，故 0.072 会挂）。
   - 建议路径：`physics-core/src/units/constants.ts` 的 `PHYSICS_CONSTANTS` 新增 σ_water（0.0728，带 value/unit/symbol）→ 引擎 `models/surface-tension.ts`（现硬编码 0.072）与 `models/capillary.ts`、viz `rendering/constants.ts SIGMA_WATER_20C` 均引用之（单一真源，参照 #54 消除跨包双源）。
   - `rendering/solidLiquidScenes.ts` 的 `drawSurfaceTensionScene`/`drawCapillaryScene` headline σ/F 改读引擎 `forceCurve`(charts.x_t)/`sigmaCurve`(charts.y_t)（`interpSeries`/`getFrame`），无引擎结果再回退——参照单源约定（AGENTS.md「渲染单一真源」）。
   - **注意**：改 `physics-core/src` 后必须先 `npm run build:core` 再跑 viz 测试/typecheck（#15 dist 守卫）；改数值后跑 `surface-tension.test.ts`/`capillary.test.ts`/`renderers.test.ts`（用 `vitest run <单文件>` 隔离，避污染树 phantom）；若新增/删用例需干净树 `count:sync`。
2. **#60**（needs-triage，**非 agent 自动执行**）：引擎 `ParameterSpec.unit` 记号 split（'deg'(13)/'°'(17)、'um'(2)/'μm'(1)）。待规划者定夺：统一记号 vs 建门禁（可扩 `constants-single-source.test.ts` 加单位串扫描）。**勿越权替规划者决定**。
3. 若 #58 完成且无 P2 实质项，读 issue/PR 现状再定新方向（#44 保持 open，勿重试 React19）。

### 不要做的事
- 不重试 React 19 / 不上调 bundle 预算（#44，且已被人 assignee）。不动 PR #23/#25。
- 代码/docs commit 与 `.agent/` commit 分开。动他人未提交文件 / `git add -A` / stash。
- 别给自检 +1 层（优先并入既有层，参 #56 省文档同步）。
- 不批量清理文档数字漂移（#46–#50 已扫尽；历史快照保留）。

### 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`（本机 node v24 + tsx v4.23 可用）。
- 场景↔引擎单位核对的可复现探针：`cd visualization && npx tsx <脚本>` 导入 `getAllScenes()`+`getModel()`、`buildProblem(defaults)` 读引擎侧实值（上棒 #55 用过；脚本在 `.scratch/b-audit.mts`，未提交可现场重造）。
- 改 physics-core/src 后跑 viz 测试/typecheck 前必须 `npm run build:core`（本轮纯 docs 未触发）。
- 沙箱：后台 test/precheck/selfcheck 用 required_permissions=all（/tmp 只读假红）。
- 污染树：测试数/count:check 以 CI 干净树为准；selfcheck/bundle 类可本地量。push 一律 `--no-verify`（钩子跑全量 precheck 在污染树会假红）。
- 自检现为 **11 层**；M1 + M1.5 + B3（#51/#52/#53/#54/#55/#56/#57/#59）全部代码+文档收口。开放项：#58（bug·可执行）、#60（待规划）、#44（勿动）。
