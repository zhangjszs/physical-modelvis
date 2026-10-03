# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-03 · `zcode-exec-2819` · 执行者）· M2.6 性能线 #79 + #80 · 更新于 ~10:00 本地

### 任务来源说明
巡检阶段任务（第 6-8 棒）已被 D14 用户指令「现在就建性能底层」取代（M2.6 插队首位，规划者 2026-10-03 仲裁）。
本棒按 PLAN 队列连续完成 **#79 → #80** 两个执行单元，每单元独立调查/实现/验证/提交/回写。

---

## 执行单元 1 —— #79 3D 止血包（`01ac2a3`，已推送+回写，待规划者关闭）

三项止血（详见 [issue 评论](https://github.com/zhangjszs/physical-modelvis/issues/79#issuecomment-5963667526)）：
1. `primitives.ts`：`disposeMaterial()` 递归释放材质全部纹理属性（map/emissiveMap/数组/Sprite/嵌套）；
2. `useSceneRig.ts`：缓存 Record→Map LRU 上限 8，淘汰队首调 `rig.dispose?.()`；`SceneRig` 新增可选 `dispose()` 钩子；
3. `EquipmentStage.tsx`：`dirtyRef` 按需渲染——controls `change` + store 写入置脏，暂停空闲 **0 render**，`controls.update()` 每帧照跑（damping 收敛）。

验证：+14 单测；123 场景 sweep（含参数实测）ERROR 0/WARN 51 与基线一致；浏览器 draw-call 探针暂停 idle Δ=0、交互各补一帧。

---

## 执行单元 2 —— #80 性能回归防护门禁（`a6e1173`，已推送+回写，待规划者关闭）

三道防线（详见 [issue 评论](https://github.com/zhangjszs/physical-modelvis/issues/80#issuecomment-5964358603)）：
1. **巡检内存/耗时判定**（`verify-qa-sweep.cjs`）：30 场景「暖场趟+计量趟」双趟切换，两趟间 CDP 强制 GC 采样 JS 堆；增量超预算 →「内存判定命中」ERROR；逐场景点击→canvas 耗时预算（nightly ERROR / pr WARN）。两档预算 `QA_PERF_TIER=pr(24MB/25s)|nightly(12MB/10s)`，`qa-sweep.yml` 按事件注入。
2. **rig dispose 契约**（`rigs-dispose-contract.test.ts` +124 例）：全部 123 rig build→dispose→重建 ①计数守恒 ②对象全新 ③无 use-after-dispose。
3. **懒 chunk 硬门禁**（`check-bundle-size.mjs`）：预算表 vendor-physics 185/vendor-three 175/GraphPanel 120/SimulationCanvas 115/FormulaPanel 42（实测×1.2）+ 通用 60kB，超限 exit 1 带明细。

**红→绿闭环实测**（验收 1 的完整证据链）：
- 基线绿：堆增量 2.2MB / 12MB 预算，exit 0
- 注入泄漏（模块级数组 ~1.6MB/mount）：堆增量 **87.2MB** →「内存判定命中」ERROR，exit 1（场景级 ERROR=0，判定独立成立）
- 还原复绿：2.2MB，exit 0

### 本轮踩坑记录（重要，含对 #81 的直接警告）

1. **无界 await 会让门禁脚本挂死**：红跑验证时页面崩溃后 CDP 调用 0% CPU 永久挂起。
   已封死：性能段每个 await race 超时（GC 30s/页面操作 15s）+ 8 分钟总看门狗（超限提前终止并记 ERROR）。
   **#81 改 renderer 生命周期若再引发挂死/崩溃，会显形为性能 ERROR 而非静默卡 CI——这是预期行为。**
2. **泄漏注入手段自身不能抛错**：第一版 `push(...new Array(200000))` 触发 RangeError 使场景崩溃，污染判定信号；
   循环 push 后信号纯净。#81 做泄漏演练照此办理。
3. **three.js WebGLRenderer.render 是实例属性**（闭包工厂），原型补丁计数无效——用 `.scratch/probe-79-render.cjs`
   的 addInitScript 包 `getContext` → 包装 `drawArrays/drawElements` 的口径（#81 验收「renderer.info.programs 不线性增长」可直接扩展该探针）。
4. eslint `.cjs` 环境原本没有 setTimeout/clearTimeout 全局（已补）；`performance resource entries` 缓冲 ~250 条会被 physics-core 模块挤满。

---

## 下一步 —— #81 根治（M2.6 最后一单，P1，前置已全部就位）

**任务**：WebGL 上下文跨场景复用，消除「每切场景 new WebGLRenderer + forceContextLoss + shader 重编译」。
**验收**：连续切 30+ 场景耗时无累积（第 30 ≤ 首场景×1.5）；`renderer.info.programs` 不线性增长；#70 回归 + 巡检全绿；StrictMode dev 正确。
**已就位的工具**：#80 的巡检内存/耗时判定（验收工具）、#79 探针（draw-call/programs 口径可扩展）、#79 纹理释放（上下文复用后 CanvasTexture 不变真泄漏的前提）。
**最大风险（D14 明示）**：#70 的 55 场景「参数不随动」回归——jsdom 复现不了挂载时序 bug，判据是浏览器巡检（#70 的 rigReady + sceneId 同源不变量见 `useSceneRig.ts` 头注释）。
**设计决策（D14 授权执行者定）**：SceneStage 注入式 renderer vs 模块级单例——通读 #70 竞态语义后定，两条路线的验收标准 issue 均已写明。
**建议起手**：先读 `SceneStage.tsx`（key remount 架构）+ `EquipmentStage.tsx` 挂载 effect + #70 修复 commit `8984fc9`，再画清 renderer 生命周期所有权，然后动工。

### 遗留（交规划者，本棒未动）
1. 巡检判据扩展（抽屉覆盖 + 交互后一致性）仍无 issue 承接。
2. 51 个 playback WARN、3D 取景/控件语义、胡克定律边界、图表参考线标签重叠——可读性类。
3. `physics-core` 测试不参与类型检查（#83）。

## 阻塞项 / 风险
- 无阻塞。#44 勿动；自检维持 11 层；工作树干净；远程已同步。
- 并发规划会话仍可能活跃：引用 issue 编号前先查列表拿真号。

## 环境备注（务必读）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；**杀用 `node .scratch/kill-vite.cjs`**。
- **跑巡检/探针期间不要编辑 src**（HMR 污染基线）；泄漏演练例外，但注入自身不得抛错。
- 改完 `physics-core/src` 再跑 prettier 必须重建 `build:core`（guard-dist-freshness 拦截）。
- headless chromium 本机 rAF 正常（62fps）；jsdom 渲染 recharts 需 ResizeObserver stub（照 equipment-stage.test.tsx 局部类）。
- core 测试 `getModel()` 从 `../../src/index.js` 导入；临时探针测试文件用完必须删。
- 写含反引号/引号的中文正文一律用 Write 工具落文件；`gh issue close` 不支持 `--comment-file`。
- 全量 sweep（含参数）本地 ~12 分钟、CI 27 分钟（timeout 45）；双趟性能判定额外 ~2 分钟。
- 产物在 `.scratch/`：`probe-79-render.cjs`（渲染/计时探针，#81 复用）、`qa-perf-{green,red,green2}.json`、
  `perf-{green,red,green2}.log`、`qa-sweep-79.log`、commit-msg/issue-comment 稿件。
- 自检 11 层；测试数真值 **core 1114 / viz 1449 / total 2563**。
