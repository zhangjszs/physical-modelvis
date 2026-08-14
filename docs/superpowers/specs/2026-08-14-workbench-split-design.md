# WorkbenchScene 拆分设计 — ProjectileScene → WorkbenchScene

> 日期: 2026-08-14
> 范围: `visualization/src/scenes/ProjectileScene.tsx` 架构拆分 + 参数对比失败变体显式报错
> 关联文档: `docs/plan.md`、`docs/rendering-physics-audit.md`、`AGENTS.md`

## 1. 背景与目标

`ProjectileScene.tsx` (430 行) 是所有场景共用的工作台入口 (`App.tsx` 的 `SCENE_MAP` 全场景映射到它)，但承担了 9 类职责：

1. 教材目录侧栏 (`TextbookDirectory` 内联组件)
2. 场景参数初始化 (`ensureSceneParameters`)
3. 仿真运行器 (`runSimulation` + 自动运行)
4. 光电门测量计算 (air-track 专用)
5. 参数对比实验 (effect + `result!` 非空断言)
6. 3D rig 加载状态机 (rigCacheRef + rigReady/rigLoading/rigError)
7. 舞台视口 (3D/Canvas 回退 + ErrorBoundary)
8. 数据抽屉 + 公式抽屉编排
9. 检查器侧栏编排

**目标**：
- 按职责拆分为「工作台壳 + 舞台 + 检查器 + 抽屉 + 目录」5 个组件
- 抽出 3 个可测试 hook (rig 加载 / 对比实验 / 仿真运行)
- 对比实验失败变体从「静默跳过」改为「显式报错」——修复 `result!` 非空断言遗留的盲区
- 组件改名 `ProjectileScene` → `WorkbenchScene`，移到 `src/components/workbench/`

**非目标**：
- 不重构 Zustand store 接口（compare 状态仍留在全局 store，供 SimulationCanvas/GraphPanel 消费）
- 不改变任何渲染行为与 CSS 类名
- 不扩大 3D rig 机制

## 2. 目录结构

```
visualization/src/components/workbench/
  WorkbenchScene.tsx          — 工作台壳（布局编排 + 抽屉开关状态）
  SceneStage.tsx              — 舞台（3D rig 装载 + Canvas 回退 + ErrorBoundary）
  InspectorPanel.tsx          — 检查器（ParameterPanel + ComparePanel + LayerToggle）
  DataDrawer.tsx              — 数据抽屉（GraphPanel + Photogate + StateInspector + DiagnosticsPanel）
  TextbookDirectory.tsx       — 教材目录侧栏（从 ProjectileScene 内联组件移出）
  useSceneRig.ts              — rig 加载状态机 hook
  useCompareSimulations.ts    — 参数对比实验 hook
  useSceneSimulation.ts       — 仿真运行 + 光电门 hook
```

入口: `src/scenes/ProjectileScene.tsx` 删除, `App.tsx` 的 `SCENE_MAP` 改为引用 `WorkbenchScene` (仍走 lazy)。

## 3. 组件拆分详述

### 3.1 WorkbenchScene.tsx (工作台壳)

职责：组合各部件 + 维护抽屉开关状态。删除后仅剩纯编排逻辑：

```tsx
export function WorkbenchScene() {
    // 状态: formulaOpen / dataOpen (从 ProjectileScene 原样迁移)
    // 调用 useSceneSimulation() 获得 runSimulation + simulationResult 副作用
    // 布局:
    //   <aside> TextbookDirectory
    //   <main>  StageToolbar + SceneStage + PlaybackControls
    //          + DataDrawer (dataOpen)
    //   <aside> InspectorPanel
    //   + FormulaDrawer (formulaOpen, 原公式抽屉 JSX 直接迁移)
}
```

组件内部不再出现任何仿真/rig/对比逻辑。

### 3.2 SceneStage.tsx (舞台)

从 ProjectileScene 迁移：
- rig 加载状态机 → 改用 `useSceneRig(currentScene)` hook
- `stage-viewport` 视口 JSX + ErrorBoundary + 3D/Canvas 分支 + `equipment-error` 提示
- `is3DScene` 判定逻辑保留在组件内

Props: 无（全部从 store + hook 读取）。

### 3.3 InspectorPanel.tsx (检查器)

原 `classroom-inspector` 侧栏 JSX 原样迁移：
- header (参数检查器 + 3D/Canvas 徽标，`is3DScene` 由 useSceneRig 提供)
- `ParameterPanel onRunSimulation={runSimulation}` (prop 从 WorkbenchScene 传入)
- `ComparePanel`
- `LayerToggle`

### 3.4 DataDrawer.tsx (数据抽屉)

原 `classroom-data-drawer` JSX 原样迁移（含 air-track PhotogateTimer 条件分支、各 ErrorBoundary + Suspense 懒加载）。`dataOpen` 控制由 WorkbenchScene 传入。

### 3.5 TextbookDirectory.tsx (目录)

从 ProjectileScene 内联组件原样迁移（`SCENE_CATEGORIES` + `useSimulationStore` 读取）。

### 3.6 FormulaDrawer (不单独建文件)

公式抽屉 JSX (~35 行) 直接在 WorkbenchScene 内保留——它只是 overlay + FormulaPanel，无逻辑，单独建文件收益低。

## 4. Hooks 设计

### 4.1 useSceneRig.ts

从 ProjectileScene 原样迁移 rig 状态机逻辑：

```ts
export function useSceneRig(sceneId: string): {
    rig: SceneRig | null;
    rigReady: boolean;
    rigLoading: boolean;
    rigError: string | null;
    is3DScene: boolean;
}
```

内部保留 `rigCacheRef` 按场景 ID 缓存 + `hasSceneRig/loadSceneRig` 调用 + `cancelled` 竞态保护。

### 4.2 useCompareSimulations.ts

对比实验逻辑从 ProjectileScene effect 移出，**同时实现失败变体显式报错**：

```ts
export function useCompareSimulations(): void
```

输入: store 的 compareMode / compareConfig / parameters / currentScene / scenes
行为:
- 对比模式关闭或 config 为空 → 清空 compareResults (保持原逻辑)
- 开启 → 生成均匀分布变体值，逐个 `runSceneSimulation`：
  - 成功: `{ paramValue, result, color, error: null }`
  - 失败: `{ paramValue, result: null, color, error }` ← 不再静默跳过
- 全部失败 → compareResults 仍有条目（带 error），不主动清空
- 保留 `cancelled` 竞态清理

### 4.3 useSceneSimulation.ts

从 ProjectileScene 迁移：

```ts
export function useSceneSimulation(): {
    runSimulation: () => void;
}
```

内部:
- 首次加载/场景切换自动运行 (currentScene + sceneLoadVersion 依赖)
- `ensureSceneParameters` 初始化 (scene 依赖)
- air-track 光电门计算 effect (computePhotogateMeasurements → setExperimentData)

## 5. CompareEntry 类型变更 + 消费方适配

### 5.1 类型变更 (`src/types/visualization.ts`)

```ts
export interface CompareEntry {
    paramValue: number;
    result: SimulationResult | null;   // 失败变体为 null
    color: string;
    error?: string;                     // 失败原因 (ParameterOutOfRangeError 等)
}
```

### 5.2 消费方适配

| 文件 | 现状 | 改动 |
|---|---|---|
| `SimulationCanvas.tsx:1208` | `compareResults.map(e => e.result)` 参与 autoFit 坐标拟合 | 过滤 `e.result !== null` |
| `SimulationCanvas.tsx:1790` | `entry.result.trajectories` 直接访问 | 跳过 `entry.result === null` 的变体 (`continue`) |
| `GraphPanel.tsx:68` | `extractGraphSeries(entry.result, ...)` 直接访问 | `entry.result === null` 时返回 null (被现有 filter 丢弃) |
| `ComparePanel.tsx:149` 图例 | 显示 `paramValue = X` | 失败变体显示 `✗ 求解失败: <error>` (红色标记，CSS 复用现有 error 样式) |

### 5.3 ComparePanel 图例渲染改动

```tsx
{compareResults.map((entry, i) => (
    <div key={i} className="compare-legend-item">
        <span className="compare-legend-color" style={{ backgroundColor: entry.error ? '#94a3b8' : entry.color }} />
        <span className="compare-legend-label">
            {entry.error
                ? `${activeParam?.label ?? activeParam?.name} = ${entry.paramValue} ${activeParam?.unit ?? ''} ✗ 求解失败`
                : `${activeParam?.label ?? activeParam?.name} = ${entry.paramValue} ${activeParam?.unit ?? ''}`}
        </span>
        {entry.error && <span className="compare-legend-error" title={entry.error}>({entry.error})</span>}
    </div>
))}
```

失败变体用灰色色块 + 红色错误文字，不参与轨迹/图表绘制（消费方已过滤）。

## 6. 测试计划

新增 `visualization/tests/workbench/`：

### 6.1 useCompareSimulations.test.ts (核心，覆盖显式报错)

1. 对比模式关闭 → 清空 compareResults
2. 开启 + 全部参数有效 → 生成 N 个成功条目 (result 非空, error 为空)
3. **开启 + 变体含越界值 → 失败变体 result=null + error 非空，成功变体不受影响** (核心新行为)
4. 全部变体失败 → compareResults 含 N 个 error 条目（不清空）
5. 场景切换/卸载 → cancelled 竞态不再 setState (挂载/卸载测试)
6. count 越界 clamp (2..8)

测试方式: `renderHook` (需 @testing-library/react，检查是否已依赖) 或直接调用 hook 逻辑纯函数。若仓库无 testing-library，则将变体生成+求解逻辑抽为纯函数 `generateCompareEntries(variantValues, scene, baseParams)` 直接单测，hook 只做包装。

### 6.2 useSceneRig.test.ts

1. 有 rig 场景 → rigReady=true + rig 非空
2. 无 rig 场景 → rigReady=true + rig=null (Canvas 分支)
3. 加载失败 → rigError 非空 + rigReady=false
4. 场景切换 → 缓存命中 (rigCacheRef) 不重复加载
5. 卸载后不再 setState (竞态)

### 6.3 useSceneSimulation.test.ts

1. 挂载自动运行一次 (currentScene 变化触发)
2. sceneLoadVersion 变化 → 重新运行
3. air-track 场景 + 有结果 → setExperimentData 被调用且数据非空
4. 非 air-track → setExperimentData(null)

### 6.4 现有测试保障

- `equipment-stage.test.tsx` / `rigs-build.test.ts` 不受影响（EquipmentStage 未动）
- `single-source-contract.test.ts` 等 accuracy 测试必须保持全绿

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| compareResults 消费方遗漏 (遗漏处仍 `entry.result!`) | 改完跑全量 typecheck，`entry.result` 为 `SimulationResult \| null` 后 TS 强制所有消费方处理空值 |
| hook 竞态 (场景快速切换) | 保留 cancelled 清理；useSceneRig 保留场景缓存 |
| 抽屉开关状态迁移遗漏 | WorkbenchScene 逐段对照原 JSX 迁移 |
| 行为回归 | 全部现有测试 (viz ~1161) + typecheck + lint 门禁 |
| testing-library 缺失 | 依赖清单确认；若无则 hook 抽纯函数直接单测 |

## 8. 提交计划

拆分 + 类型变更 + 适配 + 测试为**一个 commit**（refactor 类型）：

```
refactor(workbench): ProjectileScene 拆分为 WorkbenchScene 组件族 + 对比失败显式报错

- 新增 src/components/workbench/: WorkbenchScene / SceneStage / InspectorPanel /
  DataDrawer / TextbookDirectory + useSceneRig / useCompareSimulations / useSceneSimulation
- CompareEntry.result 可空 + error 字段, SimulationCanvas/GraphPanel 过滤 null,
  ComparePanel 图例显示失败标记
- 新增 tests/workbench/ 3 个 hook 测试
- App.tsx SCENE_MAP 改用 WorkbenchScene
```

先提交此设计文档（docs 类型 commit），再执行拆分。