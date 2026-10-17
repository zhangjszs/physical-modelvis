# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 **2026-10-17 三十四次滚动**）。
> #134 集成收尾验收 CLOSED；#105/#132/#133/#126 据 D41 关闭（commit 已入 main，in-review 清零）；α 落 main 解锁 β/γ 入 ready。

## 今日队列（执行顺序，2 个）—— 已全部完成入 main

- [x] **#135（P2 · type:chore/area:render · in-review）实施单 β：抽取 `common/NumberField` 统一数值控件并迁移 CompositionLab/ParameterPanel**
  - ✅ executor-20261017c 完成：交付 `4244b32` 经 `--no-ff` merge `a8dc71f` 入 main（SHA 成祖先）；NumberField.tsx 99 行 · 6 调用点无回归 · handleChange/store 零改动 · 新单测 10 例 · 测试数 total 2850 · CI `39043881529`+Deploy `39044065412` @ `a8dc71f` success · 全程无 --no-verify/force-push。**待 Planner 验收**。
- [x] **#136（P2 · type:chore/area:render · in-review）实施单 γ：抽取 `common/StepWizard` + `OverlayDrawer` 并迁移 GuidancePanel/ClassroomScriptPanel/WorkbenchScene 抽屉**
  - ✅ executor-20261017d 完成：交付 `829f990` 经 `--no-ff` merge `10dbba9` 入 main（SHA 成祖先）；OverlayDrawer 78 行（portal body·避 #112）+ StepWizard 120 行（wizard/stepper 双模式）· 迁移三处（guidance-* / script-stepper / formula-drawer class 全保留）· 新单测 11 例 + **Playwright 双视口冒烟 `verify-overlay-drawer-smoke.cjs` exit 0**（1440×900/1024×768 portal/不溢出/遮罩关闭）· `verify-guidance-smoke` 回归绿 · total 2861 · CI `39048587934`+Deploy @ `10dbba9` success。**待 Planner 验收**。

## 本轮关闭（done · 三十四次滚动验收）

- [x] #134（P1）集成收尾 —— 4 分支 `--no-ff` 合入 main（`c7e20ed`/`6d5868a`/`202417f`/`83da967` 均为祖先）；README `1169/1671/2840` 一致；rigs/ 强转=1；**CI+Deploy @ `916ec05`+`b0fa7de` success**；#126 红向探针 TS2339 在案；4 临时分支已删。规划者独立复核逐条达成，D41 闭环。
- [x] #105（P3）README 英文摘要 + badge + CONTRIBUTING first-contribution —— commit `c7e20ed` 已入 main，内容三十三次滚动已验收（D39 一致）。
- [x] #132（P2）实施单 α：PanelSection + LazyPanel 抽取 —— commit `202417f` 已入 main，内容前轮已验收；α 落地解锁 β/γ。
- [x] #133（P3）docs/README 索引补 #131/#130 —— commit `6d5868a` 已入 main；`--no-verify`+force-push 纪律偏差已于 D41 登记（不另立单）。
- [x] #126（P3）Rig handles `as unknown as` 清零（D36）—— commit `83da967` 已入 main；`handles: unknown` 等价泛型方案经 D41 裁定 + #134 红向探针实测支持。

## 已确认决策（本轮新增 D42）

- **D42**：三十四次滚动 —— #134 通过；据 D41 关闭 4 延后单；**确立「交付 commit 以 `--no-ff`/trunk 使 SHA 成 main 祖先 + CI 绿」为后续实施单集成的既定口径**；排 β(#135)/γ(#136) 入 ready。
- **D41**（三十三次滚动）：合入 main 属执行动作、规划者不 merge（#134 承载）；#126 `unknown` 方案接受；#133 纪律偏差登记。
- **D38/D39/D40**：#99 只加 dry-run 门禁 · #105 英文物料先行 · #44 vendor-react 懒拆保 70kB（拆单验收含首帧探针）。

## 阻塞 / 待处理

- **#100（P2）/#101（P3）**—— 维持 parked（D19）；`parked` 标签与排程一致，执行者勿领。
- **#44（P2）**—— 决策已定（D40）但未拆单；下一批由规划者拆「vendor-react 懒拆」实施单（验收含**生产构建 + headless 首帧探针**，#111 教训）后排程；本轮优先复用线 β/γ。
- **派生 backlog（未建单，防撞车/范围蔓延）**：
  - #130 token 4 切片（补 `--surface` 等 :root token / 消 inline 硬编码 / 控件状态落地 / 遮罩统一）——「消 inline 硬编码」原撞 #132 改动面，现 #132 已入 main 冲突消除，可待 β/γ 后定级入队。
  - β 之后的其余 panel-section 壳迁移（CompositionStage 等，~19 处）——按模块逐步，α/β/γ 先立范式。
- 观察：引擎 `photoresistor.ts` explanation 文案温度项（无渲染正确性影响，暂不立单）。

## 标签说明

- 状态：parked（排程冻结 D19/D31）· ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收/内容已验收待合入）· blocked（前置未就绪）· needs-info（需决策）；closed = done
- 本仓沿用 `ready-for-agent`，不引入新 `ready` 标签；`parked` 为 2026-10-17 新建
- 本仓无 `priority:P4` 标签（P3 即最低）
