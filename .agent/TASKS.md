# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 **2026-10-17 三十二次滚动**）。昨日 5 单验收关闭；用户 2026-10-16 两轮拍板已落盘 D38/D39/D40；#100/#101 标签卫生已修复（新 `parked` 标签）。

## 今日队列（执行顺序，5 个）—— 全部 in-review

- [x] #99（P2 · type:chore/area:ci · **in-review**）发布门禁切片：CI 补 `npm publish --dry-run` + files/类型入口/体积三类断言
  —— 零代码变更（#107 已覆盖）；红向验证完成；报告见 Issue comment
- [x] #105（P3 · type:docs · **in-review**）外部入口齐备：README 英文摘要 + badge 行 + CONTRIBUTING first-contribution
  —— commit `c7e20ed` @ `agent/issue-105-external-entry`
- [x] #132（P2 · type:chore/area:render · **in-review**）实施单 α：抽取 PanelSection（≤60 行）+ LazyPanel（≤80 行）
  —— commit `202417f` @ `agent/issue-132-panel-alpha`；测试数 +8
- [x] #133（P3 · type:docs · **in-review**）docs/README.md 索引补 #131/#130 两行
  —— commit `6d5868a` @ `agent/issue-133-docs-index`
- [x] #126（P3 · area:render · **in-review**）`Rig<H>` 泛型化收口 84 文件 / 225 处 handles 双向强转（D36）
  —— commit `83da967` @ `agent/issue-126-rig-generic`；216 处消除 + 1 处非范围

## 本轮关闭（done · 三十二次滚动验收）

- [x] #131（P2）组件复用边界调查 —— 330 行文档；7 组候选/6 接口草案/3 实施单；验收 comment 在案
- [x] #130（P2）统一外部界面风格调查 —— 249 行文档；7 类分歧/token 六类全表/3 验证组件
- [x] #127（P3）pre-push 归档路径改良 —— 三级回退在位；非沙箱 `6ce58ae` 现场「归档源: system」+ 11 层 PASS
- [x] #128（P3）FormulaPanel 光敏电阻指数式 —— 幂律旧式 0 残留；4 例守卫本轮独立重跑 passed
- [x] #129（P3）AGENTS.md 补 extra/meta 守卫口径 —— L45 单行追加，与 #82 charts 双柱并列

## 已确认决策（本轮新增 D38–D40）

- **D31**：#103 派生三张大规模重构实施单长期暂缓（默认转正，不建对应 issue）。
- **D36**：#126 `Rig<H>` 泛型化用户放行 —— 前置 #131 已完成，本轮摘 `blocked` 转 ready。
- **D37**：物理世界盒子方向：先统一界面风格 + 组件复用（α→β→γ 序）。
- **D38**：#99 只加 CI dry-run 门禁，不真发布；包名保持 `physics-core`；版本 = 手动 bump+tag（本轮仅登记选型，不建流水线）。
- **D39**：#105 英文摘要 + badge + first-contribution；不整篇双语；剔除 npm i 示例；入门 = TASKS.md/认领（取代 D21 旧口径）。
- **D40**：#44 vendor-react 懒拆/预加载保 70kB 门禁；拆单验收必须含「生产构建 + headless 首帧探针」。

## 阻塞 / 待处理

- #100（P2）/#101（P3）—— 维持 parked（D19）；本轮已建 `parked` 标签并摘 `ready-for-agent`，标签-排程背离消除
- #44（P2）—— 决策已定（D40）但未拆单；下一轮拆「vendor-react 懒拆」实施单（验收含首帧探针）后排程
- 派生 backlog（未建单，防撞车与范围蔓延）：#131 实施单 β（依赖 α 完成）/ γ（依赖 α）；#130 token 4 切片（补 `:root` token / 消 inline 硬编码 / 控件状态落地 / 遮罩统一）—— 待 α 落地或下一轮定夺
- 观察：引擎 `photoresistor.ts` explanation 文案温度项（无渲染正确性影响，暂不立单）；FormulaPanel 同型错式已随 #128 收口清零（第三十一/三十二轮复核）

## 标签说明

- 状态：parked（排程冻结，D19/D31 口径）· ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（前置未就绪）· needs-info（需决策）；closed = done
- 本仓沿用 `ready-for-agent`，不引入新 `ready` 标签；`parked` 为 2026-10-17 新建（原 ready-for-agent 与 D19 冻结排程长期背离，本轮修复）
- 本仓无 `priority:P4` 标签（P3 即最低）
