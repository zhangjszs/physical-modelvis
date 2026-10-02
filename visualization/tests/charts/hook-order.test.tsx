/**
 * React hooks 调用顺序守卫
 *
 * 起因 (第 5 轮浏览器巡检发现): `GraphPanel` 把空态早退
 * `if (!simulationResult && !inCompareMode) return …` 写在三个 `useMemo` **之前**。
 * 切场景瞬间 store 会把 `simulationResult` 置 null → 那一帧少调 3 个 hook →
 * React 抛 "Rendered fewer hooks than expected" → 曲线图区被 ErrorBoundary 接成
 * **粘滞的「图表加载失败」，之后切任何场景都不恢复，只能刷新页面**。
 *
 * 本文件两道防线:
 *   1. 静态扫描: src 下任何组件不得在顶层早退 return 之后再放顶层 hook
 *      (仓库无 eslint-plugin-react-hooks, 故自带启发式; 已验证对现有代码零误报)
 *   2. 行为回归: 真实渲染 GraphPanel, 让 simulationResult 走 有 → null → 有
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { solveProblem } from 'physics-core';
import { GraphPanel } from '../../src/components/charts/GraphPanel';
import { loadAllScenes, getScenesSync } from '../../src/scenes/sceneRegistry';
import { useSimulationStore } from '../../src/store/simulationStore';
import type { SimulationResult } from 'physics-core';
import type { SceneConfig } from '../../src/types/visualization';

function listTsx(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) out.push(...listTsx(p));
        else if (entry.endsWith('.tsx')) out.push(p);
    }
    return out;
}

/**
 * 判定「顶层早退 return 之后仍有顶层 hook」。
 *
 * 依赖 prettier 的 4 空格缩进约定: 函数体内的顶层语句恰好缩进 4 空格,
 * 因此 `^ {4}useXxx(` 是顶层 hook, `^ {4}if (…) {` 里含 `^ {8}return` 是顶层早退。
 * 嵌套回调里的 if/return 缩进更深, 不会被误判。
 */
function findHookAfterEarlyReturn(file: string): { earlyReturnLine: number; hookLine: number } | null {
    const lines = readFileSync(file, 'utf8').split('\n');
    let lastHookLine = -1;
    let firstEarlyReturn = -1;

    for (let i = 0; i < lines.length; i++) {
        if (/^ {4}(const [\w{ ,\]]+ = |)(use[A-Z]\w*\()/.test(lines[i]!)) lastHookLine = i;

        if (/^ {4}if \(.*\) \{$/.test(lines[i]!)) {
            for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
                if (/^ {4}\}$/.test(lines[j]!)) break;
                if (/^ {8}return[ ;(]/.test(lines[j]!)) {
                    if (firstEarlyReturn < 0 || i < firstEarlyReturn) firstEarlyReturn = i;
                    break;
                }
            }
        }
    }

    if (firstEarlyReturn >= 0 && lastHookLine > firstEarlyReturn) {
        return { earlyReturnLine: firstEarlyReturn + 1, hookLine: lastHookLine + 1 };
    }
    return null;
}

function defaultParams(scene: SceneConfig): Record<string, number> {
    const p: Record<string, number> = {};
    for (const x of scene.parameters) p[x.name] = x.default;
    return p;
}

/** jsdom 不提供 ResizeObserver, 而 recharts 的 ResponsiveContainer 要用 (同 equipment-stage.test.tsx 先例) */
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

describe('hooks 调用顺序守卫', () => {
    it('静态扫描: 组件不得在顶层早退 return 之后再调用顶层 hook', () => {
        const violations: string[] = [];
        for (const file of listTsx('src')) {
            const hit = findHookAfterEarlyReturn(file);
            if (hit) violations.push(`${file}: 早退@L${hit.earlyReturnLine} 之后仍有顶层 hook@L${hit.hookLine}`);
        }
        expect(violations, `hooks 顺序违规 (切场景时会崩):\n${violations.join('\n')}`).toEqual([]);
    });
});

describe('GraphPanel 切场景不崩', () => {
    let result: SimulationResult;

    beforeAll(async () => {
        await loadAllScenes();
        const scene = getScenesSync().find(s => s.id === 'projectile');
        if (!scene) throw new Error('测试前置失败: 找不到 projectile 场景');
        result = solveProblem(scene.buildProblem(defaultParams(scene)));
    });

    beforeEach(() => {
        globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
        act(() => {
            useSimulationStore.setState({ simulationResult: null, compareMode: false, compareResults: [] });
        });
    });

    it('simulationResult 走 有 → null → 有 全程可渲染 (旧实现在 null 那一帧崩)', () => {
        act(() => {
            useSimulationStore.setState({ simulationResult: result });
        });
        const { container, rerender } = render(<GraphPanel />);
        // 有数据时渲染的是图表选项卡 (x-t / y-t / …), 空态才渲染 .panel-title「曲线图」
        expect(container.querySelector('.graph-tabs'), `实际内容: ${container.textContent}`).not.toBeNull();

        // 切场景瞬间: 结果为 null → 旧实现走早退分支, 少渲染 3 个 useMemo → React 抛错
        act(() => {
            useSimulationStore.setState({ simulationResult: null });
        });
        expect(() => rerender(<GraphPanel />)).not.toThrow();
        expect(container.textContent).toContain('等待仿真运行');

        // 新场景结果到位
        act(() => {
            useSimulationStore.setState({ simulationResult: result });
        });
        expect(() => rerender(<GraphPanel />)).not.toThrow();
        expect(container.querySelector('.graph-tabs')).not.toBeNull();
    });
});
