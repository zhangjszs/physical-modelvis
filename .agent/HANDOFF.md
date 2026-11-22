# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮概要

2026-11-22 晚间按用户明确指令「继续推进issue」，在未改写 `PLAN.md`/`DECISIONS.md` 的前提下沿既定路线图（D75=A：M10 → M11）串行推进 **M11 5 个实证物理缺陷单（`#170`、`#176`、`#178`、`#183`、`#184`）**，逐单独立建分支、实现、全量验证、合并入 `main`、推送至 `origin/main`（每次 `pre-push` 全量 `precheck` 全绿）、留完整 1.7 执行报告并转 `in-review`。全仓测试数从 `3237` 增长至 **`3260 = physics-core 1224 + visualization 2036`**。

## 已完成

- **#170 弹簧振子平衡位置关键帧速度文本误用 `v0`**（`in-review`）：`SpringOscillatorModel` 改用轴向有符号投影位移与帧内线性插值定位首次穿越平衡位置时刻与速度，文本消费 `Vec2.magnitude(velCross)` 与帧对象同源；新增 4 组回归单测。commit `5636563` / merge `d057d07`（已推送）。
- **#176 卡文迪什/微小形变光杠杆位移公式多乘 2**（`in-review`）：两同源模型统一 `Δspot = D·tan(2θ) ≈ 2Dθ`、`k = 2D/L` 与平面光屏 `2θ < π/2` 截断告警；2D（`drawCavendishScene`/`drawMicroDeformationScene`）与 3D（`cavendishRig`/`microDeformationRig`）收敛至优先消费引擎 `maxValues` 单一真源；补全公式边界与 2D/3D 哨兵回归。commit `234f8c5` / merge `1001a1c`（已推送）。
- **#178 摩擦轮接触传动反向旋转**（`in-review`）：`TransmissionBeltModel` 将 `friction` 改为 `direction=-1`、`ω₂=-(r₁/r₂)ω₁` 与外切默认中心距 `r₁+r₂`（接触点切向速度矢量严格相等、无 double negate），新增 `omega1Signed`/`omega2Signed`/`direction`；2D/3D 消费带符号角速度并对齐外切几何、转向与切点箭头。commit `42d3e7f` / merge `0039b51`（已推送）。
- **#183 液体混合双零体积收缩率 NaN 修复**（`in-review`）：按 Planner 评论 `#6951339087` 定型保留 `min=0` 空白态，`VTotal=0` 时置 `contractionPercent=0`、`flags.isEmpty=true` 并于关键帧/步骤/摘要及 2D/3D HUD 明确展示「无液体，收缩率不适用」（3D 隐藏液层），补齐 `(0,0)/(0,50)/(50,0)/(50,50)` 与极小体积无 NaN 门禁。commit `e644942` / merge `c2294ea`（已推送）。
- **#184 热传递终态关键帧 `t=0` 与温度误用环境值**（`in-review`）：`HeatTransferModel` 按当前模式输出主曲线与终态 `T(tMax)`，终态关键帧 `t=tMax`、`position=(tMax, TFinal)` 且明示环境温度为长期渐近值；辐射步进改为 O(N) 递增子步并钳制防过冲；示意轨迹保持初/终两点满足 K2 语义守卫；2D/3D 共同消费 `maxValues.finalTemp/finalTime`。commit `80bd329` / merge `5b525f8`（已推送）。

## 未完成 / 进行中（下一棒最优先看这里）

- **进行中任务**：无（`in-progress` = 0）。
- **待 Planner 验收（共 8 单 `in-review`）**：M10 Wave 2（`#174/#175/#177`）+ 本轮 M11 首批 5 单（`#170/#176/#178/#183/#184`）。
- **M11 剩余未领（8 单）**：`#179`（光控开关，D69=A 已确认）、`#180`（静电感应电荷守恒，Planner 已定型）、`#181`（双缝单缝加薄片，D70=A 已确认）、`#182`（薄膜干涉 Fresnel 相位，Planner 4.2 预审已补充）、`#185`（β 射线偏转，Planner 4.2 预审已补充）、`#186`（衰变统计 `nTrials` + 大 λ 稳定抽样，Planner 4.2 预审已补充）、`#187`（AM 调制抗混叠）、`#188`（光栅角色散 `1e-9` 与缺级判据）。

## 验证情况

- 5 单全部独立执行：对应引擎单测 + 可视化单测 + `npm run count:sync` + `npm run typecheck` + `npm run lint` + `npm run format:check` + `npm run count:check` + `npm run build:viz` + `npm run check:bundle` + `npm run selfcheck`（11 层全 PASS），均退出码 `0`。
- 5 单推送全部经由 `.husky/pre-push` 实跑完整 `precheck` 通过（退出码 `0`）。
- 最终测试数真值：**`3260 = physics-core 1224 (130 files) + visualization 2036 (81 files)`**。
- 未执行：本地 Playwright 浏览器探针（远端 GitHub Actions CI 在每次 push 后自动跑 4 探针）。

## 风险与注意事项

1. **工作区 4 处用户未暂存改动（严禁触碰）**：2026-11-22 11:15+08:00 产生的 `.github/workflows/{ci,deploy,qa-sweep}.yml` 与 `mise.toml`（Node `24` → `26`），全程绕开未暂存、未还原、未提交；涉及 CI/CD 流程（§1.10），须由用户自决。
2. **IDE 自动保存复发提醒**：本轮执行 `#184` 期间 `physics-core/src/models/heat-transfer.ts` 在 23:09:19 被外部自动保存重排格式，被 `guard-dist-freshness` 与 `format:check` 及时拦截，已重新 `prettier --write` + `build:core` 复验通过。后续棒仍须每次提交前核对 `git status` 与 `format:check`。
3. **本轮提前推进 M11 说明**：按用户明确指令「继续推进issue」在 Planner 尚未打 `ready-for-agent` 时推进了 M11 中需求/定型已明确的 5 单；未改写 `PLAN.md`/`DECISIONS.md`，未关闭任何 Issue。
4. 远程遗留分支 `origin/agent/issue-95-shadow-adaptive`、`origin/agent/issue-96-default-on-grid` 仍按 §1.9 保留不代删。

## 给下一棒的第一步建议

- **Planner**：验收 8 个 `in-review` 单（M10 Wave 2 `#174/#175/#177` 达成 M10 8/8 收官 + M11 首批 5 单 `#170/#176/#178/#183/#184`），核对远端 CI runs；随后将 M11 剩余 8 单（`#179/#180/#181/#182/#185/#186/#187/#188`）补齐/确认 `ready-for-agent` 标签并刷新 `PLAN.md`/`TASKS.md`。
- **Executor（若用户继续要求推进 M11）**：优先顺序 `#179`（D69=A 已确认）→ `#180` → `#181`（D70=A 已确认）→ `#182` → `#185` → `#186` → `#188` → `#187`（前 6 单均有用户/Planner 预审定型，边界清晰）。

## 今日日报

- 已追加写入 `.agent/DIARY/2026-11-22.md`（第四段：M11 首批 5 单 `#170/#176/#178/#183/#184` 推进实录）。

## 给 Planner 的信号

- **需要 Planner 介入（集中验收 + 队列刷新）**：当前已有 8 单处于 `in-review`（M10 Wave 2 3 单 + M11 5 单），请集中验收并正式下发 M11 剩余 8 单的 `ready-for-agent` 队列。
