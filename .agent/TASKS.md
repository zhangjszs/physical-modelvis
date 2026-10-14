# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 2026-10-14 · 二十八次滚动）。标签映射：`ready-for-agent` ≡ ready；
> `closed` ≡ done。本文件只读镜像，执行者改状态时先改 Issue 再同步本行（冲突以 Issue 为准）。

## 今日队列（执行顺序，4 个；同级按创建时间）

- [ ] #118（P2 · type:bug/area:render · **in-review**）portal 浮层脱离 .app 设计令牌作用域修复（#112 样式回归）
  —— 验收要点：`:root` 令牌生效（computed-style 探针红→绿，探针入库、不入 CI）；亮/暗双主题；04 图重采（01/02 仍逐字节一致）；precheck 绿
  —— 执行报告：方案 A 令牌上移 `:root` + `.app.light`→`:root.light` + App.tsx 镜像 `<html.light>`；探针 `scripts/verify-portal-tokens.mjs` 红→绿实测；04/05 重采（01/02/03/06 md5 不变）；precheck exit 0；`bb4ab22`+`ff8c730` 已推送
- [ ] #119（P3 · type:chore/area:engine · **in-review**）线圈场求值零分配标量重写（#102 方案 C1）
  —— 验收要点：对拍测试 ≤1e-12 先红后绿；bench ≥5×；precheck 绿；无行为变更
  —— 执行报告：标量化热循环 + 按 segments 缓存 cos/sin 查表（位等价、零漂移）；对拍 6 组误差 0 + 红向对照；bench 6.7–7.4×；precheck exit 0；测试数 1160→1167/total 2808；`e820f08`+`bb67e59` 已推送（首跑 vitest 拖动重试即过）
- [ ] #120（P3 · type:chore/area:engine · **in-review**）#104 方案 C 点状收口 + 两处陈旧注释订正
  —— 验收要点：readonly 37→0；幽灵字面量清零；keyof 收窄 + `@ts-expect-error`；barrel 注释；precheck 绿
  —— 执行报告：C1 37→0・C2 116→113・C3 ConstraintFieldName 收窄（+@ts-expect-error 常驻测，红向对照已验）・C4 barrel 注释・两处注释订正；#104“零迁移成本”漏计 tests/ 守卫消费者（em-guards.test.ts 已适配）；测试数 1167→1169/total 2810；precheck exit 0；`32936b6`+`8895727` 已推送
- [ ] #121（P3 · type:docs · **in-review**）#103 调查落档 docs/rendering-structure-survey.md
  —— 验收要点：与 #103 comment 一致；§I 未核实项补齐或明确标注；文档头含来源与红线声明
  —— 执行报告：新增 docs/rendering-structure-survey.md（168 行，平移 §A–§J）；§I 复核 drawMiniChart=3・极板 16/7/6 一致，顶层 .ts 实测 32（行数 20273 一致，已标注）；precheck exit 0；`045a502`+`7b7ce7a` 已推送

## 本轮关闭（done，二十八次滚动验收通过 · 2026-10-14）

- [x] #103（P2）渲染层结构治理调查 —— 坐标抽查全吻合（drawMiniChart 3 处 / 2894 / 2215 / 1886）；落档转 #121；重构实施未放行（D31）
- [x] #116（P2）截图重采 —— 01/02/03 逐字节一致（git 对象 md5 复核）；CI/Deploy@67f5d0c success；04 现状接受（#118 后重采）
- [x] #102（P3）多线圈性能调查 —— 复跑 bench exit 0（8.60× / 1.16e-14）；C1 转 #119
- [x] #104（P3）引擎契约调查 —— 抽查 116 接口 / 107 readonly / 3 幽灵 /「113 键」陈旧属实；C 方案转 #120
- [x] #117（P3）依赖审计 —— 复跑 0 漏洞；lockfile 未动；暂不纳 CI（D30）

## 待用户决策

- **D31（pending，第 1 天）**：#103 派生三张重构实施单是否放行（原语抽取 / CanvasRenderer 切分 / FormulaPanel 数据外迁；触 1.10 红线）。
  推荐 = 默认 = **暂缓**（不进 ready）。
- 已按默认先行（可叫停）：#102-C1（#119）与 #104-C（#120）两条最小切片，D30 记录。

## 候选 / parked（不执行）

- #100（P2）/#101（P3）—— ready-for-agent 但维持 parked（D19；D29 仅放行调查类）
- #99（P2）/#105（P3）—— needs-info（D20/D21：真实发布暂缓、英文随发布走）
- #44（P2）—— 人类持有，勿动
- 候选（未立单）：新增模型触点收敛 / 自动注册调查（#104 §5.4）；extra/meta 强转类型化（PLAN 遗留观察）；canvas 公式标注粒度

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· needs-info（需决策）；closed = done
- 本仓库沿用 `ready-for-agent`（历史约定），不引入新 `ready` 标签，避免执行侧识别断裂
