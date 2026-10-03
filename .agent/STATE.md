# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `zcode-exec-2819`（**执行者**·M2.6 性能线全程）
- 会话开始: 2026-10-02T23:39:00Z (UTC) ≈ 本地 2026-10-03 07:39
- 本轮代码 commit: `85ca829`（feat #81 WebGL 上下文复用）· pre-push 全量 precheck 绿 · 已推送
- 脉络：…→ qoder-20261003T010000Z（#88） → 本棒 zcode-exec-2819：**#79（`01ac2a3`）→ #80（`a6e1173`）→ #81（`85ca829`）三单连做，M2.6 性能线全闭环**。阶段任务 = M2.6（D14 用户指令「现在就建性能底层」），浏览器巡检阶段任务已被其取代。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者（现至 D15）；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | zcode-exec-2819 | #81（已完成，M2.6 收官）→ 下一棒 #83 | 2026-10-03 07:39 起本地 |

## 当前活跃
**无**（#81 已完成并回写，[评论](https://github.com/zhangjszs/physical-modelvis/issues/81#issuecomment-5964868479)，待规划者关闭）。
- M2.6 三单全部实现+回写：#79 止血 / #80 门禁 / #81 根治，均待规划者复核关闭。
- 队列（PLAN D14/D15 口径）：**#83 → #84 → #85 → #86 → #60 → #68 → #74–#77 → #61 → #82 → #62–#66**；#44 人类持有勿动。

## 本轮已做（#81，实现完成，待规划者关闭）
**根治**：新增 `StageRenderer`（renderer/canvas 拥有者，不按场景 key，render-prop 注入 EquipmentStage；切 2D/离开工作台随子树卸载并在卸载回调销毁上下文——全应用唯一 forceContextLoss 点）。EquipmentStage 每次切换只重建 Scene/Camera/Controls，卸载只 disposeObject(scene)；`key={currentScene}` 留在 EquipmentStage——**#70 三道防线（sceneId 绑定 rig + remount + mount 建 handles）零回退**。StrictMode 切换路径零上下文创建。
**设计定案 = 方案一注入式**（弃模块单例：其 StrictMode 下要么双建要么永不释放），理由记录在 issue 评论。
**验证**（dev StrictMode 与生产构建分别实测）：31 场景暖趟×2 逐场景配对耗时比 dev 0.99 / prod 1.00（最差 ×1.04/×1.11）；programs 62 次切换后段增长 −6（饱和）；堆冷趟 6.5/5.7MB < 12MB；全量 sweep **ERROR 0 / WARN 51 / OK 72** 与基线一致；6 场景截图目视正常；precheck 绿；测试数 **core 1114 / viz 1452 / total 2566**。
**方法论**：「首/末对比」会把重 rig 场景复杂度误判成累积（prod 一度 1.2% 误报 FAIL）——已改逐场景配对口径并固化进 probe-81-context.cjs；canvas 常驻后巡检「等 canvas」信号全部失效，sweep 耗时判定已改「激活项匹配 + 2 rAF」。

## 前两轮已做（同棒）
- **#80**（`a6e1173`）：巡检内存/耗时双趟判定（红→绿闭环：注入泄漏 87.2MB 触发「内存判定命中」）+ rig dispose 契约 124 例 + 懒 chunk 硬门禁（实测×1.2 预算表）。
- **#79**（`01ac2a3`）：纹理释放 + rig LRU 上限 8 + 暂停按需渲染（暂停空闲 0 render）+ draw-call 探针。

## 巡检基线（三轮保持一致）
123 场景含参数实测：**ERROR 0 / WARN 51 / OK 72**；性能判定（nightly）堆增量 4.1MB / 12MB，切换耗时超限 0。

## 阻塞项 / 风险
- **下一棒注意**：M2.6 收官后回到引擎加固线（#83 tsconfig 纳入测试类型检查——已知 2 处真实 readonly 错误要修，严格模式面不得扩大）。
- 巡检判据扩展（抽屉覆盖 + 交互后一致性）仍无 issue 承接，交规划者。
- 51 个 playback WARN、可读性问题漂浮 backlog 外（原巡检 HANDOFF 建议 2-6 项）。
- #44 勿动；自检维持 11 层；工作树干净；远程已同步。
- StageRenderer 是上下文唯一拥有者（单实例假设）；未来「多 3D 舞台同屏」需先扩展它。

## 环境备注（继承本轮，仍有效）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；杀 dev server 用 `node .scratch/kill-vite.cjs`；**pkill 模式勿含本命令行子串**（本轮 `pkill -f "vite preview"` 自杀过一次，用 `vite.[p]review` 转义）。
- 跑巡检/探针期间不要编辑 src（HMR 污染基线）；泄漏演练例外但注入自身不得抛错。
- **canvas 常驻后**：一切「等 canvas 出现」的巡检等待退化为 0ms，就绪信号用「激活项匹配 + 2 rAF」。
- performance resource entries 缓冲 ~250 条会被 physics-core 模块挤满；three URL 从 `.vite/deps/` + react.js `?v=` 哈希拼。
- **WebGLRenderer.render 是实例属性**（闭包工厂），原型补丁计数无效；用 getContext 包装口径（probe-79/81）。
- dev-only `window.__physvisRenderer` 可读 info.programs/memory（生产构建无此钩子）。
- headless chromium rAF 正常且**截图可用**（本轮 6/6 成功，旧「标签页置后台」问题未复现）；改完 physics-core/src 再跑 prettier 需 build:core。
- 写中文正文用 Write 工具落文件；`gh issue close` 不支持 `--comment-file`。
- 自检 11 层；测试数真值 **core 1114 / viz 1452 / total 2566**。
