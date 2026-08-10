# 3D 渲染修复 — 后续任务交接文档

> **接手者请先读本文件，再读 [3D_RENDERING_FIXES_SUMMARY.md](./docs/archive/3D_RENDERING_FIXES_SUMMARY.md) 了解前序修复全貌。**

## 一、背景

PhysVis 高中物理可视化平台的 3D 实验舞台（`EquipmentStage`）近期做了一轮修复，目标是消除 Three.js 弃用警告、解决场景切换崩溃、加固防御性编程。前序修复已合并到 `main`（commit `913eac6`），1254 个单元测试 + 9 层物理自检全绿。

但浏览器端实测（用 `scripts/verify-3d-scene-switching.js` 跑了 123 个场景）发现**仍有 3 个场景报 CRASH**。本文档说明当前卡点、根因分析、以及后续需要推进的全部任务。

---

## 二、前置准备（必做）

### 2.1 提交验证脚本

`scripts/verify-3d-scene-switching.js` 目前是 **untracked**，尚未进入版本库。接手者拉代码后拿不到这个脚本，无法复现验证。请先提交：

```bash
git add scripts/verify-3d-scene-switching.js
git commit -m "test(3d): 新增 3D 场景切换实测脚本（浏览器注入版）"
git push
```

### 2.2 环境就绪

```bash
cd visualization && npm run dev   # http://localhost:3000/
```

---

## 三、当前卡点：3 个场景 CRASH 未修

### 3.1 根因（已定位）

`EquipmentStage` 里有 4 处调用 rig 方法，上一轮给其中 3 处加了 `try-catch`，**唯独漏了初始化阶段的 `rig.buildEquipment`**：

| rig 调用 | 位置 | 有 try-catch |
|---|---|---|
| `rig.buildEquipment(scene, parameters)` | `visualization/src/components/simulation3d/EquipmentStage.tsx:151` | ❌ **缺失** |
| `rig.updateEquipment(...)` | `EquipmentStage.tsx:217` | ✅ |
| `rig.getVisualPosition(...)` 轨迹重建 | `EquipmentStage.tsx:231` | ✅ |
| `rig.getVisualPosition(...)` 动画循环 | `EquipmentStage.tsx:291` | ✅ |

因为 `buildEquipment` 在 `useEffect` 里且没包 `try-catch`，一旦某 rig 的实现抛错，错误冒泡 → React 捕获 → `ErrorBoundary` 触发 → 实测脚本标记为 `CRASH`。

**关键判断**：只有 3 个场景崩溃（不是大面积），说明不是 React 时序问题，而是**这 3 个 rig 的 `buildEquipment` 实现本身有 bug**（几何参数越界 / 访问 undefined 属性等）。

### 3.2 待确认：哪 3 个场景

实测结果已挂载到运行浏览器的 `window.__3D_VERIFY_RESULT`。**接手者第一步**是在 DevTools Console 跑：

```js
copy(JSON.stringify(window.__3D_VERIFY_RESULT.results.filter(r => r.status !== 'OK'), null, 2))
```

> 注意：这是上一个跑脚本的人浏览器里的数据。如果换了机器/重开了页面，需要重跑 `verify-3d-scene-switching.js`（见第六节）。

把输出贴出来即可看到 3 个场景的：名称、所属分类、错误摘要（截断 220 字符）。完整堆栈在 Console 历史里搜 `[ErrorBoundary`。

---

## 四、任务清单（按优先级）

### 任务 1：修复 3 个 CRASH 场景 ⭐ 最高优先级

**目标**：3 个 CRASH 场景恢复为 OK，0 崩溃。

**双层修复策略**：

#### 1a. 防御层（覆盖全部 68 个 rig，立即做）

给 `EquipmentStage.tsx:151` 的 `buildEquipment` 加 `try-catch`，失败时用空 group 兜底：

```typescript
// EquipmentStage.tsx 初始化 useEffect 内，约第 150 行
let equipmentGroup: THREE.Group;
let equipmentHandles: Record<string, unknown>;
try {
    const built = rig.buildEquipment(scene, parameters);
    equipmentGroup = built.group;
    equipmentHandles = built.handles;
} catch (err) {
    console.error('[EquipmentStage] buildEquipment failed:', err);
    equipmentGroup = new THREE.Group();
    equipmentHandles = {};
}
scene.add(equipmentGroup);
```

这样即便某 rig 的 `buildEquipment` 崩溃，场景仍能渲染（只是没器材），不再白屏。后续 `updateEquipment` / `getVisualPosition` 也已有 `try-catch`，不会级联崩溃。

#### 1b. 根因层（针对 3 个场景，逐个修）

定位到具体 rig 文件（`visualization/src/components/simulation3d/rigs/<name>Rig.ts`），修复 `buildEquipment` 内的实现 bug。修完后该场景应能正常显示器材，而不是"空舞台"。

**验收**：重跑 `verify-3d-scene-switching.js`，3 个场景变为 `OK`，汇总显示 `全部场景通过`。

---

### 任务 2：3D 稳定性收尾（1-2 天）

| 子任务 | 说明 | 涉及文件 |
|---|---|---|
| 浏览器端实测验证 | 跑脚本 + 人工切换几个场景看观感 | `scripts/verify-3d-scene-switching.js` |
| 全部 68 个 rig 的 handles 结构校验 | 在 `updateEquipment` 入口统一校验 `handles` 字段存在性，给明确错误提示而非静默 | 各 `rigs/*.ts` |
| 初始化 useEffect 加 `rig` 依赖评估 | 验证 rig 引用稳定性后，考虑是否需要把 `rig` 加入初始化 effect 依赖数组 | `EquipmentStage.tsx:210` |

---

### 任务 3：视觉与交互打磨（3-5 天）

1. **阴影观感调优**：`PCFSoftShadowMap` 已降级为 `PCFShadowMap`（上一轮为消除弃用警告）。当前用 `shadow.radius=3` + `bias=-0.0005` 缓解硬边。可选：
   - 评估 `VSMShadowMap`（真软阴影，但有 light bleeding 风险）
   - 或提升 `mapSize` 到 4096 + 调 `radius`
   - 位置：`visualization/src/components/simulation3d/primitives.ts:204-214`

2. **3D 场景视觉一致性审查**：68 个 rig 由不同时期开发，光照/材质/世界尺度可能不统一。建议建立"3D 场景视觉规范"：
   - 统一地面尺寸、网格颜色
   - 统一器材配色（金属件银灰、木质件原木色）
   - 统一世界尺度（1 单位 = ? 米）

3. **交互增强**：参数调节实时预览、3D 视角预设按钮（侧视/俯视/正视）

---

### 任务 4：测试覆盖深化（持续）

当前 393 个可视化测试主要集中在物理正确性和渲染契约，**3D 交互层几乎没有测试**。

1. **`EquipmentStage` 行为测试**：`@testing-library/react` + mock WebGL，验证：
   - 场景切换不崩溃（针对本次 bug 加回归保护）
   - 参数变化正确触发 `updateEquipment`
   - rig 加载失败时正确降级

2. **rig 契约测试扩展**：`tests/accuracy/rig-contract.test.ts` 当前只测"能加载 + 返回结构正确"，可加：
   - `updateEquipment` 对各种参数组合不抛错
   - `getVisualPosition` 返回值在合理范围内
   - `buildEquipment` 不抛错（针对任务 1 的回归保护）

3. **E2E 冒烟测试**：Playwright 跑主要场景切换链路，捕获控制台 error

---

### 任务 5：新功能拓展（长期，可选）

根据 AGENTS.md "人教版高中物理 176 个实验"的体量：

1. **补齐 3D rig 覆盖**：123 个场景里 68 个有 3D rig，还有 55 个只有 2D。挑高优先级的（电磁感应、波动光学）做 3D 化
2. **实验导学模式**：场景里加步骤引导
3. **数据导出**：仿真结果导出 CSV/Excel
4. **OCR 识别增强**：支持图片中多题分离

---

## 五、关键文件索引

| 文件 | 作用 |
|---|---|
| [visualization/src/components/simulation3d/EquipmentStage.tsx](./visualization/src/components/simulation3d/EquipmentStage.tsx) | 3D 实验舞台组件，**任务 1 主要修改点（第 151 行 buildEquipment）** |
| [visualization/src/components/simulation3d/rigs/](./visualization/src/components/simulation3d/rigs/) | 68 个 rig 实现，**任务 1b 根因修复点** |
| [visualization/src/components/simulation3d/primitives.ts](./visualization/src/components/simulation3d/primitives.ts) | 环境构建、光照、阴影配置（任务 3.1） |
| [visualization/src/components/simulation3d/equipment/](./visualization/src/components/simulation3d/equipment/) | 设备组件（heightRuler/inclinedPlane/launcher 等，已加空值检查） |
| [visualization/src/components/common/ErrorBoundary.tsx](./visualization/src/components/common/ErrorBoundary.tsx) | 错误边界，崩溃时降级显示 |
| [visualization/src/scenes/ProjectileScene.tsx](./visualization/src/scenes/ProjectileScene.tsx) | 场景切换入口（已修 `setRig(undefined)` 时序问题） |
| [scripts/verify-3d-scene-switching.js](./scripts/verify-3d-scene-switching.js) | **实测脚本（任务 1 验收手段）** |
| [3D_RENDERING_FIXES_SUMMARY.md](./docs/archive/3D_RENDERING_FIXES_SUMMARY.md) | 前序修复总结文档 |

---

## 六、验证方法（实测脚本用法）

`scripts/verify-3d-scene-switching.js` 是**浏览器注入脚本**（零依赖），不是 Node 脚本。

**运行步骤**：

1. 启动 dev server：`cd visualization && npm run dev`
2. 浏览器打开 `http://localhost:3000/`
3. F12 → Console 标签页
4. 复制 `scripts/verify-3d-scene-switching.js` 全部内容，粘贴到 Console，回车
5. 等待约 4-6 分钟跑完 123 个场景

**输出解读**：

- 进度行：`[12/123] ✓ 场景名 (3D) ...`（✓ 通过 / ✗ CRASH / ⚠ 其他问题）
- 汇总计数 + 异常项表格（`console.table`）
- `⚡3D→3D` 标记连续 3D 切换路径（崩溃高发区）
- 完整结果挂到 `window.__3D_VERIFY_RESULT`

**重点检测标记**：

| 标记 | 含义 | 对应问题 |
|---|---|---|
| `CRASH` | ErrorBoundary 触发 | rig 方法抛错（如本次 buildEquipment） |
| `DEPREC` | Three.js 弃用警告 | API 迁移残留 |
| `ERROR` | 其他运行时错误 | rig 方法调用异常 |
| `NO_CANVAS` | Canvas 未出现 | 3D 舞台挂载失败 |

---

## 七、开发约定（务必遵守）

### 7.1 代码审查

每个任务实现完成后、commit 前，执行一轮代码审查（AGENTS.md 规定）。Review 维度：

1. **Correctness** — 物理公式 / 数值计算 / 边界条件 / NaN 处理
2. **Type Safety** — strict TS，no `any`，no 非空断言滥用
3. **API Consistency** — extends `PhysicsModelBase`，modelType 唯一
4. **Test Coverage** — 每个 exported 函数至少 1 positive + 1 edge-case 测试
5. **Doc & Naming** — 中文 JSDoc，变量名自解释，无 magic number
6. **Performance** — 无 O(N²) 大循环，无内存泄漏
7. **Rendering Contract** — scene 的 `parameters[].name` 与 `buildProblem` 配套

常见问题清单：除零 / 负数开方 / 数组越界 / 未处理 nullable / console.log 残留 / 未使用 import / TODO 残留 / 数学符号错（θ vs ω）。

### 7.2 提交与推送

仓库配置了 **pre-push 钩子**，推送前会跑与 CI 等价的 6 道门禁：

```
build:core → typecheck → lint → format:check → test → selfcheck
```

任何一道失败都会阻止 push。修复方式：

- `format:check` 失败 → `npm run format`（Prettier --write）
- `typecheck` 失败 → 按报错修 TS 类型
- `test` 失败 → 按报错修逻辑

**不要用 `--no-verify` 跳过**，除非用户明确要求。

### 7.3 提交信息风格

参考已有提交：

```
fix(3d): 修复 Three.js 弃用警告、场景切换崩溃，加固防御性编程
refactor: 将 gapScenes 的 8 个场景按章节合并到对应渲染文件
```

格式：`<type>(<scope>): <概述>` + 空行 + 详细要点列表。type 常用：`fix` / `feat` / `refactor` / `test` / `docs` / `chore`。

---

## 八、注意事项

1. **3 个 CRASH 场景名未确认**：上一位开发者还没把 Console 输出贴出来就交接到此文档。接手者第一步是跑 3.2 节的命令确认具体场景。
2. **rig 文件数量大**：68 个 rig，定位 bug 时建议先看 Console 的完整堆栈（搜 `[ErrorBoundary`），直接定位到出错的 rig 文件和行号，不要逐个翻。
3. **React StrictMode 双挂载**：开发环境下组件会双挂载，可能导致 useEffect 执行两次。这是正常的，不是 bug，但调试时要注意 effect 的 cleanup 必须正确。
4. **WebGL 在 headless 浏览器可能不可用**：如果要用 Playwright 做 E2E，需要 `--use-gl=swiftshader` 等参数启用软件渲染。
5. **前序文档**：[3D_RENDERING_FIXES_SUMMARY.md](./docs/archive/3D_RENDERING_FIXES_SUMMARY.md) 记录了上一轮的所有改动，包含"未采用的建议及原因"，避免重复讨论已否决的方案。

---

## 九、快速上手清单

接手者按顺序做完即可推进到下一阶段：

- [ ] 提交 `scripts/verify-3d-scene-switching.js`（第二节）
- [ ] 启动 dev server，跑实测脚本，确认 3 个 CRASH 场景名（第 3.2 节）
- [ ] 给 `EquipmentStage.tsx:151` 的 `buildEquipment` 加 try-catch（任务 1a）
- [ ] 逐个修 3 个 rig 的 `buildEquipment` 实现 bug（任务 1b）
- [ ] 重跑脚本验收：3 个场景变为 OK（任务 1 验收）
- [ ] 走代码审查 + pre-push 门禁 + 提交推送（第七节）
- [ ] 按优先级推进任务 2-5
