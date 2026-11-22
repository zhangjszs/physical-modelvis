import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { LiquidMixingModel } from '../../src/models/liquid-mixing.js';

function makeBody(id = 'b1', mass = 1) {
    return { id, mass: { value: mass, unit: 'kg' as const }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
}
function makeProblem(
    modelType: string,
    constraints: Record<string, unknown>,
    bodies: ReturnType<typeof makeBody>[] = [makeBody()]
): PhysicsProblem {
    return {
        id: 'test-' + modelType,
        model: modelType as PhysicsProblem['model'],
        bodies,
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        timeConfig: { duration: 5, sampleCount: 100 },
        environment: {}
    };
}

describe('G4: LiquidMixing', () => {
    const m = new LiquidMixingModel();
    it('meta', () => {
        expect(m.modelType).toBe('liquid-mixing');
    });
    it('chart', () => {
        expect(
            m.solve(makeProblem('liquid-mixing', { liquidMixing: { volumeWater: 50, volumeAlcohol: 50 } })).explanation
                .summary
        ).toBeTruthy();
    });

    it('边界 (0, 0): 空白容器 contractionPercent=0 且绝不输出 NaN/Infinity (#183)', () => {
        const res = m.solve(makeProblem('liquid-mixing', { liquidMixing: { volumeWater: 0, volumeAlcohol: 0 } }));
        const mv = res.diagnostics.maxValues;
        for (const [key, val] of Object.entries(mv)) {
            expect(Number.isFinite(val), `maxValues.${key} 应有限`).toBe(true);
        }
        expect(mv.totalVolume).toBe(0);
        expect(mv.finalVolume).toBe(0);
        expect(mv.deltaV).toBe(0);
        expect(mv.contractionPercent).toBe(0);
        expect(res.diagnostics.flags?.isEmpty).toBe(true);
        expect(res.warnings).toContain('体积均为 0, 无法计算');

        const allStrings = [
            res.explanation.summary,
            ...res.keyframes.map(k => k.description),
            ...res.explanation.steps.flatMap(s => [s.description, s.calculation ?? '', s.result ?? ''])
        ].join(' | ');
        expect(allStrings).toContain('无液体，收缩率不适用');
        expect(allStrings).not.toMatch(/NaN|Infinity/);
    });

    it('纯组分 (0, 50) / (50, 0): 无收缩且数值有限 (#183)', () => {
        const pureAlcohol = m.solve(
            makeProblem('liquid-mixing', { liquidMixing: { volumeWater: 0, volumeAlcohol: 50 } })
        );
        expect(pureAlcohol.diagnostics.maxValues.finalVolume).toBeCloseTo(50, 9);
        expect(pureAlcohol.diagnostics.maxValues.deltaV).toBeCloseTo(0, 9);
        expect(pureAlcohol.diagnostics.maxValues.contractionPercent).toBeCloseTo(0, 9);
        expect(pureAlcohol.diagnostics.flags?.isEmpty).toBe(false);

        const pureWater = m.solve(
            makeProblem('liquid-mixing', { liquidMixing: { volumeWater: 50, volumeAlcohol: 0 } })
        );
        expect(pureWater.diagnostics.maxValues.finalVolume).toBeCloseTo(50, 9);
        expect(pureWater.diagnostics.maxValues.deltaV).toBeCloseTo(0, 9);
        expect(pureWater.diagnostics.maxValues.contractionPercent).toBeCloseTo(0, 9);
        expect(pureWater.diagnostics.flags?.isEmpty).toBe(false);
    });

    it('正常混合 (50, 50) 与极小体积 (1e-6, 1e-6): 保持原收缩定量关系且有限 (#183)', () => {
        const normal = m.solve(makeProblem('liquid-mixing', { liquidMixing: { volumeWater: 50, volumeAlcohol: 50 } }));
        expect(normal.diagnostics.maxValues.finalVolume).toBeLessThan(100);
        expect(normal.diagnostics.maxValues.finalVolume).toBeGreaterThan(95);
        expect(normal.diagnostics.maxValues.contractionPercent).toBeGreaterThan(2);
        expect(normal.explanation.summary).not.toContain('无液体');

        const tiny = m.solve(
            makeProblem('liquid-mixing', { liquidMixing: { volumeWater: 1e-6, volumeAlcohol: 1e-6 } })
        );
        for (const val of Object.values(tiny.diagnostics.maxValues)) {
            expect(Number.isFinite(val)).toBe(true);
        }
        expect(tiny.diagnostics.maxValues.contractionPercent).toBeCloseTo(
            normal.diagnostics.maxValues.contractionPercent,
            6
        );
    });
});
