# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-07 · `executor-kerwin-20261007c` · 执行者·第十二棒，规划会话连任）· #62 批次 1 五场景迁移 · 完工转 in-review

### 本轮一件事（已入 main 推送，`ac4ffb1`，执行报告在 issue comment）

**#62 M3 批次 1：光学波动 + 波粒二象 5 场景迁移**（4×B 局部 + 1×A+B，无 C 豁免）：

1. **diffraction-grating**（B）：k_max 读 `maxValues.orderMax`；主极大射线与引擎逐字同式，示意保留。
2. **polarization-malus**（B）：出射光强 I 读 `maxValues.Ifinal`；逐片级联同式回退（引擎无逐片序列）。
3. **interference**（B）：Δy 读 `maxValues.deltaYmm`；像素空间条纹带为示意图保留（与引擎物理 mm 曲线标定不同，注释在案）。
4. **doppler-effect**（B）：前/后观察者 f′ 由 `fprime_vs_theta` 在 0°/180° 插值——**刻意不用 maxValues.fObserved**（它跟随场景 dirAngle，与画面的固定两观察者口径不符）；NaN 断点防护后回退同式。
5. **photoelectric**（A+B）：Ek-ν 直线整条读 `charts.y_t`（止于引擎采样域上界）；ν₀ 读 maxValues；HUD K_max 与动画电子 y_t 插值。

全部经 #82 `chartsOf` 类型化访问层（零 as 强转）；**豁免表 22→17**（批次 1 销名 5 项）；契约用例 +10（每场景引擎端独立复算 + 源码消费断言）；audit 新增「M3 批次 1 迁移进展」节。

### 验证（全部真实命令，退出码在案）

- 定向三件套 `single-source-contract / single-source-coverage / renderers` → **92/92**
- `npm run count:sync` → core 1125 / viz **1544** / total **2669**（三处回写）
- `npm run precheck` → **exit 0**（typecheck / lint 0 错 19 既有 warn / format / 测试 2669 / count:check / build / bundle / 自检 11 层 11 PASS）
- CI + Deploy @ `ac4ffb1` → **双 success**

### 给下一棒

**第一优先 = 等 Planner 验收 #62** → 队首 **#63**（批次 2 传感器元件 4 场景：hall-effect / thermistor / photoresistor / strain-gauge，
引擎键已在 MODEL_CHART_KEYS 登记表）。迁移工作流不变：改渲染消费 `chartsOf` → 豁免表销名 → 契约用例 +2/场景 → audit 批次节。
其后 #64 → #65 → #66 → #107（D20 授权的发布 dry-run 门禁）→ M4 #93–#97。**勿领 #100–#104**（D19 已定夺不立项维持 parked）。

### 风险与注意事项

- **十六次滚动编号已被并发规划会话占用**（`06fb2b1`：D19 用户定夺补落盘，M5 不立项维持 parked）——规划侧下轮用**十七次滚动**。
- 本轮合并经 `pull --rebase` 扁平化为线性历史（无 merge commit），内容完整性已由 precheck + CI 双验证。
- **viz tsconfig `noUncheckedIndexedAccess: true`**：测试里 `mv.xxx` 做算术要 `?? 0`（TS18048 现场实录在 STATE）。
- **interpSeries NaN 断点污染相邻插值**：凡消费引擎扫描曲线（超声速区等）必配 `Number.isFinite` 守卫。
- **引擎 h 精度观察**（非 bug 不立项）：photoelectric.ts 局部 h=6.626e-34 与 units/constants 6.62607015e-34 有 1e-5 相对差，
  已在 audit 批次 1 备注行留痕；后续批次若遇同类「引擎局部字面量 vs 共享常量」以引擎为准消费、回退取共享常量即可。
- 端口 3000 被占（勿杀）；dev server 用 5199 strictPort；冒烟脚本 `SMOKE_BROWSER_CHANNEL=''`。
- 测试数真值 core 1125 / viz 1544 / total 2669（#62 后）。

### 给 Planner 的信号

- **in-review 积压 1**：#62 待验收（验收标准逐条核对清单 + CI/Deploy 证据在 issue 报告 comment）。
- ready 队列：#63 → #64 → #65 → #66 → #107 → M4 #93–#97，继续执行即可；D19/D20/D21 均已定夺落盘，无 pending。
- 无新增决策事项；引擎 h 字面量精度差异仅为观察记录，不值得立单。
