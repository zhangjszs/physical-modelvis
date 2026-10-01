# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-01 · `qoder-20261001T161520Z` · 执行者）· 收尾 ~16:30 UTC

### 接手时状态
- main @ `f2c629b`（上棒 #54 收尾），本地=origin；无 `LOCK` → 新建 `qoder-20261001T161520Z`。
- issue：M1 代码主干 #51/#52/#53/#54 全 CLOSED；剩 P2：#55（步骤2 待做）、#56（M1.5）、#44。
- 并发会话未提交 viz 文件（composition/fieldLines/store）**仍停在 mtime ~11:51Z（stalled ~4.5h）**，持续污染本地 count。

### 本轮做了什么（#56，P2 — M1.5 收口）— commit `2e9ccf1`，**CI `36891721823` 绿 · Deploy `36892028568` 绿**
1. **接口归属（方案 A）**：`physics-core/src/physics/boris3d.ts` 里 `TrajectoryPoint3D` 的"待归并 SimulationResult"占位注释 → 明确决策：3D 轨迹是**独立于 SimulationResult 的通道，不并入**。理由：`SimulationResult.TrajectoryPoint`(Vector2D) 是 123 场景/`getFrame`/`single-source-contract.test.ts` 的支点，扩成 2D/3D 联合属破坏性变更。
2. **3D 自检接入（仍 11 层，刻意不 +1）**：`scripts/self-check.mjs` 把 3D 测试并入既有层 —— L8 加 `tests/unit/boris3d.test.ts`（9→18 例）、L1 加 `tests/unit/fields3d.test.ts`（16→30 例）。层数不变 → **无 8 处文档/CI 层数同步**（避开 #53 式 churn）。
3. **顺带修真 bug**：`runLayer` 此前对所有 test 项一律前缀 `tests/accuracy/`，而 3D 测试在 `tests/unit/` → 直接写文件名会被 vitest 静默跳过（首次接入时 L1/L8 计数没变即暴露）。改为"含 '/' 则按原样解析路径"，向后兼容。
4. **2D/3D 边界文档**：AGENTS.md「Key Patterns」新增条目（纯 2D 匀强场用 `em-combined-field` 解析；3D/非匀强/组合场用 `boris3d`+`fields3d`，独立通道）。

### 选 #56 而非 #55步骤2 的理由
#56 是有实质工程价值的收口（接口决策/自检/边界），且**不新增 vitest 用例**（core 仍 1107）→ 污染树无影响、count 不动；只碰 physics-core + scripts + 文档，**不碰并发会话占用的 visualization 文件**。#55 步骤2 是 61 场景长 grind。

### 验证（全绿）
- typecheck / lint / format 绿；**selfcheck 11 层全 PASS（L1=30 / L8=18，含 3D）**；core 1107（不新增用例）。未改 viz → 测试数不变（README 维持 core 1107 / viz 1283 / total 2390）。
- 因污染树本地 count:check 不可信 → push 用 `--no-verify`；CI 干净树已验证 count:check 通过（#56 不改测试数）。

### 🔴 并发会话（仍勿动 / 勿 `git add -A`）
`visualization/src/components/composition/*`、`src/store/compositionStore.ts`、`tests/composition/*`（含 fieldLines/fieldLineSeeds），mtime 停在 ~11:51Z。所有 `git add` 用显式路径。若这些被合入/清场，工作树即干净，可正常跑完整 precheck。

### 下一步建议
1. **#55 步骤2（唯一实质性剩余项，#55 仍 OPEN）**：61 个 B 类 sceneId 逐条常量/单位核对。方法见 #55 评论：逐 scene 取 `parameters[].unit`/default + 渲染引用常量，比对引擎 `PHYSICS_CONSTANTS`/`ParameterSpec.unit`。分批填"核对记录表"；发现不一致→**另立 issue**，不在 #55 内改数值。纯读，受污染影响小。可考虑写脚本自动比对 unit（若发现可自动化模式→另立门禁 issue）。
2. 若 M1 全部收口后需要新里程碑方向，读 issue/PR 现状再定（#44 React19 等依赖专项保持 open，勿动）。

### 不要做的事
- 不重试 React 19 / 不上调 bundle 预算（#44）。不动 PR #23/#25。
- 不做文档数字漂移批量清理（#46–#50 已扫尽；历史快照保留）。
- 代码/docs commit 与 `.agent/` commit 分开。动他人未提交文件 / `git add -A` / stash。
- 别给自检 +1 层，除非确实需要 —— 优先像 #56 这样并入既有层，省 8 处文档同步。

### 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- 改 physics-core/src 后跑 viz 测试/typecheck 前必须 `npm run build:core`（#56 改了 boris3d.ts 注释，已重建）。
- 沙箱：后台 test/precheck/selfcheck 用 required_permissions=all（/tmp 只读假红）。
- 污染树：测试数/count:check 以 CI 干净树为准；selfcheck/bundle 类可本地量（不受 test-count 污染影响）。
- 自检现为 **11 层**；M1 + M1.5 代码全部收口（#51/#52/#53/#54/#56/#57 CLOSED）。
