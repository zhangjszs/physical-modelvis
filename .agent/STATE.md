# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `zcode-exec-2819`（**执行者**·M2.6 性能线）
- 会话开始: 2026-10-02T23:39:00Z (UTC) ≈ 本地 2026-10-03 07:39
- 本轮代码 commit: `01ac2a3`（fix #79 3D 性能止血包）· pre-push 全量 precheck 绿 · 已推送
- 脉络：…→ qoder-20261003T010000Z（#88 参数滞后一步） → 本棒 zcode-exec-2819（**#79 3D 性能止血包**，阶段任务由浏览器巡检切回 PLAN 队列：规划者 D14 记录用户 2026-10-03 指令「现在就建性能底层」，M2.6 插队首位）
- **本棒不再延续浏览器巡检阶段任务**：无对应 ready issue，D14 用户指令（性能底层）为更新的直接指令，按 PLAN 队列执行。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者（现至 D15）；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
| 文件/目录 | 持有者 | 任务 | 时间 |
|---|---|---|---|
| `.agent/LOCK`（不提交，收尾删除） | zcode-exec-2819 | #79（已完成）→ #80（进行中） | 2026-10-03 07:39 起本地 |

## 当前活跃
**#80 · 3D 性能回归防护门禁**（P2，M2.6 第二单）：巡检内存/耗时判定 + dispose 契约测试 + 懒 chunk 硬门禁。
- #79 已完成并回写（[评论](https://github.com/zhangjszs/physical-modelvis/issues/79#issuecomment-5963667526)），待规划者复核关闭。
- 队列（PLAN D14/D15 口径）：**#80 → #81 → #83 → #84 → #85 → #86 → #60 → #68 → #74–#77 → #61 → #82 → #62–#66**；#44 人类持有勿动。

## 本轮已做（#79，实现完成，待规划者关闭）
M2.6 性能线首单「止血包」三项（用户报告「越点越慢」，D14 确证 4 缺陷中的 3 个次要项）：

1. **纹理释放**：`primitives.ts` 新增 `disposeMaterial()` —— 遍历材质全部属性、`instanceof THREE.Texture` 即释放（map/emissiveMap/数组材质/Sprite/嵌套全覆盖）。旧实现只释放 geometry+material，CanvasTexture 靠 `forceContextLoss` 兜底，#81 落地后立即变真泄漏。
2. **rig 缓存 LRU**：`useSceneRig.ts` 缓存 Record→Map，命中触碰、上限 8、淘汰队首调 `rig.dispose?.()`；`SceneRig` 新增可选 `dispose()` 清理钩子（现状全为 no-op，为 #81 预留）。淘汰恒为队首，当前场景不会误删。
3. **暂停按需渲染**：`EquipmentStage.tsx` 新增 `dirtyRef` —— controls `change`（拖拽/滚轮/阻尼/视角预设/缩放）+ store 任何写入（拖进度条/改参数/换结果/换主题）置脏；播放中或脏才 sync+render。**实测暂停空闲 0 render**（旧实现满帧）。`controls.update()` 每帧照跑（damping 收敛依赖，无 GPU 工作）。

**验证**（全部真实证据）：
- precheck 全绿（含 11 层自检）；测试数 **core 1114 / viz 1325 / total 2439**（+14，count:sync 已回写）
- qa-sweep 123 场景含参数边界实测：**ERROR 0 / WARN 51 / OK 72** —— 与第 8 轮基线逐项一致，#70 零回归
- 浏览器 draw-call 探针（`.scratch/probe-79-render.cjs`）：暂停 idle 1s Δ=0；拖轴/改参数恰好一帧（Δ=136）；旋转 Δ=5620（交互+阻尼）；播放 600ms Δ=3264。3D→3D 切换×3 无错、console 0 error

## 上轮已做（#88，CLOSED）
改参数后仿真结果滞后一步 —— `runSimulation` 读渲染期闭包快照被 debounce 旧身份调用；改为调用瞬间 `getState()` 读参数。详见 git 历史 `fdca402` 与上轮 HANDOFF。

## 已完成（最近，≤20 条）
- **#79** 3D 性能止血包（纹理释放 + LRU 缓存 + 暂停按需渲染）+ draw-call 浏览器探针 — `01ac2a3`，本轮完成
- **#88** 参数滞后一步（过期闭包） — `fdca402` · **#87** 抛体落地截断 — `83f2632` · **#78** GraphPanel hooks 崩溃 — `06ee453`
- **#73** 数据面板量纲 — `33d5fee` · **#72** L2 断言空转 — `e0c0f1d` · **#71** 静电屏蔽 — `e5a367a`/`921e5a4`
- **#70** 3D 切场景 rig 泄漏 — `8984fc9`/`5700693` · **#69** 3D 舞台空白 — `71573d5` · **#67** L5 场线 — `83fa03e`

## 巡检战果（历史基线，#79 sweep 复核仍成立）
舞台空白 101→0；console/pageerror 55→0；错误提示条 12→0；ERROR 场景 101→**0**；WARN（播放按钮类）稳定 **51**。#79 sweep 与基线一致 → 无回归。

## 阻塞项 / 风险
- **#80 的判定工具已备好**：`.scratch/probe-79-render.cjs` 的 WebGL draw-call 计数（addInitScript 包 getContext）是实例级准确的渲染/耗时口径 —— three.js `WebGLRenderer.render` 是**实例属性**（闭包工厂），原型补丁无效，别再踩。
- **OrbitControls mock 升级**：`equipment-stage.test.tsx` 的 mock 现带 `addEventListener/emit` + `OrbitControls.instances` 登记，3D 交互测试可直接取实例派发 `change`。
- **"ERROR 清零"≠没问题**：巡检 6 项判据不覆盖抽屉内崩溃、交互后一致性（#78/#88 教训）——判据扩展仍无 issue 承接，交规划者。
- **51 个 playback WARN** 与 3D 取景/控件语义、胡克定律边界量级等可读性问题仍在 backlog 外漂浮（原巡检 HANDOFF 第 2-6 项建议）。
- **`visualization/tsconfig.json` 含 tests**（core 不含）→ 可视化测试参与类型检查；core 测试不参与（#83 待做）。
- **#44 勿动**；自检维持 11 层；无脏树。

## 环境备注（继承前几棒，仍有效）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；**杀用 `node .scratch/kill-vite.cjs`**（pkill 会连沙箱自杀）。
- **跑巡检/探针期间不要编辑 src**（HMR 污染基线）；改 `scripts/`、`.agent/` 安全。
- **performance resource entries 缓冲区只有 ~250 条**，会被 physics-core 249 个模型模块挤满 → 懒加载 chunk 的 URL 别从 resource entries 找，改从 `.vite/deps/` 目录 + react.js 的 `?v=` 哈希拼。
- **改完 `physics-core/src` 若再跑 prettier，必须重新 `npm run build:core`**（guard-dist-freshness 拦截；本轮开局就吃了一次上棒遗留的陈旧 dist）。
- jsdom 渲染 recharts 需 `ResizeObserver` stub（照 `tests/rendering/equipment-stage.test.tsx` 局部类写法）。
- 写含反引号/引号的中文正文一律用 Write 工具落文件。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close。
- 全量 sweep（含参数实测）：本地 ~12 分钟；CI 27 分钟（timeout 45）。
- 自检 11 层；测试数真值 **core 1114 / viz 1325 / total 2439**。
