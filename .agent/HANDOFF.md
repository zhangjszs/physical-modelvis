# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-07 · `executor-kerwin-20261007e` · 执行者·批次 3 棒）· #64 批次 3 热学定律迁移 · 完工转 in-review

### 本轮一件事（已入 main 推送，`c82ec34`，执行报告在 issue comment）

**#64 M3 批次 3：热学定律 5 场景**（3 迁 B + 2 判 C）：

1. **joule-electrical**（B）：HUD P/Q/ΔT 读 `maxValues.powerW / workTotalJ / deltaT_K`（引擎 P=V²/R、W=P·t、ΔT=W/(M·c水)，c水=4184 与引擎 C_WATER 同源）；电路/箭头示意保留。
2. **adiabatic-compression**（B）：HUD 终温 T2 读 `maxValues.T2_K`（引擎 gamma 在侧，T2=T1·r^(γ−1)，去除渲染硬编码 gamma 的漂移风险）；活塞动画示意保留。
3. **energy-transformation**（B）：有用/损耗读 `maxValues.Eout_J / Eloss_J`（引擎 Eout=Ein·η、Eloss=Ein−Eout）；能量柱/箭头示意保留。
4. **heat-direction**（C）：保留豁免表，理由引用阶段 C 第 5 批「可保留」——本画面绘方向/不可逆示意（两方块 + 单向箭头），不绘 T–t 曲线，故引擎 x_t/y_t 无可消费面；Qdot=k·ΔT 为 arb 单位速率无引擎标量。**未推翻既有结论**。
5. **perpetuum-mobile**（C）：保留豁免表，卡诺效率 1−Tc/Th 与引擎逐字同式 + 转轮动画示意；引用第 5 批结论。

全部经 #82 口径（charts 走 `chartsOf`、无 `as unknown as Record`，遵守十八次滚动口径更新）；**豁免表 13→10**；契约用例 **+6**（迁 B 的 3 景各 2 例）；audit 新增「M3 批次 3」节；audit B 类计数 36/30/去重 60 未动。

### 验证（全部真实命令，退出码在案）

- 定向三件套 `single-source-contract / single-source-coverage / renderers` → **106 passed**（coverage 7 + renderers 26 + contract 73）
- `npm run count:sync` → core 1125 / viz **1558** / total **2683**（+6，回写 README + docs/plan.md）
- `npm run precheck` → **exit 0**（typecheck / lint 0 错 19 既有 warn / format / test 2683 / count:check 一致 / build / bundle 首屏通过 / 自检 11 层 11 PASS）
- **CI @ `c82ec34` → success（1m57s）· Deploy → success（28s）**

### 给下一棒

**第一优先 = 等 Planner 验收 #64** → 队首 **#65**（M3 批次 4 气体分子/静能/核 4 场景：gas-law（249 行自算）/ capacitor-charge / radioactive / liquid-mixing）。其后 **#66 → #108**（常量门禁补漏，十八次滚动后新入队）→ **#107** → M4 #93–#97。**勿领 #100–#104**（D19 parked）。迁移工作流不变：改渲染消费 `chartsOf`/`maxValues` → 豁免表销名 → 契约用例 +2/场景 → audit 批次节。
#65/#66 大概率也含 C 项——沿用本轮「**C 场景不进迁移进展表首列反引号行、用散文列出**」的处理，避免破 #61 差集 7 项例外。

### 风险与注意事项

- **pre-push 钩子有测试抖动**：本棒首跑 physics-core vitest 失败、复跑 `npm test` exit 0、重试 push 即过（非改动引入）。下一棒遇钩子首跑红先本地复跑确认真伪，勿贸然 `--no-verify`。
- **charts 口径**：一律 `chartsOf(simulationResult, model)` / `getChart(...)`，禁 `as unknown as Record`（AGENTS.md + chart-registry.ts 为真源）；未登记模型 chartsOf 回退全量，用到哪个登记哪个。
- **viz tsconfig `noUncheckedIndexedAccess: true`**：测试里对 `mv.xxx`/`pts[i]` 做算术/取属性需 `?? 0` 或 `!`（本棒 `wp[wp.length-1]!.y`、`(mv.Eout_J ?? 0)+...`）。
- **prettier + 源码契约耦合**：改完渲染先 `npx prettier --write` 再复跑契约测试确认被断言字符串未被重排。
- **audit B 类计数勿动**（36/30/去重 60，#55/#59 钉死）；B-静态∩B-数值重复项只在其唯一归属批处理一次。
- 端口 3000 被占（勿杀）；dev server 用 5199 strictPort；冒烟脚本 `SMOKE_BROWSER_CHANNEL=''`。
- 测试数真值 core 1125 / viz 1558 / total 2683（#64 后）。

### 给 Planner 的信号

- **in-review 积压 1**：#64 待验收（验收标准逐条核对 + CI/Deploy 证据在 issue 报告 comment；C 两项未推翻、理由见豁免表 note 与报告「歧义处理」）。
- ready 队列：#65 → #66 → #108 → #107 → M4 #93–#97，继续执行即可；D19/D20/D21 均已落盘，无 pending。
- 无新增决策事项、无 auto-discovered 立单。
