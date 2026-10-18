# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 **2026-10-18 三十六次滚动**）。
> 昨日 #135/#136 验收通过并 CLOSED（in-review 维持清零）；今日队列 3 单（#137 → #138 → #139）；#140 保持下一批备选；#44 标 blocked（依赖 #140）。

## 今日队列（2026-10-18 · 执行顺序，3 个）

- [ ] **#137（P2 · type:bug/area:render · ready-for-agent）窄视口工作台侧栏遮挡「公式推导」触发按钮（1024×768 下真实点击被 classroom-inspector 拦截）**
  - 证据：Planner 2026-10-18 复测 button rect `x=926 y=79 w=82 h=40`；inspector rect `x=688 y=84 w=320 h≈399`；`elementFromPoint` 命中 `ASIDE.classroom-inspector`，真实点击不可达；1440×900 正常。
  - 验收：真实 `locator.click()` 开抽屉（禁 DOM click 绕过）；双视口无水平滚动；inspector 可操作；扩展 `verify-overlay-drawer-smoke.cjs`；precheck/count/CI/Deploy 全绿。
- [ ] **#138（P2 · type:chore/area:render · ready-for-agent）Design Token 切片 1：补全 `:root` 语义 token 并修复 `--surface` 未定义**
  - 证据：`--surface` 被用 6 处但从未定义；亮色 guidance/export 回退深色 `#1e293b`；4 处面板背景透明；`--overlay-bg` / `--shadow-drawer` / `--space-*` / `--text-*` / `--radius-xs` 均缺。
  - 验收：补 token（暗/亮覆盖）；静态 token 契约测试红→绿；亮/暗 guidance + export 实际背景探针；不改 inline 硬编码/遮罩实际引用；precheck/count/CI/Deploy 全绿。
- [ ] **#139（P3 · type:chore/area:render · ready-for-agent）组件复用收口：PanelSection 壳迁移 7 文件 14 处**
  - 范围：CompositionLab 5 / StateInspector 2 / DiagnosticsPanel 2 / ParameterPanel 1 / GraphPanel 1 / App 1 / PhotogateTimer 2；FormulaPanel 除外（D31）。
  - 验收：7 文件无直接 `className="panel-section"`；DOM/class/文案不变；≥2 回归测试（StateInspector 空态 + PhotogateTimer 附加 class）；precheck/count/CI/Deploy 全绿。

## 昨日验收（done · 三十五次滚动）

- [x] **#135（P2）实施单 β：NumberField 统一 + CompositionLab/ParameterPanel 迁移** —— 通过，CLOSED。
  - 证据：`4244b32` 为 main 祖先；NumberField 99 行/强转 0；CompositionLab 本地定义已删；ParameterPanel 仅换 JSX；重跑 21 + 80 passed；count:check 2861；CI `39043881529` + Deploy `39044065412` @ `a8dc71f` 双绿。验收评论在 Issue。
- [x] **#136（P2）实施单 γ：StepWizard + OverlayDrawer + 三处迁移** —— 通过，CLOSED。
  - 证据：`829f990` 为 main 祖先；StepWizard 120 / OverlayDrawer 78 行、强转 0；三处迁移在位；wizard-overlay 11 passed；**Planner 独立重跑 Playwright 双视口 exit 0**；count:check 2861；CI `39048587934` + Deploy `39048748078` @ `10dbba9` 双绿。验收评论在 Issue。
  - 附带发现：1024×768 inspector 遮挡「公式推导」→ 已转 #137（不 reopen #136）。

## 下一批 ready（未入今日队列，今日不领）

- [ ] **#140（P2 · type:chore/area:ci · ready-for-agent）vendor-react 懒拆 / 预加载：React 19 前置，保 70kB 首屏门禁 + 生产构建 headless 首帧探针**
  - D40 用户已定；验收含生产构建 + headless 首帧探针（#111 教训）、`LAZY_BUDGETS` 增加 `vendor-react-`、CI/Deploy 双绿。完成后解锁 #44。

## 阻塞 / 待处理

- **#44（P2 · type:chore/area:ci · blocked）React 19 专项迁移** —— 正文已按 2026-10-18 实况重写：vite 8.3.1 / express 5.2.1 / TS 7.0.0 / vitest 5.0.3 已在大版本线；剩余 React 19（blocked by #140）+ recharts 3 / three 0.186 / jsdom 30 / jest-dom 7 / eslint 10 / @types/node 26 逐项另议。**勿领**，待 #140 完成。
- **#100（P2）/#101（P3）** —— parked（D19），勿领。
- **#130 §5 切片 2–4（未建单）** —— 消 inline 硬编码色 / 控件状态规范 / 浮层遮罩统一；待 #138 落地后由 Planner 拆单，避免与 #138 同窗冲突。
- 观察：`.classroom-script-panel` / `.quiz-option` / active tab 的 `var(--surface)` 透明问题归 #138（已纳入），不另立单。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（前置未就绪）· parked（排程冻结 D19/D31）· needs-info（需决策）；closed = done
- 本仓沿用 `ready-for-agent`，不引入新 `ready` 标签；`parked` 为 2026-10-17 新建
- 优先级：P0 最多 2 个；P1 与今日容量匹配；本仓无 `priority:P4` 标签（P3 即最低）
