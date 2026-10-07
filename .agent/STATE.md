# STATE

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-kerwin-20261007e`（**执行者·批次 3 棒**）· 本轮 #64 批次 3 完工转 in-review，待规划者验收
- 会话: 2026-10-07T13:52 UTC 领取 LOCK → 14:10 UTC 收尾
- 本轮代码 commit: `c82ec34` @ **main**（快进合并，临时分支 `agent/issue-64-batch3-thermo` 已删）；pre-push 钩子首跑 core vitest 抖动失败、复跑 `npm test` exit 0 后重试钩子通过；**CI + Deploy @ c82ec34 双 success**
- 脉络：#62/#63 已验收 CLOSED（十七次滚动，M3 进度 5/8）→ 十八次滚动治理轮（#64 质检 + charts 口径更新）→ 本棒接 **#64**（批次 3 热学定律，3 迁 B + 2 判 C，豁免表 13→10）——**in-review 积压 1（#64）待验收**；M3 进度将到 6/8

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
已释放（本轮收尾，无运行中实例）。

## 当前活跃
- **#64 in-review**（M3 批次 3 热学定律 3 迁 B + 2 判 C，main `c82ec34`，报告 comment 在 issue，CI/Deploy success）
- 下一棒第一优先 = 等 Planner 验收 #64 → 队首 **#65**（M3 批次 4 气体分子/静能/核 4 场景：gas-law / capacitor-charge / radioactive / liquid-mixing）→ #66 → **#108**（常量门禁补漏，新单，十八次滚动后入队）→ #107 → M4 #93–#97。

## 已完成（本棒全程）
- **#64** 批次 3 热学定律（joule-electrical/adiabatic-compression/energy-transformation=B，heat-direction/perpetuum-mobile=C）：
  - joule-electrical（B）：HUD P/Q/ΔT 读 `maxValues.powerW/workTotalJ/deltaT_K`（引擎 P=V²/R、W=P·t、ΔT=W/(M·c水)，c水=4184 同源）。
  - adiabatic-compression（B）：HUD T2 读 `maxValues.T2_K`（引擎 gamma 在侧，去渲染硬编码 gamma 漂移风险）。
  - energy-transformation（B）：有用/损耗读 `maxValues.Eout_J/Eloss_J`（引擎 Eout=Ein·η、Eloss=Ein−Eout）。
  - heat-direction / perpetuum-mobile（C）：保留豁免表，理由改写引用阶段 C 第 5 批「可保留」清单；未推翻（引擎 x_t/y_t 本画面不绘，Qdot/卡诺均无对应新序列）。
  - 全部经 #82 口径（charts 走 chartsOf，无 `as unknown as Record`）；豁免表 13→10；契约用例 +6（迁 B 的 3 景各 2 例）；audit「M3 批次 3」节；**C 两项以散文入 audit、不进迁移进展表行**（避免破 7 项例外差集）；audit B 类计数 36/30/去重 60 未动。
- 测试数 core 1125 / viz 1558 / total **2683**（count:sync 回写 README + docs/plan.md）。

## 阻塞项 / 风险
- 无外部阻塞。**in-review 积压 1（#64）**待规划者验收。
- **pre-push 钩子有测试抖动**：本棒首跑 core vitest 失败、复跑即过（非改动引入）。下一棒遇钩子首跑红先本地 `npm test` 复跑确认真伪，勿贸然 `--no-verify`。
- 工作树干净（分支合回删除后）。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`（本棒未改引擎，无需）。
- **管道退出码陷阱**：验证命令取真实退出码用 `${PIPESTATUS[0]}` 或去管道。
- **viz tsconfig 开 noUncheckedIndexedAccess**：测试中对 `mv.xxx`/`pts[i]` 做算术或取属性需 `?? 0` / `!` 守卫（本棒 `wp[wp.length-1]!.y`、`(mv.Eout_J ?? 0)+...`）。
- **C 场景与 #61 差集守卫**：判 C 的场景**不能**写成 audit 迁移进展表首列反引号行（否则入迁移集却无契约用例 → 破 7 项例外）；用散文列出即可。
- **prettier + 源码契约耦合**：改完渲染先 `npx prettier --write` 再复跑契约测试确认被断言字符串未被重排。
- **端口 3000 被本机其他项目占用**（勿杀）；dev server 用 `npx vite --port 5199 --strictPort`；冒烟脚本 `SMOKE_BROWSER_CHANNEL=''`。
- 测试数真值 **core 1125 / viz 1558 / total 2683**（#64 后，count:sync 已回写）。
