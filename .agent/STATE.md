# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `zcode-exec-2819`（**执行者**·M2.6 性能线）
- 会话开始: 2026-10-02T23:39:00Z (UTC) ≈ 本地 2026-10-03 07:39
- 本轮代码 commit: `a6e1173`（feat #80 性能回归防护门禁）· pre-push 全量 precheck 绿 · 已推送
- 脉络：…→ qoder-20261003T010000Z（#88） → 本棒 zcode-exec-2819：**#79 3D 止血包（`01ac2a3`，已回写）→ #80 性能门禁（`a6e1173`，已回写）**。阶段任务 = M2.6 性能线（D14 用户指令「现在就建性能底层」，插队首位），巡检阶段任务已被其取代。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者（现至 D15）；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | zcode-exec-2819 | #80（已完成）→ #81（进行中） | 2026-10-03 07:39 起本地 |

## 当前活跃
**#81 · 3D 劣化根治：WebGL 上下文跨场景复用**（P1，M2.6 第三单，依赖 #79✅ #80✅ 均已就位）。
- #79 已完成并回写（[评论](https://github.com/zhangjszs/physical-modelvis/issues/79#issuecomment-5963667526)），待规划者关闭。
- #80 已完成并回写（[评论](https://github.com/zhangjszs/physical-modelvis/issues/80#issuecomment-5964358603)），待规划者关闭。
- 后续队列：#81 → #83 → #84 → #85 → #86 → #60 → #68 → #74–#77 → #61 → #82 → #62–#66；#44 人类持有勿动。

## 本轮已做（#80，实现完成，待规划者关闭）
M2.6 第二单「性能回归防护门禁」三道防线：
1. **巡检内存/耗时判定**：verify-qa-sweep.cjs 新增 30 场景「暖场趟+计量趟」双趟切换，两趟间 CDP 强制 GC 采样 JS 堆，增量超预算 →「内存判定命中」ERROR；逐场景「点击→canvas 可见」耗时预算（nightly ERROR/pr WARN）。两档预算 QA_PERF_TIER=pr(24MB/25s) | nightly(12MB/10s)，qa-sweep.yml 按事件注入。**红→绿闭环实测**：基线 2.2MB 绿 / 注入 ~1.6MB/mount 泄漏后 87.2MB 红（场景级 ERROR=0，判定独立）/ 还原复绿 2.2MB。
2. **rig dispose 契约**（+124 例）：全部 123 rig 逐场景 build→dispose→重建 断言计数守恒/对象全新/无 use-after-dispose。
3. **懒 chunk 硬门禁**：check-bundle-size.mjs 扩展预算表（vendor-physics 185/vendor-three 175/GraphPanel 120/SimulationCanvas 115/FormulaPanel 42 = 实测×1.2；其余 60kB 通用），LAZY_BUDGET_SCALE=0.01 构造超限 exit 1 验证。
配套：性能段全程 race 超时 + 8 分钟总看门狗（泄漏构建下页面崩溃会使无界 await 挂死——实测踩坑后封死）；eslint .cjs 补 setTimeout/clearTimeout 全局。
验证：precheck 全绿；测试数 **core 1114 / viz 1449 / total 2563**（+124）。

## 上轮已做（#79，实现完成，待规划者关闭）
3D 止血包三项：disposeObject 递归释放材质纹理 / useSceneRig LRU 上限 8 + rig.dispose 清理钩子 / EquipmentStage 暂停按需渲染（dirtyRef：controls change + store 写入置脏）。验证含浏览器 draw-call 探针（暂停空闲 Δ=0）与 123 场景 sweep 零回归。详见 `01ac2a3` 与 issue 评论。

## 已完成（最近，≤20 条）
- **#80** 性能门禁三防线 + 红绿闭环 — `a6e1173`，本轮完成
- **#79** 3D 性能止血包 + draw-call 探针 — `01ac2a3`，本轮完成
- **#88** 参数滞后一步 — `fdca402` · **#87** 抛体落地截断 — `83f2632` · **#78** GraphPanel hooks — `06ee453`
- **#73** 量纲 — `33d5fee` · **#72** 断言空转 — `e0c0f1d` · **#71** 静电屏蔽 — `e5a367a` · **#70** rig 泄漏 — `8984fc9` · **#69** 舞台空白 — `71573d5`

## 阻塞项 / 风险
- **#81 是 M2.6 最重的一单**：动 renderer 生命周期。D14 明示最大风险 = #70 的 55 场景「参数不随动」回归（jsdom 复现不了挂载时序 bug，判据靠浏览器巡检）；本棒 #80 的看门狗 + #79 探针是它的验收工具。
- 巡检判据扩展（抽屉/交互一致性）仍无 issue 承接，交规划者。
- 51 个 playback WARN 与可读性问题漂浮 backlog 外（原巡检 HANDOFF 建议 2-6 项）。
- #44 勿动；自检维持 11 层；工作树干净；远程已同步。

## 环境备注（继承本轮，仍有效）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；杀 dev server 用 `node .scratch/kill-vite.cjs`。
- 跑巡检/探针期间不要编辑 src（HMR 污染基线）——泄漏演练例外（编辑本身就是实验），但要保证注入手段自身不抛错（第一版 `push(...200k)` RangeError 污染过信号）。
- performance resource entries 缓冲 ~250 条会被 physics-core 模块挤满；three URL 从 `.vite/deps/` + react.js `?v=` 哈希拼。
- **WebGLRenderer.render 是实例属性**（闭包工厂），原型补丁计数无效；用 `.scratch/probe-79-render.cjs` 的 getContext 包装口径。
- headless chromium rAF 正常（62fps/visible）；改完 physics-core/src 再跑 prettier 需重建 build:core。
- 写中文正文用 Write 工具落文件；`gh issue close` 不支持 `--comment-file`。
- 自检 11 层；测试数真值 **core 1114 / viz 1449 / total 2563**。
