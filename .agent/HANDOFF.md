# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-03 · `zcode-exec-2819` · 执行者）· M2.6 性能线 #79 止血包 · 完成于 ~08:20 本地

### 任务切换说明（重要）
上一棒在浏览器巡检阶段任务里（第 8 轮 #88）。本棒启动时：#88 已 CLOSED、巡检判据扩展**无对应 ready issue**，
而规划者 D14（2026-10-03）记录了用户更新的直接指令「现在就建性能底层」且 M2.6 插队可执行队列首位
→ 按任务选择规则取 **#79（P1·3D 性能止血包）**。巡检阶段任务视为已被 D14 取代；若用户要恢复巡检，
直接说一声，判据扩展建议仍在本文件历史版（`83f2632` 附近）与 #88 收尾评论里。

### 本轮做了什么 —— #79（三项止血，M2.6 首单）

**背景**：用户报告「前几个 3D 模型很快，多点几个场景明显变慢」。规划者 D14 全链排查：主因是
每切场景整套销毁重建 WebGL 上下文（#81 根治），本单先修三个次要确证缺陷，并给 #81 备好前置条件。

| # | 缺陷（D14 确证） | 修复 |
|---|---|---|
| 1 | `disposeObject` 不释放纹理——`makeTextSprite` 每次新建 CanvasTexture，卸载靠 `forceContextLoss` 兜底；**#81 做上下文复用后立刻变真泄漏** | `primitives.ts` 新增 `disposeMaterial()`：遍历材质全部属性，`instanceof THREE.Texture` 即释放；覆盖 map/emissiveMap/数组材质/Sprite/嵌套。`disposeObject`/`clearGroup` 全走它 |
| 2 | rig 缓存无上限无淘汰（现状无状态单例影响≈0，结构隐患） | `useSceneRig.ts` 缓存 Record→Map（插入序即 LRU 序），命中 `delete+set` 触碰，**上限 8**，淘汰队首调 `rig.dispose?.()`；`SceneRig` 接口新增可选 `dispose()`（现状 no-op，为 #81 有状态 rig 预留）。淘汰恒为队首，当前场景永不误删 |
| 3 | 暂停时满帧渲染：`isPlaying` 只门控时间推进，暂停仍每帧 sync+render+damping update | `EquipmentStage.tsx` 新增 `dirtyRef`（初始 true 保证首帧）：controls `change` 事件 + store 任何写入置脏；播放中或脏才 sync+render。**暂停空闲 0 render**。`controls.update()` 每帧照跑（damping 收敛依赖，本身无 GPU 工作） |

**承重前提已核实**：three r185 的 `OrbitControls.update()` 在相机位移超 EPS 时派发 `change`（OrbitControls.js L909）
→ 拖拽/滚轮/阻尼滑行/视角预设/缩放按钮全部自动置脏，无需逐个 hook。

### 验证（真实证据，非退出码迷信）

- **precheck 全绿**（build:core → typecheck → lint 0 error → format → test → count:check → build:viz → bundle → 自检 11 层）。
- **+14 用例**：`primitives-dispose.test.ts` 7 例（纹理 dispose 契约）；`equipment-stage.test.tsx` 5 例
  （手动 rAF 队列 + mock renderer 原型 spy：挂载 1 帧 → 暂停 60 帧 0 render → 拖轴/参数/change 各恰好 1 帧 → 播放恢复满帧）；
  `useSceneRig.test.ts` 2 例（超限淘汰 + dispose 钩子被调 + 重访重新 load + 触碰刷新淘汰顺序）。
- **qa-sweep 全量 123 场景含参数边界实测**：ERROR 0 / WARN 51 / OK 72 —— 与第 8 轮基线**逐项一致**，#70 参数随动零回归。
- **浏览器 draw-call 探针**（Playwright chromium，`.scratch/probe-79-render.cjs`，可复用）：
  暂停 idle 1s **Δ=0**；`setCurrentTime`/`setParameter`/UI 拖轴各**恰好一帧**（Δ=136）；画布旋转 Δ=5620（8 步拖拽+阻尼收敛）；
  播放 600ms Δ=3264（满帧）；3D→3D 切换×3 无错误条、console 0 error。
- 测试数 **core 1114 / viz 1325 / total 2439**（+14，count:sync 已回写 README + docs/plan.md）。
- 代码 commit **`01ac2a3`** 已推送（pre-push 钩子全量 precheck 也过了一遍）；issue #79 已回写
  [执行结果评论](https://github.com/zhangjszs/physical-modelvis/issues/79#issuecomment-5963667526)，**未关闭**（规划者复核）。

### 两条踩坑记录（对 #80 直接有用）

1. **three.js `WebGLRenderer.render` 是实例属性不是原型方法**（闭包工厂 `this.render = function...`）
   → 原型补丁计数静默无效（探针 v2 全 0 的假象，差点误判成"按需渲染坏了"）。
   正确口径：**addInitScript 包 `HTMLCanvasElement.prototype.getContext`，包装 webgl/webgl2 上下文的
   `drawArrays/drawElements` 计数** —— 每次 render 必产生 draw call，Δ=0 ⇔ 0 渲染，实例级准确。
   #80 的「巡检内存/耗时判定」可直接复用 `probe-79-render.cjs`。
2. **`performance resource entries` 缓冲区 ~250 条**会被 physics-core 249 个模型模块挤满，
   懒加载 chunk（three/EquipmentStage）的 URL 从 entries 里找不到 → 从 `node_modules/.vite/deps/` 目录 +
   react.js 资源条目的 `?v=` 哈希拼 URL 动态 import。

### 下一步（按 PLAN 队列）

**#80 · 性能回归防护门禁**（P2，验收工具就位，风险低）：
- 巡检加内存/耗时判定（人为造泄漏要能变红）—— 探针的 draw-call 口径 + `performance.memory` / renderer.info；
- dispose 契约测试 3 类断言（纹理/材质/geometry，本单 `primitives-dispose.test.ts` 已覆盖一半）；
- 懒 chunk 硬门禁（`check-bundle-size.mjs` 从仅入口扩展到懒 chunk 预算）。
之后 **#81 根治**（WebGL 上下文复用；依赖 #79 纹理释放✅ + #80 判定；**#70 的 55 场景参数随动是最大风险点**）。

### 遗留（交规划者，本棒未动）

1. 巡检判据扩展（抽屉覆盖 + 交互后一致性）仍无 issue 承接（#78/#88 的制度性教训）。
2. 51 个 playback WARN、3D 相机取景/控件语义、胡克定律边界量级、图表参考线标签重叠 —— 可读性类，漂浮在 backlog 外。
3. `#73` K2 残留 24 场景（属 #86 设计调查范围）。
4. `physics-core` 测试不参与类型检查（#83 待做）。

### 阻塞项 / 风险

- 无阻塞。#44 勿动；自检维持 11 层；工作树干净；远程已同步。
- 并发规划会话仍可能活跃：**引用 issue 编号前先 create/查列表拿真号**。
- LRU 上限 8 是单点常量（`useSceneRig.ts` `RIG_CACHE_LIMIT`），#81 引入有状态 rig 后如命中率有异可调。

## 环境备注（务必读）

- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- 起 dev server：`cd visualization && npx vite --port 5199 --strictPort`；**杀用 `node .scratch/kill-vite.cjs`**
  （`pkill -f vite` 会连沙箱包装进程自杀）。
- **跑巡检/探针期间不要编辑 src**（HMR 污染基线）；改 `scripts/`、`.agent/` 安全。
- **改完 `physics-core/src` 若再跑 prettier，必须重新 `npm run build:core`** —— 否则 guard-dist-freshness 拦截
  `npm test`/`count:sync`（本轮开局吃了一次上棒遗留的陈旧 dist，`build:core` 即解）。
- **headless chromium 本机 rAF 正常**（实测 62fps、visibilityState=visible）—— 旧 HANDOFF 记录的「标签页置后台
  截图失败」本轮未复现，但像素级验证仍应优先 DOM/JS 读数（截图失败的历史原因未根除）。
- jsdom 渲染 recharts 需 `ResizeObserver` stub（照 `tests/rendering/equipment-stage.test.tsx` 局部类写法）。
- core 测试里 `getModel()` 必须从 `../../src/index.js` 导入（注册在 solver-router 副作用里）。
- 临时探针测试文件注意相对路径深度（`tests/` 用 `../src`，`tests/accuracy/` 用 `../../src`），**用完必须删**。
- 写含反引号/引号的中文正文一律用 Write 工具落文件（`printf` 会被命令替换/EOF 坑）。
- `gh issue close` 不支持 `--comment-file` → 先 comment 再 close，最后 `--json state` 复核。
- 全量 sweep（含参数实测）本地 ~12 分钟；CI 27 分钟（timeout-minutes: 45）。
- 产物在 `.scratch/`（gitignore）：本轮新增 `probe-79-render.cjs`（**渲染计数探针，#80 复用**）、
  `qa-sweep-79.log`、`issue-comment-79.md`、`commit-msg-79.txt`、`probe-79-urls.cjs`/`probe-79-vis.cjs`（调试用，可删）。
- 自检 11 层；测试数真值 **core 1114 / viz 1325 / total 2439**。
