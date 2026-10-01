# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `qoder-20261001T231900Z`（**执行者**）
- 会话开始: 2026-10-01T23:19:00Z (UTC)
- 本轮代码 commit: `51ccaa7`（fix #58 σ 单一真源）· CI `36940916734` 绿 · Deploy `51ccaa7` 绿
- 脉络：规划者 `claude-opus-5-…` 建 M1；执行棒 …→ T163330Z(#55步骤2) → T171000Z(#59) → 本棒 T231900Z(#58 CLOSED)。**M1 + M1.5 + B3 + #58 全部收口**。

## 接力载体
- `.agent/` 随仓库提交（根 .gitignore 放行 `.agent/`；`.agent/.gitignore` 仅排 `LOCK`）。ENV.md 记录自检 11 层。人工可编辑 ENV.md 覆盖。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | qoder-20261001T231900Z | #58 | 2026-10-01T23:19:00Z |

## 当前活跃
**本轮无活跃未完成任务**（#58 已 CLOSED）。**GitHub 开放 issue 仅剩 2 个，均非 agent 自动执行项**：
- **#60**（needs-triage·P3·chore·area:engine，**无 assignee**）：引擎 `ParameterSpec.unit` 记号 split（'deg'(13)/'°'(17)、'um'(2)/'μm'(1)）。**待规划者定夺**统一记号 vs 建门禁，**非 ready-for-agent，勿越权实现**。
- **#44**（P2·chore·area:ci，**assignee=zhangjszs**，人类持有）：react19/vite8/express5/TS7 专项迁移。**勿动/勿抢**（react-dom 19 +23kB 破 #42 70kB 门禁）。

### 本轮已做（#58，CLOSED）
surface-tension σ_水 三方取值不一致（引擎内联 0.072 / 渲染 constants 0.0728 / 3D rig 内联 0.072）+ 渲染 headline 自算未消费引擎 → 统一到单一真源（commit `51ccaa7`，9 文件）：
1. `PHYSICS_CONSTANTS` 新增 `sigmaWater20C=0.0728`（IAPWS）/`sigmaMercury20C=0.487`。
2. 引擎 `surface-tension.ts`/`capillary.ts` + 渲染 `constants.ts SIGMA_*_20C` 全部引用之（跨包双源消除，参照 #54）。
3. **温度模型统一到引擎加法模型** `σ=σ₀−β·(T−20)`（β_水=1.5e-4/β_水银=2.0e-4）；渲染 headline 与 3D rig 原乘法近似 `σ₀·(1−0.002·ΔT)` 已改加法式，偏离 20℃ 不再与引擎发散。
4. `drawSurfaceTensionScene`/`drawCapillaryScene` headline σ₀/σ/F、ρ/θ/h 优先读 `diagnostics.maxValues`，无结果再回退（回退常数/模型均与引擎同源）。
5. 场景描述文本 0.072→0.0728；`surface-tension.test.ts`/`capillary.test.ts` **在既有 `it` 内**加断言锁定 σ=0.0728（**未增删用例 → 测试数不变**，README 标记未动，count:check 干净树通过）。
- 验证：CI `36940916734` 全 7 门禁绿；本地定向 renderers(26)/single-source-contract(49)/surface-tension(2)/capillary(2)/em-guards(22)/constants-single-source(29) + 11 层 selfcheck 全 PASS；typecheck/lint/prettier 绿。水银 σ 不变，capillary 契约用例走水银（medium=1）不受影响。

## 已完成（最近，≤20 条）
- **#58** surface-tension σ_水 三方取值统一到 PHYSICS 单一真源 0.0728 + 温度模型归一到引擎加法 + 渲染/3D rig 消费引擎 — 51ccaa7，**本轮 CLOSED**
- **#59** 移除幻影 double-slit，B 类清单/计数 61→60（B-静态 37→36）— abc4a72，T171000Z CLOSED
- **#55** B3 清单数字修正 + 61 场景常量/单位核对（步骤1 `2a0e312` + 步骤2 `8eda01b`）；发现外化 #58/#59/#60 — T163330Z CLOSED
- **#56** 3D 基础层收口：TrajectoryPoint3D 方案A + L1/L8 接入 3D 自检(仍 11 层) + 2D/3D 边界文档 — 2e9ccf1
- **#54** 跨包双源消除：rendering/constants.ts 5 项→PHYSICS_CONSTANTS（零值变化）— 3ea8ced
- **#53** 渲染层常量门禁（constantPatterns + L11 + 24 例测试 + 8 处文档 10→11）— 04241b2
- **#52** 渲染层 24 处内联 g/R/e/c 收敛到 rendering/constants.ts — 5ec7122
- **#51** 电荷模式加严 + 引擎 8 处内联收敛 — 89910d1
- **#57** Deploy 修复（deploy.yml 子目录 npm ci + YAML 冒号）— 89b7dcc/d45cd39
- README/plan.md 测试数 **core 1107 / viz 1283(40 files) / total 2390**（干净树真值，本棒未变，count:check CI 已复核）

## 阻塞项 / 风险
- **#60 记号 split**：'deg'(13)/'°'(17)、'um'(2)/'μm'(1) 引擎侧并存；needs-triage，交规划者，**非 agent 执行**。
- **#44**：人类 assignee，勿重试 React19/勿上调 bundle 预算。
- **并发未提交 viz 文件（仍在）**：`visualization/{src/components/composition,src/store/compositionStore,tests/composition}`（fieldLines/fieldLineSeeds，mtime ~11:48–11:51Z，**stalled ~11.5h**，比上棒更久仍未合入/未清场）。**勿动、勿 `git add -A`/stash**。存在时本地 `count:sync`/`precheck` 的 count:check 不可信（phantom）；一切以 CI 干净树为准（本棒已验证：只提交 9 个显式路径文件，CI count:check 绿）。
- **sandbox**：后台跑 test/selfcheck 需 required_permissions=all（`/tmp` 只读 → vitest 假红）。
- **dist 新鲜度**：本棒改了 `physics-core/src`（constants/surface-tension/capillary）→ 已 `npm run build:core` 重建 dist（含 prettier 复排后二次重建）。下一棒改 core src 后跑 viz 测试/typecheck 前务必先 build:core。
