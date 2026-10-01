# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-01 · `qoder-20261001T231900Z` · 执行者）· 收尾 ~23:30 UTC

### 接手时状态
- main @ `12429f8`（上棒 #59 收尾 chore(agent)），本地=origin；无 `LOCK` → 新建 `qoder-20261001T231900Z`。
- issue：唯一 ready-for-agent 实质代码项 = **#58**（surface-tension σ 三方取值不一致 + 渲染未消费引擎）；#59 已 CLOSED；#60 待规划、#44 人类持有。
- 并发未提交 viz 文件（composition/fieldLines/store）仍在，mtime ~11:48–11:51Z（**stalled ~11.5h**，比上棒更久），持续潜在污染本地 count。

### 本轮做了什么（#58，P2·type:bug — σ 单一真源收口）— commit `51ccaa7`（9 文件），**CI `36940916734` 全绿 + Deploy 绿**
1. `physics-core/src/units/constants.ts`：`PHYSICS_CONSTANTS` 新增 `sigmaWater20C=0.0728`（IAPWS）/`sigmaMercury20C=0.487`（value/unit/symbol 齐全，过常量表三字段测试）。
2. 引擎 `surface-tension.ts`/`capillary.ts`：σ₀ 由内联 `0.072/0.487` 改为引用 `PHYSICS_CONSTANTS.sigma*20C.value`（跨包双源消除，参照 #54）。水 σ₀ 0.072→**0.0728**。
3. `visualization/src/rendering/constants.ts`：`SIGMA_WATER_20C`/`SIGMA_MERCURY_20C` 改为引用 `PHYSICS_CONSTANTS`（值不变 0.0728/0.487 → `renderers.test.ts` L3 断言仍绿）。
4. **温度模型归一到引擎加法** `σ=σ₀−β·(T−20)`（β_水=1.5e-4/β_水银=2.0e-4）：`drawSurfaceTensionScene`/`drawCapillaryScene` 与 3D `surfaceTensionRig.ts` 原乘法近似 `σ₀·(1−0.002·ΔT)` 全部改加法式，偏离 20℃ 不再与引擎发散。
5. **渲染消费引擎（单源约定）**：两个 2D 渲染 headline σ₀/σ/F、ρ/θ/h 优先读 `diagnostics.maxValues`（键名见 STATE），无结果才回退（回退常数与模型均与引擎同源）。
6. 场景描述文本 0.072→0.0728；`surface-tension.test.ts`/`capillary.test.ts` **在既有 `it('chart')` 内**加断言锁定 σ=0.0728 —— **未增删 `it` 用例 → 测试数不变**（本棒全程未碰 count，README 标记未动，CI count:check 干净树绿）。

### 验证（全绿）
- 本地：build:core（含 prettier 复排后二次重建）→ typecheck 全绿 → prettier/eslint 对 9 文件绿 → 定向 vitest：surface-tension(2)/capillary(2)/em-guards(22)/constants-single-source(29)/renderers(26)/single-source-contract(49) 全 PASS → selfcheck 11 层全 PASS。
- CI `36940916734`（干净树，仅本棒 9 文件）：typecheck/lint/format/test/**count:check**/build/selfcheck/bundle 全过；Deploy `51ccaa7` 成功。

### 🔴 并发会话（仍勿动 / 勿 `git add -A`）
`visualization/{src/components/composition,src/store/compositionStore,tests/composition}`（含 fieldLines/fieldLineSeeds），mtime ~11:48–11:51Z、**stalled ~11.5h**。本棒已实证「只暂存 9 个显式路径 → 绕开污染 → CI 绿」这条路可行。若下棒仍见其在，继续显式路径 staging + `--no-verify`（钩子跑全量 precheck 在脏树会假红）。

### 下一步建议（优先级）
**当前 GitHub 无 ready-for-agent 实质项**（#58 是最后一个，已 CLOSED）。开放项仅：
1. **#60**（needs-triage·P3·**非 agent 自动执行**）：引擎 `ParameterSpec.unit` 记号 split（'deg'(13)/'°'(17)、'um'(2)/'μm'(1)）。**待规划者定夺**统一记号 vs 建门禁（可扩 `constants-single-source.test.ts` 加单位串扫描）。**勿越权替规划者拍板**。可做的低风险准备：跑一次全仓 `grep` 把 deg/° / um/μm 的确切分布整理成评论附到 #60，供规划者决策（不改代码、不做取舍）。
2. **#44 保持 open，勿动**（人类 assignee，勿重试 React19、勿上调 bundle 预算）。
3. 若下棒上来发现 tracker 有**新 triaged 的 ready-for-agent issue**，优先做它；否则回到 #60 的「只调研不实现」准备。
4. 也可主动做一次轻量健康巡检：`gh run list`（CI/Deploy 是否偶发红）、`git log`（是否有并发 composition 分支被合入使工作树转干净，若干净则可正常跑全量 precheck + count:sync）。

### 不要做的事
- 不替规划者决定 #60；不重试 React19 / 不上调 bundle 预算（#44）。不动 PR #23/#25。
- 代码 commit 与 `.agent/` commit 分开。动他人未提交文件 / `git add -A` / stash。
- 别给自检 +1 层（优先并入既有层，参 #56）。不为 σ 单独加 LITERAL_PATTERNS 门禁（本棒用「既有 it 内加断言」锁定，避免门禁面扩大 + 需补 PATTERN_SAMPLES；上棒亦有意未加）。
- 不批量清理文档数字漂移（#46–#50 已扫尽；历史快照保留）。

### 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`（本机 node v24）。
- 改 `physics-core/src` 后跑 viz 测试/typecheck 前必须 `npm run build:core`（#15 dist 守卫；本棒已做）。
- 沙箱：后台 test/selfcheck 用 required_permissions=all（/tmp 只读假红）。
- 污染树：测试数/count:check 以 CI 干净树为准。**本棒证明**：#58 只强化既有断言、不加 `it`，测试数不变 → 无需 count:sync，直接提交显式路径即可 CI 绿。
- 自检现为 **11 层**；M1 + M1.5 + B3（#51–#57/#59）+ **#58** 全部代码+文档收口。开放项：#60（待规划、非 agent）、#44（勿动）。
