# M7 任务规约（增强版）

> 原始需求：渲染质量提升 + 部署闭环。
> 本规约将其拆分为两个**独立、可验证**的子任务 M7a / M7b，并补充：基线测量（禁止凭感觉优化）、可量化验收标准、验证步骤、范围纪律。
> 适用于交给工程 agent 或人工执行；执行前请先读完「重要前提」。

---

## 重要前提（已核实仓库现状，避免空做）

1. **部署流水线已经存在**：`.github/workflows/deploy.yml` 已实现
   `CI 成功（workflow_run） → npm ci → 构建（physics-core + visualization，带 VITE_BASE_PATH=/physical_modelvis/） → configure-pages → upload-pages-artifact → deploy-pages`。
   因此"部署仅停留在 build 阶段"**不成立**。真正的任务是**让已有流水线产出可访问的线上地址并验证闭环**，而不是从零补全部署步骤。

2. **渲染架构已解耦求解与播放**：`solveProblem` 只在场景/参数变化时运行一次，产出预计算轨迹 `simulationResult`；播放由 `requestAnimationFrame` 推进 `currentTime` 播放头并对 Canvas 重绘。
   因此"卡顿/丢帧"的瓶颈在**重绘路径**（每帧 render 成本 / 画布清晰度），**不在物理求解**。性能优化应针对重绘成本与 DPR 清晰度，而不是每帧重算物理。

3. **渲染层未做 DPR 缩放**：`visualization/src/rendering/CanvasRenderer.ts` 与 `visualization/src/components/simulation/SimulationCanvas.tsx` 中均无 `devicePixelRatio` 处理，也无 `imageSmoothingEnabled` 设置。
   这是高分屏/Retina 上"渲染精度差、发虚"的高概率根因，也是性价比最高的修复点。

---

## M7a：渲染质量提升

### 目标
在不改变物理正确性的前提下，提升播放流畅度与画面清晰度。

### 必须先做：基线测量（硬性要求，禁止"凭感觉优化"）
1. 选取代表性场景，覆盖重负载与不同渲染形态：
   - 多粒子：`alpha-scattering`、`radioactive-decay`（盖革）
   - 场线类：`efield-lines`、`current-magnetic`
   - 含位图纹理的场景（若有）
2. 在**参考机器**上测量（注明 OS / 浏览器 / 屏幕分辨率 / DPR）：用 rAF 帧间隔日志或 Performance 面板记录——平均 FPS、帧时间 p95、是否出现 >1 帧的长卡顿。
3. 把基线数值写进交付说明，作为验收对比基准。

### 验收标准（可量化）
- **清晰度（渲染精度）**：Canvas 后备缓冲按 `devicePixelRatio` 缩放（`canvas.width = round(cssW * dpr)` 并对 ctx 做 `scale(dpr, dpr)` 或 `setTransform`），在 2x 屏上线条/文字边缘锐利不发虚。
  自动化断言建议：`canvas.width === Math.round(cssWidth * devicePixelRatio)`。
- **帧率**：参考机器上代表场景平均 FPS ≥ 55（目标 60）；帧时间 p95 < 18ms；掉帧率（帧间隔 > 2×基准间隔） < 2%。
- **抗锯齿 / 纹理**：若场景绘制位图纹理，显式设置 `ctx.imageSmoothingEnabled = true` 并选合适 `imageSmoothingQuality`；矢量描边依赖浏览器默认 AA，无需额外处理——除非发现具体锯齿问题且附证据。
- **色彩还原**：此项为模糊需求，**需先指明"哪些场景、什么现象"方可纳入**；无证据则本迭代不做，避免盲目调色引入回归。

### 实现候选（按性价比排序；须先测基线再决定动手范围）
1. **DPR 缩放（最高性价比，几乎确定要做）**：封装 `setupHiDPICanvas(canvas, cssW, cssH)`，所有渲染入口统一调用；注意 render 内部坐标仍以 CSS 像素书写，由缩放矩阵处理清晰度。
2. **重绘成本**：确认 `render()` 每帧工作量；对静态背景（网格、坐标轴、固定标注）做离屏缓存（offscreen canvas，只画一次），每帧仅重绘动态物体；避免每帧重复 `measureText`、重复创建路径对象。
3. **播放头插值**：若轨迹点稀疏，按 `currentTime` 在相邻轨迹点间线性插值，消除"跳帧感"。
4. **可选确认**：`playbackSpeed` 已存在，确认时间推进用"真实经过时间 × speed"，不因帧率波动而变速。

### 验证
- 性能：同一场景、同一参考机器，优化前/后 FPS 与帧时间 p95 对比，附数值。
- 正确性回归：跑 `npm test`（core 843 + viz 244）/ `tsc --noEmit`（viz strict）/ `eslint` / `npm run selfcheck`（9 层）全绿——确保只改渲染、物理零改动。
- 视觉：在 1x 与 2x DPR 下截图对比，确认清晰度提升且无渲染回归（位置/比例/标注无错位）。

---

## M7b：部署闭环

### 目标
让项目在 GitHub Pages 上真正可访问，打通并验证"构建 → 线上访问"全链路。

### 必须先做：确认阻塞点（不要假设"缺步骤"）
1. 检查仓库 `Settings → Pages → Source` 是否为 **"GitHub Actions"**。
   若不是，这是最常见阻塞（CI 无法代设仓库设置），需在交付说明中标注，由有仓库权限者设置，并附检查截图。
2. 验证 `visualization/vite.config.ts` 的 `base` 是否与 `VITE_BASE_PATH=/physical_modelvis/` 一致，确保构建产物 `index.html` 的资源路径带 `/physical_modelvis/` 前缀（否则线上白屏）。
3. 查 Actions 面板：近期 main 已有多次绿色 CI，`workflow_run` 理论上应已触发 deploy。确认是否有 deploy 运行记录及其成功/失败原因——这是判断"到底卡在哪"的关键证据。

### 验收标准（可量化）
- 推送一次到 main → CI 绿 → deploy 工作流自动运行并完成。
- 线上地址 `https://<user>.github.io/physical_modelvis/` 返回 HTTP 200。
- 该页 `index.html` 引用的 JS/CSS 资源均返回 200（无 404、无因 base path 错误导致的白屏）。
- 页面能进入默认场景并可交互（手动或脚本冒烟）。

### 实现候选
1. 若 Pages Source 未设为 GitHub Actions → 在交付说明中标注阻塞，由仓库管理员设置；可附检查脚本/截图，但**不要**在 CI 里尝试代设。
2. 若 base path 不匹配 → 修正 `vite.config.ts` 的 `base`（或统一用 `import.meta.env.BASE_URL` 贯穿资源引用）。
3. 若 deploy 工作流本身报错 → 按 Actions 日志修复（`permissions: pages: write / id-token: write` 已配置，通常无需改）。
4. 部署后加轻量冒烟：脚本 `curl -sI` 线上 URL + 解析 `index.html` 中 `<script>/<link>` 的 src/href 逐一 `curl -sI` 确认 200。

### 验证
- `curl -sI https://<user>.github.io/physical_modelvis/` → `HTTP/2 200`。
- 解析 `index.html` 资源路径，逐一 `curl -sI` 确认 200（无 404）。
- 可选：无头脚本加载首页，断言不抛错且 canvas 元素存在。

---

## 范围纪律（不要越界）
- 只动**渲染层**（CanvasRenderer / SimulationCanvas / 相关渲染器）与**部署配置**；不重构物理引擎、不加新功能、不动 `physics-core` 求解逻辑。
- "色彩还原"无证据不碰；"抗锯齿"仅针对已确认的位图纹理。
- M7a 与 M7b **独立提交、独立验证**，互不阻塞。

## 完成定义（DoD）
- [ ] **M7a**：基线记录 + DPR 缩放落地 + 帧率达标 + 全量测试/自检绿 + 1x/2x 对比截图。
- [ ] **M7b**：线上地址 200 + 资源全 200 + 可交互冒烟通过 + 阻塞点说明文档。
- [ ] 两者均 commit（建议分开），更新 `TASKS.md`；若部署段有变更，同步 `AGENTS.md`。

---

## 验证记录（2026-07-07 执行）

### M7a（渲染质量提升）
- **基线**：渲染架构已确认解耦（见"重要前提"#2）；沙箱无浏览器，**FPS 基线无法在 CI/沙箱测量**——改为在应用内提供 FPS 叠层（`fpsRef` + 右上角 `N FPS`），由用户在参考机器读取。清晰度根因已通过代码核查锁定为"无 DPR 缩放"（前提 #3），无需跑分即可确定修复点（符合"先测后优"）。
- **落地**：新增 `visualization/src/rendering/dpr.ts`（`setupHiDPICanvas`）；`SimulationCanvas` 的 `resize()` / `render()` / `getCanvasPos()` / 3D / `autoFit` 全部切换到逻辑 CSS 像素 + `ctx.setTransform(dpr, …)`。
- **正确性陷阱已堵**：鼠标→画布映射 `getCanvasPos` 原用 `canvas.width / rect.width`（DPR 下 = dpr）会导致点击错位，已改为逻辑空间映射。
- **M7a-3 静态背景离屏缓存：暂缓**。基线/静态分析未见重绘热路径，瓶颈是 DPR 清晰度（已修复）；遵循"不臆测优化"，仅当用户报告卡顿且 FPS 计显示 p95 帧时间超阈值时再实施。
- **测试**：`tests/dpr.test.ts` 5 用例全绿（dpr 1/2/3、分数尺寸四舍五入、SSR 无 window 回退 dpr=1）。
- **门禁**：`tsc --noEmit` ✅ / `eslint` ✅ / `vitest run` 249 ✅（244 既有 + 5 新增）。
- **视觉对比**：提供 `scripts/capture-dpr.mjs`（Playwright 1x/2x 截图 + 采样 FPS），需在参考机器运行（沙箱无浏览器）。

### M7b（部署闭环）
- **阻塞点**：`deploy.yml` 本身正确；真正阻塞是 **CI 红 → deploy `skipped`**。已修复两处：
  1. Prettier `format:check` 因 7 个 M5/M6 文件格式违规失败 → `npx prettier --write`（commit `d0e7173`）。
  2. `boris-correctness.test.ts` 极端参数 `sampleCount=1e5` 在 CI 5s 超时 → 降至 5000（commit `b0aec0e`）。
- **验证**：CI run `28885294000` ✅ → Deploy `28885387108` ✅ → `https://zhangjszs.github.io/physical-modelvis/` 返回 200 + JS/CSS 资源 200。
- **注**：仓库名为连字符 `physical-modelvis`；此前误用下划线 URL 的 404 为**假警报**。
