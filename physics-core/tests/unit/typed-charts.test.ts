/**
 * charts 类型化访问层单元测试 (B1 最小切片, #82)
 *
 * 覆盖:
 *   - chartsOf / getChart 正向: 登记模型 + 登记键 → 取到 ChartSeries;
 *   - 边界: 模型不匹配 → undefined; 未登记模型回退全量 charts;
 *   - 编译期键名约束: 故意写错键名 → tsc 报错 (@ts-expect-error, 由
 *     physics-core tsconfig.typecheck.json 纳入 tests 强制 —— 若访问层退化
 *     为放行任意键, 这里会成为「未使用的 @ts-expect-error」编译错误)。
 */

import { describe, it, expect } from 'vitest';
import { chartsOf, getChart, MODEL_CHART_KEYS } from '../../src/types/chart-registry.js';
import type { ChartSeries, SimulationResult } from '../../src/types/result.js';

function series(yLabel: string): ChartSeries {
    return {
        xLabel: 't',
        yLabel,
        xUnit: 's',
        yUnit: '',
        points: [
            { x: 0, y: 1 },
            { x: 1, y: 2 }
        ]
    };
}

function fakeResult(model: SimulationResult['meta']['model'], charts: Record<string, ChartSeries>): SimulationResult {
    return {
        meta: { model, solver: 'analytical', computationTime: 0, timestamp: '', version: 'test' },
        trajectories: [],
        keyframes: [],
        charts,
        diagnostics: { conservedQuantities: [], maxValues: {}, rangeCheck: { withinRange: true, warnings: [] } },
        explanation: { summary: '', steps: [], formulas: [] },
        errors: [],
        warnings: []
    };
}

describe('#82 charts 类型化访问层', () => {
    const malus = series('透射光强');

    it('chartsOf: 登记模型返回收窄视图, 正确键可取', () => {
        const result = fakeResult('polarization', { malus_curve: malus });
        const charts = chartsOf(result, 'polarization');
        expect(charts).toBeDefined();
        expect(charts?.malus_curve?.yLabel).toBe('透射光强');
    });

    it('chartsOf: 模型不匹配返回 undefined (防御惯例)', () => {
        const result = fakeResult('polarization', { malus_curve: malus });
        expect(chartsOf(result, 'interference')).toBeUndefined();
    });

    it('chartsOf: 未登记模型回退全量 charts (与既有直读等价)', () => {
        const result = fakeResult('uniform-linear', { x_t: malus });
        const charts = chartsOf(result, 'uniform-linear');
        expect(charts?.x_t).toBeDefined();
    });

    it('getChart: 登记模型 + 登记键返回系列; 未产出键返回 undefined', () => {
        const result = fakeResult('polarization', { malus_curve: malus });
        expect(getChart(result, 'polarization', 'malus_curve')).toBe(malus);
        // 登记键但本次未产出 → undefined (条件产出键的正常路径)
        expect(getChart(result, 'polarization', 'multi_scan')).toBeUndefined();
        expect(getChart(fakeResult('polarization', {}), 'interference', 'x_t')).toBeUndefined();
    });

    it('登记表: 每个登记模型至少 1 个键', () => {
        // 「登记键 ⊆ charts 协议键」由 chart-registry.ts 的 `satisfies { [M in ModelType]?: readonly ChartKey[] }`
        // 在编译期保证 (引擎 typecheck 纳入 tests, #83) —— 此处不重复枚举 113 键 (即 #82 排除的全量 schema 化)。
        // 运行时反向守卫「模型实际产出 ⊆ 登记」在 visualization/tests/accuracy/typed-charts.test.ts 全场景探针。
        for (const [model, keys] of Object.entries(MODEL_CHART_KEYS)) {
            expect(keys.length, `${model} 登记键数 ≥ 1`).toBeGreaterThanOrEqual(1);
        }
    });

    it('编译期演示: 登记模型读错键名必须 tsc 报错', () => {
        const result = fakeResult('polarization', { malus_curve: malus });
        // @ts-expect-error 键名拼错 (malus_curv) —— 访问层若退化为放行任意键, 本行将因
        // 「未使用的 @ts-expect-error」在 typecheck 阶段失败, 即红→绿反向验证的常驻化。
        const _typo = getChart(result, 'polarization', 'malus_curv');
        // @ts-expect-error 模型登记键之外的合法 charts 键同样不可读 (diffraction-grating 无 x_t)
        const _cross = getChart(fakeResult('diffraction-grating', {}), 'diffraction-grating', 'x_t');
        expect(_typo).toBeUndefined();
        expect(_cross).toBeUndefined();
    });
});
