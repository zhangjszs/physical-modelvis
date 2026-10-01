# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-01 · `qoder-20261001T114739Z` · 执行者）

### 接手时状态
- main @ `0c38f43`（L4 组合实验台交互层），工作树干净，HEAD 与 origin/main 同步。
- **`.agent/` 不在工作区**：`6214cbd` 开源化清理把它移出跟踪并加入根 .gitignore。
  接力指令要求 `.agent/` 随仓库提交，故本轮恢复（见 STATE.md「接力载体恢复」）。
- GitHub issue 是最新事实源：M1 链（#51–#56）经 `gh issue list` 确认，#51 为唯一未 blocked 的 P1。

### 本轮做了什么
1. 环境探测 → 重建 `.agent/ENV.md`（主分支/命令链/gh 可用/mise PATH/Linux 用 `npx`）。
2. 恢复 `.agent/` 提交载体：删根 .gitignore 的 `.agent/` 行 + 建 `.agent/.gitignore`（仅排 `LOCK`）。
3. 认领并完成 **#51 [P1] 常量门禁漏洞**（commit `89910d1`）：
   - **先红**：`constants-single-source.test.ts` 电荷模式 `1\.602176634e-19` → `(?<![\d.])1\.6\d*e-19`，
     加 `#51 门禁模式自检`（6 模式×正/负样例=18 例）。实跑即捕获 7 个漏网文件。
   - **后绿**：7 文件 8 处内联电荷常量改为 `PHYSICS_CONSTANTS.e.value`，补 6 处 import（em-combined 已有）。
   - 未触碰 `MeV_to_J`(1.602e-13) / `h` / `m` 等**非电荷**常量（严格守 #51 范围）。
4. `npm run count:sync` 回写三处测试数（顺带校正 viz 既有漂移 1259/39→1278/41）。

### 验证结果（本轮实测，precheck EXIT=0）
- core 1107 全绿（+18）/ viz 1278 全绿（41 文件）/ total 2385；count:check「13 数字 3 标记一致」。
- 10 层物理自检全 PASS（L0–L6 + L8–L10），含 L1 守恒律 16 例、L9 跨场景鲁棒 694 例。
- check:bundle 首屏体积通过（vendor-physics 157kB 不在入口 chunk，未触及 70kB 门禁）。

### 数值影响（务必知悉，非回归）
- `1.602e-19 → 1.602176634e-19`（+0.011%）；`1.6e-19 → 全精度`（+0.125%，仅缺省电荷回落路径）。
- 这是**修正系统性偏低**（正是 #51 目标）；未改任何测试容差，全量测试 + 10 层自检全绿即容差内一致。
- 若后续 viz 快照/期望值因这 ~0.1% 变化需更新，属预期 → 按新引擎值重录，**勿放宽容差**。

### 下一步建议（按优先级）
1. **P1 关键路径**：#52（渲染层 24 处内联常量收敛到常量模块）已解 blocked，可开工。
   ⚠️ #52 issue 已记：若让渲染层对 physics-core 做**值** import，可能把 vendor-physics(157kB gzip) 拖进首屏，
   直接击穿 #42 的 70kB 门禁 —— **先测体积再落地**（必要时用 type-only 或本地镜像常量）。
   #52 关闭后：解 #53（门禁+自检 10→11 层，需同步 7 处文档 + CI 步骤名，参考 commit e91b900）与 #54。
2. **可并行 P2（未 blocked）**：
   - #55：B 类场景清单数字修正（34→37 / 13→30 / 去重 61）+ 61 场景常量单位核对（docs/核对）。
   - #56：3D 基础层收口（接口归属 / 自检接入 / 2D-3D 边界文档）。**前置已满足**，直接可做，范围不含重实现三层。

### 不要做的事
- 不重试 React 19 / 不为它上调 bundle 预算（#44 保持 open，会掏空 #42 门禁意义）。
- 不动 PR #23 / #25（他人，9 月下旬起无更新）。
- 不做文档数字漂移批量清理（#46–#50 已扫尽，只剩历史快照 CHANGELOG/plan.md 日期段/docs/archive 与冻结归档）。
- 代码 commit 与 `.agent/` commit 分开（类型 chore(agent)，绝不混在一个 commit）。
- `blocked` 标签摘除：正常属规划者；本轮因无独立规划棒、为保接力连续，已代摘 #52。
  下一棒若沿用执行者角色，摘除前先核对上游 issue 确已 CLOSED，避免误解。

### 环境备注
- 跑 npm/npx/node 前：`export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`（非 `npx.cmd`）。
- **沙箱陷阱（重要）**：后台（bwrap）执行会把 `/` 只读挂载，vitest 写 `/tmp/*\/ssr` 失败 →
  "126 files failed / no tests" 假红。跑 precheck/test/selfcheck 用**非只读沙箱**（required_permissions=all）即可全绿。
- pre-push 钩子跑全量 precheck，红则挡 push。本轮 push 亦需在有可写 /tmp 的环境（否则钩子内 precheck 会因上面的沙箱问题假失败）。
