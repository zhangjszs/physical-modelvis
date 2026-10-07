# STATE

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-kerwin-20261007d`（**执行者·第十三棒**）· 本轮 #63 批次 2 完工转 in-review，待规划者验收
- 会话: 2026-10-07T12:26 UTC 领取 LOCK → 12:54 UTC 收尾
- 本轮代码 commit: `5205370` @ **main**（快进合并，临时分支 `agent/issue-63-batch2-sensors` 已删）；pre-push 钩子复跑 precheck 通过；**CI + Deploy @ 5205370 双 success**
- 脉络：M3 队首 #62 已 in-review（上棒）→ 本棒接 **#63**（批次 2 传感器元件 4 场景迁移落地，豁免表 17→13）——**in-review 积压 2（#62 + #63）待验收**

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
已释放（本轮收尾，无运行中实例）。

## 当前活跃
- **#63 in-review**（M3 批次 2 传感器元件 4 场景迁移，main `5205370`，报告 comment 在 issue，CI/Deploy success）
- 下一棒第一优先 = 等 Planner 验收 #62/#63 → 队首 **#64**（M3 批次 3 热学定律 5 场景，heat-direction/perpetuum-mobile 沿用阶段 C 既有豁免）→ #65 → #66 → #107 → M4 #93–#97。

## 已完成（本棒全程）
- **#63** 批次 2 传感器元件 4 场景迁移（thermistor/hall-effect/photoresistor/strain-gauge，无 C）：
  - thermistor（B）：实时 R 读 `maxValues.resistance`（与 NTC 回退式逐字同式）；R-T 曲线/温度计示意保留（引擎 x_t 域 [250,400] 窄于画面 [200,600]）；y_t 不消费 → 规避 PTC 缺失。
  - hall-effect（B）：V_H 读数读 `maxValues.hallVoltageAbs_mV`（幅值，匹配画面正显示；carrierType 恒 electron 使带极性键为负）；偏转/极性示意保留。
  - photoresistor（**A 全量 + B**）：R-E 曲线整条读 `charts.x_t`（含引擎温度修正）+ 工作点读 `maxValues.workResistance_Ohm`；**修旧渲染漏温度项真双源**；阈值线按实际绘制域重标定；回退含同源 TEMP_COEFF=0.02。
  - strain-gauge（B）：ΔU 读 `maxValues.deltaUMV`、ΔR/R 读 `maxValues.deltaROverR`（与回退式逐字同式）；ΔU-ε 曲线/形变示意保留（引擎 y_t 域 [±2000] 窄于画面 [±5000]）。
  - 全部经 #82 `chartsOf` 类型化层；豁免表 17→13；契约用例 +8（每景 2 例）；audit「M3 批次 2」节落盘。
- 测试数 core 1125 / viz 1552 / total **2677**（count:sync 回写 README + docs/plan.md）。

## 阻塞项 / 风险
- 无外部阻塞。**in-review 积压 2（#62 + #63）**待规划者验收。
- 工作树干净（分支合回删除后）。
- photoresistor A 迁移后 R-E 曲线 x 轴域变为引擎采样窗（预期单一真源行为，工作点数值零漂移）；验收截图须知。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`（本棒未改引擎，无需）。
- **管道退出码陷阱**：验证命令取真实退出码用 `${PIPESTATUS[0]}` 或去管道。
- **冒烟脚本通道已参数化（#98）**：本机跑 verify-*.cjs 用 `SMOKE_BROWSER_CHANNEL=''`。
- **viz tsconfig 开 noUncheckedIndexedAccess**：测试中对 `mv.xxx` 做算术需 `?? 0` 守卫（本棒契约用例踩过一次 TS18048：`-mv.hallVoltage_mV`、`mv25.workResistance_Ohm * 0.5`）。
- **prettier 对改动的 .ts 全量生效**：新写代码先 `npx prettier --write` 再 precheck；源码契约断言读渲染源，prettier 后须复跑契约测试确认字符串未被重排。
- **端口 3000 被本机其他项目占用**（勿杀他人进程）；dev server 用 `npx vite --port 5199 --strictPort`。
- 测试数真值 **core 1125 / viz 1552 / total 2677**（#63 后，count:sync 已回写）。
