import { describe, it, expect } from 'vitest';
import { ResistanceLawModel } from '../../src/models/resistance-law.js';
import type { PhysicsProblem, ResistanceMaterial } from '../../src/types/problem.js';
import { RESISTIVITY } from '../../src/types/problem.js';

const model = new ResistanceLawModel();

function makeProblem(
    overrides: {
        length?: number;
        diameter?: number;
        material?: ResistanceMaterial;
        sampleCount?: number;
    } = {}
): PhysicsProblem {
    const { length = 1, diameter = 1, material = 'Cu', sampleCount = 50 } = overrides;
    return {
        id: 'rl-test',
        model: 'resistance-law',
        bodies: [{ id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { resistanceLaw: { length, diameter, material, sampleCount } },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 10 }
    };
}

describe('ResistanceLawModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('resistance-law');
        expect(model.name).toBe('电阻定律');
    });

    it('基准: L=1m, d=1mm, Cu=1.68e-8', () => {
        const r = model.solve(makeProblem({ length: 1, diameter: 1, material: 'Cu' }));
        const rho = RESISTIVITY.Cu;
        const d = 1 / 1000;
        const S = Math.PI * (d / 2) ** 2;
        const expectedR = (rho * 1) / S;
        expect(r.diagnostics.maxValues.baseResistance).toBeCloseTo(expectedR, 10);
    });

    it('R-L 线性: 长度加倍 → 电阻加倍', () => {
        const r1 = model.solve(makeProblem({ length: 1, diameter: 1, material: 'Cu' }));
        const r2 = model.solve(makeProblem({ length: 2, diameter: 1, material: 'Cu' }));
        expect(r2.diagnostics.maxValues.baseResistance).toBeCloseTo(r1.diagnostics.maxValues.baseResistance * 2, 10);
    });

    it('R-S 反比: 直径加倍 (面积×4) → 电阻 1/4', () => {
        const r1 = model.solve(makeProblem({ length: 1, diameter: 1, material: 'Cu' }));
        const r2 = model.solve(makeProblem({ length: 1, diameter: 2, material: 'Cu' }));
        expect(r2.diagnostics.maxValues.baseResistance).toBeCloseTo(r1.diagnostics.maxValues.baseResistance / 4, 10);
    });

    it('材料电阻率: Cu < Fe < Nichrome', () => {
        const rCu = model.solve(makeProblem({ material: 'Cu' }));
        const rFe = model.solve(makeProblem({ material: 'Fe' }));
        const rNi = model.solve(makeProblem({ material: 'Nichrome' }));
        expect(rCu.diagnostics.maxValues.baseResistance).toBeLessThan(rFe.diagnostics.maxValues.baseResistance);
        expect(rFe.diagnostics.maxValues.baseResistance).toBeLessThan(rNi.diagnostics.maxValues.baseResistance);
    });

    it('电阻率数值与 RESISTIVITY 表一致', () => {
        expect(RESISTIVITY.Cu).toBeCloseTo(1.68e-8, 12);
        expect(RESISTIVITY.Fe).toBeCloseTo(1.0e-7, 10);
        expect(RESISTIVITY.Nichrome).toBeCloseTo(1.1e-6, 8);
    });

    it('材料比较图覆盖三种材料', () => {
        const r = model.solve(makeProblem());
        expect(r.charts.R_material!.points.length).toBe(3);
    });

    it('R 过小触发 warning', () => {
        const r = model.solve(makeProblem({ length: 0.01, diameter: 10 }));
        expect(r.warnings.some(w => w.includes('接触电阻'))).toBe(true);
    });

    it('summary 包含 R₀', () => {
        const r = model.solve(makeProblem());
        expect(r.explanation.summary).toContain('R₀=');
    });

    it('所有 charts 的 x 必须升序 (R_invS 旧版按直径升序遍历 ⇒ 1/S 降序, 曲线方向反了)', () => {
        const r = model.solve(makeProblem());
        for (const [key, series] of Object.entries(r.charts)) {
            // charts 里既有 ChartSeries 也有 force_diagram (ForceDiagram) —— 只看带 points 的
            if (!series || !('points' in series)) continue;
            const xs = series.points.map((p: { x: number }) => p.x);
            for (let i = 1; i < xs.length; i++) {
                expect(xs[i]!, key).toBeGreaterThanOrEqual(xs[i - 1]!);
            }
        }
    });

    it('R-1/S 直线满足 R = ρ·L·(1/S) 且斜率为 ρ·L', () => {
        const r = model.solve(makeProblem({ length: 2, diameter: 1, material: 'Cu' }));
        const pts = r.charts.R_invS!.points;
        const slope = r.diagnostics.maxValues.slope_R_invS!;
        expect(slope).toBeCloseTo(RESISTIVITY.Cu * 2, 14);
        // chart 的 y 经过 toFixed(6) 量化 ⇒ 绝对误差控制在量化步长量级
        for (const p of pts) {
            expect(Math.abs(p.y - slope * p.x)).toBeLessThan(1e-6);
        }
    });

    it('R-L 直线满足 R = (ρ/S)·L 且斜率为 ρ/S', () => {
        const r = model.solve(makeProblem({ length: 1, diameter: 1, material: 'Cu' }));
        const pts = r.charts.R_L!.points;
        const slope = r.diagnostics.maxValues.slope_R_L!;
        const d = 1 / 1000;
        const S = Math.PI * (d / 2) ** 2;
        expect(slope).toBeCloseTo(RESISTIVITY.Cu / S, 12);
        for (const p of pts) {
            expect(Math.abs(p.y - slope * p.x)).toBeLessThan(1e-6);
        }
    });
});
