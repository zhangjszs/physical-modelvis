# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 **2026-10-17 三十三次滚动**）。
> 三十二次滚动队列 5 单验收：#99 已 CLOSED（零代码，门禁已在 main）；#105/#132/#133/#126 **内容通过但未合入 main**，延后关闭，统一转 #134 集成单。

## 今日队列（执行顺序）—— 1 个 ready + 4 个延后关闭

- [~] **#134（P1 · type:chore/area:render · in-review）集成收尾：将已验收的 #105/#132/#133/#126 四分支协调合入 main**
  - 执行要点（原文）：队首 · 关键路径。按序 merge #105→#133→#132→#126；解 README.md 交叉改动（#105 顶部英文块 vs #132 第 7 行测试数）；`count:sync` 回写（预期 viz 1671 / total 2840）；`precheck` 全绿；push 触发完整 CI；删 4 分支；补 #126 红向探针（不存在 handle key → tsc TS2339）。全程禁 `--no-verify`。
  - ✅ **执行棒 `executor-20261017b` 完成**（结论=完成）：`--no-ff` 按序合入 #105→#133→#132→#126（保留原始 SHA，4 交付 commit 现均为 main 祖先）；README.md ort 自动合并、英文块 + 测试数行两处共存无冲突；`count:sync`=core 1169/viz 1671/total 2840（标记无需改动）；#126 红向探针报 TS2339 已还原；`precheck` exit 0；push `916ec05` 走完整 pre-push 钩子（未 `--no-verify`）；CI `39039555596` + Deploy `39039667251` 均 success；4 临时分支已删。**#105/#132/#133/#126 commit 现已在 main → Planner 下轮可关闭四单。**

### 待合入即关闭（in-review · 由 #134 承载合入量 · 规划者不 merge）

- [~] #105（P3 · type:docs · **in-review**）README 英文摘要 + badge + CONTRIBUTING first-contribution —— 内容验收通过（D39 一致，`npm i physics-core` grep=0）；commit `c7e20ed` @ `agent/issue-105-external-entry`（未合入 main）
- [~] #132（P2 · type:chore/area:render · **in-review**）实施单 α：PanelSection + LazyPanel 抽取 + DataDrawer/WorkbenchScene 迁移 —— 内容验收通过（组件在位 · ErrorBoundary=0 · 8 例测试 · common/ 零强转）；commit `202417f` @ `agent/issue-132-panel-alpha`（未合入 main · 测试数 +8 待 sync）
- [~] #133（P3 · type:docs · **in-review**）docs/README.md 索引补 #131/#130 两行 —— 内容验收通过（+2 行 · 目标文件在 main 存在）；⚠️ `--no-verify` + force-push 纪律偏差已登记；commit `6d5868a` @ `agent/issue-133-docs-index`（未合入 main）
- [~] #126（P3 · area:render · **in-review**）Rig handles 双向 `as unknown as` 清零（D36）—— 内容验收通过（rigs/ 220→1）；`handles: unknown` 方案经规划者裁定接受（等价泛型，见 #126 comment）；commit `83da967` @ `agent/issue-126-rig-generic`（未合入 main · #134 合入时补红向探针）

## 本轮关闭（done · 三十三次滚动验收）

- [x] #99（P2 · type:chore/area:ci）发布 dry-run 门禁切片 —— 零代码变更，交付物已在 main（`check-publish-dryrun.mjs` 156 行 + `ci.yml:68` + precheck 链含 `check:publish`）；D38 授权兑现；验收 comment 在案。

## 已确认决策（本轮新增 D41）

- **D41**：三十三次滚动 —— 合入 main 属执行动作、规划者不 merge（建 #134 承载 4 单集成）；#126 `handles: unknown` 方案裁定接受（等价泛型）；#133 `--no-verify` + force-push 纪律偏差登记（不另立整改单）。
- **D38/D39/D40**（三十二次滚动）：#99 只加 dry-run 门禁不真发布 · #105 英文物料先行 · #44 vendor-react 懒拆保 70kB（拆单验收含首帧探针）。

## 阻塞 / 待处理

- **实施单 β（#131 产出：`common/NumberField` 统一 + CompositionLab/ParameterPanel 迁移）**：依赖 α（=#132）先落 main，**#134 完成前不入 ready**；α 落地后规划者据 `docs/composition-reuse-boundary.md` §β 建单。
- **实施单 γ（#131 产出：`common/StepWizard` + `OverlayDrawer`）**：同依赖 α；与 #130 token 对接但不阻塞。排在 β 之后。
- **#130 token 4 切片**（补 `--surface` 等 :root token / 消 inline 硬编码 / 控件状态落地 / 遮罩统一）：其中「消 inline 硬编码」会改 DataDrawer/WorkbenchScene，与未合入的 #132 撞车，**须待 #134 落地后再排**；补 token 定义切片相对独立，可作 β/γ 之后的候选。均为派生 backlog，未建单（防撞车与范围蔓延）。
- #100（P2）/#101（P3）—— 维持 parked（D19）；已挂 `parked` 标签，标签-排程一致。
- #44（P2）—— 决策已定（D40）但未拆单；下一批由规划者拆「vendor-react 懒拆」实施单（验收含生产构建 + headless 首帧探针）后排程。
- 观察：引擎 `photoresistor.ts` explanation 文案温度项（无渲染正确性影响，暂不立单）；FormulaPanel 同型错式已随 #128 收口清零。

## 标签说明

- 状态：parked（排程冻结 D19/D31）· ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收/内容已验收待合入）· blocked（前置未就绪）· needs-info（需决策）；closed = done
- 本仓沿用 `ready-for-agent`，不引入新 `ready` 标签；`parked` 为 2026-10-17 新建
- 本仓无 `priority:P4` 标签（P3 即最低）
