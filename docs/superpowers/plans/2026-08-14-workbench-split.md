# WorkbenchScene 拆分实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 430 行的 ProjectileScene 拆分为 WorkbenchScene 组件族（5 组件 + 3 hooks），并把参数对比失败变体从「静默跳过」改为「显式报错」。

**Architecture:** 职责分离 — 壳组件只做布局编排；rig 加载、对比实验、仿真运行抽成 3 个可测试 hooks；`CompareEntry.result` 变为可空 + `error?` 字段，3 处消费方过滤空值。行为变更仅一处：对比失败变体在图例显示错误标记。

**Tech Stack:** React 18 + TypeScript strict + Zustand + vitest (@testing-library/react v16, jsdom)

**Spec:** `docs/superpowers/specs/2026-08-14-workbench-split-design.md`

## Global Constraints

- 不新增任何依赖（testing-library/react 已存在，`renderHook` 可用）
- 不改变任何 CSS 类名与渲染行为（除对比图例错误标记外）
- 不改变 Zustand store 接口（compare 状态仍留在全局 store）
- 中文 JSDoc + 中文 UI 文案
- TypeScript strict，无 `any`，无未经处理的非空断言
- 每个任务结束必须能通过：相关新测试 + `npx.cmd tsc --noEmit`（visualization 目录）
- 提交格式 `<type>(<scope>): <概述>`，每次 commit 前按 AGENTS.md 代码审查清单自查
- 测试命令统一 `cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run <路径>`
- typecheck 命令统一 `cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd tsc --noEmit`

---

### Task 1: CompareEntry 类型变更 + 消费方适配

**Files:**
- Modify: `visualization/src/types/visualization.ts:95-99`
- Modify: `visualization/src/components/simulation/SimulationCanvas.tsx:1208, 1790-1807`
- Modify: `visualization/src/components/charts/GraphPanel.tsx:66-82`
- Modify: `visualization/src/components/controls/ComparePanel.tsx:146-159`

**Interfaces:**
- Consumes: 现有 `CompareEntry`（`result: SimulationResult`）
- Produces: 新 `CompareEntry` = `{ paramValue: number; result: SimulationResult | null; color: string; error?: string }`。本任务后 `entry.result` 在任何消费方都可能是 null，TS 强制后续代码处理。

- [ ] **Step 1: 修改类型定义**

`visualization/src/types/visualization.ts:95-99`:

```ts
export interface CompareEntry {
    paramValue: number;
    /** 求解失败时为 null（参数越界/引擎错误），error 携带原因 */
    result: SimulationResult | null;
    color: string;
    /** 失败原因（如参数越界），成功变体无此字段 */
    error?: string;
}
```

- [ ] **Step 2: 适配 SimulationCanvas 两处**

`SimulationCanvas.tsx:1207-1208`（autoFit 坐标拟合）：

```ts
const resultsToFit =
    compareMode && compareResults.length > 0
        ? compareResults.filter(e => e.result !== null).map(e => e.result)
        : [simulationResult];
```

（filter 后 `e.result` 类型收窄为 `SimulationResult`，`for (const result of resultsToFit)` 循环体不变）

`SimulationCanvas.tsx:1790-1793`（对比模式轨迹绘制）：

```ts
for (let ci = 0; ci < compareResults.length; ci++) {
    const entry = compareResults[ci]!;
    if (!entry.result) continue; // 失败变体不绘制轨迹
    const entryTraj = entry.result.trajectories[0] ?? [];
    if (entryTraj.length === 0) continue;
```

- [ ] **Step 3: 适配 GraphPanel 对比序列提取**

`GraphPanel.tsx:66-82` 的 `compareSeries` 中：

```ts
return compareResults
    .map(entry => {
        if (!entry.result) return null; // 失败变体无图表数据
        const series = extractGraphSeries(entry.result, selectedGraph);
        ...
```

（后续代码不变，现有 `filter((s): s is NonNullable<typeof s> => s !== null)` 已丢弃 null）

- [ ] **Step 4: 适配 ComparePanel 图例（显式报错 UI）**

`ComparePanel.tsx:146-159` 图例区域替换为：

```tsx
{compareResults.length > 0 && (
    <div className="compare-legend">
        <div className="compare-legend-title">图例</div>
        {compareResults.map((entry, i) => (
            <div key={i} className="compare-legend-item">
                <span
                    className="compare-legend-color"
                    style={{ backgroundColor: entry.error ? '#94a3b8' : entry.color }}
                />
                <span className="compare-legend-label">
                    {activeParam?.label ?? activeParam?.name} = {entry.paramValue} {activeParam?.unit ?? ''}
                    {entry.error && <span className="compare-legend-error"> ✗ 求解失败</span>}
                </span>
                {entry.error && (
                    <span className="compare-legend-error" title={entry.error}>
                        ({entry.error})
                    </span>
                )}
            </div>
        ))}
    </div>
)}
```

（无需新增 CSS：`compare-legend-error` 复用现有错误文字样式，无则暂用 `color: #dc2626; font-size: 11px` 内联 style）

- [ ] **Step 5: 验证 typecheck + 现有测试**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd tsc --noEmit
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/accuracy/single-source-contract.test.ts
```

预期：typecheck 无错误（ProjectileScene 中 `result: result!` 仍可赋给 `SimulationResult | null`，Task 3 会重写该处）；契约测试全绿。

- [ ] **Step 6: Commit**

```bash
cd D:\Coding\Projects\physical_modelvis; git add visualization/src/types/visualization.ts visualization/src/components/simulation/SimulationCanvas.tsx visualization/src/components/charts/GraphPanel.tsx visualization/src/components/controls/ComparePanel.tsx; git commit -m "refactor(workbench): CompareEntry 支持失败变体 (result 可空 + error 字段), 消费方过滤 null + 图例显式报错"
```

---

### Task 2: useSceneRig hook + 测试

**Files:**
- Create: `visualization/src/components/workbench/useSceneRig.ts`
- Create: `visualization/tests/workbench/useSceneRig.test.ts`

**Interfaces:**
- Consumes: `hasSceneRig` / `loadSceneRig`（`visualization/src/components/simulation3d/rigs/index.ts:179,198`）、`SceneRig`（`EquipmentStage.tsx:33`）
- Produces: `useSceneRig(sceneId: string): { rig: SceneRig | null; rigReady: boolean; rigLoading: boolean; rigError: string | null; is3DScene: boolean }` — Task 5 的 SceneStage/InspectorPanel 依赖

- [ ] **Step 1: 写失败测试**

`visualization/tests/workbench/useSceneRig.test.ts`:

```ts
/**
 * useSceneRig 行为测试 — rig 加载状态机 (从 ProjectileScene 拆出)
 *
 * 覆盖: 有 rig 场景加载成功 / 无 rig 场景走 Canvas / 加载失败回退 /
 * 场景切换缓存命中 / 卸载后不再 setState (竞态保护)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useSceneRig } from '../../src/components/workbench/useSceneRig';
import { hasSceneRig, loadSceneRig } from '../../src/components/simulation3d/rigs';
import type { SceneRig } from '../../src/components/simulation3d/EquipmentStage';

vi.mock('../../src/components/simulation3d/rigs', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/components/simulation3d/rigs')>();
    return {
        ...actual,
        hasSceneRig: vi.fn(),
        loadSceneRig: vi.fn()
    };
});

const mockRig = { buildEquipment: vi.fn(), updateEquipment: vi.fn() } as unknown as SceneRig;
const mockHasSceneRig = vi.mocked(hasSceneRig);
const mockLoadSceneRig = vi.mocked(loadSceneRig);

describe('useSceneRig', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('有 rig 的场景: 加载成功后 rigReady=true 且 rig 非空', async () => {
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockResolvedValue(mockRig);
        const { result } = renderHook(() => useSceneRig('projectile'));
        expect(result.current.rigLoading).toBe(true);
        expect(result.current.is3DScene).toBe(true);
        await act(async () => {});
        expect(result.current.rigReady).toBe(true);
        expect(result.current.rig).toBe(mockRig);
        expect(result.current.rigError).toBeNull();
    });

    it('无 rig 的场景: rigReady=true, rig=null, 走 Canvas 分支', () => {
        mockHasSceneRig.mockReturnValue(false);
        const { result } = renderHook(() => useSceneRig('some-canvas-scene'));
        expect(result.current.rigReady).toBe(true);
        expect(result.current.rig).toBeNull();
        expect(result.current.is3DScene).toBe(false);
        expect(mockLoadSceneRig).not.toHaveBeenCalled();
    });

    it('加载失败: rigError 非空, rigReady=false', async () => {
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockRejectedValue(new Error('chunk 404'));
        const { result } = renderHook(() => useSceneRig('projectile'));
        await act(async () => {});
        expect(result.current.rigReady).toBe(false);
        expect(result.current.rigError).not.toBeNull();
    });

    it('场景切换: 已缓存 rig 直接命中, 不重复调用 loadSceneRig', async () => {
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockResolvedValue(mockRig);
        const { result, rerender } = renderHook(({ id }) => useSceneRig(id), {
            initialProps: { id: 'projectile' }
        });
        await act(async () => {});
        expect(mockLoadSceneRig).toHaveBeenCalledTimes(1);
        // 切回已缓存场景
        rerender({ id: 'free-fall' });
        await act(async () => {});
        rerender({ id: 'projectile' });
        await act(async () => {});
        expect(mockLoadSceneRig).toHaveBeenCalledTimes(2); // 每个场景最多一次
    });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/workbench/useSceneRig.test.ts
```

预期：FAIL（模块不存在 / 函数未定义）。

- [ ] **Step 3: 实现 hook**

`visualization/src/components/workbench/useSceneRig.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import { loadSceneRig, hasSceneRig } from '../simulation3d/rigs';
import type { SceneRig } from '../simulation3d/EquipmentStage';

export interface SceneRigState {
    rig: SceneRig | null;
    rigReady: boolean;
    rigLoading: boolean;
    rigError: string | null;
    is3DScene: boolean;
}

/**
 * 3D 实验器材 (rig) 加载状态机。
 * 按场景 ID 缓存已加载 rig；渲染条件 = 缓存中存在当前场景 rig。
 * 从 ProjectileScene 拆出，竞态保护 (cancelled) 与场景缓存逻辑原样迁移。
 */
export function useSceneRig(sceneId: string): SceneRigState {
    const rigCacheRef = useRef<Record<string, SceneRig>>({});
    const [rigReady, setRigReady] = useState(false);
    const [rigLoading, setRigLoading] = useState(false);
    const [rigError, setRigError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setRigError(null);
        setRigLoading(hasSceneRig(sceneId));

        if (hasSceneRig(sceneId)) {
            if (rigCacheRef.current[sceneId]) {
                setRigReady(true);
            } else {
                setRigReady(false);
                loadSceneRig(sceneId)
                    .then(loaded => {
                        if (!cancelled && loaded) {
                            rigCacheRef.current[sceneId] = loaded;
                            setRigReady(true);
                            setRigLoading(false);
                        }
                    })
                    .catch(err => {
                        // chunk 加载失败（404/网络/部署路径错误）→ 回退 Canvas 并提示
                        console.error('[useSceneRig] rig 加载失败:', err);
                        if (!cancelled) {
                            setRigReady(false);
                            setRigLoading(false);
                            setRigError('3D 实验器材加载失败，已回退 2D 画面');
                        }
                    });
            }
        } else {
            setRigReady(true);
            setRigLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [sceneId]);

    const rig = rigCacheRef.current[sceneId] ?? null;
    const is3DScene = !!rig || rigLoading;

    return { rig, rigReady, rigLoading, rigError, is3DScene };
}
```

注意：`is3DScene = !!rig || rigLoading` 与 ProjectileScene 原逻辑一致（rig 缓存引用在 effect 外读取，渲染时用最新缓存值）。

- [ ] **Step 4: 运行测试确认通过**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/workbench/useSceneRig.test.ts
```

预期：4 例全绿。

- [ ] **Step 5: typecheck + Commit**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd tsc --noEmit
cd D:\Coding\Projects\physical_modelvis; git add visualization/src/components/workbench/useSceneRig.ts visualization/tests/workbench/useSceneRig.test.ts; git commit -m "refactor(workbench): 抽取 useSceneRig rig 加载状态机 hook + 4 例单元测试"
```

---

### Task 3: useCompareSimulations hook + 测试（显式报错核心行为）

**Files:**
- Create: `visualization/src/components/workbench/useCompareSimulations.ts`
- Modify: `visualization/src/scenes/ProjectileScene.tsx:133-190`（替换原 compare effect 为 hook 调用）
- Create: `visualization/tests/workbench/useCompareSimulations.test.ts`

**Interfaces:**
- Consumes: store 的 `compareMode/compareConfig/parameters/currentScene/scenes/setCompareResults`、`runSceneSimulation`（`adapters/physicsCoreAdapter.ts:28`）、`GRAPH_COLORS`（`utils/colorMap.ts`）、新 `CompareEntry`（Task 1）
- Produces: `useCompareSimulations(): void`（副作用 hook，无返回值）— Task 5 WorkbenchScene 调用

- [ ] **Step 1: 写失败测试**

`visualization/tests/workbench/useCompareSimulations.test.ts`:

```ts
/**
 * useCompareSimulations 行为测试 — 参数对比实验
 *
 * 核心新行为: 失败变体显式报错 (result=null + error), 不再静默跳过。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useCompareSimulations } from '../../src/components/workbench/useCompareSimulations';
import { useSimulationStore } from '../../src/store/simulationStore';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import type { SimulationResult } from 'physics-core';

vi.mock('../../src/adapters/physicsCoreAdapter', () => ({
    runSceneSimulation: vi.fn()
}));

const mockRun = vi.mocked(runSceneSimulation);

const okResult = { trajectories: [], charts: {}, diagnostics: { maxValues: {} } } as unknown as SimulationResult;

function okScene() {
    return {
        id: 'projectile',
        name: '抛体运动',
        model: 'projectile',
        parameters: [
            { name: 'angle', label: '发射角', unit: '°', value: 45, min: 0, max: 90, step: 1, default: 45, description: '' }
        ],
        buildProblem: (p: Record<string, number>) => ({ model: 'projectile', parameters: p })
    } as unknown as Parameters<typeof runSceneSimulation>[0];
}

describe('useCompareSimulations', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        useSimulationStore.setState({
            currentScene: 'projectile',
            parameters: { angle: 45 },
            scenes: [okScene()],
            compareMode: true,
            compareConfig: { paramName: 'angle', count: 3, min: 30, max: 60 },
            compareResults: []
        });
    });

    it('对比模式关闭 → 清空 compareResults', () => {
        useSimulationStore.setState({ compareMode: false, compareResults: [{
            paramValue: 30, result: okResult, color: '#000'
        }] });
        renderHook(() => useCompareSimulations());
        expect(useSimulationStore.getState().compareResults).toEqual([]);
    });

    it('全部参数有效 → 生成 N 个成功条目 (result 非空, 无 error)', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        renderHook(() => useCompareSimulations());
        const entries = useSimulationStore.getState().compareResults;
        expect(entries).toHaveLength(3);
        for (const e of entries) {
            expect(e.result).not.toBeNull();
            expect(e.error).toBeUndefined();
        }
        // 均匀分布: 30 / 45 / 60
        expect(entries.map(e => e.paramValue)).toEqual([30, 45, 60]);
    });

    it('部分变体越界 → 失败变体 result=null + error 非空, 成功变体不受影响', () => {
        mockRun.mockImplementation((_scene, params) =>
            params['angle'] === 60 ? { result: null, error: '参数错误: angle 超出范围' } : { result: okResult, error: null }
        );
        renderHook(() => useCompareSimulations());
        const entries = useSimulationStore.getState().compareResults;
        expect(entries).toHaveLength(3); // 不再静默丢弃失败变体
        const failed = entries.find(e => e.paramValue === 60)!;
        expect(failed.result).toBeNull();
        expect(failed.error).toContain('参数错误');
        const ok = entries.filter(e => e.paramValue !== 60);
        for (const e of ok) {
            expect(e.result).not.toBeNull();
            expect(e.error).toBeUndefined();
        }
    });

    it('全部变体失败 → 保留 N 个 error 条目 (不清空)', () => {
        mockRun.mockReturnValue({ result: null, error: '求解失败: 越界' });
        renderHook(() => useCompareSimulations());
        const entries = useSimulationStore.getState().compareResults;
        expect(entries).toHaveLength(3);
        for (const e of entries) {
            expect(e.result).toBeNull();
            expect(e.error).toBeDefined();
        }
    });

    it('count 越界 clamp 到 2..8', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        useSimulationStore.setState({ compareConfig: { paramName: 'angle', count: 99, min: 30, max: 60 } });
        renderHook(() => useCompareSimulations());
        expect(useSimulationStore.getState().compareResults).toHaveLength(8);
    });

    it('卸载后不再 setCompareResults (竞态保护)', async () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        const { unmount } = renderHook(() => useCompareSimulations());
        unmount();
        // 卸载后 store 不因异步残留更新 —— 同步实现下本用例验证 store 未被再次写入
        const before = useSimulationStore.getState().compareResults;
        await act(async () => {});
        expect(useSimulationStore.getState().compareResults).toBe(before);
    });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/workbench/useCompareSimulations.test.ts
```

预期：FAIL（模块不存在）。

- [ ] **Step 3: 实现 hook**

`visualization/src/components/workbench/useCompareSimulations.ts`:

```ts
import { useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { runSceneSimulation } from '../../adapters/physicsCoreAdapter';
import { GRAPH_COLORS } from '../../utils/colorMap';
import type { CompareEntry } from '../../types/visualization';

const MAX_COMPARE = 8;
const MIN_COMPARE = 2;

/**
 * 参数对比实验副作用 hook。
 * 对比模式开启时生成均匀分布的参数变体并逐个求解；
 * 失败变体显式保留 (result=null + error)，由消费方过滤/展示，不再静默跳过。
 */
export function useCompareSimulations(): void {
    const compareMode = useSimulationStore(s => s.compareMode);
    const compareConfig = useSimulationStore(s => s.compareConfig);
    const currentScene = useSimulationStore(s => s.currentScene);
    const parameters = useSimulationStore(s => s.parameters);
    const scenes = useSimulationStore(s => s.scenes);
    const setCompareResults = useSimulationStore(s => s.setCompareResults);
    const scene = scenes.find(s => s.id === currentScene);

    useEffect(() => {
        if (!compareMode || !compareConfig || !scene) {
            // 未开启对比模式 → 清空结果，恢复单仿真渲染
            if (useSimulationStore.getState().compareResults.length > 0) {
                setCompareResults([]);
            }
            return;
        }

        const { paramName, count, min, max } = compareConfig;
        const clampedCount = Math.max(MIN_COMPARE, Math.min(MAX_COMPARE, count));

        // 生成 count 组均匀分布的参数值
        const variantValues: number[] = [];
        for (let i = 0; i < clampedCount; i++) {
            const value = min + ((max - min) * i) / (clampedCount - 1);
            variantValues.push(value);
        }

        // 逐变体求解（同步求解，无需 Promise.all）
        const entries: CompareEntry[] = variantValues.map((paramValue, i) => {
            const variantParams = { ...parameters, [paramName]: paramValue } as Record<string, number>;
            const { result, error } = runSceneSimulation(scene, variantParams);
            return {
                paramValue,
                result,
                color: GRAPH_COLORS[i % GRAPH_COLORS.length]!,
                error: error ?? undefined
            } satisfies CompareEntry;
        });

        setCompareResults(entries);
    }, [compareMode, compareConfig, currentScene, scene, parameters, setCompareResults]);
}
```

注意：
- 原 ProjectileScene 实现是 `async` + `cancelled` 竞态清理（因为当时是 `Promise.all(async map)`）；现在同步求解，无需 async/cancelled，竞态由 effect 清理天然覆盖（每次 config 变化重建 effect 覆盖旧结果）。原 `clampedCount === 1` 死分支删除（clampedCount ≥ 2 恒成立）。
- 替换 ProjectileScene 原 compare effect（第 133-190 行整段）为：`useCompareSimulations();` 一行调用 + 移除 `compareMode/compareConfig/setCompareResults` 的本地订阅与 `CompareEntry/GRAPH_COLORS/runSceneSimulation` 的 import（runSceneSimulation 仍在 runSimulation 使用，保留）。

- [ ] **Step 4: 运行测试确认通过**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/workbench/useCompareSimulations.test.ts
```

预期：6 例全绿。

- [ ] **Step 5: typecheck + 现有测试回归**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd tsc --noEmit
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/accuracy/single-source-contract.test.ts
```

预期：typecheck 无错误；契约测试全绿（ProjectileScene 对比逻辑已由 hook 接管）。

- [ ] **Step 6: Commit**

```bash
cd D:\Coding\Projects\physical_modelvis; git add visualization/src/components/workbench/useCompareSimulations.ts visualization/src/scenes/ProjectileScene.tsx visualization/tests/workbench/useCompareSimulations.test.ts; git commit -m "refactor(workbench): 抽取 useCompareSimulations hook — 失败变体显式报错 (result=null+error) + 6 例单元测试"
```

---

### Task 4: useSceneSimulation hook + 测试

**Files:**
- Create: `visualization/src/components/workbench/useSceneSimulation.ts`
- Modify: `visualization/src/scenes/ProjectileScene.tsx:87-131`（替换初始化/运行/光电门 effect 为 hook 调用）
- Create: `visualization/tests/workbench/useSceneSimulation.test.ts`

**Interfaces:**
- Consumes: store 的 `currentScene/parameters/sceneLoadVersion/simulationResult/scenes/setSimulationResult/setErrorMessage/ensureSceneParameters/setExperimentData`、`getDefaultParams`（`scenes/sceneRegistry.ts`）、`computePhotogateMeasurements`（`utils/photogate.ts`）
- Produces: `useSceneSimulation(): { runSimulation: () => void }` — Task 5 WorkbenchScene → InspectorPanel 的 ParameterPanel `onRunSimulation` prop

- [ ] **Step 1: 写失败测试**

`visualization/tests/workbench/useSceneSimulation.test.ts`:

```ts
/**
 * useSceneSimulation 行为测试 — 仿真运行器 + air-track 光电门
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useSceneSimulation } from '../../src/components/workbench/useSceneSimulation';
import { useSimulationStore } from '../../src/store/simulationStore';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import type { SimulationResult } from 'physics-core';

vi.mock('../../src/adapters/physicsCoreAdapter', () => ({
    runSceneSimulation: vi.fn()
}));

const mockRun = vi.mocked(runSceneSimulation);

const okResult = {
    trajectories: [
        [
            { position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 }, t: 0 },
            { position: { x: 1, y: 1 }, velocity: { x: 1, y: 1 }, t: 1 }
        ]
    ],
    charts: {},
    diagnostics: { maxValues: {} }
} as unknown as SimulationResult;

function scene(id: string, params: Array<Record<string, number>> = []) {
    return {
        id,
        name: id,
        model: 'projectile',
        parameters: params,
        buildProblem: (p: Record<string, number>) => ({ model: 'projectile', parameters: p })
    } as unknown as Parameters<typeof runSceneSimulation>[0];
}

describe('useSceneSimulation', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        useSimulationStore.setState({
            currentScene: 'projectile',
            parameters: { angle: 45 },
            parametersSceneId: 'projectile',
            sceneLoadVersion: 0,
            scenes: [scene('projectile')],
            simulationResult: null,
            experimentData: null
        });
    });

    it('挂载时自动运行一次仿真', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        renderHook(() => useSceneSimulation());
        expect(mockRun).toHaveBeenCalledTimes(1);
        expect(useSimulationStore.getState().simulationResult).toBe(okResult);
    });

    it('sceneLoadVersion 变化 → 重新运行', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        renderHook(() => useSceneSimulation());
        expect(mockRun).toHaveBeenCalledTimes(1);
        useSimulationStore.setState({ sceneLoadVersion: 1 });
        expect(mockRun).toHaveBeenCalledTimes(2);
    });

    it('求解失败 → 写入 errorMessage, 不写入 simulationResult', () => {
        mockRun.mockReturnValue({ result: null, error: '参数错误: angle 超出范围' });
        renderHook(() => useSceneSimulation());
        expect(useSimulationStore.getState().errorMessage).toContain('参数错误');
        expect(useSimulationStore.getState().simulationResult).toBeNull();
    });

    it('runSimulation 手动调用 → 重新求解', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        const { result } = renderHook(() => useSceneSimulation());
        mockRun.mockClear();
        act(() => result.current.runSimulation());
        expect(mockRun).toHaveBeenCalledTimes(1);
    });

    it('air-track 场景 + 有结果 → 写入光电门数据', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        useSimulationStore.setState({
            currentScene: 'air-track',
            scenes: [scene('air-track')],
            parameters: { x1: 0.3, x2: 0.8, flagWidth: 0.02 }
        });
        renderHook(() => useSceneSimulation());
        const data = useSimulationStore.getState().experimentData;
        expect(data).not.toBeNull();
    });

    it('非 air-track 场景 → experimentData 清空', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        useSimulationStore.setState({ experimentData: [{ gateIndex: 0, tPass: 0.1, vAvg: 0.5 }] });
        renderHook(() => useSceneSimulation());
        expect(useSimulationStore.getState().experimentData).toBeNull();
    });
});
```

注意：光电门计算依赖 `computePhotogateMeasurements(trajectory, ...)` 真实实现（纯函数，Node 可用，不需要 mock）。

- [ ] **Step 2: 运行确认失败**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/workbench/useSceneSimulation.test.ts
```

预期：FAIL（模块不存在）。

- [ ] **Step 3: 实现 hook**

`visualization/src/components/workbench/useSceneSimulation.ts`:

```ts
import { useCallback, useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { runSceneSimulation } from '../../adapters/physicsCoreAdapter';
import { getDefaultParams } from '../../scenes/sceneRegistry';
import { computePhotogateMeasurements } from '../../utils/photogate';

/**
 * 仿真运行副作用 hook：场景初始化、自动运行、air-track 光电门数据。
 * 从 ProjectileScene 拆出，行为原样迁移。
 */
export function useSceneSimulation(): { runSimulation: () => void } {
    const currentScene = useSimulationStore(s => s.currentScene);
    const parameters = useSimulationStore(s => s.parameters);
    const sceneLoadVersion = useSimulationStore(s => s.sceneLoadVersion);
    const simulationResult = useSimulationStore(s => s.simulationResult);
    const scenes = useSimulationStore(s => s.scenes);
    // action / stable selectors 返回 stable 引用, 不会触发重渲染
    const setSimulationResult = useSimulationStore(s => s.setSimulationResult);
    const setErrorMessage = useSimulationStore(s => s.setErrorMessage);
    const ensureSceneParameters = useSimulationStore(s => s.ensureSceneParameters);
    const setExperimentData = useSimulationStore(s => s.setExperimentData);

    const scene = scenes.find(s => s.id === currentScene);

    // 初始化默认参数
    useEffect(() => {
        if (!scene) return;
        const defaults = getDefaultParams(currentScene);
        ensureSceneParameters(currentScene, defaults);
    }, [currentScene, ensureSceneParameters, scene]);

    // 运行仿真
    const runSimulation = useCallback(() => {
        if (!scene) return;
        const { result, error } = runSceneSimulation(scene, parameters);
        if (error) {
            setErrorMessage(error);
            return;
        }
        if (result) {
            setSimulationResult(result);
        }
    }, [scene, parameters, setSimulationResult, setErrorMessage]);

    // 首次加载自动运行
    useEffect(() => {
        runSimulation();
    }, [currentScene, sceneLoadVersion]);

    // 计算气垫导轨实验的光电门测量数据
    useEffect(() => {
        if (currentScene !== 'air-track' || !simulationResult) {
            setExperimentData(null);
            return;
        }
        const trajectory = simulationResult.trajectories[0];
        if (!trajectory || trajectory.length === 0) {
            setExperimentData(null);
            return;
        }
        const x1 = parameters['x1'] ?? 0.3;
        const x2 = parameters['x2'] ?? 0.8;
        const flagWidth = parameters['flagWidth'] ?? 0.02;
        const measurements = computePhotogateMeasurements(trajectory, {
            gatePositions: [x1, x2],
            flagWidth
        });
        setExperimentData(measurements);
    }, [simulationResult, parameters, currentScene, setExperimentData]);

    return { runSimulation };
}
```

替换 ProjectileScene 第 87-131 行（初始化 effect + runSimulation + 自动运行 effect + 光电门 effect）为 `const { runSimulation } = useSceneSimulation();` 调用，并移除相应 import（`getDefaultParams`、`computePhotogateMeasurements`；`runSceneSimulation` 已由 Task 3 移除 compare 用途后此处也不再需要，但注意保持 store selectors 最小化——替换后 ProjectileScene 顶部 store 订阅移除 `simulationResult/ensureSceneParameters/setExperimentData`）。

- [ ] **Step 4: 运行测试确认通过**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/workbench/useSceneSimulation.test.ts
```

预期：6 例全绿。

- [ ] **Step 5: typecheck + 现有测试回归**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd tsc --noEmit
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/accuracy
```

预期：typecheck 无错误；accuracy 全部契约测试全绿。

- [ ] **Step 6: Commit**

```bash
cd D:\Coding\Projects\physical_modelvis; git add visualization/src/components/workbench/useSceneSimulation.ts visualization/src/scenes/ProjectileScene.tsx visualization/tests/workbench/useSceneSimulation.test.ts; git commit -m "refactor(workbench): 抽取 useSceneSimulation hook (自动运行/光电门) + 6 例单元测试"
```

---

### Task 5: WorkbenchScene 组件族 + 入口切换 + 删除 ProjectileScene

**Files:**
- Create: `visualization/src/components/workbench/TextbookDirectory.tsx`
- Create: `visualization/src/components/workbench/SceneStage.tsx`
- Create: `visualization/src/components/workbench/InspectorPanel.tsx`
- Create: `visualization/src/components/workbench/DataDrawer.tsx`
- Create: `visualization/src/components/workbench/WorkbenchScene.tsx`
- Modify: `visualization/src/app/App.tsx:11`（SCENE_MAP → WorkbenchScene）
- Delete: `visualization/src/scenes/ProjectileScene.tsx`

**Interfaces:**
- Consumes: Task 2/3/4 的 3 个 hooks、现有各子组件（ParameterPanel/ComparePanel/LayerToggle/SimulationCanvas/PlaybackControls/StateInspector/GraphPanel/FormulaPanel/DiagnosticsPanel/PhotogateTimer/ExportDataButton/ErrorBoundary/EquipmentStage/rigs）、`SCENE_CATEGORIES`（`components/layout/SceneSelector.tsx:5`）
- Produces: `WorkbenchScene`（App.tsx 的 `SCENE_MAP` 各场景入口）

- [ ] **Step 1: TextbookDirectory.tsx**

`visualization/src/components/workbench/TextbookDirectory.tsx` — 从 ProjectileScene:36-69 原样迁移：

```tsx
import { useSimulationStore } from '../../store/simulationStore';
import { SCENE_CATEGORIES } from '../layout/SceneSelector';

/** 教材实验目录侧栏 */
export function TextbookDirectory() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const setScene = useSimulationStore(s => s.setScene);
    const scenes = useSimulationStore(s => s.scenes);
    const sceneMap = new Map(scenes.map(s => [s.id, s.name]));

    return (
        <nav className="textbook-directory" aria-label="教材实验目录">
            <div className="directory-eyebrow">教材目录</div>
            <h2>选择实验</h2>
            <div className="directory-list">
                {SCENE_CATEGORIES.map(category => (
                    <details key={category.label} open={category.ids.includes(currentScene)}>
                        <summary>{category.label}</summary>
                        <div className="directory-scenes">
                            {category.ids.map(id => {
                                const isActive = id === currentScene;
                                return (
                                    <button
                                        key={id}
                                        className={`directory-scene ${isActive ? 'active' : ''}`}
                                        onClick={() => setScene(id)}
                                    >
                                        <span>{sceneMap.get(id) ?? id}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </details>
                ))}
            </div>
        </nav>
    );
}
```

- [ ] **Step 2: SceneStage.tsx**

`visualization/src/components/workbench/SceneStage.tsx` — 迁移 ProjectileScene 的 rig 加载（改用 useSceneRig）+ stage-viewport JSX（:272-294）+ rigError 提示（:295-299）：

```tsx
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { SimulationCanvas } from '../simulation/SimulationCanvas';
import { useSceneRig } from './useSceneRig';
import { useSimulationStore } from '../../store/simulationStore';

// EquipmentStage 自带完整的 Three.js (≈450 kB gzip)，用 lazy 隔离出首屏 bundle
const LazyEquipmentStage = lazy(() =>
    import('../simulation3d/EquipmentStage').then(m => ({ default: m.EquipmentStage }))
);

/** 舞台视口：3D 器材装载（失败回退 2D Canvas） */
export function SceneStage() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const { rig, rigReady, rigLoading, rigError, is3DScene } = useSceneRig(currentScene);

    return (
        <>
            <div className="stage-viewport">
                <ErrorBoundary
                    label="3D 实验舞台"
                    fallback={
                        <>
                            <SimulationCanvas />
                            <div className="equipment-error" role="alert">
                                ⚠ 该实验 3D 渲染出错，已回退到 2D 画面
                            </div>
                        </>
                    }
                >
                    {is3DScene ? (
                        rigReady && rig ? (
                            <Suspense
                                fallback={
                                    <div className="equipment-loading">
                                        <div className="loading-spinner" />
                                        <span>加载 3D 实验器材…</span>
                                    </div>
                                }
                            >
                                <LazyEquipmentStage key={currentScene} rig={rig} />
                            </Suspense>
                        ) : (
                            <div className="equipment-loading">
                                <div className="loading-spinner" />
                                <span>加载 3D 实验器材…</span>
                            </div>
                        )
                    ) : (
                        <SimulationCanvas />
                    )}
                </ErrorBoundary>
            </div>
            {rigError && (
                <div className="equipment-error" role="alert">
                    ⚠ {rigError}
                </div>
            )}
        </>
    );
}
```

- [ ] **Step 3: InspectorPanel.tsx**

`visualization/src/components/workbench/InspectorPanel.tsx` — 迁移 ProjectileScene:377-385 的 inspector JSX：

```tsx
import { useSimulationStore } from '../../store/simulationStore';
import { ParameterPanel } from '../controls/ParameterPanel';
import { ComparePanel } from '../controls/ComparePanel';
import { LayerToggle } from '../layout/LayerToggle';
import { useSceneRig } from './useSceneRig';

interface InspectorPanelProps {
    onRunSimulation: () => void;
}

/** 检查器侧栏：参数面板 + 参数对比 + 图层开关 */
export function InspectorPanel({ onRunSimulation }: InspectorPanelProps) {
    const currentScene = useSimulationStore(s => s.currentScene);
    const { is3DScene } = useSceneRig(currentScene);

    return (
        <aside className="classroom-inspector">
            <div className="inspector-header">
                <span>参数检查器</span>
                <strong>{is3DScene ? '3D 器材' : 'Canvas'}</strong>
            </div>
            <ParameterPanel onRunSimulation={onRunSimulation} />
            <ComparePanel />
            <LayerToggle />
        </aside>
    );
}
```

注意：InspectorPanel 与 SceneStage 各自调用 useSceneRig，各自持有 useRef 实例缓存（保留 Task 2 实现不变——模块级缓存会跨测试污染 Task 2 的缓存命中用例）。两个实例对同一场景各自触发一次 `loadSceneRig`：动态 import 是模块级幂等（第二次为 cache hit，开销可忽略），且 `is3DScene = !!rig || rigLoading` 在两实例加载期间一致（hasSceneRig 同步判定）。行为与原 ProjectileScene 单实例语义等价。

- [ ] **Step 4: DataDrawer.tsx**

`visualization/src/components/workbench/DataDrawer.tsx` — 迁移 ProjectileScene:302-374 的 data drawer JSX（含 air-track PhotogateTimer 条件分支、GraphPanel、StateInspector、DiagnosticsPanel 及各自 ErrorBoundary+Suspense）：

```tsx
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { StateInspector } from '../simulation/StateInspector';
import { useSimulationStore } from '../../store/simulationStore';

// 非首屏关键组件懒加载（保持主 chunk 体积不变）
const GraphPanel = lazy(() => import('../charts/GraphPanel').then(m => ({ default: m.GraphPanel })));
const DiagnosticsPanel = lazy(() =>
    import('../diagnostics/DiagnosticsPanel').then(m => ({ default: m.DiagnosticsPanel }))
);
const PhotogateTimer = lazy(() =>
    import('../simulation/PhotogateTimer').then(m => ({ default: m.PhotogateTimer }))
);

/** 数据抽屉：图表 + 光电门(air-track) + 状态检查器 + 诊断报告 */
export function DataDrawer() {
    const currentScene = useSimulationStore(s => s.currentScene);

    return (
        <div className="classroom-data-drawer">
            <ErrorBoundary
                label="数据图表"
                fallback={
                    <div className="panel-section">
                        <div className="panel-title">数据图表</div>
                        <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>图表加载失败</div>
                    </div>
                }
            >
                <Suspense
                    fallback={
                        <div className="panel-section" style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>
                            加载中...
                        </div>
                    }
                >
                    <GraphPanel />
                </Suspense>
            </ErrorBoundary>
            <div className="classroom-data-side">
                {currentScene === 'air-track' && (
                    <ErrorBoundary
                        label="数字毫秒计"
                        fallback={
                            <div className="panel-section">
                                <div className="panel-title">数字毫秒计</div>
                                <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载失败</div>
                            </div>
                        }
                    >
                        <Suspense
                            fallback={
                                <div className="panel-section">
                                    <div className="panel-title">数字毫秒计</div>
                                    <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中...</div>
                                </div>
                            }
                        >
                            <PhotogateTimer />
                        </Suspense>
                    </ErrorBoundary>
                )}
                <StateInspector />
                <ErrorBoundary
                    label="诊断报告"
                    fallback={
                        <div className="panel-section">
                            <div className="panel-title">诊断报告</div>
                            <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载失败</div>
                        </div>
                    }
                >
                    <Suspense
                        fallback={
                            <div className="panel-section">
                                <div className="panel-title">诊断报告</div>
                                <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中...</div>
                            </div>
                        }
                    >
                        <DiagnosticsPanel />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </div>
    );
}
```

- [ ] **Step 5: WorkbenchScene.tsx（壳）**

`visualization/src/components/workbench/WorkbenchScene.tsx` — 组装全部部件 + 公式抽屉（从 ProjectileScene:237-424 迁移，移除已拆分逻辑）：

```tsx
import { useState } from 'react';
import { lazy, Suspense } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ExportDataButton } from '../export/ExportDataButton';
import { PlaybackControls } from '../controls/PlaybackControls';
import { TextbookDirectory } from './TextbookDirectory';
import { SceneStage } from './SceneStage';
import { InspectorPanel } from './InspectorPanel';
import { DataDrawer } from './DataDrawer';
import { useSceneSimulation } from './useSceneSimulation';
import { useCompareSimulations } from './useCompareSimulations';

const FormulaPanel = lazy(() => import('../formula/FormulaPanel').then(m => ({ default: m.FormulaPanel })));

/**
 * 课堂演示工作台 — 所有场景的统一入口。
 * 壳组件只做布局编排；仿真/对比/3D 逻辑由 hooks 提供。
 */
export function WorkbenchScene() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const scenes = useSimulationStore(s => s.scenes);
    const [formulaOpen, setFormulaOpen] = useState(false);
    const [dataOpen, setDataOpen] = useState(false);

    const scene = scenes.find(s => s.id === currentScene);
    const { runSimulation } = useSceneSimulation();
    useCompareSimulations();

    return (
        <div className="classroom-scene">
            <aside className="classroom-directory">
                <TextbookDirectory />
            </aside>

            <main className="classroom-stage">
                <div className="stage-toolbar">
                    <div>
                        <div className="stage-kicker">课堂演示模式</div>
                        <h2>{scene?.name ?? '物理实验'}</h2>
                    </div>
                    <div className="stage-actions">
                        <button className="btn btn-secondary" onClick={() => setDataOpen(prev => !prev)}>
                            {dataOpen ? '收起数据' : '数据/图像'}
                        </button>
                        <ExportDataButton />
                        <button className="btn btn-primary" onClick={() => setFormulaOpen(true)}>
                            公式推导
                        </button>
                    </div>
                </div>

                <SceneStage />
                <PlaybackControls />

                {dataOpen && <DataDrawer />}
            </main>

            <InspectorPanel onRunSimulation={runSimulation} />

            {formulaOpen && (
                <div className="formula-drawer-overlay" onClick={() => setFormulaOpen(false)}>
                    <aside className="formula-drawer" onClick={e => e.stopPropagation()} aria-label="公式推导">
                        <div className="formula-drawer-head">
                            <div>
                                <span>按需讲解</span>
                                <h3>公式推导</h3>
                            </div>
                            <button className="btn btn-sm" onClick={() => setFormulaOpen(false)}>
                                关闭
                            </button>
                        </div>
                        <ErrorBoundary
                            label="公式推导"
                            fallback={
                                <div className="panel-section">
                                    <div className="panel-title">公式说明</div>
                                    <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载失败</div>
                                </div>
                            }
                        >
                            <Suspense
                                fallback={
                                    <div className="panel-section">
                                        <div className="panel-title">公式说明</div>
                                        <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中...</div>
                                    </div>
                                }
                            >
                                <FormulaPanel />
                            </Suspense>
                        </ErrorBoundary>
                    </aside>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 6: App.tsx 入口切换 + 删除 ProjectileScene**

`App.tsx:9` 改为：

```tsx
const LazyWorkbenchScene = lazy(() =>
    import('../components/workbench/WorkbenchScene').then(m => ({ default: m.WorkbenchScene }))
);
```

`SCENE_MAP`（:11-21）所有值改为 `LazyWorkbenchScene`（或直接 `const SCENE_MAP: Record<string, React.LazyExoticComponent<() => JSX.Element>> = ...` 全部指向它；也可简化为单组件直接渲染——但保留 SCENE_MAP 结构以最小化 diff）。

删除 `visualization/src/scenes/ProjectileScene.tsx`：

```bash
cd D:\Coding\Projects\physical_modelvis; git rm visualization/src/scenes/ProjectileScene.tsx
```

- [ ] **Step 7: 全量验证**

```bash
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd tsc --noEmit
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/workbench
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/rendering
cd D:\Coding\Projects\physical_modelvis\visualization; npx.cmd vitest run tests/accuracy
```

预期：typecheck 无错误；workbench 16 例 + rendering（含 equipment-stage/rigs-build）+ accuracy 全部全绿。

- [ ] **Step 8: Commit**

```bash
cd D:\Coding\Projects\physical_modelvis; git add visualization/src/components/workbench/ visualization/src/app/App.tsx; git commit -m "refactor(workbench): ProjectileScene 拆分为 WorkbenchScene 组件族 (壳/舞台/检查器/抽屉/目录), App.tsx 入口切换"
```

---

### Task 6: 全量门禁 + 文档同步

**Files:**
- Modify: `README.md`（测试数行，若变化）
- Modify: `docs/plan.md`（新增 WorkbenchScene 拆分记录）
- Modify: `AGENTS.md`（架构说明：scenes/ProjectileScene → components/workbench/）

- [ ] **Step 1: 运行全量测试并记录测试数**

```bash
cd D:\Coding\Projects\physical_modelvis; npm test
```

记录输出尾部 `Tests  x passed | y failed` 的 core/viz 数字，与 README 顶部对比。

- [ ] **Step 2: 更新 README 测试数**

`README.md` 顶部 `core X / viz Y / total Z` 三行按实测更新。

- [ ] **Step 3: 更新 docs/plan.md**

「0. 当前状态快照」追加一行：

```markdown
- `WorkbenchScene 拆分` — ProjectileScene(430 行) 拆为 components/workbench/ 组件族 (WorkbenchScene/SceneStage/InspectorPanel/DataDrawer/TextbookDirectory + useSceneRig/useCompareSimulations/useSceneSimulation)；CompareEntry 支持失败变体显式报错 (result 可空 + error)；tests/workbench/ 新增 16 例
```

- [ ] **Step 4: 更新 AGENTS.md 架构说明**

`AGENTS.md` 中 `visualization/src/scenes/` 条目补充：

```markdown
  src/components/workbench/ — 课堂工作台 (WorkbenchScene 壳 + SceneStage 舞台 + InspectorPanel 检查器 + DataDrawer 抽屉 + TextbookDirectory 目录 + useSceneRig/useCompareSimulations/useSceneSimulation hooks)
```

（`src/scenes/ProjectileScene.tsx` 已删除，如有引用一并清理）

- [ ] **Step 5: 运行完整 precheck 门禁**

```bash
cd D:\Coding\Projects\physical_modelvis; npm run precheck
```

预期：build:core → typecheck → lint → format:check → test → selfcheck 全部通过。

- [ ] **Step 6: Commit**

```bash
cd D:\Coding\Projects\physical_modelvis; git add README.md docs/plan.md AGENTS.md; git commit -m "docs: WorkbenchScene 拆分收尾 — README 测试数 / plan.md 快照 / AGENTS.md 架构说明"
```

---

## 任务依赖图

```
Task 1 (CompareEntry 类型+消费方)
   ↓
Task 2 (useSceneRig) ──┐
Task 3 (useCompareSimulations) ──┼─→ Task 5 (组件族+入口) → Task 6 (门禁+文档)
Task 4 (useSceneSimulation) ──┘
```

Task 2/3/4 相互独立，可并行（各自独立文件 + 各自修改 ProjectileScene 不同区段）。