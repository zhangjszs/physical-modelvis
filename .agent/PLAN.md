# PLAN

> Planner 当前快照 · 2026-11-19 · D74–D76。任务权威：GitHub Issues（33 开放单）；TASKS.md 为本轮整体重写镜像。

## 当前方向

项目按 D72=A 保持 **「先清零实证物理真源与 2D/3D 实验台缺陷，再依次演进沙盒与 UI」**。本轮已独立验收关闭 **M10 Wave 1 全部 5 单（`#166/#169/#172/#173/#190`）**，将 M10 推进至 **5 / 8**；完成 **M10 Wave 2 全部 3 单（`#174/#175/#177`）** 的 4.2 门禁定型并下发今日可执行队列；全量分拣 2026-11-18 审计增补的 12 个缺陷（`#192–#203`）收编至新建 **M12（12 单）**。

## 今日目标（2026-11-19）

1. 完成 **M10 Wave 2 全部 3 单**（`#174` 牛顿管 → `#175` 卫星轨道 → `#177` 牛顿第三定律）并转入 `in-review`，为次日验收实现 **M10 8/8 收官**。
2. 解除工作区 2 处 00:45 格式化/BOM 脏改动（`collisionRig.ts`、`chapter5Scenes.ts`，见 D74）对 `format:check` 与 `.husky/pre-push` 的阻断，使滞留本地的 `.agent/` 收尾与规划提交顺利推送远端。

## 当前 Milestone：M10 核心物理真源与沙盒缺陷修复（进度：5 / 8）

> [Milestone 4](https://github.com/zhangjszs/physical-modelvis/milestone/4) · 已完成 5 单（`#166/#169/#172/#173/#190` CLOSED）+ 剩余 Wave 2 3 单（`#174/#175/#177` `ready-for-agent`）。

### 目标与验收

- 组合实验台 P0 选中交互通过真实 WebGL 浏览器探针（`#166` ✅），参数校验/求解失败清除旧轨迹并停播（`#190` ✅）。
- 斜面运动（`#169` ✅）、竖直圆周（`#172` ✅）、平抛碰撞（`#173` ✅）、牛顿管（`#174`）、卫星轨道（`#175`）、牛顿第三定律（`#177`）全部完成「物理公式正确 + 2D/3D 消费引擎单一真源 + 单测/回归覆盖」。

### 完成信号（Success signal）

- M10 全部 8 个关联 Issue 经 Planner 独立验收后 **CLOSED（8 / 8）**，且 `main` 上 `npm run precheck`、`verify-composition-interaction.mjs`、GitHub CI / Deploy 与夜间 `QA 场景巡检` 全绿。

### 明确非目标（Non-goals）

- 本 Milestone 不开展 M11（`#170/#176/#178–#188`）、M12（`#192–#203`）、`#191`（#166 P1 可控放置）、`#171`（Sandbox M0 共享器材契约）、`#189`（UI/UX 赛博改版）与 `#167`（P3 CI 安装步重试）；不动 `#44`（D44=B 冻结）。

### 执行队列（2026-11-19，共 3 项 · 全部属 M10 Wave 2 · `ready-for-agent`，全仓 P1 总数 = 3）

1. **#174**（`priority:P1` · `ready-for-agent`）：新增专用 `newton-tube` 双体物理模型（硬币自由落体 + 羽毛真空同落/空气线性阻力 $v_t=1.6\text{ m/s}$，落地截断，登记 `chart-registry.ts`）并让 2D/3D/HUD 统一消费双体轨迹真源
2. **#175**（`priority:P1` · `ready-for-agent`）：为 `orbital` 接入 `centralRadius` 不可穿透边界首次触地二分插值截断（`flags.impacted` + `触地碰撞` 关键帧），2D/3D 同步绘制截断路径与坠地告警（不改安全轨道）
3. **#177**（`priority:P1` · `ready-for-agent`）：将 `newton-third-law` 的 `allowMotion=1` 修正为自由双体内力运动（`a_A=-F_AB/m_A, a_B=F_AB/m_B`，总动量守恒，相向靠拢接触停于质心不穿透），同步 2D/3D 双体轨迹消费与测试

## 已知阻塞与依赖

- **工作区脏文件阻断 `pre-push`（D74 pending，第 1 天询问）**：`mise.toml`（`node = "22"` → `"24"`）与 2026-11-18 00:45 产生的 `visualization/src/components/simulation3d/rigs/collisionRig.ts`、`visualization/src/rendering/chapter5Scenes.ts`（格式/BOM 差异）导致 `npm run format:check` 失败并拦截 `.husky/pre-push`（按契约 Agent 不触碰且不用 `--no-verify`，本地 `.agent/` 提交暂留待清理后推送）。
- **M12 排程顺位（D75 pending，第 1 天询问）**：2026-11-18 增补 12 单（`#192–#203`）已收编至 [Milestone 6 (M12)](https://github.com/zhangjszs/physical-modelvis/milestone/6)；默认按 **M10 → M11 → M12 → #191 → #171 → #189** 串行收口（`#198` 排 `#180` 后、`#202` 排 `#181/#188` 后防同文件冲突）。
- **#191 / #171 / #189（D72=A）**：当前维持 `blocked` 等待前置物理缺陷清零后再按 `#191 → #171（先出 RFC）→ #189` 推进。
- **#167（D71=A 局部授权 1.10）**：仅授权给 `ci.yml`/`qa-sweep.yml` Playwright 安装步加 3 次退避重试，作 `P3` 后置排期。
- **#44**：`blocked · parked`（D44=B 冻结，React 19 暂缓）。
- **远程已合并旧分支**：`origin/agent/issue-95-shadow-adaptive` 与 `origin/agent/issue-96-default-on-grid` 继续按契约 §1.9 保留不代删。

## 下一阶段

- M10 验收 8/8 收官 → **[M11（13 单）](https://github.com/zhangjszs/physical-modelvis/milestone/5)** 清理电磁/光学/热学/近代物理缺陷 → **[M12（12 单，按 D75 默认 A）](https://github.com/zhangjszs/physical-modelvis/milestone/6)** 清理增补物理引擎与 3D 实验台参数失配/误绑缺陷 → **#167**（P3 CI 安装步重试）→ 按 **D72=A** 推进 **#191（#166 P1）→ #171（Sandbox M0 阶段 A 设计 + 平抛纵切）→ #189（UI/UX 改版）**。

## 已放弃 / 暂缓的方向

- React 19 自动升级（D44=B 冻结 `#44`）
- `#103` 派生大重构（D31 暂缓）
- 组合台交互探针强制接入 `ci.yml`（D62=A 不接入）

## 给 Executor 的指令

按 `#174 → #175 → #177` 顺序领取并严格对照各 Issue 最新 Planner 4.2 定型评论实施；开工前先检查 `git status`，在用户未答复 D74 授权前勿回退或提交 `mise.toml`/`collisionRig.ts`/`chapter5Scenes.ts`（如 `pre-push` 仍被该两份脏文件阻断则按 §1.9 留本地并记录）。
