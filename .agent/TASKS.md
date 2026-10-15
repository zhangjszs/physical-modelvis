# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 2026-10-15 · 三十次滚动）。标签映射：`ready-for-agent` ≡ ready；
> `closed` ≡ done。本文件只读镜像，执行者改状态时先改 Issue 再同步本行（冲突以 Issue 为准）。

## 今日队列（执行顺序，2 个）

- [ ] #124（P3 · type:chore/area:render · open/ready）渲染层 extra/meta 四处 as unknown as 类型化收口（#82 未覆盖面）
  —— 验收要点：全仓 `as unknown as` 零残留（4 站点逐一消解）+ typecheck 绿 + 契约/渲染测试绿 + precheck 绿；禁新添 any；实现路线二选一单内定
- [ ] #125（P3 · type:chore/area:render · open/ready）光敏电阻面板公式与计算式对齐（含引擎温度项）
  —— 验收要点：450 行旧式子无残留（二选一：补全式 / 条件注）+ 系数与引擎同源 + precheck 绿；禁改计算逻辑与引擎系数

## 本轮关闭（done，三十次滚动验收通过 · 2026-10-15）

- [x] #122（P3）门禁稳定性：vitest 首跑抖动转观测 —— 12/12 复现全绿不可复现，未硬造根因；`.husky/pre-push` 失败归档 + sh -e 兼容修复入库；CI/Deploy@2fd64c6/f946b0c success；L320 记观测中
- [x] #123（P3）docs 索引补全：两份 survey 入 docs/README.md —— §4 表 62/63 行在位（直接读文件复核）；precheck 绿；CI/Deploy success

## 待用户决策

- **D31（pending，第 2 天）**：#103 派生三张重构实施单是否放行（原语抽取 / CanvasRenderer 切分 / FormulaPanel 数据外迁；触 1.10 红线）。
  推荐 = 默认 = **暂缓**（不进 ready）。连续 3 天无答复则默认转正。

## 候选 / parked（不执行）

- #100（P2）/#101（P3）—— ready-for-agent 但维持 parked（D19；D29 仅放行调查类，三单已 CLOSED）
- #99（P2）/#105（P3）—— needs-info（D20/D21：真实发布暂缓、英文随发布走）
- #44（P2）—— 人类持有，勿动
- 候选（未立单）：新增模型触点收敛 / 自动注册调查（#104 §5.4）；#122 根因单（待下次抖动带 .scratch 日志出现时立）

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· needs-info（需决策）；closed = done
- 本仓库沿用 `ready-for-agent`（历史约定），不引入新 `ready` 标签，避免执行侧识别断裂
- 本仓无 `priority:P4` 标签（P3 即最低）
