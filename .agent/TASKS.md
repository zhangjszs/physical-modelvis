# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮已同步 **2026-10-18 三十七次滚动**；`gh issue list --state open` 实拉，非记忆）。
> 昨日至今日队列 4 单（#137/#138/#139/#140）**全部验收 CLOSED**，in-review **清零**；今日队列 = **#141 → #142**（2 单）。
> **#44 由 `blocked` 转 `needs-info`**（技术前置已达成，但预算口径冲突待用户 D44 答复）；**#143 新建即为 `needs-info`**（CI 流程红线）。

## 今日队列（2026-10-18 · 三十七次滚动 · 执行顺序，2 个）

- [ ] **#141（P2 · type:chore/area:ci · ready）重建首屏体积门禁口径：挂载前必需资源度量 + 脚本注释与 AGENTS.md 现状数字修正**
  - 证据：门禁值 68.0 kB（CI run `39125798785` @ `fc6c2ef`，即 #140 前最后一次构建：css 8.1 + entry 14.9 + vendor-react 43.7）→ **9.7 kB**（#140 后）；Planner 实测**挂载前必需下载 ≈ 68.8 kB gzip**（含 bootstrap 14.1 + vendor-react 43.7）。用户侧成本未变（68.0→68.8），变的是计量范围（`check-bundle-size.mjs` L63–70 只解析 `index.html` 的 `src|href`；#140 后 Vite 不再注入 vendor-react 的 `modulepreload`）。
  - 验收：在 `verify-first-frame-smoke.cjs` 内新增「挂载前必需资源」逐文件 gzip + 合计（参照值 68.8 kB ±3）；红向 = 放宽边界到 `networkidle` 后合计 >200 kB（含 `vendor-physics` 153.8 / `WorkbenchScene` 28.8）；`BUDGET_KB` 与 `LAZY_BUDGETS` **数值零改动**；`AGENTS.md` CI 段「现状约 63kB」与 `docs/plan.md` 同改；CI/Deploy 双绿。
- [ ] **#142（P3 · type:chore/area:render · ready）让 #138 的 Design Token 首批落地：收口 3 处 `.app.dark` 同值硬编码 + 等值消费 + 规范 §5 盘点修正**
  - 证据：五族新 token（`--space-*`/`--text-*`/`--radius-xs`/`--shadow-drawer`/`--overlay-bg`）在 `src`+`tests` 的 `var()` 消费数**全为 0**；`styles.css` L1703 `.app.dark .badge-script` / L2207 `.app.dark .script-badge` / L2479 `.app.dark .tool-btn:hover` 仍硬编码 `background: #1e293b`；`--text-*` 实现为 size-only 与规范 §2.5（size+weight）不符；规范 §5 切片 2「~30 处」实测失真（CompositionLab 10 / DataDrawer 0 / WorkbenchScene 0；SimulationCanvas 37 与 PhotogateTimer 17 等多为 canvas 绘制色 / SVG 属性 / JS 三元，**不可用 `var()`**）。
  - 验收：3 处改 `var(--surface)` 且新契约测试例红向有效；4 条规则等值替换（`.panel-title` 12px→`--text-h3` / `.param-label` 13px→`--text-body` / `.param-desc` 11px→`--text-small` / `.panel-section` 16px→`--space-lg`）+ badge 圆角→`--radius-xs`，附「替换前值→token 值」对照表；生产构建双向 computed style 证据（暗/亮双主题）；规范 §2.5 实现注记 + §5 按四类重写 + 切片 4 站点行号清单；**不改任何 tsx 颜色 / 不改 token 定义值 / 不动 `--shadow-drawer` 消费（L2086 不等值）**。

## 本轮验收（done · 三十七次滚动，4 单全部 CLOSED）

- [x] **#137（P2）窄视口工作台侧栏遮挡「公式推导」触发按钮** —— 通过，CLOSED（验收评论 6250820245）。
  - 证据：`e99f056` 为 main 祖先（merge `d17a458`）；`styles.css` `@media(max-width:1180px)` `top 84→136px`、`max-height calc(100vh-152px)`；探针 `force: true`/`$$eval` 残留 0，`locator.click()` ×4 站点 + `elementFromPoint`/矩形相交/`scrollWidth` 断言全部固化为 `throw`；**Planner 在生产构建 :4173 亲自复跑 ×3 exit 0**；CI `39124010326` + Deploy `39124118444` 双绿。
- [x] **#138（P2）Design Token 切片 1：补 `:root` 语义 token + 修 `--surface` 未定义** —— 通过，CLOSED（评论 6250824765）。
  - 证据：`76ec878` 为 main 祖先（merge `9aaf3aa`）；`grep -c 'var(--surface, #1e293b)'` = 0；`:root`/`:root.light` token 逐项在位；Planner 复跑 `token-contract` 4 passed + `verify-portal-tokens.mjs` exit 0（生产构建）。
  - **结转 #142 的两处口径修正**（Planner 立案不严谨，非执行差距）：① 标准「`.app.dark ... #1e293b` 等价重复 = 0」字面未清零（实测剩 3 处，契约测试只守了实现范围点名的 2 处）；② token 0 消费者 + `--text-*` 形态与规范 §2.5 不符（D45 已裁定维持 size-only）。
- [x] **#139（P3）PanelSection 壳迁移 7 文件 14 处** —— 通过，CLOSED（评论 6250826009）。
  - 证据：`5fab11f` 为 main 祖先（merge `fc6c2ef`）；7 文件 `className="panel-section"` 命中 0、`<PanelSection` = 1+1+5+1+2+2+2 = **14**；DOM/文案等价性抽查通过；Planner 复跑 `common-components` 10 passed；候选 C 23 处重复外壳已收口 21 处（FormulaPanel 7 处按 D31 暂缓）。
- [x] **#140（P2）vendor-react 懒拆 / 预加载 + 生产构建 headless 首帧探针** —— 通过，CLOSED（**含必须纠正的报告表述**，评论 6250880574）。
  - 证据：`c7717f8` 为 main 祖先（merge `f9cd5d6`）；生产 `dist/index.html` 实测无 vendor-react 静态引用；`check:bundle` 9.7 kB/70 kB、`vendor-react-` 43.7/55 kB；**Planner 亲自复跑首帧探针 ×3 exit 0（1096/951/1043 ms，0 console error）**。
  - **纠正**：报告/HANDOFF 的「首屏 67.9→9.7 kB 大幅优化 / React 19 的 +23 kB 不影响首屏门禁」**不成立**——真实挂载前体积 68.0→68.8 kB 基本未变，只是退出了门禁判定；D40 的 70 kB 保护自此被架空。后果转 **#141（度量）+ D44（预算策略）**。

## 下一批 ready（未入今日队列，今日不领）

- 无（今日队列 2 单即为全部 ready；#130 §5 切片 3/4 待 #142 的实测盘点产出后再拆）。

## 阻塞 / 待处理

- **#44（P2 · type:chore/area:ci · needs-info）React 19 专项迁移** —— `blocked` 已摘（技术前置 #140 CLOSED）。**但不可按现状实施**：其验收标准第 1 条「首屏 `check:bundle` ≤70 kB」在 #140 后不再构成约束，React 19 的 +23 kB 落在不被门禁统计的懒 chunk（唯一间接哨兵 = `vendor-react-` 55 kB 预算，抬预算即可绕过），与 D40「不抬预算」实质冲突 → **待用户 D44 答复**。另：其余大版本候选面（recharts 3 / three 0.186 / jsdom 30 / jest-dom 7 / eslint 10 / @types/node 26）继续逐项另议、不自动放行。**勿领**。
- **#143（P2 · type:chore/area:ci · needs-info）4 个 headless 浏览器探针是否接入 CI 门禁** —— 新立。`verify-first-frame-smoke` / `verify-overlay-drawer-smoke` / `verify-portal-tokens` / `verify-guidance-smoke` 全部手动，CI 7 道门禁无浏览器项（#111 / #136→#137 两类回归均靠 Planner 手工复测才发现）。触契约 1.10「主要 CI/CD 流程变化」红线 → 三案（A 新增 CI job / B 仅首帧探针接入 deploy 前置 / C 维持手动 + 纪律），**推荐 A、默认 C**。**勿领**。
- **#100（P2）/#101（P3）** —— parked（D19），勿领。
- 观察（不建单）：`index.html` 加载骨架硬编码深底 `#0b1020`，亮色主题 reload 会先见深色块——因 `simulationStore` 默认 `theme:'dark'` 且**无持久化**，挂载前无法预知用户主题，属「是否引入主题持久化」的设计问题，待 M6 后另议；`--shadow-drawer`（`rgba(0,0,0,0.3)`）与 L2086 `.classroom-inspector`（`rgba(15,23,42,0.2)`）**不等值**，切片 4 须先定取舍。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（前置未就绪）· parked（排程冻结 D19/D31）· needs-info（需决策）；closed = done
- 本仓沿用 `ready-for-agent`，不引入新 `ready` 标签；`parked` 为 2026-10-17 新建；关闭时摘 `in-review`（沿 #135/#136 惯例）
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0——本轮无重要缺陷与核心能力缺口，禁为「看起来重要」而堆 P1）；本仓无 `priority:P4` 标签（P3 即最低）
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list/view` 实拉整体重写）
