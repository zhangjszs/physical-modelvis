# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-08 · `executor-kerwin-20261008a` · 执行者·批次 4 棒）· #65 批次 4 气体分子/静能/核迁移 · 完工转 in-review

### 本轮一件事（已入 main 推送，`7e9732a` + Merge `0a86988`，执行报告在 issue comment）

**#65 M3 批次 4：4 场景全部判 B（无 C）**：

1. **gas-law**（B）：过程曲线整条读 `charts.x_t`（等温/等压 x=V(L)/y=p(kPa) 同单位直取；等容 x=T(K) 取画布 T 窗内点映射垂直线）；动点 P 由曲线 `interpSeries`；R 读 `maxValues.R`（收敛旧 `GAS_CONSTANT_R=8.314` 截断双源）。动画相位 sweep 为演示示意。
2. **liquid-mixing**（B）：HUD Vmix/ΔV 读 `maxValues`（新增 `readEngineLiquidMix` helper）；**修真漂移**（旧 `0.04·min` 自算 vs 引擎摩尔分数模型，50/50mL 下 98.0 vs 97.71）。量杯/分子示意保留。
3. **capacitor-charge**（B）：τ 读 `maxValues.tau`；Uc(t) 由 `charts.Uc_t` 插值（t 钳制 [0,tMax]）；ratio=Uc/E。首次为该 draw 引入 simulationResult。电路符号示意保留。
4. **radioactive**（B）：N-t 曲线整条读 `charts.x_t`（201 点@duration=tEnd）；N(t) 插值；tNow 周期 sweep 为演示。云室径迹装饰示意保留。`decay-statistics`/`fission-chain` 豁免未动。

全部经 #82 口径（charts 走 `chartsOf`、零 `as unknown as Record`）；**豁免表 10→6**；契约用例 **+8**（4 景各 2）；audit 新增「M3 批次 4」节；B 类计数 36/30/去重 60 未动；未改引擎。

### 验证（全部真实命令，退出码在案）

- 定向三件套 `single-source-contract / single-source-coverage / renderers` → **114 passed**（106+8）
- `npm run count:sync` → core 1125 / viz **1566** / total **2691**（+8，回写 README + docs/plan.md）
- `npm run precheck` → **exit 0**（typecheck / lint / format / test / count:check / build / bundle / 自检 11 层 11 PASS）
- **CI @ `0a86988` → success · Deploy → success**

### 给下一棒

**第一优先 = 等 Planner 验收 #65** → 队首 **#66**（M3 批次 5 收口批：电路+测量仪器 4 景 + 附带改写 audit/plan 的 B3「保留自算」旧口径）。其后 **#108**（常量门禁补漏）→ **#107** → M4 #93–#97。**勿领 #100–#104**（D19 parked）。迁移工作流不变：改渲染消费 `chartsOf`/`maxValues` → 豁免表销名 → 契约用例 +2/场景 → audit 批次节。
#66 若含 C 项——沿用「**C 场景不进迁移进展表首列反引号行、用散文列出**」的处理（D24），避免破 #61 差集 7 项例外。

### 风险与注意事项

- **gas-law 等温 Tm 取 T0 输入回显**：若用户参数组合本身不满足 pV=nRT（如乱调 p0/V0/T0），动点 Tm 与 Pm·Vm/nR 有 ~0.1% 级不一致；引擎同样以给定 T0 为准，画面与引擎一致。非本批引入，验收若问起见 #65 报告剩余风险。
- **charts 口径**：一律 `chartsOf(simulationResult, model)` / `getChart(...)`，禁 `as unknown as Record`（AGENTS.md + chart-registry.ts 为真源）；未登记模型 chartsOf 回退全量，用到哪个登记哪个。
- **viz tsconfig `noUncheckedIndexedAccess: true`**：测试里对 `mv.xxx`/`pts[i]` 做算术/取属性需 `?? 0` 或 `!`。
- **prettier + 源码契约耦合**：改完渲染先 `npx prettier --write` 再复跑契约测试确认被断言字符串未被重排。
- **audit B 类计数勿动**（36/30/去重 60）；B-静态∩B-数值重复项只在其唯一归属批处理一次。
- 端口 3000 被占（勿杀）；dev server 用 5199 strictPort；冒烟脚本 `SMOKE_BROWSER_CHANNEL=''`。
- 测试数真值 core 1125 / viz 1566 / total 2691（#65 后）。

### 给 Planner 的信号

- **in-review 积压 1**：#65 待验收（验收标准逐条核对 + CI/Deploy 证据在 issue 报告 comment；本批无 C、全 B）。
- ready 队列：#66 → #108 → #107 → M4 #93–#97，继续执行即可；D19/D20/D21 均已落盘，无 pending。
- 无新增决策事项、无 auto-discovered 立单。
- 附带修复本棒开工时发现的过期状态：STATE/HANDOFF 曾停在「#64 in-review」（落后规划者验收一轮），本轮重写已刷新。
