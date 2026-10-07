# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-07 · `executor-kerwin-20261007d` · 执行者·第十三棒）· #63 批次 2 传感器元件 4 场景迁移 · 完工转 in-review

### 本轮一件事（已入 main 推送，`5205370`，执行报告在 issue comment）

**#63 M3 批次 2：传感器元件 4 场景迁移**（3×B 局部 + 1×A+B，无 C 豁免）：

1. **thermistor**（B）：实时 R（HUD/副标题/公式末值）读 `maxValues.resistance`（引擎 NTC B 方程目标温度解，与回退式逐字同式，零漂移）。R-T 曲线/温度计/滑杆示意保留——引擎 `charts.x_t` 采样域 [250,400]K 远窄于画面量程 [200,600]K 且峰值标记 T 可越域，直取会断线；引擎 `y_t`（lnR–1/T，仅 NTC 分支）画面不展示故不消费 → **天然规避 PTC 分支 `y_t` 缺失**（场景 buildProblem 恒 'NTC'）。
2. **hall-effect**（B）：V_H 表头/HUD 读数读 `maxValues.hallVoltageAbs_mV`（|U_H| 的 mV 幅值，与回退式 |Vh|·1000 逐字同式）。场景 carrierType 恒 'electron' → 带极性键 `hallVoltage_mV`<0，画面取幅值；载流子偏转/上下表面 +/− 极性示意保留。
3. **photoresistor**（**A 全量 + B**）：R-E 曲线整条读 `charts.x_t`（含引擎暗电阻温度修正 `R_dark(T)=R_dark·exp(−0.02·(T−25))`），工作点 R 读 `maxValues.workResistance_Ohm`。**本批最硬的修复**：旧渲染自算 `Rdark·exp(−k·E)` 漏了温度项，T≠25℃ 时画面偏离引擎（又一真双源，同 #58 性质）。阈值线按实际绘制域 `[xs[0], xs[n-1]]` 的 log 重标定（兼容引擎/回退两种数据源）；回退分支含同源 `TEMP_COEFF=0.02`。
4. **strain-gauge**（B）：ΔU 读 `maxValues.deltaUMV`、ΔR/R 读 `maxValues.deltaROverR`（引擎 ΔR/R=K·ε、全桥 ΔU=U_K·K·ε/4，与回退式逐字同式，零漂移）。ΔU-ε 曲线/形变示意保留——引擎 `charts.y_t` 采样域 [−2000,2000]με 窄于画面 [−5000,5000]；ΔR=120Ω·ΔR/R 用标称阻值（引擎无绝对 R 输出）。

全部经 #82 `chartsOf` 类型化访问层（零 `as unknown as Record` 强转）；**豁免表 22→17→13**（批次 2 销名 4 项）；契约用例 **+8**（每景 2 例：引擎端独立复算 + 源码消费断言）；audit 新增「M3 批次 2 迁移进展」节。

### 验证（全部真实命令，退出码在案）

- 定向三件套 `single-source-contract / single-source-coverage / renderers` → **100 passed**（coverage 7 + renderers 26 + contract 67）
- `npm run count:sync` → core 1125 / viz **1552** / total **2677**（+8，回写 README + docs/plan.md 三处标记）
- `npm run precheck` → **exit 0**（typecheck / lint 0 错 19 既有 warn / format / test 2677 / count:check 一致 / build / bundle 首屏通过 / 自检 11 层 11 PASS）
- pre-push 钩子复跑 precheck → 通过
- **CI @ `5205370` → success（2m27s）**；**Deploy → success（34s）**

### 给下一棒

**第一优先 = 等 Planner 验收 #62 / #63**（in-review 积压 2）→ 队首 **#64**（M3 批次 3 热学定律 5 场景：heat-direction / perpetuum-mobile / adiabatic-compression / joule-electrical / energy-transformation；前两者沿用阶段 C 既有豁免结论——即判 C 留表写明理由，不迁）。
其后 **#65 → #66 → #107（D20 授权发布 dry-run 门禁）→ M4 #93–#97**。**勿领 #100–#104**（D19 已定夺不立项维持 parked）。迁移工作流不变：改渲染消费 `chartsOf`/`maxValues` → 豁免表销名 → 契约用例 +2/场景 → audit 批次节。

### 风险与注意事项

- **本棒未动引擎、未动 buildProblem**（严守 #63「本批不改引擎」）；thermistor/strain 若将来要升 A 全量曲线，需扩 buildProblem 采样域（`tempMin/tempMax`、`strainMin/strainMax`）——属场景配置改动，建议后续单列，勿混入迁移批。
- **photoresistor A 迁移后曲线显示域变化**：R-E 曲线 x 轴从固定 [0.1,1e5] 变为引擎采样窗 [0.01, max(5E,1e4)]（工作点 E 恒在窗内）。这是单一真源预期行为，工作点数值零漂移（T=25），T≠25 现与引擎一致（即修复点）。验收截图须知该曲线范围会变。
- **viz tsconfig `noUncheckedIndexedAccess: true`**：契约测试里对 `mv.xxx` 做算术要 `?? 0`（本棒踩过 `-mv.hallVoltage_mV`、`mv25.workResistance_Ohm * 0.5` 两处 TS18048）。
- **prettier + 源码契约耦合**：源码契约 `it` 断言读渲染源字符串；改完渲染先 `npx prettier --write` 再复跑契约测试，确认被断言的表达式未被重排。
- 端口 3000 被占（勿杀）；dev server 用 5199 strictPort；冒烟脚本 `SMOKE_BROWSER_CHANNEL=''`。
- 测试数真值 core 1125 / viz 1552 / total 2677（#63 后）。

### 给 Planner 的信号

- **in-review 积压 2**：#62（上棒）+ #63（本棒）待验收；两单验收标准逐条核对清单 + CI/Deploy 证据均在各自 issue 报告 comment。
- ready 队列：#64 → #65 → #66 → #107 → M4 #93–#97，继续执行即可；D19/D20/D21 均已定夺落盘，无 pending。
- 无新增决策事项、无 auto-discovered 立单（photoresistor 温度项漏算是**本批迁移即修复的双源点**，非新缺陷，已在报告/audit 记录，无需另立）。
