# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 2026-10-14 · 二十九次滚动）。标签映射：`ready-for-agent` ≡ ready；
> `closed` ≡ done。本文件只读镜像，执行者改状态时先改 Issue 再同步本行（冲突以 Issue 为准）。

## 今日队列（执行顺序，2 个）

- [ ] #122（P3 · type:chore/area:ci · **ready**）门禁稳定性：pre-push core vitest 首跑抖动（累计 4 次，达 L320 阈值）
  —— 验收要点：复现数据（≥10 次计数）+ 根因证据链 + 缓解落地后连续 10 次首跑绿（或转观测）；禁改 workflows/；禁 --no-verify；precheck 绿
- [ ] #123（P3 · type:docs · **ready**）docs 索引补全：两份 survey 入 docs/README.md
  —— 验收要点：两份 survey 条目在列；precheck 绿（docs-only）

## 本轮关闭（done，二十九次滚动验收通过 · 2026-10-14）

- [x] #118（P2）portal 浮层设计令牌作用域修复 —— `:root` + `:root.light` + App.tsx 镜像在位；探针入库；04/05 重采；CI/Deploy@7b7ce7a success
- [x] #119（P3）线圈场零分配标量重写 —— 三文件 54 passed 复跑；查表位等价（误差 0，6.7–7.4×）；测试数 1160→1167；CI/Deploy@bb67e59 success
- [x] #120（P3）引擎契约点状收口 —— 幽灵零残留；ConstraintFieldName + 常驻测；测试数 1167→1169；#104 C3 口径修正收录 D32
- [x] #121（P3）#103 调查落档 docs/ —— 168 行；drawMiniChart=3 复核；CI/Deploy@7b7ce7a success；索引建议转 #123

## 待用户决策

- **D31（pending，第 1 天，同日）**：#103 派生三张重构实施单是否放行（原语抽取 / CanvasRenderer 切分 / FormulaPanel 数据外迁；触 1.10 红线）。
  推荐 = 默认 = **暂缓**（不进 ready）。

## 候选 / parked（不执行）

- #100（P2）/#101（P3）—— ready-for-agent 但维持 parked（D19；D29 仅放行调查类）
- #99（P2）/#105（P3）—— needs-info（D20/D21：真实发布暂缓、英文随发布走）
- #44（P2）—— 人类持有，勿动
- 候选（未立单）：新增模型触点收敛 / 自动注册调查（#104 §5.4）；extra/meta 强转类型化（PLAN 遗留观察）；canvas 公式标注粒度

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· needs-info（需决策）；closed = done
- 本仓库沿用 `ready-for-agent`（历史约定），不引入新 `ready` 标签，避免执行侧识别断裂
- 本仓无 `priority:P4` 标签（P3 即最低；#123 以 P3 落盘）
