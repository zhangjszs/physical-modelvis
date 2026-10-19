# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮实拉 `gh issue list --state open` 于 **2026-10-19 · 三十八次滚动**，非记忆）。
> 本轮为**治理轮**：in-review **为 0**（#137/#138/#139/#140 已于 2026-10-18 三十七次滚动全部 CLOSED，无遗留验收），故本轮产出 = 对今日队列三单逐条重过契约 4.2，**坐实 4 项前提 + 补掉 3 个会让执行跑偏的坑 + 校正 2 处事实误记**，队列与范围不变。
> open 共 **6 单** = ready 3（#141/#143/#142）+ parked 3（#44/#100/#101）；Issue ↔ 本文件**零漂移**。

## 今日队列（2026-10-19 · 三十八次滚动 · 执行顺序，3 个）

- [x] **#141（P2 · type:chore/area:ci · in-review）重建首屏体积门禁口径：挂载前必需资源度量 + 脚本注释与 AGENTS.md 现状数字修正**
  - **本轮独立复核（通过）**：不依赖浏览器，对 `visualization/dist/assets` 逐文件 `gzipSync` 求和 = **68.82 kB**（index.html 0.60 + 入口 js 1.09 + css 8.08 + bootstrap 14.1 + vendor-react 43.7 + vendor-state 0.42 + rolldown-runtime 0.42 + scenes 0.41）→ 参照值坐实，**验收容差由 ±3 kB 收紧为 ±1 kB**。
  - 事实校正：门禁取数在 `check-bundle-size.mjs` **L65–74**（`matchAll` 循环，首稿误记 L63–70）；过期表述「现状约 63kB」在头注释 **L10–12**（首稿误记 L12–16）。
  - 锚点核实：`visualization/index.html` L12–13 确有 `#root` + `#app-loading`（度量边界钩子真实存在）；该探针 L40 `ensureServer()` 是**唯一**自启 preview 者。
  - 硬边界不变：`BUDGET_KB` 70 kB / `LAZY_BUDGETS`（含 `vendor-react-` 55 kB）**数值零改动**；只打印不判定（D44=B）；不改 `.github/workflows/*`。
- [x] **#143（P2 · type:chore/area:ci · in-review）4 个 headless 浏览器探针接入 CI 门禁（D46=A 已批：现有 `ci` job 内追加步骤）
  - **本轮补上的两条硬前提（原正文缺失，不补则大概率四单全红）**：
    ① **4 探针里只有 `verify-first-frame-smoke.cjs` 会自启服务**（L40 `ensureServer()`，`BASE_URL` 缺省 :4173）；`verify-overlay-drawer-smoke.cjs:16` / `verify-portal-tokens.mjs:15` / `verify-guidance-smoke.cjs:11` **均不自启且缺省指向 dev 端口 :3000** → CI 必须显式后台起 `vite preview --port 4173` + 就绪轮询，`BASE_URL` 喂给全部 4 个。
    ② `verify-guidance-smoke.cjs:13` 是 `SMOKE_BROWSER_CHANNEL ?? 'msedge'`（另三个 `?? ''`），而 `playwright install --with-deps chromium` **只装 chromium** → 4 步骤必须共用 `SMOKE_BROWSER_CHANNEL: ""`，否则 `Executable doesn't exist`。
  - **实况补充**：本仓**已有浏览器 CI 先例** `qa-sweep.yml`（L53–54 装 chromium / L56–58 后台起服务 / L60–71 curl 就绪轮询）→ 安装与后台服务三段**照抄既有写法**；差异须守住：本单跑**生产 preview**，qa-sweep 跑 dev。**不并入 qa-sweep、不新建 workflow**（超出 D46=A 放行范围，须另行请示）。
  - **耗时基线实测**：现有 `ci` job ≈**2 分钟**（run `39136649170`，14:35:03Z→14:37:03Z，20 步）→ 接入后预期 4–6 分钟；`ci` job 现无 `timeout-minutes`（默认 6 小时）→ 本单补 **`timeout-minutes: 20`**。
  - **红向触发方式已核准**：`ci.yml` 只在 `push: [main]` / `pull_request: [main]` 触发 → **临时分支 push 不会跑 CI**，必须 `gh pr create --draft` 开 PR 触发、报红后关闭且不合并；注入点 `visualization/src/styles.css:2106`（`.classroom-inspector top:136px → 84px`）。
  - WebGL 若在 ubuntu runner 失败 → **停单转 `blocked` 并附 CI 原始输出，禁止放宽断言/跳过探针**；**`qa-sweep` nightly 全绿不构成 WebGL 证据**（`verify-qa-sweep.cjs` L129/L145 明确跳过 WebGL 画布，3D 像素在 CI 里从未被断言）→ 本单是第一次真检验；headless 的 **WebGL 上下文数量上限**（同文件 L80 既往规避手段）⇒ 4 探针**保持各自独立 `chromium.launch()`**，禁止共享 browser/page 省时间。
  - `package.json`/`package-lock.json`/`BUDGET_KB`/`LAZY_BUDGETS` 零改动；`.agent/ENV.md` 自行更新。
- [x] **#142（P3 · type:chore/area:render · in-review）让 #138 的 Design Token 首批落地：收口 3 处 .app.dark 同值硬编码 + 等值消费 + 规范 §5 盘点修正
  - **本轮实测坐实**：`background: #1e293b` 在 `visualization/src` **恰好 3 处** = L1703 / L2207 / L2479（无第四处）；五族新 token `var()` 消费**全为 0**（`--surface` 已有 src 8 + tests 4，属 #138 成果）；等值关系核到行号——`--space-lg`(L68)=16px↔`.panel-section`(L298)、`--text-h3`(L87)=12px↔`.panel-title`(L301)、`--text-body`(L88)=13px↔`.param-label`(L333)、`--text-small`(L89)=11px↔`.param-desc`(L371)、`--radius-xs`(L72)=4px↔`.badge-script`(L1689→**L1697**)/`.script-badge`(L2194→**L2201**)。
  - **本轮校正 2 处误记**：① L2086 的 `box-shadow …rgba(15,23,42,0.2)` 属 **`.formula-drawer`**（L2077），**不是** `.classroom-inspector`（后者在 L1596/L1606/L2102，其 shadow 走 `var(--shadow-lg)`）；`--shadow-drawer`(L82) 全仓 0 消费者、与 `.formula-drawer` 值**不等值** → 禁替换。② badge 圆角在**基规则**里，不在 `.app.dark` 覆盖块内（dark 块只改 color/background/border-color）。
  - **本轮新增裁定（消除自行发明点）**：`.panel-title`/`.param-label` 另有 4 处 `@media` 覆盖（L1413 12px / L1416 11px / L1463 13px / **L1466 14px**）——**14px 无等值 token**，按「顺手替换该选择器全部字号」施工必然改数值 → **本单只改 4 条基线规则，断点覆盖一律不动**（待切片 3/4）。
  - 验收判据已换成可跑的一条：`grep -rn "background: #1e293b" visualization/src` = 0（原跨行正则用单行 `grep -E` 跑不出结果，会被误读为「本来就是 0」）。
  - 禁改任何 `.tsx` 颜色（`GraphPanel.tsx` / `SimulationCanvas.tsx` 里的 `isDark ? '#1e293b' : …` 属 D45 第 ④ 类，**不是残留项**）；禁改 token 定义值；不动 `--shadow-drawer` 消费。

## 本轮验收（三十八次滚动）

- **无 in-review 待验收**：上一轮（2026-10-18 三十七次滚动 + 续）已把 #137/#138/#139/#140 四单逐条独立复核并 CLOSED（验收评论 6250820245 / 6250824765 / 6250826009 / 6250880574），昨日 22:33 之后**main HEAD 未变（`cefe669`）**、无新交付 commit、`gh issue list` in-review = 0。
- **main 基线复核（只读实测）**：`cefe669` → CI run `39136649170` success · Deploy `39136800308` success · QA 巡检 `39165693099` success（三线全绿，非记忆）。
- **契约 3.8「验收通过 ≠ 收敛」的延续动作**：上轮关闭四单后遗留的口径失真（`AGENTS.md`「现状约 63kB」、`check-bundle-size.mjs` 头注释）仍未修 —— 已完整落在 #141 的验收标准内，**不另立单**；本轮新增的收敛证据 = 68.82 kB 静态复算，使 M6 之后的「体积线」具备可复核基线。

## 下一批 ready（未入今日队列，今日不领）

- 无（#141/#143/#142 即为全部 ready；#130 §5 切片 3/4 待 #142 的实测盘点产出后再拆）。

## 阻塞 / 待处理

- **#44（P2 · type:chore/area:ci · parked）React 19 专项迁移** —— D44 = **B**（用户 2026-10-18 拍板，落实记录 D47）：技术前置 #140 已达成但**暂不升**；`BUDGET_KB`/`LAZY_BUDGETS` 不动（方案 A 未采纳）。解除条件三条：用户改选 A/C、React 19 出现**已验证的功能收益**、react 18 遇安全/兼容硬约束。**勿领**；其余大版本候选面（recharts 3 / three 0.186 / jsdom 30 / jest-dom 7 / eslint 10 / @types/node 26）继续逐项另议、不自动放行。
- **#100（P2）/#101（P3）** —— parked（D19），勿领。
- **B 案未解决部分（诚实记账，非任务）**：真实挂载前成本 ≈68.8 kB **当前无门禁约束**；#141 只把它变成可复核观测项。若度量或线上首帧耗时恶化，**重开 D44**，不要默认抬预算。
- **#130 §5 切片 3/4** —— 暂不建单：规范文档站点盘点已实测失真，待 #142 产出四类分列清单后由 Planner 拆单；#142 同时把「响应式断点档位是否纳入 token 体系」列为切片 3/4 待定项（本轮已实测 4 处断点值与基线值不同）。
- **CI/CD 授权的边界（勿越界解释）**：D46=A 的放行**只覆盖**「把 4 个既有探针接入现有 `ci` job + `timeout-minutes: 20`」。**不构成**对下列事项的预支授权：并入/改动 `qa-sweep.yml`、改 `deploy.yml` 触发条件、抬任何门禁阈值、引入第三方 Action。若 #143 执行中发现必须动其中之一才能跑通 → **停单转 `blocked` 回报**，不要自行扩权。
- **观察（不建单，需用户点头才做）**：`origin/agent/issue-95-shadow-adaptive`(`ba0bd6f`) 与 `origin/agent/issue-96-default-on-grid`(`f73f21a`) 两个远程分支**已是 main 祖先且对应 Issue 已 CLOSED**，属 §1.9「合并后删除临时分支」的未执行清理。删除远程分支影响共享状态、且契约 1.9 禁止 agent 删他人分支，故本轮**只上报、不删**（无任何功能影响，留着也不阻塞）。
- **观察（不建单）**：`index.html` 加载骨架硬编码深底 `#0b1020`（L13），亮色主题 reload 会先见深色块——`simulationStore` 默认 `theme:'dark'` 且**无持久化**，挂载前无法预知用户主题，属「是否引入主题持久化」的设计问题，待 M6 后另议；`--shadow-drawer`（L82，0 消费者）与 `.formula-drawer`（L2086，`rgba(15,23,42,0.2)`）**不等值**，切片 4 须先定取舍。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（前置未就绪）· parked（排程冻结 D19/D31/D44）· needs-info（需决策）；closed = done
- 本仓沿用 `ready-for-agent`，不引入新 `ready` 标签；`parked` 为 2026-10-17 新建；关闭时摘 `in-review`（沿 #135/#136 惯例）
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0——无重要缺陷与核心能力缺口，禁为「看起来重要」而堆 P1）；本仓无 `priority:P4` 标签（P3 即最低）
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list/view` 实拉整体重写）；当前 open 共 6 单 = ready 3 + parked 3，in-review 0
- 契约 1.2：本轮未发现 `.agent/LOCK` 残留（锁已于 D30 裁决废止）
- **pending 决策**：**清零**（D44=B / D45 自决 / D46=A / D47 落实 / D48 本轮治理裁定均属已确认）；本轮无需用户拍板事项，仅「远程分支清理」一项以观察形式上报（默认不删）
