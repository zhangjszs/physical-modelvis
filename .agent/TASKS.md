# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 2026-10-16 · 三十一次滚动 · 规划者整体重写）。标签映射：`ready-for-agent` ≡ ready；
> `closed` ≡ done。本文件只读镜像，执行者改状态时先改 Issue 再同步本行（冲突以 Issue 为准）。

## 今日队列（执行顺序，4 个 · 全部 ready-for-agent）

- [ ] #127（P3 · type:chore/area:ci · **ready**）pre-push 归档路径改良：沙箱 `/tmp` 只读时不丢证据（承接 #122 观测机制）
  —— 来源 = #125 棒 executor-20261015a 报告 auto-discovered；本轮 31 次滚动定级 P3 ready 入队首
  —— 验收要点：`.husky/pre-push` 归档主路改 `.scratch/` 仓库内 + `TMPDIR` 不可写显式警告 + 非沙箱行为不变 + `precheck` exit 0 + 未用 `--no-verify`
  —— 明确不包含：不改 `.github/workflows/`（1.10 红线）；不改 `npm run precheck` 语义；不新增第三方依赖
  —— 依赖：无（#122 CLOSED，观测机制已在 main）
- [ ] #128（P3 · type:chore/area:render · **ready**）FormulaPanel 光敏电阻条目对齐指数式与引擎/画布同源（承接 #125 单一真源）
  —— 来源 = #125 棒 HANDOFF 信号 ④ + DIARY「未解决（越范围）」；本轮 31 次滚动 Planner 承接立单
  —— 验收要点：`grep -rn "R₀.*\^.*−α" visualization/src` = 0（本轮实测现况 = 2 命中，均在 FormulaPanel.tsx:830/835）+ 新式在位 + 红/绿守卫 + `typecheck`/`precheck` exit 0 + count:sync（若测试数变化）
  —— 明确不包含：不改引擎 `photoresistor.ts` explanation；不改其他场景 FormulaPanel 条目；不做 FormulaPanel 数据结构外迁（D31 暂缓）
  —— 依赖：无（#125 CLOSED 三十一次滚动）
- [ ] #129（P3 · type:docs · **ready**）AGENTS.md 关键陷阱节补 extra/meta 访问守卫口径（与 #82 charts 那条并列）
  —— 来源 = #124 棒 executor-20261015a 报告「给 Planner 的信号 ③」；本轮 31 次滚动 Planner 承接立单
  —— 验收要点：AGENTS.md 新增一条 bullet 与 #82 同层级 + 明确「禁新添 as unknown as」/「走 engineExtraAccess 守卫」/「支点测试 = typed-extra.test.ts」三要素 + `precheck` exit 0 + commit 含 `Refs #129`
  —— 明确不包含：不动代码守卫；不改 #82 现有文字；不做「全量文档审计」
  —— 依赖：无（#124 CLOSED 三十一次滚动，`engineExtraAccess.ts` 与守卫测试已入库）
- [ ] #126（P3 · area:render · **ready**）[auto-discovered] 一次性泛型化 `Rig<H>`，收口 3D rig handles 225 处双向强转
  —— 来源 = #124 验收发现的 225 处 handles 残留；用户 2026-10-16 明确选择 D36 方案 A，授权触及契约 1.10 的大规模重构
  —— 范围：84 个受影响文件；收口 `build` / `updateEquipment` / `applyHandles` 的具体 handle 类型；3 处调试挂载、材质取值、组合台参数取值不自动并入
  —— 验收要点：rigs 目录 handles 双向 `as unknown as` 清零；错误 handle key 红向类型探针确实失败；build→updateEquipment 回归与 rigs 定向测试全绿；precheck/count:check 全绿
  —— 明确不包含：不改 physics-core 公共 API、WebGL 生命周期、`.github/workflows/`；若边界不足转 `needs-info`，不得自行改成方案 B
  —— 依赖：#127 → #128 → #129 完成后再领取

## 本轮关闭（done，三十一次滚动验收通过 · 2026-10-16）

- [x] #124（P3）渲染层 extra/meta 四处 as unknown as 类型化收口 —— 4 目标站点全消解（本轮 `grep src/rendering` = 0）；
  新守卫 `engineExtraAccess.ts` + 14 例测试在位；CI/Deploy @ `3f44b7b`/`4346efe` success。
  **验收口径修订**（Planner 单内自纠）：原第 1 条「`visualization/src` 零命中」与「背景/实现范围/明确不包含」的 4 站点范围相矛；
  本轮 comment 修订为「4 目标站点逐一消解 + `src/rendering` 子目录零命中」（实测达成）。余 225 处属 rig handles → 新 D34 pending
- [x] #125（P3）光敏电阻面板公式与计算式对齐（选 A 补温度项）—— 三处均在位（面板公式 / 信息条 / 参数回显行，本轮直读源码复核）；
  `TEMP_COEFF=0.02` 与引擎 `photoresistor.ts:72` 同源；新测试 4 例（红/绿已验）+ 浏览器探针 209.8 px；CI/Deploy @ `532f239`/`a67e6e5` success。
  FormulaPanel 同场景另一处幂律 → 新立 **#128**；引擎 explanation 文案 → 归遗留观察未立单

## 已确认决策

- **D31（2026-10-16 default 转正）**：#103 派生三张大规模重构实施单暂缓，不进 ready；Executor 不得自取。
- **D34/D36（2026-10-16，用户答复）**：#126 选择方案 A，一次性泛型化 `Rig<H>`；已解除 `needs-info` 并进入 ready，排在 #127 → #128 → #129 之后。
- 当前无 pending 用户决策。

## 候选 / parked（不执行）

- #100（P2）/#101（P3）—— ready-for-agent 但维持 parked（D19；D29 仅放行调查类，三单已 CLOSED）
- #99（P2）/#105（P3）—— needs-info（D20/D21：真实发布暂缓、英文随发布走）
- #44（P2）—— 人类持有，勿动
- 候选（未立单）：新增模型触点收敛 / 自动注册调查（#104 §5.4）；#122 根因单（待下次抖动带 `.scratch/pre-push-failure-*` 归档出现时立）；
  引擎 `photoresistor.ts` `explanation.steps[].formula` 补温度项（本轮归入遗留观察，未立单）

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· needs-info（需决策）；closed = done
- 本仓库沿用 `ready-for-agent`（历史约定），不引入新 `ready` 标签，避免执行侧识别断裂
- 本仓无 `priority:P4` 标签（P3 即最低）
