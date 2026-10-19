# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮实拉 `gh issue list --state open` 于 **2026-10-20 · 四十次滚动**，非记忆）。
> 本轮验收：昨日 in-review 3 单（#145/#146/#147）已全部通过独立实测复核并 CLOSED，**M6 7/7 收官**。
> open 共 **6 单** = ready 2（#148/#149）+ blocked 1（#150）+ parked 3（#44/#100/#101）；Issue ↔ 本文件**零漂移**。

## 今日队列（2026-10-20 · 四十次滚动 · 执行顺序，2 个 ready）

- [ ] **#148（P2 · type:chore/area:render · ready）浮层可访问性统一：Esc 关闭 + 初始焦点 / 焦点归还 + OCR 弹窗 dialog 语义**
  - **背景**：`OverlayDrawer.tsx:43-77`（导学 / 公式抽屉共用）只有点击关闭与 aria，无 Escape、无初始焦点、无焦点归还、无 Tab 约束；`OCRPanel.tsx:314-318` 自建 portal 遮罩无 `role=dialog` / `aria-modal` / 可访问名、无 Escape、无焦点管理；现有测试只覆盖鼠标路径。
  - **范围**：新增 `useDialogAccessibility.ts`（Escape 关闭、初始焦点、焦点归还、Tab 循环、清理）；OverlayDrawer 与 OCRPanel 接入；OCR 遮罩补 dialog 语义，关闭按钮补可访问名；扩展 `tests/rendering/wizard-overlay.test.tsx` 与 `tests/ocr/ocr-panel.test.tsx`。
  - **明确不包含**：不改 CSS/视觉/动画/z-index；不引入第三方 focus-trap/a11y 依赖；不改 OCR 业务逻辑；不处理 `.problem-overlay`（无组件使用）。
  - **验收标准**：
    - [ ] OverlayDrawer：Escape 调用 onClose；打开后焦点位于 dialog 内；关闭后焦点归还先前元素；Tab/Shift+Tab 不逃出 dialog。
    - [ ] OCRPanel：role=dialog、aria-modal=true、非空可访问名；Escape 关闭；关闭后焦点回到「📷 拍照解题」触发按钮；关闭按钮具备可访问名。
    - [ ] 新增/扩展测试覆盖键盘路径，既有 OCR 与 overlay 测试无回归。
    - [ ] `git diff` 仅含 `.ts` / `.tsx` 与测试，无 `styles.css` 改动；`package.json` / lockfile 零改动。
    - [ ] `npm run typecheck` / `lint` / `format:check` / `test` / `count:check` / `precheck` exit 0。
    - [ ] 4 个 headless 探针 exit 0；CI + Deploy 双绿；交付 commit `--no-ff` 入 main 成祖先。

- [ ] **#149（P2 · type:chore/area:render · ready）主题色 JS 单一真源（切片 1）：themeTokens 语义表 + GraphPanel/PhotogateTimer 迁移**
  - **背景**：D45 第 ④ 类要求先建立主题单一真源。GraphPanel（L137-138 / L221-224 / L284-287 / L237-240 / L300-303）与 PhotogateTimer（19 处）用 `isDark ? '#...' : '#...'` 复制颜色；`utils/colorMap.ts` 的 `gridLight: '#f1f5f9'` 与 GraphPanel 亮色网格 `#e2e8f0` 已漂移；无主题色契约测试。
  - **范围**：`styles.css` 的 `:root` / `:root.light` 补齐无等值语义 token 的颜色（现有 token 值不改；有精确等值的直接复用；状态色亮色允许语义化）；新增 `utils/themeTokens.ts`（dark/light 表 + `THEME_TOKEN_SOURCES` + `getThemeTokens`）；迁移 GraphPanel / PhotogateTimer；新增 `tests/rendering/theme-tokens.test.ts` 做 CSS↔JS 逐项契约（含红向验证）；新增/扩展双主题浏览器探针。
  - **明确不包含**：不迁移 SimulationCanvas / EquipmentStage（#150）；不迁移场景 Canvas 调色板（`rendering/*Scenes.ts` / `CanvasRenderer.ts`，D45 第 ② 类）；不改 `colorMap.ts` 现有消费者；不改已有 token 值；不引入第三方主题库。
  - **验收标准**：
    - [ ] `themeTokens.ts` 建立 dark/light 两表与 CSS 变量来源映射；契约测试逐项对齐 `styles.css` 且键集合一致。
    - [ ] GraphPanel / PhotogateTimer 主题相关颜色全部来自 `getThemeTokens(theme)`；无 `isDark ? '#` 颜色三元或颜色字面量。
    - [ ] 新增 token 在 `:root` 与 `:root.light` 均有定义；既有 token 值零改动；暗色实际渲染值不变（状态色亮色语义化须在报告列出）。
    - [ ] 契约测试完成红向验证；组件测试覆盖双主题；双主题浏览器探针通过。
    - [ ] `npm run typecheck` / `lint` / `format:check` / `test` / `count:check` / `precheck` exit 0。
    - [ ] 4 个 headless 探针 exit 0；CI + Deploy 双绿；交付 commit `--no-ff` 入 main 成祖先。

- [ ] **#150（P3 · type:chore/area:render · blocked）主题色 JS 单一真源（切片 2）：SimulationCanvas 与 EquipmentStage 主题分支迁移**
  - **依赖**：#149（`themeTokens.ts` 与契约测试先落地）。**本轮不得领取**；#149 验收通过后由 Planner 摘 `blocked` 转 ready。
  - **范围摘要**：迁移 SimulationCanvas 的 `isDark ?` 主题颜色分支与 EquipmentStage 的 3D 背景色到 token 表；扩展契约测试与双主题探针；不迁场景调色板，不做 3D 材质/光照重设计。

## M6 验收（四十次滚动 · 全部 CLOSED）

- [x] **#145（P2 · area:render · CLOSED）Design Token 切片 4：浮层遮罩与侧栏抽屉统一**
  - 交付 `3c880c9` → merge `2841124`，均为 main 祖先；CI `39289347764` + Deploy `39289820909` 双绿。
  - 独立复核：4 处 overlay 使用 `var(--overlay-bg)`（L838/L1055/L1238/L2158）；`:root.light` 含 `--shadow-drawer`（L136）；`.formula-drawer` 用 `var(--shadow-drawer)`（L2170）；z-index 1000/1000/1000/900；定向测试 20 passed。
- [x] **#146（P2 · area:render · CLOSED）Design Token 切片 3：控件交互状态规范落地**
  - 交付 `3aab6f0` → merge `76019de` → format `2cc3c7c`，均为 main 祖先；CI + Deploy 双绿。
  - 独立复核：`.param-input` / `.param-slider` / `.composition-field` / `.btn` / `.btn-preset` 状态选择器齐全（Slider hover 按规范 §2.6 为「—」）；`count:check` 2873 一致；定向测试 20 passed。
- [x] **#147（P3 · area:render · CLOSED）Design Token 切片 2 延伸：消除 DOM inline style 硬编码色**
  - 交付 `2d41456` → merge `6d99989`，均为 main 祖先；CI + Deploy 双绿。
  - 独立复核：CompositionLab `style={` 计数 0；OCRPanel 无颜色字面量（仅隐藏 file input `display:none`）；MeasurementToolbox 使用 `.gate-a/.gate-b`（`var(--accent2)/var(--warn)`），其余内联为拖拽坐标；定向测试 20 passed。

## 阻塞 / 待处理（parked / blocked）

- **#150（P3 · blocked）**：依赖 #149；Planner 在 #149 验收通过后解除，不得提前领取。
- **#44（P2 · type:chore/area:ci · parked）React 19 专项迁移** —— D44 = **B**（用户 2026-10-18 拍板）：**暂不升**；解除条件三条（用户改选 A/C、React 19 出现已验证功能收益、react 18 遇安全/兼容硬约束）。**勿领**。
- **#100（P2）/#101（P3）** —— parked（D19），**M7 期间勿领**；D51 已答复：**M7 三切片（#148/#149/#150）全部 CLOSED 后解冻**，转产品功能线，顺序 **#100 → #101**（届时由 Planner 摘 `parked`、加 `ready-for-agent` 并重写验收项）。
- **观察（不建单，需用户点头才做）**：`origin/agent/issue-95-shadow-adaptive`(`ba0bd6f`) 与 `origin/agent/issue-96-default-on-grid`(`f73f21a`) 两个远程分支已是 main 祖先且对应 Issue 已 CLOSED，属 §1.9 未执行的清理。删除远程分支影响共享状态且契约 1.9 禁止 agent 删他人分支，本轮**只上报、不代删**。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（外部/依赖阻塞）· parked（排程冻结 D19/D44）· needs-info（需决策）；closed = done
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0）；P2 为当前核心质量收口，P3 为次级迁移切片
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list/view` 实拉整体重写）；当前 open 共 6 单 = ready 2 + blocked 1 + parked 3，in-review 0
- 契约 1.2：本轮未发现 `.agent/LOCK` 残留
- **pending 决策**：清零（D51 已获用户答复：先完成 M7，收官后解冻 #100/#101 转产品功能线）
