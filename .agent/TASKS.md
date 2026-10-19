# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮实拉 `gh issue list --state open` 于 **2026-10-19 · 三十九次滚动**，非记忆）。
> 本轮完成：昨日交付入 main 的 3 单（#141/#143/#142）已全部通过独立实测复核并 CLOSED，in-review 清零；立单推进 M6 收尾（#145/#146/#147）。
> open 共 **6 单** = ready 3（#145/#146/#147）+ parked 3（#44/#100/#101）；Issue ↔ 本文件**零漂移**。

## 今日队列（2026-10-19 · 三十九次滚动 · 执行顺序，3 个）

- [x] **#145（P2 · type:chore/area:render · in-review）Design Token 切片 4：浮层遮罩与侧栏抽屉统一（--overlay-bg 与 --shadow-drawer 落地消费 + z-index 梯队对齐）**
  - **背景**：`--overlay-bg` 与 `--shadow-drawer` 在全仓消费者数均为 0；4 处遮罩背景仍硬编码各自独立的 `rgba()`，且 z-index 未规范对齐；`.formula-drawer` 未使用 `--shadow-drawer` 且 `:root.light` 缺少浅色定义。
  - **范围**：
    1. `visualization/src/styles.css`：
       - `:root.light` 补充 `--shadow-drawer: -20px 0 60px rgba(15, 23, 42, 0.16);` 对齐 `--shadow-lg` 浅色口径。
       - 4 处遮罩（`.ocr-overlay:754` / `.guidance-overlay:971` / `.problem-overlay:1154` / `.formula-drawer-overlay:2074`）`background` 统一切换为 `var(--overlay-bg)`。
       - `.formula-drawer:2086` 的 `box-shadow` 切换为 `var(--shadow-drawer)`。
       - 对齐 z-index 梯队：Modal 全屏弹窗梯队（`.ocr-overlay` 1000、`.problem-overlay` 1000、`.guidance-overlay` 200→1000，其挂载点已为 `document.body` 顶层）；Drawer 侧滑遮罩梯队（`.formula-drawer-overlay` 保持 900）。
    2. `visualization/tests/rendering/token-contract.test.ts`：
       - 新增硬编码收口与消费数断言：断言 `--overlay-bg` 消费数 ≥ 4；断言 `--shadow-drawer` 消费数 ≥ 1；红向验证确认有效。
  - **验收标准**：
    - [ ] `styles.css` 中 4 处 overlay 类的 `background` 均使用 `var(--overlay-bg)`，且通过契约测试消费数断言（≥4）。
    - [ ] `.formula-drawer` 的 `box-shadow` 使用 `var(--shadow-drawer)`，且 `:root.light` 包含浅色 `--shadow-drawer` 定义。
    - [ ] z-index 梯队对齐：`.ocr-overlay`、`.problem-overlay`、`.guidance-overlay` 为 1000；`.formula-drawer-overlay` 为 900。
    - [ ] `token-contract.test.ts` 契约测试用例全部通过，且完成红向有效性验证。
    - [ ] 4 个 headless 浏览器探针（`verify-first-frame-smoke.cjs` / `verify-overlay-drawer-smoke.cjs` / `verify-portal-tokens.mjs` / `verify-guidance-smoke.cjs`）全部 exit 0。
    - [ ] `npm run typecheck` / `lint` / `format:check` / `test` / `count:check` / `precheck` exit 0。
    - [ ] 交付 commit 以 `--no-ff` 入 main 成祖先；CI + Deploy 双绿。

- [x] **#146（P2 · type:chore/area:render · in-review）Design Token 切片 3：控件交互状态规范落地（NumberField / param-input / slider / button 状态对齐）**
  - **背景**：`docs/ui-visual-token-spec.md` §2.6 制定了统一的控件状态规范。当前 `common/NumberField.tsx` 的纯 input 模式（`.composition-field`）未配置统一样式类，input 呈现原生样式；`.param-input` 缺少 `:hover` 与 `:disabled`；`.param-slider` 缺少 `:disabled`；按钮缺少 `:focus-visible` 与统一 `:disabled`。
  - **范围**：
    1. `visualization/src/styles.css`：
       - 补充 `.composition-field` 基础样式（布局与对齐，input 对齐 `.param-input` 尺寸、背景、边框、字体与圆角）。
       - 为 `.param-input` / `.composition-field input` 补齐 `:hover`（`border-color: var(--glass-border-hover)`）与 `:disabled`（`opacity: 0.5; cursor: not-allowed;`）。
       - 为 `.param-slider` 补齐 `:disabled`（`opacity: 0.4; cursor: not-allowed;`）。
       - 为 `.btn` / `.btn-preset` 补齐 `:focus-visible`（`outline: none; box-shadow: 0 0 0 3px var(--ring);`）与 `:disabled`（`opacity: 0.4; cursor: not-allowed; pointer-events: none;`）。
    2. `visualization/tests/rendering/common-components.test.tsx`：
       - 补充针对 NumberField 在 disabled 状态下的渲染与属性传递断言。
  - **验收标准**：
    - [ ] `.composition-field` 拥有对齐 design token 的输入样式，与 `.param-input` 视觉规范统一。
    - [ ] `.param-input`、`.param-slider`、`.btn` 均具备规范化的 `:hover`、`:focus-visible` 及 `:disabled` 状态。
    - [ ] 组件单测与全量测试全绿，测试数回写一致。
    - [ ] `npm run typecheck` / `lint` / `format:check` / `test` / `count:check` / `precheck` exit 0。
    - [ ] 4 个 headless 浏览器探针在生产 preview 下全绿。
    - [ ] 交付 commit 以 `--no-ff` 入 main 成祖先；CI + Deploy 双绿。

- [x] **#147（P3 · type:chore/area:render · in-review）Design Token 切片 2 延伸：消除 DOM inline style 硬编码色（CompositionLab 与弹窗外层样式迁移至 Token）**
  - **背景**：`docs/ui-visual-token-spec.md` §5 切片 2 实测盘点分类 ① 中，指出 `CompositionLab.tsx`（10 处）及 `MeasurementToolbox.tsx` / `OCRPanel.tsx` 存在多处包含硬编码颜色与字号的 DOM inline style（如 `#94a3b8`、`#64748b`、`fontSize: 11/12`、`rgba(255,255,255,0.72)` 等）。
  - **范围**：
    1. `visualization/src/components/composition/CompositionLab.tsx`：
       - 将提示文案、辅助说明、状态栏内的硬编码颜色与字号替换为已定义的 design token 或迁移至专用 CSS 类（使用 `var(--text-small)` / `var(--text3)` / `var(--space-*)` / `var(--surface)` 等）。
    2. `visualization/src/components/measurement/MeasurementToolbox.tsx` 与 `visualization/src/components/ocr/OCRPanel.tsx`：
       - 提取或替换外层内联硬编码样式为 CSS 类或 token 引用。
  - **验收标准**：
    - [ ] `CompositionLab.tsx` 中的 10 处 DOM inline style 硬编码颜色/字号全部替换为 token 或专用 CSS class。
    - [ ] `MeasurementToolbox.tsx` 与 `OCRPanel.tsx` 外层内联硬编码样式完成 token 规范化。
    - [ ] 双主题视觉无倒退，`token-contract.test.ts` 契约保持通过。
    - [ ] `npm run typecheck` / `lint` / `format:check` / `test` / `count:check` / `precheck` exit 0。
    - [ ] 4 个 headless 浏览器探针在生产 preview 下全绿。
    - [ ] 交付 commit 以 `--no-ff` 入 main 成祖先；CI + Deploy 双绿。

## 本轮验收（三十九次滚动 · 全部 CLOSED）

- [x] **#141（P2 · area:ci · CLOSED）重建首屏体积门禁口径：挂载前必需资源度量 + 脚本注释与 AGENTS.md 现状数字修正**
  - 交付 commit `cfa56d0` 已 `--no-ff` merge `fedd6b5` 合入 main（`git merge-base --is-ancestor cfa56d0 main` 确认为祖先）。
  - 独立实测复核：`verify-first-frame-smoke.cjs` 连续 3 次通过（793~1360ms），挂载前必需资源实测 68.4 kB gzip（与 68.8 kB 参照值差 0.4 kB，在 ±1 kB 容差内）；红向 `MEASURE_BOUNDARY=networkidle` 显著上升至 458.2 kB 并超时报错；`check-bundle-size.mjs` 门禁与数值零改动；注释与 `AGENTS.md` 对齐实测双数；CI `39195735459` + Deploy `39195904480` 双绿。
- [x] **#143（P2 · area:ci · CLOSED）4 个 headless 浏览器探针接入 CI 门禁（D46=A 已批：ci job 内新增探针步骤 + 生产构建 preview + 阻断 Deploy）**
  - 交付 commit `fcb96c9` 已 `--no-ff` merge `b982aa0` 合入 main（`git merge-base --is-ancestor fcb96c9 main` 确认为祖先）。
  - 独立实测复核：`ci.yml` 单个 `ci` job 内成功追加 preview 服务启动、就绪探测与 4 探针顺序执行；子路径 `/${{ github.event.repository.name }}/` 与 `SMOKE_BROWSER_CHANNEL: ""` 全探针生效；Ubuntu runner 上 WebGL 画布（826x690）首次真检验通过；Draft PR #144 红绿闭环证实拦截能力有效（注入 `top: 84px` 报错阻断 Deploy，revert 后转绿并按契约关闭未合并）；CI `39198883919` + Deploy `39199156200` 双绿。
- [x] **#142（P3 · area:render · CLOSED）让 #138 的 Design Token 首批落地：收口 3 处 .app.dark 同值硬编码 + 等值消费 + 规范 §5 盘点修正**
  - 交付 commit `6c418da` 已 `--no-ff` merge `9e33a2a` 合入 main（`git merge-base --is-ancestor 6c418da main` 确认为祖先）。
  - 独立实测复核：`grep -rn "background: #1e293b" visualization/src` 0 命中；`token-contract.test.ts` 6 passed 且改回 #1e293b 报红有效；五族 token 消费数各 ≥1 且等值替换；响应式断点与 `--shadow-drawer` 维持字面量不变；`docs/ui-visual-token-spec.md` §2.5 追加 size-only 说明，§5 按四类实测重写并盘点切片 4 遮罩清单；测试数真值 2869，`count:check` exit 0；CI `39200369677` + Deploy `39200610064` 双绿。

## 阻塞 / 待处理（parked）

- **#44（P2 · type:chore/area:ci · parked）React 19 专项迁移** —— D44 = **B**（用户 2026-10-18 拍板）：技术前置 #140 已达成但**暂不升**；解除条件三条：用户改选 A/C、React 19 出现**已验证的功能收益**、react 18 遇安全/兼容硬约束。**勿领**。
- **#100（P2）/#101（P3）** —— parked（D19），勿领。
- **观察（不建单，需用户点头才做）**：`origin/agent/issue-95-shadow-adaptive`(`ba0bd6f`) 与 `origin/agent/issue-96-default-on-grid`(`f73f21a`) 两个远程分支已是 main 祖先且对应 Issue 已 CLOSED，属 §1.9 未执行的清理。删除远程分支影响共享状态且契约 1.9 禁止 agent 删他人分支，本轮**只上报、不代删**。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· parked（排程冻结 D19/D44）· needs-info（需决策）；closed = done
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0）；P2 为中优先级核心规范，P3 为次级优化与样式收尾
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list/view` 实拉整体重写）；当前 open 共 6 单 = ready 3 + parked 3，in-review 0
- 契约 1.2：本轮未发现 `.agent/LOCK` 残留
- **pending 决策**：**清零**（D44=B / D46=A / D48 治理裁定 / D49 验收与 M6 收尾立单均已确认）；本轮无需用户拍板事项
