# TASKS（GitHub Issue 本地镜像）

> Planner 每轮整体重写；Executor 改状态先 Issue、后本文件对应条目。权威来源：GitHub Issues（2026-10-23 · 四十七次滚动实拉，未降级）。
> 开放 4 单：ready 0 + in-progress 0 + in-review 3（#101/#151/#154）+ blocked 1（#44，已确认冻结）。needs-info / P0 / P1 均为 0。
> 状态沿用仓内映射：ready = `ready-for-agent`；done = CLOSED；`parked` 仅排程属性，不是第二个生命周期状态。完整验收标准以 Issue 正文及最新 Planner comment 为准。

## 昨日验收（2026-10-22 日报 → 2026-10-23 复核）

- **#101：报告失实，重开 → in-progress；首次验收退回。** 认可四模板已交付和浏览器可加载，不认可把 PNG 压缩字节差异 98.3% 当像素差异、用场源数量 >0 当逐模板正确数量、用端点/单调性当圆弧/抛物线数学验证。另实测拖动后模板高亮/教学目标未清除。原 D58 通过记录由 D59 纠正，M8 产品进度退回 1/2。
  - 完整差距与恢复协议：[Planner 退回 comment](https://github.com/zhangjszs/physical-modelvis/issues/101#issuecomment-6355227373)。旧日报不可编辑，Executor 只追加更正。
- **#152：通过，维持 CLOSED。** `git show 29d73a2` 只有 action 版本一行变更；QA run `39778247099` success，artifact `qa-sweep-report-26` 1120 bytes，check-run annotations 仅 Ubuntu 26 notice、无 Node 20 弃用告警；本轮在 Issue 追加复核证据，不重复关闭。
- 本轮真实浏览器交互探针 exit 0、零 console error；已查看速度选择器/质谱仪截图，但这不补足上述定量像素/形状证据。
- `npm run count:check` exit 0，读取已有测试 JSON 报告并核对 13 个数字/3 处标记：1169 + 1794 = 2963；验收取证阶段未另跑全套单测；提交推送由既有 pre-push 强制执行 precheck，结果以钩子输出为准。HEAD `123a7b6` 的 CI `39814573581` / Deploy `39816033106` / QA `39860609121` 均 success。

## 在途恢复（优先于领取 ready，不伪装为 ready）

### #101 · 补齐模板验收证据并修复拖动后的模板标识

- Issue：[组合实验台预设模板](https://github.com/zhangjszs/physical-modelvis/issues/101)
- 状态：**in-review**；优先级 P2；Milestone：[M8 组合实验台产品功能线](https://github.com/zhangjszs/physical-modelvis/milestone/1)，1/2。
- 范围：现有 `compositionStore.ts`、`compositionStore.test.ts`、`compositionTemplates.test.ts`；更正执行报告，追加更正日报。原四模板范围不扩大。
- 不包含：不改物理引擎、不换状态框架、不在本单改交互探针（归 #151）、不新添器材。
- 实现依赖：#100 已 CLOSED；无外部实现阻塞。最终像素验收复用 #151 交付；这不是 store/测试返工的开工依赖。
- 必须逐条交付：
  - [x] 四模板成功完成且源数按独立期望 **3/3/2/1** 验证，不能只断言 >0。
  - [x] 平行板位移符合独立恒加速度二次关系；质谱仪磁场区轨迹符合独立圆弧半径/圆心残差；容差有物理/积分误差依据，两类受控错误反例可拦截并恢复。
  - [x] 加载 → 实际移动 → commit 后 `activeTemplateId` / 高亮 / 教学目标清除；仅选中器材保持模板激活。现有测试捕捉转换，真实浏览器拖动复核，零 console error。
  - [x] 纠正旧报告的 PNG/像素与形状验证误述；#151 未交付时视觉项不得声称完成；DIARY 只追加更正。
  - [x] 保留原 ≥3 模板、参数合法/0.25m 网格、单次重仿真、precheck、CI/Deploy、--no-ff 祖先与测试数同步标准。
- 连续验收退回计数：1；再失败则 Planner 必须拆分/重定标准，不准第三次盲试。原通过历史不是一次失败。

## 今日队列（2026-10-23 · 2 个 ready，建议顺序）

### 1. #151 · 用真实像素验证组合台交互（P3）

- Issue：[浏览器探针视觉断言强化](https://github.com/zhangjszs/physical-modelvis/issues/151)
- 状态：**in-review**；Milestone：[M8 收尾：交互证据与演示物料](https://github.com/zhangjszs/physical-modelvis/milestone/2)，0/2。
- 范围：`scripts/verify-composition-interaction.mjs`；将模板加载前后旧 PNG 字节比较迁为同尺寸解码 RGBA，并补改朝向、暂停、跳帧的画布断言与实际倍速推进比。
- 不包含：不改应用/store/引擎；不新增依赖、CI job、视觉基线库；发现真实应用 bug 另报，不放宽断言。
- 依赖：无未完成实现依赖。模板实现已在 main；#101 返工限 store/测试，本单独占探针，所以旧“#101 CLOSED”文件冲突门禁已取消，避免互等。
- 验收标准：
  - [x] 同尺寸解码 RGBA、变化像素数/总像素数；排除回放 DOM、光标/hover，固定暂停时间、相机与分辨率；模板加载旧伪像素指标一并纠正。
  - [x] 改朝向画布变化、暂停跨 300ms 像素静止、不同真实轨迹时刻跳帧画面变化；0.5x/2x 在同一非零墙钟窗口推进比约 4:1，避开边界/循环，输出指标及容差依据。
  - [x] “只改读数不重画”和“暂停画布仍变化”两种受控反例各触发正确断言 exit 1；截图留 `.scratch/`，恢复后正常探针 exit 0。改断言阈值不算反例。
  - [x] 原 10 项交互断言保留、零 console error；正确旧日志保持，错误伪指标日志允许且必须更正。
  - [x] precheck exit 0、CI/Deploy 双绿、--no-ff 祖先；测试数变化才 count:sync。
- 测试要求：实跑生产 preview 浏览器 + 两类红向证据；不新增源码字符串/mock 回声式单测。

### 2. #154 · 更新组合台演示物料并移除 OCR 绕行（P3）

- Issue：[README 演示截图脚本与物料更新](https://github.com/zhangjszs/physical-modelvis/issues/154)
- 状态：**in-review**；Milestone：M8 收尾：交互证据与演示物料，0/2。
- 范围：`scripts/capture-screenshots.mjs` 的 04/06 配方、对应图片与必要说明；06 加载代表性模板，展示目标、轨迹、回放栏与双色场线；04 移除 OCR `addStyleTag` 绕行，头注释反映 #111/#112 已修复。
- 不包含：不改业务/引擎、不改 1440×900、不提交无关场景重采图；不恢复旧 README 或覆盖用户 `123a7b6` 表格布局。
- 依赖：无未完成硬依赖；#151 → #154 只是建议顺序。#101 已交付模板可用，其 store/测试返工不阻塞配方修改。
- 验收标准：
  - [x] 04 原始 Portal 画面在视口内，不用临时样式；06 真实展示模板专区、目标、完整轨迹与回放栏。
  - [x] `node scripts/capture-screenshots.mjs` 自建生产产物/preview 后 exit 0；六图 1440×900，单张 ≤1MiB、合计 ≤8MiB；报告体积与真实图像核对证据。
  - [x] README 引用/说明与新图一致，保留用户布局；其他图不提交无关重采；保留确定性所需场景切换，沿 #115 有界确定性，不承诺六图跨会话逐字节一致。
  - [x] precheck exit 0、CI/Deploy 双绿、--no-ff 祖先。
- 测试要求：运行现有采集脚本，查看真实 04/06 图片；不写业务测试。

## 冻结 / 不可领取

- **#44 · blocked · P2 · parked 属性**：[暂缓 React 19](https://github.com/zhangjszs/physical-modelvis/issues/44)。D44=B 已确认；#140/#141 已 CLOSED，不再冒充未完成前置。只有用户改选 A/C、具体功能收益或 React 18 安全/兼容硬约束才重议。无 pending，勿安装试升、勿抬预算。
- 远程旧分支清理沿既定决定：只上报、不代删，不新问同一问题。

## 执行握手与本轮治理

- 先恢复 #101，再按 #151 → #154 领取；每单领取/报告走 Issue comment，规范 in-progress → in-review，**Executor 不 close**。
- #101 与 #151 是互补范围，不重复建单：前者 store/数量/轨迹形状，后者浏览器解码像素。两单都具备证据后 Planner 再验收 M8；当前不可称收敛。
- 4 个未完任务逐项治理：无重复/方向冲突；P0/P1 均 0；无待定级 auto-discovered；P3 两单未跨两个 Milestone 饥饿；无超过 24h 且缺日报的在途任务（#101 是本轮重开，不是中断）；ready 两单七项门禁通过。
- Executor 文件只读：STATE/HANDOFF 仍写昨日待验收及 #151 blocked，已在 Issue comment 交接纠正，由 Executor 下轮更新，Planner 不代改。
- pending：**0**。不设锁、不读取或创建锁；历史 LOCK 提醒不作为开工条件。