import { describe, it, expect } from 'vitest';
import { WaterDiffractionModel } from '../../src/models/water-diffraction.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new WaterDiffractionModel();

function makeProblem(overrides: {
    wavelength?: number;
    slitWidth?: number;
    screenDist?: number;
    waveAmplitude?: number;
} = {}): PhysicsProblem {
    const { wavelength = 4, slitWidth = 5, screenDist = 50, waveAmplitude = 1 } = overrides;
    return {
        id: 'water-diff-test',
        model: 'water-diffraction',
        bodies: [
            {
                id: 'wave',
                mass: { value: 1, unit: 'kg' },
                position: { x: -screenDist, y: 0 },
                velocity: { x: 0, y: 0 }
            }
        ],
        constraints: { waterDiffraction: { wavelength, slitWidth, screenDist, waveAmplitude } },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 200 }
    };
}

describe('WaterDiffractionModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('water-diffraction');
        expect(model.name).toBe('水波衍射');
    });

    it('中央主极大 = A0, 半宽 = arcsin(λ/a)', () => {
        const r = model.solve(makeProblem({ wavelength: 30, slitWidth: 60, waveAmplitude: 2 }));
        const pts = r.charts.intensity_angle!.points;
        expect(Math.max(...pts.map(p => p.y))).toBeCloseTo(2, 3);
        const halfWidth = r.diagnostics.maxValues.halfWidthAngle;
        expect(halfWidth).toBeCloseTo((Math.asin(0.5) * 180) / Math.PI, 4); // 30°
    });

    it('衍射极小值在 θ=arcsin(n·λ/a): 第一极小 ±30° (a=2λ)', () => {
        const r = model.solve(makeProblem({ wavelength: 30, slitWidth: 60, waveAmplitude: 2 }));
        const firstMin = r.diagnostics.maxValues.firstMinimaDeg;
        expect(Math.min(Math.abs(firstMin - 30), Math.abs(firstMin + 30))).toBeLessThan(1);
        // 曲线在 ±30° 处 I≈0
        const pts = r.charts.intensity_angle!.points;
        for (const target of [30, -30]) {
            const idx = pts.findIndex(p => Math.abs(p.x - target) < 0.4);
            expect(idx).toBeGreaterThan(0);
            expect(Math.abs(pts[idx]!.y)).toBeLessThan(0.02);
        }
    });

    it('第一极小不被 ±60° 扫描边界误检 (边界单调非极小)', () => {
        const r = model.solve(makeProblem({ wavelength: 30, slitWidth: 60, waveAmplitude: 2 }));
        const firstMin = r.diagnostics.maxValues.firstMinimaDeg;
        expect(Math.abs(firstMin)).toBeLessThan(45); // 不在 59.4° 边界
    });

    it('a << λ 时衍射强: 主极大宽 (半宽接近 90°)', () => {
        const r = model.solve(makeProblem({ wavelength: 40, slitWidth: 1, waveAmplitude: 1 }));
        expect(r.diagnostics.maxValues.halfWidthAngle).toBeGreaterThan(85);
        expect(r.diagnostics.flags!.isStrong).toBe(true);
    });

    it('a >> λ 时衍射弱: 半宽小, 近似直线传播', () => {
        const r = model.solve(makeProblem({ wavelength: 1, slitWidth: 40, waveAmplitude: 1 }));
        expect(r.diagnostics.maxValues.halfWidthAngle).toBeLessThan(5);
        expect(r.diagnostics.flags!.isWeak || r.diagnostics.flags!.isNegligible).toBe(true);
    });
});
