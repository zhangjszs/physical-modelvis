# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-kerwin-20261007b`（**执行者·第十一棒**）· 本轮 #92/#82 两单连做完工转 in-review，待规划者验收
- 会话: 2026-10-07T14:21 本地开始 → 15:2x 收尾
- 本轮代码 commit: `180261d`（#92）/ `7b93cda`（#82）；merge 后 main `8d7293e` / `fc083a3`，两分支均已合回推送删除
- 脉络：M3 队首 #92 参数域边界门禁落地（+存量 3 处失配修复）→ #82 B1 charts 类型化访问层落地（31 模型登记表 + 9 处存量强转全迁移）——**M3 前置双单全部完工，#62–#66 开工条件就绪，in-review 积压 2 待验收**

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
已释放（本轮收尾，无运行中实例）。

## 当前活跃
- **#92 in-review**（参数域边界静态门禁，main `8d7293e`，报告 comment 6032502633，CI/Deploy success）
- **#82 in-review**（B1 charts 类型化访问层，main `fc083a3`，报告 comment 6032996248）
- 下一棒第一优先 = 等 Planner 验收 #92/#82 → 规划者摘除 #62–#66 的 blocked 标签后按批迁移
  （每迁一景：改渲染消费引擎 chartsOf → 从 EXEMPTION_TABLE 销名 → 补契约用例）。

## 已完成（本棒全程，≤10 条）
- **#92** 场景参数域×引擎域边界静态门禁 — L2 既有 validate it 内并入边界段：全场景×全参数
  min/max → buildProblem → 对 **problem.model**（collision 动态模型口径）validate，
  PARAMETER_OUT_OF_RANGE/NON_FINITE_PARAMETER 即红并点名 sceneId.param=edge。
  红基线恰好 3 处与 D16 普查逐字吻合；存量修复 audioFreq max 200→20、epsilon min 0.01→**0.2**
  （0.1 经 *1e-21 浮点转换落引擎域外，新发现）、magnetic-force.q min −10→0.1（裁决：场景对齐，
  引擎 |q| 无符号语义，不放开引擎负值，理由在 issue 报告）。豁免表空；红→绿反向验证在案。
  `180261d`/`8d7293e`。
- **#82** charts 类型化访问层 B1 — 引擎新增 `types/chart-registry.ts`：MODEL_CHART_KEYS 登记表
  （31 模型 = M3 五批 22 场景模型 + 存量强转 9 场景模型；键集经 123 场景 solve 探针 + 源码复核）
  + `chartsOf`/`getChart`（satisfies 编译期保证登记键 ⊆ 协议键；缺 meta 畸形 result 容错回退）。
  渲染层 9 处 charts 强转全部迁入新 API（含 AGENTS.md 陷阱原型的 lc-oscillator 键映射入注释）；
  真实性守卫（全场景 solve：实际产出 ⊆ 登记）+ 引擎单测 6 it（@ts-expect-error 错键名演示常驻化，
  编译期红→绿证据：TS2345 malus_curv）。#61 守卫兼容，bohr 源码断言同步新语法。`7b93cda`/`fc083a3`。
- 测试数 core 1125 / viz 1534 / total **2659**（count:sync 回写）。
- CI/Deploy：`8d7293e` success；`fc083a3` 收尾时确认（见 HANDOFF 验证节）。

## 阻塞项 / 风险
- 无外部阻塞。**in-review 积压 2（#92/#82）**——验收后请规划者摘除 #62–#66 的 blocked 标签。
- **带外单 #107**（publish dry-run CI 门禁，ready-for-agent）不在 PLAN 队列且领域涉 CI/CD、
  关联 needs-info 的 #99——本棒未领，已在 #92 报告向规划者报告，待确认是否入图。
- #44 人类持有勿动。工作树干净。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`。
- **管道退出码陷阱**：验证命令取真实退出码用 `${PIPESTATUS[0]}` 或去管道（本轮又踩一次：npm run
  typecheck 管道接 tail 后 `$?` 量到 tail）。
- **heredoc 单引号不展开变量**：写 LOCK 用 printf + 变量（本轮开局踩过：LOCK 里写进了字面 `$(date)`）。
- **gh 命令链中 printf 重定向用绝对路径**——工作目录可能停在子包（本轮 cd physics-core 后
  `.agent/LOCK` 相对路径失败一次）。
- 端口 3000 被占（weibo 项目勿杀）；dev server 用 5199 strictPort；e2e 泄漏进程查 5199/9201/3021/3022。
- 测试数真值 **core 1125 / viz 1534 / total 2659**（#82 后，count:sync 已回写）。
