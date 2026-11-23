import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { LightControlSwitchModel, computeRldr, computeCriticalLux } from '../../src/models/light-control-switch.js';

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

describe('F14: LightControlSwitchModel', () => {
    const model = new LightControlSwitchModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('light-control-switch');
    });
    it('chart ok', () => {
        const r = model.solve(makeProblem('light-control-switch', { lightControlSwitch: { lightIntensity: 1000 } }));
        expect(r.charts.x_t).toBeDefined();
        expect(r.charts.y_t).toBeDefined();
        expect(r.charts.v_t).toBeDefined();
    });
    it('L=0 与极小正数 1e-6 无 NaN/Infinity 且完全黑暗导通亮灯 (#179)', () => {
        for (const L of [0, 1e-6]) {
            const r = model.solve(
                makeProblem('light-control-switch', {
                    lightControlSwitch: { lightIntensity: L, Rfix: 10000, Esupply: 12 }
                })
            );
            const mv = r.diagnostics.maxValues as Record<string, number>;
            expect(Number.isFinite(mv.rLdr)).toBe(true);
            expect(Number.isFinite(mv.vB)).toBe(true);
            expect(Number.isFinite(mv.criticalLux)).toBe(true);
            expect(mv.rLdr).toBeLessThanOrEqual(1e6);
            expect(mv.vB).toBeGreaterThan(0.7);
            expect(mv.transistorOnFlag).toBe(1);
            expect(mv.relayEngagedFlag).toBe(1);
            expect(mv.lightOnFlag).toBe(1);
        }
        expect(computeRldr(0)).toBe(1e6);
    });
    it('默认参数下 L_crit ≈ 10 lx，L=5 lx 亮、L=20 lx 灭，且在 L_crit ± 1% 准确翻转 (#179)', () => {
        const lCrit = computeCriticalLux(12, 0.7, 10000, 1e6);
        expect(lCrit).toBeCloseTo(10, 6);

        const r5 = model.solve(
            makeProblem('light-control-switch', { lightControlSwitch: { lightIntensity: 5, Rfix: 10000, Esupply: 12 } })
        );
        const r20 = model.solve(
            makeProblem('light-control-switch', {
                lightControlSwitch: { lightIntensity: 20, Rfix: 10000, Esupply: 12 }
            })
        );
        const rBelow = model.solve(
            makeProblem('light-control-switch', {
                lightControlSwitch: { lightIntensity: lCrit * 0.99, Rfix: 10000, Esupply: 12 }
            })
        );
        const rAbove = model.solve(
            makeProblem('light-control-switch', {
                lightControlSwitch: { lightIntensity: lCrit * 1.01, Rfix: 10000, Esupply: 12 }
            })
        );

        expect((r5.diagnostics.maxValues as Record<string, number>).lightOnFlag).toBe(1);
        expect((r20.diagnostics.maxValues as Record<string, number>).lightOnFlag).toBe(0);
        expect((rBelow.diagnostics.maxValues as Record<string, number>).lightOnFlag).toBe(1);
        expect((rAbove.diagnostics.maxValues as Record<string, number>).lightOnFlag).toBe(0);
        expect((r5.diagnostics.maxValues as Record<string, number>).criticalLux).toBeCloseTo(10, 6);
        expect((r5.diagnostics.maxValues as Record<string, number>).threshold).toBeCloseTo(10, 6);
        const thresholdKf = r5.keyframes.find(k => k.label === '阈值点');
        expect(thresholdKf?.position.x).toBeCloseTo(10, 6);
    });
    it('调节 Rfix 与 Esupply 真实改变 L_crit 与开关状态，且 E <= VbeOn 时安全归零永不导通 (#179)', () => {
        // Rfix 增大 -> 需要更高 R_LDR -> L_crit 下降
        const rHighRfix = model.solve(
            makeProblem('light-control-switch', { lightControlSwitch: { lightIntensity: 5, Rfix: 50000, Esupply: 12 } })
        );
        const mvHighRfix = rHighRfix.diagnostics.maxValues as Record<string, number>;
        expect(mvHighRfix.criticalLux).toBeLessThan(5);
        expect(mvHighRfix.lightOnFlag).toBe(0);

        // Esupply 增大 -> R_crit 下降 -> L_crit 升高
        const rHighE = model.solve(
            makeProblem('light-control-switch', {
                lightControlSwitch: { lightIntensity: 20, Rfix: 10000, Esupply: 24 }
            })
        );
        const mvHighE = rHighE.diagnostics.maxValues as Record<string, number>;
        expect(mvHighE.criticalLux).toBeGreaterThan(20);
        expect(mvHighE.lightOnFlag).toBe(1);

        // E <= VbeOn -> criticalLux = 0 且永不导通
        const rLowE = model.solve(
            makeProblem('light-control-switch', {
                lightControlSwitch: { lightIntensity: 0, Rfix: 10000, Esupply: 0.5 }
            })
        );
        const mvLowE = rLowE.diagnostics.maxValues as Record<string, number>;
        expect(mvLowE.criticalLux).toBe(0);
        expect(mvLowE.lightOnFlag).toBe(0);
        expect(rLowE.warnings.length).toBeGreaterThan(0);
    });
    it('24h 曲线与 computeRldr 同源：夜间 0.5 lx 亮、正午强光灭 (#179)', () => {
        const r = model.solve(
            makeProblem('light-control-switch', {
                lightControlSwitch: { lightIntensity: 0.5, Rfix: 10000, Esupply: 12 }
            })
        );
        const lightPts = r.charts.x_t!.points;
        const statePts = r.charts.y_t!.points;
        expect(lightPts.length).toBe(statePts.length);
        // t=0h 夜间 0.5 lx -> 亮
        expect(lightPts[0]!.y).toBe(0.5);
        expect(statePts[0]!.y).toBe(1);
        // t=12h 正午强光 -> 灭
        const noonIdx = lightPts.findIndex(p => Math.abs(p.x - 12) < 0.05);
        expect(noonIdx).toBeGreaterThan(0);
        expect(lightPts[noonIdx]!.y).toBeGreaterThan(49000);
        expect(statePts[noonIdx]!.y).toBe(0);
    });
    it('NaN 参数 → validate 拒绝 (NON_FINITE_PARAMETER, #85 守卫恢复)', () => {
        const v = model.validate(makeProblem('light-control-switch', { lightControlSwitch: { lightIntensity: NaN } }));
        expect(v.valid).toBe(false);
        expect(v.errors.some(e => e.code === 'NON_FINITE_PARAMETER')).toBe(true);
    });
});
