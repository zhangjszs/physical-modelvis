# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-03 · `zcode-exec-2819` · 执行者）· M2.6 性能线三单连做 #79 → #80 → #81 · **全闭环** · 更新于 ~11:00 本地

### 任务来源说明
巡检阶段任务（第 6-8 棒）已被 D14 用户指令「现在就建性能底层」取代。本棒按 PLAN 队列连续完成
**#79 → #80 → #81** 三个执行单元，每个单元独立：调查 → 实现 → 真实验证 → commit → push → issue 回写 → 状态重写。

---

## 执行单元 1 —— #79 3D 止血包（`01ac2a3`，已回写待关闭）
纹理释放（disposeMaterial 遍历材质属性 instanceof Texture 即释放）+ rig LRU 上限 8（Map 插入序，淘汰调 `rig.dispose?.()`）+ 暂停按需渲染（dirtyRef：controls change + store 写入置脏，**暂停空闲 0 render**）。
验证：+14 单测；123 场景 sweep 与基线一致；浏览器 draw-call 探针暂停 idle Δ=0、交互各补一帧。

## 执行单元 2 —— #80 性能门禁（`a6e1173`，已回写待关闭）
1. 巡检内存/耗时判定：30 场景「暖场趟+计量趟」双趟，两趟间 CDP 强制 GC 采样 JS 堆；两档预算 `QA_PERF_TIER=pr(24MB/25s)|nightly(12MB/10s)`；qa-sweep.yml 按事件注入。
2. rig dispose 契约 +124 例（全 123 rig build→dispose→重建：计数守恒/对象全新/无 use-after-dispose）。
3. 懒 chunk 硬门禁：预算表 vendor-physics 185/vendor-three 175/GraphPanel 120/SimulationCanvas 115/FormulaPanel 42（实测×1.2）+ 通用 60kB，超限 exit 1 带明细。
**红→绿闭环**：基线 2.2MB 绿 → 注入泄漏 87.2MB「内存判定命中」红（场景级 ERROR=0，判定独立）→ 还原复绿。

## 执行单元 3 —— #81 根治（`85ca829`，已回写待关闭）
**方案一「注入式」**：新增 `StageRenderer`（renderer/canvas 拥有者，render-prop 注入，不按场景 key）；EquipmentStage 每次切换只重建 Scene/Camera/Controls，卸载只 disposeObject(scene)；`key={currentScene}` 留在 EquipmentStage，**#70 三道防线零回退**；切 2D/离开工作台时 StageRenderer 卸载并销毁上下文（全应用唯一 forceContextLoss 点）。
弃「模块单例」的理由：StrictMode 双挂载下要么双建上下文要么永不释放；React 拥有者生命周期清晰、jsdom 可测。

**验证**（dev StrictMode 与生产构建分别实测）：
- 累积趋势：31 场景暖趟×2 **逐场景配对耗时比** dev 中位 **0.99** / prod **1.00**（最差 ×1.04/×1.11）——切换耗时无累积
- `info.programs` 62 次切换后段增长 −6（饱和）；堆冷趟 6.5/5.7MB < 12MB；canvas 恒 1
- #70 参数随动：模拟时长→min，timelineMax 3.0212→0.5 立即生效
- 全量 123 场景 sweep 含参数实测 **ERROR 0 / WARN 51 / OK 72**（与基线一致）
- 6 场景截图目视复验正常；precheck 绿；core 1114 / viz 1452 / total 2566

---

## 本轮踩坑记录（下一棒必读）

1. **「首/末对比」会把场景复杂度差异误判成累积**：暖趟后 10 个恰好含 4 个重 rig 场景（700-960ms，冷暖两趟相同——零累积旁证），prod 一度以 1.2% 误报 FAIL。正确口径 = **逐场景配对耗时比**（已固化进 `.scratch/probe-81-context.cjs`）。
2. **canvas 常驻后巡检信号要重审**：「等 canvas 出现」全部退化为 0ms；sweep 耗时就绪信号已改「激活项匹配 + 2 rAF」。no-canvas 判定仍有效（ErrorBoundary 回退 2D 也有 canvas）。
3. **`pkill -f` 模式别含本命令行子串**：`pkill -f "vite preview"` 把自己的 shell 杀了（python 编辑静默未执行）；用 `vite.[p]review` 转义。
4. three.js `WebGLRenderer.render` 是**实例属性**（闭包工厂），原型补丁计数无效——用 addInitScript 包 `getContext` 包装 drawArrays/drawElements（probe-79/81 已固化）。
5. 泄漏注入手段自身不得抛错（`push(...200k args)` RangeError 污染过信号）；探针参数判定要考虑物理截断行为（模拟时长 4.4s > 飞行 3.02s 时 timelineMax 本就不变）。
6. performance resource entries 缓冲 ~250 条被 physics-core 模块挤满；three URL 从 `.vite/deps/` + react.js `?v=` 拼。
7. headless chromium 本轮 **rAF 正常且截图可用**（6/6），旧「标签页置后台」问题未复现——但历史原因未根除，关键证据仍以 DOM/JS 读数为主。

## 下一步（按 PLAN 队列，M2.6 已收官）

**#83 · 引擎测试纳入类型检查**（P2，M2.7 首单）：physics-core tsconfig 移除对 tests 的 exclude——
已知 2 处真实 readonly 赋值错误（`base-validate.test.ts` 的 `problem.bodies = [...]`）要修；
**不扩大 strict 面**（#10 决定：不开 noUncheckedIndexedAccess，150 处可证明安全访问不逐个加守卫）。
之后 #84（空 catch 静态守卫）→ #85（4 大锤模型恢复守卫）→ #86（K2 设计调查）。

### 遗留（交规划者，本棒未动）
1. 巡检判据扩展（抽屉覆盖 + 交互后一致性）仍无 issue 承接（#78/#88 教训）。
2. 51 个 playback WARN、3D 取景/控件语义、胡克定律边界、图表参考线标签重叠——可读性类。
3. primitives.ts:209 阴影图 1024² 保持原样（回常值需单独立单）。

## 阻塞项 / 风险
- 无阻塞。#44 勿动；自检维持 11 层；工作树干净；远程已同步（`85ca829`）。
- 并发规划会话仍可能活跃：引用 issue 编号前先查列表拿真号。
- StageRenderer 是上下文唯一拥有者（单实例假设）；未来「多 3D 舞台同屏」需先扩展。

## 环境备注（务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；**杀用 `node .scratch/kill-vite.cjs`**。
- 生产验证：`npm run build:viz` + `cd visualization && npx vite preview --port 4173 --strictPort`。
- **跑巡检/探针期间不要编辑 src**（HMR 污染基线）；改 `scripts/`、`.agent/` 安全。
- 改完 `physics-core/src` 再跑 prettier 必须重建 `build:core`（guard-dist-freshness 拦截）。
- jsdom 渲染 recharts / StageRenderer 均需 ResizeObserver stub（照测试文件局部类写法）。
- core 测试 `getModel()` 从 `../../src/index.js` 导入；临时探针测试文件用完必须删。
- 写含反引号/引号的中文正文一律用 Write 工具落文件；`gh issue close` 不支持 `--comment-file`。
- 全量 sweep（含参数）本地 ~15 分钟；CI 27 分钟（timeout 45）；双趟性能判定额外 ~2 分钟。
- 产物在 `.scratch/`：`probe-79-render.cjs` / `probe-81-context.cjs`（验收探针，可复用）、
  `qa-sweep-{79,81}.log`、`qa-perf-*.json`、`perf-*.log`、`r9-shot-*.png`（6 场景截图）、
  `issue-comment-{79,80,81}.md`、`commit-msg-*.txt`。
- 自检 11 层；测试数真值 **core 1114 / viz 1452 / total 2566**。
