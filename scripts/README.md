# 自动化验证与自检脚本 (Scripts)

本目录包含 PhysVis 的物理引擎多层自检、自动化端到端冒烟测试以及浏览器环境校验脚本。

---

## 📋 脚本全览

| 脚本文件 | 运行时 | 主要职责 | 依赖条件 |
| :--- | :--- | :--- | :--- |
| `self-check.mjs` | Node.js | **11 层物理自检** (L0-L6 + L8-L11；无 L7)：验证物理常数、守恒律、单源真理契约、公式漂移、输出 NaN 及 694+ 极限参数数值鲁棒性 | 无需外部服务，直接运行 |
| `count-tests.mjs` | Node.js | **测试数统计单源**：实跑 core+viz 并输出测试数；`--check` 校验 README/plan 三处标记行与实跑一致（precheck/CI 内置），`--write` 回写；`--from-report` 复用已有报告不重跑 | 依赖已产出的 vitest JSON 报告（`.scratch/`） |
| `verify-3d-smoke.cjs` | Playwright | **3D 实验仪器冒烟**：测试 14 个代表性 3D/2D 场景双轮切换与 Rig 渲染稳定性 | 需本地 Dev Server 运行中 |
| `verify-e1-render-smoke.cjs` | Playwright | **基础 2D 渲染冒烟**：验证抛体、自由落体、机械波、分子扩散、布朗运动真实绘制 | 需本地 Dev Server 运行中 |
| `verify-guidance-smoke.cjs` | Playwright | **课堂引导系统冒烟**：验证引导面板步进、回退、关闭及场景重定向 | 需本地 Dev Server 运行中 |
| `verify-ocr-mount.cjs` | Playwright | **OCR 拍照解题挂载冒烟**：验证入口按钮、弹窗打开、识别状态流转与关闭 | 需本地 Dev Server 运行中 |
| `verify-3d-scene-switching.js` | 浏览器控制台 | **全量场景切换测试**：零依赖脚本，在浏览器 DevTools 控制台直接执行，全自动化遍历 123 个场景 | 浏览器控制台直接执行 |

---

## 🚀 运行方式

### 1. 物理引擎 11 层自检 (本地门禁与 CI 核心)

```bash
# 通过 npm 一键调用
npm run selfcheck

# 或直接使用 Node 运行
node scripts/self-check.mjs
```

> **注意**：修改 `physics-core/src/**` 源码后，需先执行 `npm run build:core`（重建 dist），再运行自检。

---

### 2. 测试数统计与文档一致性校验 (本地门禁与 CI 核心)

统计口径来自各包 `npm test` 产出的 vitest JSON 报告；文档三处测试数以 `<!-- test-count -->` 标记定位（README 顶部行、README 测试覆盖块、`docs/plan.md` 当前测试数行），不触碰 plan.md 中的历史测试数快照。

```bash
npm run count          # 实跑 core+viz 并输出统计
npm run count:check    # 校验三处与实跑一致 (precheck/CI 内置, 只读已有报告不重跑)
npm run count:sync     # 实跑并回写文档三处标记行
```

> **注意**：报告只由全量 `npm test` 产出；`self-check.mjs` 的分层调用已改为直接跑 vitest、不写该报告，故任何顺序下 `count:check --from-report` 校验到的都是全量结果。

---

### 3. Playwright 自动化冒烟测试

冒烟测试通过无头浏览器模拟真实用户操作，检测 Canvas/Three.js 渲染上下文是否出现未捕获异常。

**运行步骤：**
1. 先在一个终端启动前端服务：
   ```bash
   cd visualization
   npm run dev -- --port 3000
   ```
2. 在另一个终端执行对应冒烟测试：
   ```bash
   # 3D 实验仪器冒烟
   npm run test:smoke:3d        # 或 node scripts/verify-3d-smoke.cjs

   # 核心渲染冒烟
   npm run test:smoke:render    # 或 node scripts/verify-e1-render-smoke.cjs

   # 课堂引导流程冒烟
   npm run test:smoke:guidance  # 或 node scripts/verify-guidance-smoke.cjs

   # OCR 拍照解题面板冒烟
   npm run test:smoke:ocr       # 或 node scripts/verify-ocr-mount.cjs
   ```

---

### 4. 浏览器控制台 123 全场景遍历 (`verify-3d-scene-switching.js`)

适用于本地重构 3D Rig 或切换机制时的快速视觉与性能体检：
1. 启动并打开前端应用（例如 `http://localhost:5173` 或 `http://localhost:3000`）。
2. 按 `F12` 打开浏览器开发者工具，切换到 **Console** 面板。
3. 复制 `scripts/verify-3d-scene-switching.js` 全部内容，粘贴到控制台并回车。
4. 脚本将自动遍历 123 个场景，并在控制台输出每一个场景的切换耗时、渲染模式及最终统计。
