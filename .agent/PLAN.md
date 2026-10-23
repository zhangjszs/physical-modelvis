# PLAN

> Planner 当前快照 · 2026-10-23 · 四十七次滚动。权威任务总线：GitHub Issues；逐项可执行标准见 Issue 与 `TASKS.md`。决策/历史纠错见 `DECISIONS.md` D59；旧滚动路线图保留在 Git，不再重复维护互相矛盾的“当前队首”。

## 当前方向

先纠正验收证据，再收口组合实验台交互与演示物料；本轮不扩产品方向。昨日 #101 模板功能确已交付，但报告把 PNG 压缩字节差异当像素差异，且场源数量/轨迹形状测试不足，故重开返工；不能继续把 M8 写成已收敛。#152 工作流维护验收维持通过。

同步起点：main，`123a7b61d4b2fed3f27c57447f82855eeb6490ba`；fetch/pull --rebase exit 0，已最新。用户该提交的 README 重排保留。开放 4 单：ready 2、in-progress 1、blocked 1；无 in-review / needs-info / P0 / P1。

## 昨日验收（日报 2026-10-22）

| 任务 | 本轮结论 | 证据与影响 |
| --- | --- | --- |
| #101 四模板一键加载 | **报告失实，reopen → in-progress** | 功能已交付/浏览器可加载予以认可；PNG 98.3% 实为压缩字节差异；逐模板源数仅 >0、圆弧/抛物线仅端点/单调性不足。另真实拖动后模板高亮未清。完整差距见 [退回 comment](https://github.com/zhangjszs/physical-modelvis/issues/101#issuecomment-6355227373)。M8 回到 1/2。 |
| #152 QA upload-artifact v7 | **通过，维持 CLOSED** | `git show 29d73a2` 仅一行；QA `39778247099` success、artifact `qa-sweep-report-26` 1120 bytes，annotations 仅 Ubuntu 26 notice，无 Node 20 警告。[复核 comment](https://github.com/zhangjszs/physical-modelvis/issues/152#issuecomment-6355250303)。 |

- 独立两轴审查：Standards 1 项（拖动状态失效）；Spec 3 项（像素口径、源数、轨迹形状证据），细节见 D59；Planner 不修代码。
- 已实跑现有浏览器交互探针 exit 0、零 console error，并查看真实模板截图；此绿结果不补足缺少的像素/形状证据。
- `count:check` exit 0，核对已有 JSON 测试报告与文档：core 1169 / viz 1794 / total 2963。**验收取证阶段未重新执行全套单测；提交推送仍由既有 pre-push 强制运行 precheck，结果以钩子输出为准。**
- 起点 HEAD 的 CI `39814573581`、Deploy `39816033106`、QA `39860609121` 均 success；QA 产物 `qa-sweep-report-27` 4434 bytes。门禁绿不等于验收证据完整。
- 昨日日报“验收 #101/#152 → 解冻 #151”的信号已回应：#152 已复核、#101 必须纠错，#151 保持可执行并取消纯文件冲突关闭门禁，避免互等。

## 今日目标（2026-10-23）

- **先恢复 #101（P2 · in-progress）**：补逐模板独立精确源数 3/3/2/1、独立圆弧/二次位移断言与反例；修复真实移动后模板激活/教学目标未失效；重新报告、日报只追加更正。
- **ready 队列 #151 → #154**：真实 RGBA 像素与实际倍速证据落地；随后复采 04/06 展示模板/目标/轨迹/回放，移除 OCR 绕行，保留用户 README 布局。
- 输出目标为可逐条验收的 `in-review`，不是 Executor 自行 close；本轮不替 Executor 完成任何代码、测试或截图脚本修改。

## 当前 Milestone：M8 组合实验台产品功能线（已验收 1 / 2）

[GitHub Milestone #1](https://github.com/zhangjszs/physical-modelvis/milestone/1)，由关联 Issue 实际状态推算：#100 CLOSED、#101 OPEN。D58 的 2/2 收官由 D59 纠正。

### 目标与验收

- [x] **#100** 器材方向编辑与回放能力已验收；画布证据强化由 #151 承接。
- [ ] **#101** 四模板参数合法、轨迹正确、一键单次重仿真；逐模板源数、形状与模板状态转换有有效回归；报告更正、真实画布证据由 #151 交付后复用。原 precheck/CI/Deploy/--no-ff/count 标准保留。

### 完成信号（Success signal）

Planner 对 #101 原标准和本轮差距逐条验收通过并关闭；#100/#101 均 CLOSED。不能仅因模板按钮可点击或单测全绿宣称完成；#151 尚未提供画布证据时不能宣布产品验收收敛。

### 明确非目标（Non-goals）

不加新器材/新模板功能、不改引擎/公共 API、不引入统一状态框架、不做模板导入导出、不升级依赖。

### 在途恢复（非 ready 项）

**#101（P2 · in-progress）优先恢复**。只改 `compositionStore.ts` 与现有两份模板/store 测试，探针由 #151 独占；原报告不实不是让 Executor重做全部功能。退回计数=1；下次仍失败，Planner 拆分/重定标准，不第三次盲试。

## 当前 Milestone：M8 收尾——交互证据与演示物料（已验收 0 / 2）

[GitHub Milestone #2](https://github.com/zhangjszs/physical-modelvis/milestone/2)，#151/#154 均 OPEN。这是已有任务分组，不是新产品方向。

### 目标与验收

- [ ] **#151** 模板加载/改朝向/静止/跳帧采用真实解码像素证据，排除 DOM 遮盖和时间推进干扰，0.5x/2x 实际推进比约 4:1；两种受控反例可拦截。
- [ ] **#154** 04 OCR 不依赖临时样式，06 展示 M8 模板/目标/轨迹/回放；1440×900，单张 ≤1MiB、六图合计 ≤8MiB，README 与图一致。

### 完成信号（Success signal）

两 Issue 经 Planner 逐项验收 CLOSED；存在生产浏览器成功指标、两类红向失败截图/输出、真实更新的 04/06 图片及体积记录。沿 #115 有界确定性，不能承诺六图跨会话逐字节一致。

### 明确非目标（Non-goals）

不新增 CI job/依赖/视觉基线库，不改业务或物理功能，不重置其他无关截图，不恢复旧 README；不将 PNG 字节或时间标签变化冒充 WebGL 画布变化。

### 执行队列（2 个 ready；恢复 #101 后按序领取）

1. **[#151](https://github.com/zhangjszs/physical-modelvis/issues/151) 补真实画布像素及倍速证据（P3 · ready）**：独占 `verify-composition-interaction.mjs`；同尺寸 RGBA，固定暂停时刻/相机/分辨率，排除回放 DOM/光标/hover；输出变化像素率和推进比。模板加载旧伪指标一并更正；原十项正确断言保持；“只改读数不重画”和“暂停仍重画”各触发正确失败，恢复后正常运行。
2. **[#154](https://github.com/zhangjszs/physical-modelvis/issues/154) 更新演示截图与 OCR 配方（P3 · ready）**：既有采集脚本自动构建/preview 实跑；06 用代表模板，04 移除 addStyleTag，提交只含必要重采；在用户 `123a7b6` 的 README 表格上增量改说明。

两单七项 ready 门禁已核：目标/范围/非目标明确、无未决产品取舍、原实现依赖已交付、验收可判、不触红线；无硬性未完成依赖。#151 → #154 只是建议顺序，不能因把顺序误作依赖而冻结已 ready 的单。

## 已知阻塞与依赖

- **#101 ↔ #151 不互等**：#101 store/测试返工已可开工；#151 所需模板实现在 `1daf121` 已合 main。#101 最终像素证据复用 #151，所以在 #151 未交付前只报告部分完成，不谎称验收全过。
- **#44（P2 · blocked；parked 属性）**：D44=B 已确认暂不升 React 19；#140/#141 已 CLOSED，不再写成待完成依赖。只在用户改选 A/C、真实功能收益或 React 18 安全/兼容硬约束出现时重议；不重复问同一问题。
- **STATE/HANDOFF 过时**：仍写昨日 #101 待验收、#151 blocked；Planner 不代改，Issue comment 已纠正，Executor 下轮自行刷新。DIARY 只追加更正，不改旧行。
- 远程历史分支清理默认不做，沿既定只上报、不代删。串行不设锁；Planner 不检查/创建锁，历史锁不是开工门禁。

## 已完成阶段（当前仅作索引）

M1 常量真源、M1.5 3D 边界、M2 场线、M2.5 OCR、M2.6 性能、M2.7 引擎加固、M3 B 类单源、M4 体验、L6 器材扩展、M6 UI/复用与 M7 基础质量已在历史验收关闭；证据见 Git / Issues / DECISIONS。不要从历史队列恢复任务。#102–#104 调查及 #99 dry-run / #105 英文入口切片已关闭，不是当前 parked backlog。

## 下一阶段

先关闭本轮验收缺口，再依真实巡检缺陷或用户新需求规划下一批；不为了凑任务扩产品。真实 npm 发布、React 19、#103/#104 派生大重构仍需既定红线授权，不能自动解冻。

## 已放弃 / 暂缓的方向

- #103 派生大规模重构：D31 默认转正暂缓，用户未重新放行。
- React 19 自动升级：D44=B 暂缓，不以入口 70kB 门禁绿掩盖真实挂载前成本。
- M5 作为大包整批立项：旧 D19 已否决当时整包排程；其中调查后来已完成，#100/#101 经 D51 单独放行，不再描述为全部 parked。

## 给 Executor 的指令

先恢复 #101，再领 #151 → #154，按 Issue 最新正文逐条报告；错误日报仅追加更正，STATE/HANDOFF 由你刷新。每任务分支，代码与 `.agent/` 分提交，precheck/CI/Deploy 全绿后 --no-ff 集成，禁止 --no-verify/force-push，Executor 不 close；不改引擎/红线事项/用户 README 布局。

## 长期执行约束索引

- 引擎 dist 新鲜度、chartsOf/getChart、extra 守卫与渲染单一真源遵守项目既有规则；audit B 类 36/30/去重 60 不改。
- 70kB 入口与 vendor-react 55kB 懒块预算维持；挂载前资源按 D44 仅观测，不能宣称已有合计硬门禁。
- ENV 的 mise PATH / npm workspaces / 生产 preview 口径保留；未来 Rust 工具链统一 mise。
- pending **0**；无需用户拍板，以上均为验收纠错、任务拆界与既定决定落实。
