# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮概要

2026-11-23 晚间执行会话串行清空今日队列 **M11 Wave 2 全部 4 单（`#179`、`#180`、`#181`、`#182`）**。因主工作区按 **D78=A** 保留 13 处未暂存改动（4 处 Node `24→26` + 9 处 IDE 自动保存脏 `.ts`）严禁触碰，本轮全程使用基于 `main` 的干净临时 `git worktree` 完成每单独立开发、格式化、`count:sync`、全量 `npm run precheck` 验证、合入 `main` 与推送 `origin/main`（收尾已清理临时 worktree，主工作区 13 处未暂存文件零触碰）。4 单均已留下完整 §1.7 执行报告并转为 `in-review`，全仓测试数从 `3260` 增至 **`3275 = physics-core 1236 (130 files) + visualization 2039 (82 files)`**。

## 已完成

- **#179 光控开关阈值失效与 `L=0` NaN 修复（D69=A）**（`in-review`）：`LightControlSwitchModel` 改为有界饱和幂律 `computeRldr(L)` + 解析反解 `computeCriticalLux`，`lightIntensity` 下限放宽至 `0` 消除 `Infinity/NaN` 并校准默认 `L_crit = 10 lx`，24h 曲线与轨迹统一复用 `computeRldr`；场景移除无效 `threshold` 滑块；2D `drawLightControlSwitchScene` 与 3D `circuitRig` 光控分支统一消费引擎 `maxValues` 与只读 `L_crit`（未触碰 `#199` 其他电路场景）。commit `c5d3c9b`（merge `ed41abb`）+ 移除误提交 worktree 符号链接补丁 `b1a1b95`（merge `8334e7e`），已推送；远端 CI `#45202630579` & Deploy `#45203431777` `success`。
- **#180 静电感应近远端电荷硬守恒与箔片张角物理量纲修复**（`in-review`）：`ElectrostaticInductionModel` 废弃 `INDUCTION_K=1e9` 不守恒倒平方公式，改为有界无量纲感应系数 `η ∈ (0, 1)` 与孤立中性导体等量异号电荷重分布（`q_near + q_far === 0` 写入 `conservedQuantities`，误差 `< 1e-12`），箔片张角改为有界饱和 `arctan` 模型 `θ ∈ [0°, 90°)`（默认 `~28.5°`），支持正/负/零 `chargeC`，场强比与电荷比分离；2D `drawElectrostaticInductionScene` 与 3D `electroscopeRig` 感应分支统一消费引擎真源（未触碰 `#198` `electrostatic-shielding`）。commit `c7306be`（merge `1975133`），已推送；远端 CI `#45203959073` & Deploy `#45204717457` `success`。
- **#181 双缝干涉改为单缝前插透明薄片相移闭环（D70=A）**（`in-review`）：`InterferenceModel` 移除双程 `2nd` 反射公式，改为单缝前插透明薄片 `Δ_opt = (n - 1)t` 与 `Δ_total = d·x/L - Δ_opt`，`intensityCurve`/`fringeOrderCurve`/`keyframes`/`fringes` 同步向插片侧平移 `x_shift = Δ_opt·L/d`（`Δy` 严格不变），输出 `fringeShiftMm`/`filmOpticalPathDiffUm`/`filmShiftOrders`；场景预设改名「单缝加薄片」；2D `drawInterferenceScene` 与 3D `waveOpticsRig` `interference` 分支绘制薄片并同步平移条纹（未触碰 `#202` 光栅/水波）；替换 `interference.test.ts` 旧断言。commit `1cca239`（merge `f391144`），已推送；远端 CI `#45205026446` `success`。
- **#182 薄膜干涉两界面 Fresnel 复振幅与真实相对半波损失**（`in-review`）：`ThinFilmModel` 移除无条件 `+λ/2`，采用两界面真实 Fresnel 带符号幅反射系数与 Airy 复振幅非偏振平均反射率 `R = ½(R_s + R_p)`（`0 <= R <= 1`，`d → 0` 精确收敛至空气/基底单界面反射率），以 `hasRelativeHalfWave = (r1·r2) < 0` 判定相对半波损失并修正半整数 `m` 判据与单界面退化；修复 2D `drawThinFilmScene` 读错 `params.refractiveIndex` 及硬编码「空气 n=1」与无条件半波损失标注；同步 3D `waveOpticsRig` `thin-film` 标牌（未触碰 `#202` 光栅/水波）。commit `021dd56`（merge `c4f556c`），已推送；远端 CI `#45206160714` 已触发。

## 未完成 / 进行中（下一棒最优先看这里）

- **进行中任务**：无（`in-progress` = 0，今日队列 `ready-for-agent` = 0）。
- **待 Planner 验收（共 4 单 `in-review`）**：M11 Wave 2 全部 4 单（`#179/#180/#181/#182`）。
- **M11 剩余待排（Wave 3 · 4 单 · 均已完成 Planner 4.2 预审）**：`#185`（β 射线偏转）、`#186`（衰变统计 `nTrials`）、`#188`（光栅角色散与缺级判据）、`#187`（AM 调制抗混叠双尺度采样）。

## 验证情况

- 4 单均在干净 `git worktree` 中独立完成：专项单测 + `npm run count:sync` + 完整 `npm run precheck`（`build:core` / `typecheck` / `lint` / `format:check` / `sweep:test` / `test` / `count:check` / `build:viz` / `check:bundle` / `check:publish` / `selfcheck` 11 层 11 PASS, 0 FAIL），均退出码 `0`。
- 最终测试数单一真源：**`3275 = physics-core 1236 (130 files) + visualization 2039 (82 files)`**（新增 2D/3D 回归集中于 `visualization/tests/rendering/m11-wave2-physics.test.ts`，未修改主工作区脏文件列表中的任何测试文件）。
- 远端 GitHub Actions CI（含 4 项 Playwright 浏览器探针）核对：
  - `#179`（`8334e7e`）：CI `#45202630579` `success` · Deploy `#45203431777` `success`
  - `#180`（`1975133`）：CI `#45203959073` `success` · Deploy `#45204717457` `success`
  - `#181`（`f391144`）：CI `#45205026446` `success` · Deploy `#45205962498` 运行中/收口中
  - `#182`（`c4f556c`）：CI `#45206160714` 已触发（收尾推送 `.agent/` 后将一并核查状态）
- 本地未执行项：本地 Playwright 4 项浏览器探针（已由远端 GitHub Actions CI 覆盖）。

## 风险与注意事项

1. **主工作区 13 处未暂存改动（D78=A，持续保留未触碰）**：4 处 Node `24→26`（`.github/workflows/{ci,deploy,qa-sweep}.yml`、`mise.toml`）+ 9 处 IDE 自动保存脏 `.ts` 文件仍原样保留在主工作区。建议用户自决 Node `24→26` 并手动 `git restore` 9 份 IDE 脏 `.ts` 后关闭旧编辑器标签页避免复发。
2. **#179 首次提交误含符号链接已正向修复**：`c5d3c9b` 因 worktree 下 `git add -A` 误将 `physics-core/node_modules` 与 `visualization/node_modules` 符号链接入库，已立刻通过正向提交 `b1a1b95`/`8334e7e` 从索引移除并恢复主工作区 `node_modules`（未重写历史）；后续 `#180/#181/#182` 均改用显式文件路径 `git add` 且 worktree 下 `node_modules` 改为真实目录，零复发。
3. 远程遗留分支 `origin/agent/issue-95-shadow-adaptive`、`origin/agent/issue-96-default-on-grid` 按 §1.9 保留不代删。

## 给下一棒的第一步建议

- **Planner**：验收 M11 Wave 2 全部 4 单（`#179/#180/#181/#182`）并确认远端 CI `#45206160714` 及最新 Deploy 全绿；随后将已完成 4.2 预审的 M11 Wave 3 4 单（`#185/#186/#188/#187`）转 `ready-for-agent` / `priority:P1` 入队，冲击 M11 13/13 收官。

## 今日日报

- 已写入 `.agent/DIARY/2026-11-23.md`。

## 给 Planner 的信号

- **需要 Planner 介入（队列已清空 + 集中验收）**：今日队列 4 单（`#179/#180/#181/#182`）全部完成并转 `in-review`，当前无 `ready-for-agent` 任务；请验收后下发 M11 Wave 3（`#185/#186/#188/#187`）。
