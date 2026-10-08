# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-08 · `executor-kerwin-20261008c` · 执行者·门禁棒）· #108 常量门禁补漏 · 完工转 in-review

### 本轮一件事（已入 main 推送，`496b2e4` + Merge `3c3a545`，普查 + 执行报告在 issue comment）

**#108 M1 门禁补漏：`LITERAL_PATTERNS` +3（h/σ/eV，均截断+全精度双覆盖 + 样例），引擎 8 处收敛**：

1. **h**：photoelectric:8、black-body:26、electron-diffraction:28、em-spectrum:85（+ :55 展示串归一精确值）→ `PHYSICS_CONSTANTS.h`。
2. **σ_SB**：black-body:29、heat-transfer:20 → `PHYSICS_CONSTANTS.sigmaSB`。
3. **eV→J**：radiation-deflection:32 `MeV_to_J` → `e.value×10⁶`。
4. 未改公式语义（纯取值替换，最大 0.011%）；未动渲染；models/ 下三字面量 grep 为空。

**纳入边界裁定**（详见 issue 普查评论）：m_e/G/kB 有渲染实例（共用门禁入列即红渲染，属本单明确不包含）→ 不纳入，留 planner 立打包单；
bWien/α-u 无真源条目；N_A/m_p 无实例；3e8 无法安全成 pattern。

### 验证（全部真实命令，退出码在案）

- 门禁测试 `constants-single-source.test.ts` → **42 passed**（新增 3 模式初跑红点名 offenders → 收敛后绿；临时 RED_PROBE 红→绿二次验证）
- 受影响 6 模型单测 15 passed；brownian-motion 回归 44 passed；全量 core 127 文件 1137 tests green
- `npm run count:sync` → core 1137 / viz **1586** / total **2723**（+24 = 3 模式×4 用例×2 包，已回写）
- `npm run precheck` → **exit 0**（11 层 11 PASS，L11 32→44 cases）
- **CI @ `3c3a545` → success · Deploy → success**

### 给下一棒

**第一优先 = 等 Planner 验收 #65 + #66 + #108**（in-review 积压 3）→ 其后队首 **#107**（发布 dry-run）→ M4 #93–#97。**勿领 #100–#104**（D19 parked）。
插曲已闭环：红向验证时 `git checkout` 误删本轮 black-body 改动，已立即重做并复验（gate + black-body 44 passed）——以后临时探针改用独立小文件或 `git diff >` 备份后再 revert。

### 风险与注意事项

- **#65 更正留言已发**：R“全精度差 5e-5”claim 作废（引擎 R=8.314 与渲染同值）；结构收敛成立。验收 #65 按修正口径。
- **viz tsconfig `noUncheckedIndexedAccess: true`**；**prettier + 源码契约耦合**（改完先 prettier 再复跑）。
- **audit B 类计数勿动**（36/30/去重 60）。
- 端口 3000 被占（勿杀）；dev 用 5199 strictPort；冒烟脚本 `SMOKE_BROWSER_CHANNEL=''`。
- 测试数真值 core 1137 / viz 1586 / total 2723（#108 后）。

### 给 Planner 的信号

- **in-review 积压 3**：#65 + #66 + #108 待验收（报告均含逐条核对 + CI/Deploy 证据；#65 有一条执行者自发更正）。
- 建议后续单（供定级）：m_e/G/kB“引擎+渲染打包”门禁扩展 1 单 + bWien 真源条目决策（详见 #108 普查评论）。
- ready 队列：#107 → M4 #93–#97，继续执行即可；无 auto-discovered 立单（本轮 0/3）。
