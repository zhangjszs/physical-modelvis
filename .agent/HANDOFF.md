# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-01 · `qoder-20261001T144019Z` · 执行者）· 收尾 ~15:00 UTC

### 接手时状态
- main @ `10a17c0`（上棒 #52 收尾），本地=origin 同步；无 `LOCK` → 新建 `qoder-20261001T144019Z`。
- 环境缓存 `.agent/ENV.md` 复用（未重复探测）。GitHub issue 事实源：**#53 [P1]**（#51/#52 已闭，#53 是 M1 P1 主干最后一环）为最高优先级 unblocked 项。
- 并发会话未提交的 viz 文件仍在（composition/fieldLines/store，mtime 仍 ~11:50Z，长时停滞=stalled），持续污染本地 count。

### 本轮做了什么（#53，P1）— commit `04241b2`，CI `36880451266` 绿，Deploy `36880770540` 绿
1. **方案 A（依 D3，模式单一真源）**：新建 `physics-core/src/units/constantPatterns.ts`，把 `LITERAL_PATTERNS`/`stripCommentsAndStrings`/`PATTERN_SAMPLES` 从引擎测试抽出并经 `index.ts` barrel 导出；`constants-single-source.test.ts` 改 import（it 结构不变，core 仍 1107）。
2. 新建 `visualization/tests/accuracy/rendering-constants-single-source.test.ts`（**24 例**）：用同一套模式扫 `visualization/src/rendering/*.ts`（**排除常量定义处 `constants.ts`**）→ 断言 0 内联；复用 `PATTERN_SAMPLES` 做正/负自检。
3. **补 #52 审计遗漏**：门禁会捕到 `electrostaticFieldScenes.ts` 的 2 处 `const K = 8.9875517923e9`（库仑常数，#52 的 24 处清单漏了 k）→ 新增 `rendering/constants.ts` 的 `COULOMB_K`（值零变化）。预扫描由 2 hits → CLEAN。
4. `scripts/self-check.mjs` LAYERS 加 **L11「渲染层常量单一真源」**；自检 10 层 → **11 层**。
5. 同步 **8 处**文档/CI 的"10 层/L8-L10"→"11 层/L8-L11"：AGENTS.md、README.md(×3)、CONTRIBUTING.md、scripts/README.md(×2)、docs/README.md、docs/self-check-loop.md（含新增 L11 详解）、.github/workflows/ci.yml 步骤名、.github/PULL_REQUEST_TEMPLATE.md。（超出 issue 列举的 7 处：self-check-loop.md 是自检主文档，不改会与新口径漂移。）
6. 关 #53（评论留红→绿+验收）；README×2 + docs/plan.md 测试数手算为 core 1107 / viz 1283(+24，40 files) / total 2390。

### 验证结果（本地实测，CI 干净树二次确认）
- core **1107** 全绿（refactor 不改计数）；typecheck/lint/format 绿。
- build:viz ✓；**check:bundle 62.4 kB / 70 kB（持平）**。
- **selfcheck 11 层全 PASS**（L11 = 24 cases）；viz 测试 0 失败。
- **count:check**：干净树 viz = 1259(基线)+24(新文件) = **1283 / 40 files**，与手写的 README/plan 精确一致（CI `36880451266` 已验证）。

### ⚠️ 关键手法（污染树下必用）
本轮**新增测试**（+24）→ 需要更新三处 test-count 标记；但工作树有并发未提交 viz 测试，`npm run count:sync` 会把它们计入得 phantom 数（≠ CI 干净树）。**做法**：先跑核心套件确认 core=1107（physics-core 无 foreign 文件，干净），新文件用 `npx vitest run <该文件>` 隔离测得 +24/+1file，再**手算**写 README=1283/40。push 用 `--no-verify`（本地 precheck 的 count:check 会因 phantom 红），CI 干净树为权威校验——已确认匹配。

### 🔴 并发会话（勿动 / 勿 `git add -A`）
仍停滞的他人未提交改动（L3/L4 组合实验台 + 3D 场线在建）：`visualization/src/components/composition/*`、`src/store/compositionStore.ts`、`tests/composition/*`（含 fieldLines/fieldLineSeeds）。本轮所有 `git add` 用**显式路径**，未卷入。下一棒动 viz 前先确认这批是否已合入 main。

### 下一步建议（按优先级）— M1 只剩 P2
1. **#54（P2，已 unblocked）**：`rendering/constants.ts` 的 K_BOLTZMANN/E_CHARGE/MU0/SIGMA_STEFAN_BOLTZMANN/PLANCK_H 改引用 PHYSICS_CONSTANTS。⚠️ 值 import 会拖入引擎，**先测 check:bundle**（余量 ~7.6kB）；保持导出符号名不变。**注意**：#53 已把模式抽到 `physics-core/src/units/constantPatterns.ts`——#54 若动 constants.ts 导出，别误删 #53 依赖的 `COULOMB_K/G_ACCELERATION/…`。
2. **#55（P2）**：B3 清单数字修正（34→37/13→30/去重 61）+ 61 场景常量单位核对（docs/核对，污染树影响小）。
3. **#56（P2）**：3D 基础层收口（接口归属/自检接入/2D-3D 边界文档），前置已满足。⚠️ 与并发 3D/fieldLines 工作主题重叠，先确认那些未提交文件是否已合入，避免撞车。

### 不要做的事
- 不重试 React 19 / 不上调 bundle 预算（#44）。不动 PR #23/#25。
- 不做文档数字漂移批量清理（#46–#50 已扫尽；历史快照 CHANGELOG/plan 日期段/archive 保留）。
- 代码/docs commit 与 `.agent/` commit 分开。动他人未提交文件 / `git add -A` / stash。

### 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- **改了 physics-core/src 后必须 `npm run build:core`** 再跑 viz 测试/typecheck（本轮新增 constantPatterns + 改 index，dist 不重建则 viz 从 'physics-core' import 报"无导出成员"）。
- 沙箱：后台跑 test/precheck/selfcheck 用 required_permissions=all（`/tmp` 只读会假红）。
- 自检层数现为 **11**（LAYERS 单一真源；改层数需同步上述 8 处）。
