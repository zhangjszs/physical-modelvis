# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮实拉 `gh issue list --state open` 于 **2026-10-21 · 四十二次滚动 + 07:24 执行前复核**，非记忆）。
> 本轮验收：**无 in-review 积压**——上一轮 in-review 2 单（#148/#149）已于四十一次滚动（2026-10-20）关闭；42 例定向测试于 07:25 复跑全绿，HEAD `1c497f5` 的 CI / Deploy / QA 场景巡检三绿。
> 07:24 执行前复核：01:01 排程后至复核时**无 Executor 会话、无新提交**（working tree clean，main = origin/main）；open 仍 4 单、今日队列无变化。
> open 共 **4 单** = ready 1（#150）+ parked 3（#44/#100/#101）；Issue ↔ 本文件**零漂移**。

## 今日队列（2026-10-21 · 四十二次滚动 · 执行顺序，1 个 ready）

- [ ] **#150（P3 · type:chore/area:render · ready-for-agent）主题色 JS 单一真源（切片 2）：SimulationCanvas 与 EquipmentStage 主题分支迁移**
  - **背景**：#149 落地 `themeTokens.ts` 与双向静态契约后，仍有两处主题色双源：`SimulationCanvas.tsx`（当前实测 `isDark ?` **47 处**，覆盖 HUD 文本、网格/遮罩、金属/墙体/弹簧渐变等）与 `EquipmentStage.tsx`（**L167 / L186** 两处写死 `isDark ? 0x0b1020 : 0xf8fafc` 设置 3D 场景背景色）。这些值与 `styles.css` 的 `--bg` / `--bg2` / `--text*` / `--border` 等无契约约束，改主题时会漂移。前置 #149 已 CLOSED，本单为 M7 收官切片。
  - **范围**：
    1. 扩展 `visualization/src/utils/themeTokens.ts` 与 `visualization/src/styles.css`：为 SimulationCanvas 与 EquipmentStage 所需的主题相关颜色补充语义键（已有精确等值 token 直接复用，无等值的按当前值新增；**现有 token 值零改动**）。
    2. 迁移 `SimulationCanvas.tsx` 中所有 `isDark ?` 主题颜色分支到 `getThemeTokens(theme)`；Canvas 绘制使用解析后的真实色彩值，**禁止 `var()` 字符串**（D45）。
    3. 迁移 `EquipmentStage.tsx` 3D 场景背景色与雾效颜色，改为由 token 表派生生成 `THREE.Color`（如 `new THREE.Color(tokens.stage3dBg)`），消除写死十六进制数值。
    4. 扩展 `tests/rendering/theme-tokens.test.tsx` 契约覆盖新增键，保持 CSS↔JS 双向对齐与红向拦截；补充组件/单元测试覆盖暗/浅双主题（必要时抽出纯函数断言绘制入参/3D 背景色）。
    5. 验证双主题生产 preview 探针（4 探针 exit 0，3D/2D 画布非空，零 console error），并抽样断言 3D 背景色与 token 一致。
  - **明确不包含**：
    - 不改 `rendering/*Scenes.ts` / `CanvasRenderer.ts` 的场景调色板（D45 第 ② 类，保持集中常量）；
    - 不做 3D 材质/光照重设计，不动物理与 rig 生命周期；
    - 不改 GraphPanel / PhotogateTimer（#149 已覆盖）；
    - 不改已有 token 值、不引入第三方色彩库。
  - **依赖**：无（前置 #149 已 CLOSED）。
  - **验收标准**：
    - [ ] `SimulationCanvas.tsx` 中主题相关 `isDark ?` 颜色分支清零（复核基线：47 处，全部为颜色值，无纯透明度分支），颜色取自 `getThemeTokens(theme)`。
    - [ ] `EquipmentStage.tsx` 3D 背景色由 token 派生，无写死 `0x0b1020` / `0xf8fafc`。
    - [ ] `theme-tokens.test.tsx` 覆盖新增键且逐项对齐 CSS；红向验证有效。
    - [ ] 暗色渲染值保持不变（如个别亮色语义化调整须在执行报告逐条列出并附证据）；双主题画布非空、零 console error。
    - [ ] `npm run typecheck` / `lint` / `format:check` / `test` / `count:check` / `precheck` exit 0。
    - [ ] 4 个 headless 探针在生产 preview 下 exit 0；CI + Deploy 双绿。
    - [ ] 交付 commit 以 `--no-ff` 入 main 成祖先。
  - **测试要求**：纯函数化颜色解析/转换并单测（hex → string / hex → THREE color number）；双主题浏览器探针实跑，不得只靠静态 grep。
  - **队列说明**：本轮 ready 仅此 1 单，**低于 2–5 区间系有意不凑数**——M7 未收官前 #100/#101 按 D51 不得解冻；不拆分 #150。

## M7 验收（已关闭 · 四十一次滚动）

- [x] **#148（P2 · area:render · CLOSED）浮层可访问性统一：Esc 关闭 + 初始焦点 / 焦点归还 + OCR 弹窗 dialog 语义**
  - 交付 `01c03fa` → merge `fc029e7`，均为 main 祖先；CI `39416415976` + Deploy `39416691193` 双绿。
  - 本轮独立抽查：`useDialogAccessibility` 在 OverlayDrawer / OCRPanel 双接入在位；定向测试 42 例全绿（含 ocr-panel 20、wizard-overlay 15）。
- [x] **#149（P2 · area:render · CLOSED）主题色 JS 单一真源（切片 1）：themeTokens 语义表 + GraphPanel/PhotogateTimer 迁移**
  - 交付 `dfb68d3` → merge `4c07f43`，均为 main 祖先；CI `39416415976` + Deploy `39416691193` 双绿。
  - 本轮独立抽查：`themeTokens.ts` 双主题表在位；`theme-tokens.test.tsx` 7 例通过；HEAD `1c497f5` 的 CI/Deploy/QA 均 success。

## 阻塞 / 待处理（parked）

- **#100（P2）/#101（P3）** —— parked（D19/D51），**M7 期间勿领**；D51 已拍板：**M7 收官（#150 CLOSED）后的下一轮规划立即解冻**转产品功能线，顺序 **#100 → #101**（届时由 Planner 摘 `parked`、加 `ready-for-agent` 并重写验收项）。
- **#44（P2 · type:chore/area:ci · parked）React 19 专项迁移** —— D44 = **B**（用户 2026-10-18 拍板）：**暂不升**；解除条件三条（用户改选 A/C、React 19 出现已验证功能收益、react 18 遇安全/兼容硬约束）。**勿领**。
- **观察（不建单，需用户点头才做）**：`origin/agent/issue-95-shadow-adaptive`(`ba0bd6f`) 与 `origin/agent/issue-96-default-on-grid`(`f73f21a`) 两个远程分支已是 main 祖先且对应 Issue 已 CLOSED，属 §1.9 未执行的清理。删除远程分支影响共享状态且契约 1.9 禁止 agent 删他人分支，本轮**只上报、不代删**。
- **交接快照提示**：`STATE.md` / `HANDOFF.md` 为 2026-10-20 收尾快照（HANDOFF 仍写 main HEAD `4c07f43`、#148/#149 待验收；STATE 更新时间 `2026-10-20T01:45:00Z`），已被四十一次/四十二次滚动取代。下一棒以 TASKS.md / PLAN.md 为准，并在收尾时如实刷新两者。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（外部/依赖阻塞）· parked（排程冻结 D19/D44/D51）· needs-info（需决策）；closed = done
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0）；P2 为当前核心质量收口，P3 为次级迁移切片
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list/view` 实拉整体重写）；当前 open 共 4 单 = ready 1 + parked 3，in-review 0
- 本轮 Issue 治理：#148/#149 已关闭且 `in-review` 标签已清理；#150 正文测试文件名 `.test.ts` → `.test.tsx` 更正，并留基线 comment `6296452544`（07:24 复核确认正文与基线一致）
- 契约 1.2：本轮未发现 `.agent/LOCK` 残留
- **pending 决策**：清零
