# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-08 · `executor-kerwin-20261008b` · 执行者·批次 5 棒）· #66 收口批电路+仪器迁移 · 完工转 in-review

### 本轮一件事（已入 main 推送，`1530e02` + Merge `67c920a`，执行报告在 issue comment）

**#66 M3 批次 5（收口）：4 场景全部判 B（无 C），M3 8/8 代码收官**：

1. **load-voltage**（B）：HUD I/U + R 标牌 + 表针读引擎 operating 点（R₀=U₀/I₀=100Ω）；**修两真问题**（loadRMax kΩ 未换算 + 算术中点 vs 几何平均）。回路示意保留。
2. **resistance-law**（B）：HUD R 读 `maxValues.baseResistance`；**修铁档真漂移**（旧 2.82e-8 铝值 vs 引擎 1.0e-7，旧画面偏小约 3.5 倍）。导线示意保留。
3. **vernier-caliper-tool**（B）：主尺/对齐线/读数整组读引擎（全组有效才采用）；卡尺零位仍按物理输入定位。刻度尺示意保留。
4. **micrometer-tool**（B）：a/n/reading 整组读引擎；千分尺示意保留。

立单时“仪器类大概率落 C”猜想被实测证伪（两引擎输出为真实读数计算，非占位），详见报告歧义处理。
**收口动作**：audit 新增「M3 批次 5」节 + 收口记；「迁移建议」第 4 条与 plan.md B3 段旧口径改写（迁移 20/豁免 2）；
顺带修正 plan.md 同页强转旧口径行（→chartsOf/getChart）。

**豁免表 6→2**（仅 heat-direction/perpetuum-mobile 带理由 C，无「待迁」残留）；契约用例 **+8**（4 景各 2）；
B 类计数 36/30/去重 60 未动；零强转；未改引擎。

### 验证（全部真实命令，退出码在案）

- 定向三件套 `single-source-contract / single-source-coverage / renderers` → **122 passed**（114+8）
- `npm run count:sync` → core 1125 / viz **1574** / total **2699**（+8，回写 README + docs/plan.md）
- `npm run precheck` → **exit 0**（typecheck / lint / format / test / count:check / build / bundle / 自检 11 层 11 PASS）
- **CI @ `67c920a` → success · Deploy → success**

### 给下一棒

**第一优先 = 等 Planner 验收 #65 + #66**（in-review 积压 2；M3 进度待验收后 8/8）→ 其后队首 **#108**（常量门禁补漏 h 未入列）→ **#107**（发布 dry-run）→ M4 #93–#97。**勿领 #100–#104**（D19 parked）。
#108 与已迁场景零重叠（D23），可直接按门禁单工作流执行（普查 LITERAL_PATTERNS 缺项 → 纳入名单 → 收敛内联 → 红→绿反向验证）。

### 风险与注意事项

- **本轮 3 处显示值变化**（向引擎对齐，属预期）：load-voltage 默认 R 标牌 5.5Ω→100.0Ω、I/U→0.12A/11.76V；resistance-law 铁档 R 变大 ~3.5 倍；vernier 非网格输入显示量化值。验收以引擎值为准（报告剩余风险已写）。
- **自算期望常量教训**：本棒 resistance-law 测试曾因手算 R₀=0.0213876 写错期望而红（真值 0.02139042…，引擎正确）——独立复算的期望值务必用 node 实算，勿心算。
- **charts 口径**：一律 `chartsOf`/`getChart`，禁 `as unknown as Record`；本批 4 景走 maxValues（无对应画布曲线元素，B-局部既定口径）。
- **viz tsconfig `noUncheckedIndexedAccess: true`**：`?? 0` / `!` 守卫；本批用“全组有效才采用”避免引擎/自算混搭（勿引入 `as number` 新惯用法）。
- **prettier + 源码契约耦合**：改完渲染先 `npx prettier --write` 再复跑契约测试。
- **audit B 类计数勿动**（36/30/去重 60）；B-静态∩B-数值重复项只在其唯一归属批处理一次。
- 端口 3000 被占（勿杀）；dev 用 5199 strictPort；冒烟脚本 `SMOKE_BROWSER_CHANNEL=''`。
- 测试数真值 core 1125 / viz 1574 / total 2699（#66 后）。

### 给 Planner 的信号

- **in-review 积压 2**：#65 + #66 待验收（报告 comment 均含逐条核对 + CI/Deploy 证据；两批皆全 B 无 C）。
- M3 代码 8/8 收官（待验收关闭）； ready 队列：#108 → #107 → M4 #93–#97，继续执行即可。
- 无新增决策事项、无 auto-discovered 立单。
