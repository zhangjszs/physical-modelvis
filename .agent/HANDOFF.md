# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-07 · `executor-kerwin-20261007b` · 执行者·第十一棒）· #92/#82 两单连做 · 全部完工转 in-review

### 本轮两件事（均已合回 main 推送，分支已删，执行报告在各自 issue comment）

1. **#92 参数域边界静态门禁**（`180261d` → main `8d7293e`，报告 comment 6032502633）
   - L2 `scene-contract.test.ts` 既有 validate it 内并入边界段（测试数零漂移）：全场景×全参数
     min/max（其余 default）→ buildProblem → 对 **`problem.model`** validate（collision 动态模型
     e=0 走 collision-inelastic 实证放行）→ PARAMETER_OUT_OF_RANGE/NON_FINITE_PARAMETER 即红，
     输出点名 `sceneId.param=edge(value)` + 引擎消息；buildProblem 边界抛错也记红（略强于 issue，防盲区）。
   - **红基线恰好 3 处**，与 D16 普查逐字吻合，无第 4 处暗雷。
   - 存量 3 处修复（场景域对齐引擎域）：
     - `em-wave-communication.audioFreq` max 200→20 kHz（引擎 ≤20000 Hz）；
     - `molecular-force.epsilon` min 0.01→**0.2**（issue 预设 0.1 经 `*1e-21` 浮点转换 =
       9.99e-23 < 1e-22 落引擎域外——本轮新发现，取 0.2 稳定居内，理由在报告歧义处理 1）；
     - `magnetic-force.q` min −10→0.1（**裁决：场景对齐，不放开引擎负值**——引擎全程 |q| 无符号
       语义、单区间域表达不了 q≠0、放开反而制造「电子模式」误导 UI，理由在报告歧义处理 2）。
   - 豁免表为空（软限程 6 模型 validate 自动放行）；红→绿反向验证在案（audioFreq 200 红 → 撤回绿）；
     UI 滑块仅边界收纳，default/画面/数值零变化。
2. **#82 charts 类型化访问层 B1**（`7b93cda` → main `fc083a3`，报告 comment 6032996248）
   - **方案 a 折中**（理由在报告歧义处理 1，不选 b：SimulationResult 加泛型波及面大）：
     引擎新增 `types/chart-registry.ts` —— `MODEL_CHART_KEYS` 登记表（**31 模型** = M3 五批
     22 场景模型 + 存量强转 9 场景模型；键集经 123 场景 default solve 运行时探针零失败 +
     源码复核条件产出键）+ `chartsOf(result, model)`（按模型 Pick 收窄，未登记模型回退全量）
     + `getChart(result, model, key)`（单键取值）。`satisfies` 编译期保证登记键 ⊆ 协议键；
     缺 meta 畸形 result 容错 undefined（延续「空结果回退不崩」契约）。
   - 渲染层 **9 处 charts 强转全部迁移**（em-induction/ac-current/em-damping/mutual-inductance/
     lc-oscillator/light-control-switch/liquid-crystal/bohr×2/sound-waveform）——issue 估 5 处，
     实扫多 4 处；归因纠正 3 次误判（详见报告歧义处理 3）。**lc-oscillator x_t/y_t/ke_t/pe_t →
     q/i/Ee/Em 的键名≠语义映射已入登记表行内注释**（AGENTS.md 陷阱的原型）。
   - 编译期红→绿证据：移除 `@ts-expect-error` → `TS2345: '"malus_curv"' is not assignable to
     '"malus_curve" | "multi_scan" | "polar_curve"'`；恢复 → 绿。已常驻为引擎单测 6 it。
   - 可视化守卫测试（+2 it）：全场景 solve 断言「实际产出 ⊆ 登记」（与 satisfies 双向夹逼）+
     真实 solve 集成消费。#61 守卫口径不受影响，bohr 源码断言同步新语法（issue 硬性要求 3）。

### 验证（全部真实命令，退出码在案）

- 两单各跑 `npm run precheck` → **exit 0**（typecheck 双包 / lint 0 错 19 既有 warn / format /
  测试 / count:check / build / bundle / 自检 **11 层 11 PASS**）
- #92 红基线 `npx vitest run tests/accuracy/scene-contract.test.ts` exit 1（3 处）；修复后 + 红绿
  反向验证均符合预期；门禁运行开销实测 ~17ms
- #82 编译期红向 exit 1（TS2345 错键名）→ 绿向 exit 0；accuracy 目录 853/853
- CI：`8d7293e`（#92）**CI success + Deploy success**；`fc083a3`（#82）CI in_progress，本棒收尾前
  等待其完成——**下一棒开工前先确认 `fc083a3` 的 CI/Deploy 结论，若由本次变更导致失败须修复**
- 测试数真值 core 1125 / viz 1534 / total **2659**（count:sync 已回写 README + docs/plan.md）

### 给下一棒

**第一优先 = 等 Planner 验收 #92/#82**（in-review 积压 2）。验收通过、#62–#66 摘除 blocked 后，
按批开工 M3 迁移（队首 #62 光学波动 5 场景）。每迁一景的固定动作：
改 draw 消费引擎（**用 `chartsOf(simulationResult, '<model>')` 新 API，键名有编译期检查**）
→ 从 `single-source-coverage.test.ts` 的 EXEMPTION_TABLE 销名 → 补契约用例 → 两道守卫自动把关。
注意：#62–#66 的 blocked 标签在规划者手里，**勿在标签未摘除时领取**；M4（#93–#97）按 PLAN 排在
M3 之后；#106 明示不入当前执行队列；#107 带外待规划者确认；M5（#100–#104）parked 勿领。

### 风险与注意事项

- **#82 真实性探针按 default 参数 solve**：非 default 分支产出的键靠源码复核兜底（thermistor.y_t
  仅 NTC 等条件键已核对入登记）；迁移时若发现「产出未登记」红报，把键补进 MODEL_CHART_KEYS 即可
  （每模型一行键清单 + 行内语义注释）。
- **#82 未登记模型行为与现状完全等价**（chartsOf 回退全量 charts）——迁移批次不需要一次性登记
  108 模型，用到哪个登记哪个。
- **AGENTS.md 陷阱条目已过时**（「类型定义不含这些键，访问需 as unknown as 强转」）：新代码应
  用 chartsOf/getChart；AGENTS.md 归用户/规划者维护，执行棒未越权改，已在 #82 报告建议改写。
- 端口 3000 被占（勿杀）；dev server 用 5199 strictPort；e2e 泄漏进程查 5199/9201/3021/3022；
  pkill 模式 `[x]` 转义；管道退出码用 `${PIPESTATUS[0]}`；heredoc 写 LOCK 用 printf。
- 测试数真值 core 1125 / viz 1534 / total 2659（#82 后）。

### 给 Planner 的信号

- **in-review 积压 2 待验收**：#92（参数域边界门禁 + 3 处存量修复，含 magnetic-force.q 裁决与
  epsilon FP 边界新发现）、#82（B1 类型化访问层，含方案选择理由与 9 处迁移明细）。两单均有
  完整验收标准核对清单与红→绿证据。
- **验收后请摘除 #62–#66 的 blocked 标签**——M3 迁移批次开工条件已全部就绪（#61 守卫 + #92 门禁 +
  #82 类型层）。
- **#107（带外）待确认**：publish dry-run CI 门禁，标 ready-for-agent 但 PLAN 无载，领域涉 CI/CD
  且关联 needs-info 的 #99（D20）。若属 #99 的安全切片，建议先在 PLAN/DECISIONS 落盘其与契约
  1.8 红线的边界再入队。
- ready 队列（按 PLAN 口径）：#62–#66（待摘 blocked）→ M4 #93–#97。继续执行即可，无新增决策事项。
