# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-01 · `qoder-20261001T163330Z` · 执行者）· 收尾 ~17:00 UTC

### 接手时状态
- main @ `b75a01b`（上棒 #56 收尾），本地=origin；无 `LOCK` → 新建 `qoder-20261001T163330Z`。
- issue：M1 + M1.5 代码全 CLOSED（#51–#54/#56/#57）；唯一实质剩余 = **#55 步骤2**（61 场景常量/单位核对）；#44 保持 open 勿动。
- 并发会话未提交 viz 文件（composition/fieldLines/store）**仍停在 mtime ~11:51Z（stalled）**，持续污染本地 count。

### 本轮做了什么（#55 步骤2，P2 — B3 核对）— commit `8eda01b`，**CI `36895314703` 绿**
1. **可复现核对法**（非正则、数据来自运行时对象）：`tsx` 一次性脚本导入 `getAllScenes()` + 引擎 `getModel()`，对每个 B 类 sceneId 以**默认参数调 `buildProblem(defaults)`**，直接读引擎侧**换算后的实值**，与场景 UI 单位/默认值逐项比对；`ParameterSpec.unit` 同名参数自动比对单位串。脚本在 `.scratch/b-audit.mts`（**不提交**，gitignore）。
2. **结论：60 个真实 sceneId 单位换算数值全部正确**——kPa→Pa(gas-law 101.3→101300)、L→m³(22.4→0.0224)、mm→m、μm/μF→m/F、cP→Pa·s、GPa→Pa、×10ⁿ 电荷/速度/质量、指数→Hz、kΩ→Ω 均确证；材料常量 ρ(Cu/Fe/Nichrome)/σ 量级通过。**无漏换算/数量级错误**（issue 点名的 kPa/atm、cm/m 面均正确）。
3. **交付物**：`docs/rendering-physics-audit.md` 末节新增「#55 步骤2 核对记录」——**61 行核对表** + 方法说明 + 发现清单；`docs/plan.md` B3 标注核对完成。纯文档，**不新增用例、测试数不变**（core 1107 / viz 1283 / total 2390 维持）。
4. **发现 3 项非物理数值问题 → 另立 issue**（严守本 issue"不改数值"约束）：
   - **#59**（docs）：`double-slit` 是**幻影 sceneId**——`visualization/src` 无 `id:'double-slit'`，真实"双缝干涉"=`interference`（已在 B-数值）；故 61 唯一 id 含 1 个不存在项（真实 60）。建议修正清单/计数。
   - **#60**（chore·needs-triage）：引擎 `ParameterSpec.unit` 记号 split：`'deg'`(13) vs `'°'`(17)、`'um'`(2) vs `'μm'`(1)；纯记号、无换算影响；正则可检出 → 门禁候选，交规划者定夺。
   - **#58**（bug·render）：surface-tension σ_水 **三方取值不一致**（`constants.ts SIGMA_WATER_20C=0.0728` 仅 L3 测试用 ≠ 引擎 0.072 = 渲染 0.072）+ `drawSurfaceTensionScene` headline σ/F 自算未消费引擎 `forceCurve`（`drawCapillaryScene` 同模式）→ 真双源缺口。

### 验证（全绿）
- Prettier 对改动的两个 .md 绿；纯文档 → 不动测试数，无需 count:sync/precheck 本地跑（污染树 count 不可信）。
- CI `36895314703`（干净树）：typecheck/lint/format/test/count:check/build/selfcheck/bundle 全过。#55 已 CLOSED。

### 🔴 并发会话（仍勿动 / 勿 `git add -A`）
`visualization/src/components/composition/*`、`src/store/compositionStore.ts`、`tests/composition/*`（含 fieldLines/fieldLineSeeds），mtime 停在 ~11:51Z。所有 `git add` 用显式路径。若这些被合入/清场，工作树即干净，可正常跑完整 precheck。

### 下一步建议（均 unblocked、ready-for-agent）
1. **#59**（建议优先，纯文档、小工作量、抗污染）：修正 `docs/rendering-physics-audit.md` B-静态清单与 `docs/plan.md` B3 计数口径（61→60 或以 interference 去重）；不动历史测试数快照。
2. **#58**（真 bug，改数值）：统一 σ_水 到单一真源（引擎+渲染同引 `PHYSICS_CONSTANTS`/`SIGMA_WATER_20C`）+ `drawSurfaceTensionScene` headline 改读引擎 charts。**注意**：改数值须本地跑 viz 测试、干净树 `count:sync` 回写三处标记；先在干净树（并发文件清场后）操作以免 phantom。
3. **#60**：待规划者定夺是否统一记号/建门禁；若建门禁可扩 `constants-single-source.test.ts` 加 `ParameterSpec.unit` 记号扫描（正则无歧义）。
4. 若三项后无 P2 实质项，读 issue/PR 现状再定新方向（#44 保持 open，勿重试 React19）。

### 不要做的事
- 不重试 React 19 / 不上调 bundle 预算（#44）。不动 PR #23/#25。
- 代码/docs commit 与 `.agent/` commit 分开。动他人未提交文件 / `git add -A` / stash。
- 别给自检 +1 层（本轮未碰 core/render 源码）；#60 若建门禁优先并入既有层（参 #56 省文档同步）。
- 本轮 `.scratch/b-audit.mts` 探针脚本**故意不提交**（gitignore）；若 #59/#60 需要复用，方法已在审计文档末节写清，可现场重造。

### 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`（本机 node v24 + tsx v4.23 可用）。
- 跑抽取：`cd visualization && npx tsx ../.scratch/b-audit.mts`（`physics-core` 经 root node_modules 符号链接解析，dist 须新鲜）。
- 改 physics-core/src 后跑 viz 测试/typecheck 前必须 `npm run build:core`（本轮纯 docs，未触发）。
- 沙箱：后台 test/precheck/selfcheck 用 required_permissions=all（/tmp 只读假红）。
- 污染树：测试数/count:check 以 CI 干净树为准；selfcheck/bundle 类可本地量（不受 test-count 污染影响）。
- 自检现为 **11 层**；M1 + M1.5 + **B3**（#51/#52/#53/#54/#55/#56/#57）全部代码+文档收口。开放项仅 #44 + 新立 #58/#59/#60。
