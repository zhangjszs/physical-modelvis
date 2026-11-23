# PLAN

> Planner 当前快照 · 2026-11-23 · D77–D79（pending 清零）。任务权威：GitHub Issues（25 开放单）；TASKS.md 为本轮整体重写镜像。

## 当前方向

项目按 D72=A / D75=A 保持 **「先清零实证物理真源与 2D/3D 实验台缺陷，再依次演进沙盒与 UI」**。昨日（2026-11-22 23:39）规划收口并确认 D78=A 后，**2026-11-23 无新增 Executor 执行产出**（无 `2026-11-23` 日报，0 单 `in-review`，0 单 `in-progress`），远端夜间 `QA 场景巡检`（`#45084927394` @ `e7e987d`）保持 `success`。本轮维持 **M11 Wave 2（电磁+光学 4 单：`#179/#180/#181/#182`）** 今日队列不变，并前瞻完成 **M11 Wave 3 其余 2 单（`#187/#188`）** 的源码实证 4.2 预审补齐（至此 M11 剩余 8 单已全量完成源码预审，Wave 2 清零后 Wave 3 可无缝转 ready），同时记录今晨 `11:12` 工作区 IDE 自动保存复发新增 7 处脏改动提醒用户按 D78=A 清理。

## 今日目标（2026-11-23）

1. 完成 **M11 Wave 2 全部 4 单**（`#179` 光控开关 → `#180` 静电感应 → `#181` 双缝单缝加薄片 → `#182` 薄膜干涉 Fresnel 相对相变）并转入 `in-review`，将 M11 推向收官前夜（Wave 3 4 单 `#185/#186/#188/#187` 已全部完成 4.2 预审）。
2. 按已确认 **D78=A**，由用户自决工作区 4 处 Node `24→26` 改动并手动 `git restore` 9 处 IDE 自动保存脏改动（昨夜 2 处 + 今晨 `11:12` 新复发 7 处，含 `scene-rig-physics.test.ts` 被旧缓冲区删去 61 行 `#177` 回归测试）后执行 `git push`（推上本地领先的 `.agent/` 提交）；Agent 严格不触碰且不用 `--no-verify`。

## 当前 Milestone：M11 电磁/光学/热学/近代物理缺陷修复（进度：5 / 13）

> [Milestone 5](https://github.com/zhangjszs/physical-modelvis/milestone/5) · 已完成 5 单（`#170/#176/#178/#183/#184` CLOSED）+ 今日队列 Wave 2 4 单（`#179/#180/#181/#182` `ready-for-agent`）+ 剩余 Wave 3 4 单（`#185/#186/#187/#188` `open · P2`，均已完成源码 4.2 预审）。
> 上一阶段 **[M10（Milestone 4）](https://github.com/zhangjszs/physical-modelvis/milestone/4)** 已于 2026-11-22 达成 **8 / 8 CLOSED** 收官。

### 目标与验收

- 力学/热学收尾缺陷全部清零：`#170`（弹簧振子 ✅）、`#176`（卡文迪什/微小形变 ✅）、`#178`（外切摩擦轮 ✅）、`#183`（液体混合双零 ✅）、`#184`（热传递终态 ✅）。
- 电磁与波动光学 4 单完成「物理公式正确 + 2D/3D 消费引擎单一真源 + 回归覆盖」：`#179`（光控开关 D69=A）、`#180`（静电感应硬守恒）、`#181`（双缝单缝加薄片 D70=A）、`#182`（薄膜干涉 Fresnel 相对相变）。
- 近代物理与波动采样 4 单（Wave 3：`#185/#186/#188/#187`，均已完成 4.2 预审）在 Wave 2 推进验收后转 ready 清零。

### 完成信号（Success signal）

- M11 全部 13 个关联 Issue 经 Planner 独立验收后 **CLOSED（13 / 13）**，且 `main` 上 `npm run precheck`、GitHub CI / Deploy 与夜间 `QA 场景巡检` 全绿。

### 明确非目标（Non-goals）

- 本 Milestone 不开展 M12（`#192–#203`）、`#191`（#166 P1 可控放置）、`#171`（Sandbox M0 共享器材契约）、`#189`（UI/UX 赛博改版）与 `#167`（P3 CI 安装步重试）；不动 `#44`（D44=B 冻结）。
- `#179` 不顺手改 `circuitRig` 其他电路阻值映射（归 `#199`）；`#180` 不改 `electrostatic-shielding`（归 `#198`）；`#181/#182/#188` 不改 `waveOpticsRig` 光栅参数映射/水波衍射量纲（归 `#202`）。

### 执行队列（2026-11-23，共 4 项 · 全部属 M11 Wave 2 · `ready-for-agent`，全仓 P1 总数 = 4）

1. **#179**（`priority:P1` · `ready-for-agent`）：按 D69=A 以分压 `V_B>=VbeOn` 为唯一开关真源，移除无效 `threshold` 滑块改示只读等效临界照度 `L_crit`（默认校准至 ~10 lx），对 `L=0` 设有限暗阻上限消除 `NaN`，同步 2D/3D 与 `single-source-contract`
2. **#180**（`priority:P1` · `ready-for-agent`）：将孤立中性导体 `q_near + q_far = 0` 设为硬不变量纳入 `conservedQuantities`，改用量纲明确的感应电荷（`μC`）与有界箔片张角（`[0°, 90°)`），同步 2D/3D 消费引擎真源
3. **#181**（`priority:P1` · `ready-for-agent`）：按 D70=A 将双缝干涉薄膜模式改为「单缝前插透明薄片」`Δ_opt=(n-1)t`，使 `intensityCurve` 与 2D/3D 条纹同步平移（保持 `Δy` 不变），预设改名「单缝加薄片」并更新 `interference.test.ts`
4. **#182**（`priority:P1` · `ready-for-agent`）：以两界面真实 Fresnel 复振幅 Airy 反射率与相对半波损失判据 `hasRelativeHalfWave = (r1·r2)<0` 取代无条件 `+λ/2`，修复 2D `drawThinFilmScene` 读错 `refractiveIndex` 及硬编码「空气 n=1」并同步 3D 标牌

## 已知阻塞与依赖

- **工作区 13 处未暂存改动与 IDE 自动保存再复发（D78=A 已确认）**：
  - 2026-11-22 11:15 用户工作区 4 处 Node `24→26` 改动（`.github/workflows/{ci,deploy,qa-sweep}.yml` + `mise.toml`，涉及 §1.10 CI/CD 红线）。
  - 2026-11-22 23:18（2 处：`heat-transfer.ts`、`thermodynamicLawScenes.ts`）+ **2026-11-23 11:12 新复发（7 处：`newton-tube.ts`、`orbital.ts`、`newton-tube.test.ts`、`orbitalRig.ts`、`chapter2Scenes.ts`、`rigs-build.test.ts`、`scene-rig-physics.test.ts`——后者被旧缓冲区再次删去 61 行 `#177` 回归测试）**，合计 9 份 `.ts` 脏改动持续拦截 `format:check`、`guard-dist-freshness`、`git pull --rebase` 与 `.husky/pre-push`（本地 `main` 领先 `origin/main` 均为 `.agent/` 规划提交）。
  - 严格执行 **D78=A**：由用户自决 4 处 Node `24→26` 并手动 `git restore` 上述 9 份 `.ts` 噪声、关闭冲突自动保存/旧标签页后执行 `git push`；Agent 严格不触碰且不用 `--no-verify`。
- **M12 排程顺位（D75=A 已确认）**：[Milestone 6 (M12, 12 单)](https://github.com/zhangjszs/physical-modelvis/milestone/6) 排在 M11 清零后执行（`#198` 排 `#180` 后、`#199` 排 `#179` 后、`#202` 排 `#181/#182/#188` 后防同文件冲突）。
- **#191 / #171 / #189（D72=A）**：维持 `blocked`，待 M11/M12 清零后按 `#191 → #171（先出 RFC）→ #189` 推进。
- **#167（D71=A 局部授权 1.10）**：仅授权给 `ci.yml`/`qa-sweep.yml` Playwright 安装步加 3 次退避重试，作 `P3` 后置排期。
- **#44**：`blocked · parked`（D44=B 冻结，React 19 暂缓）。
- **远程已合并旧分支**：`origin/agent/issue-95-shadow-adaptive` 与 `origin/agent/issue-96-default-on-grid` 按契约 §1.9 保留不代删。

## 下一阶段

- M11 Wave 2（4 单）执行与验收 → **M11 Wave 3（4 单：`#185/#186/#188/#187`，均已完成 4.2 预审）** 转 ready 收官 M11（13/13）→ **[M12（12 单，D75=A）](https://github.com/zhangjszs/physical-modelvis/milestone/6)** 清理增补物理引擎与 3D 实验台参数失配/误绑缺陷 → **#167**（P3 CI 安装步重试）→ 按 **D72=A / D75=A** 推进 **#191（#166 P1）→ #171（Sandbox M0 阶段 A 设计 + 平抛纵切）→ #189（UI/UX 改版）**。

## 已放弃 / 暂缓的方向

- React 19 自动升级（D44=B 冻结 `#44`）
- `#103` 派生大重构（D31 暂缓）
- 组合台交互探针强制接入 `ci.yml`（D62=A 不接入）

## 给 Executor 的指令

按 `#179 → #180 → #181 → #182` 顺序领取并严格对照各 Issue 最新 Planner 4.2 定型评论实施；按已确认 **D78=A** 严禁触碰工作区 13 处未暂存改动（4 处 Node `24→26` + 9 处 IDE 脏改动），如用户尚未清理导致 `pre-push` 仍被阻断按 §1.9 留本地并记录，绝不用 `--no-verify`。
