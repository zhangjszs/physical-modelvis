import { describe, it, expect } from 'vitest';
import { InterferenceModel } from '../../src/models/interference.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new InterferenceModel();

function makeProblem(
    overrides: {
        wavelengthNm?: number;
        slitSeparationMm?: number;
        screenDistanceM?: number;
        filmThicknessUm?: number;
        filmN?: number;
    } = {}
): PhysicsProblem {
    const { wavelengthNm = 600, slitSeparationMm = 0.5, screenDistanceM = 2.0, filmThicknessUm, filmN } = overrides;
    const ic: {
        wavelengthNm: number;
        slitSeparationMm: number;
        screenDistanceM: number;
        filmThicknessUm?: number;
        filmN?: number;
    } = {
        wavelengthNm,
        slitSeparationMm,
        screenDistanceM
    };
    if (filmThicknessUm !== undefined) ic.filmThicknessUm = filmThicknessUm;
    if (filmN !== undefined) ic.filmN = filmN;
    return {
        id: 'interference-test',
        model: 'interference',
        bodies: [{ id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { interference: ic },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 10 }
    };
}

describe('InterferenceModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('interference');
        expect(model.name).toBe('双缝干涉');
    });

    it('条纹间距 Δy = λ·L/d (600nm, 0.5mm, 2m → Δy = 2.4mm)', () => {
        const r = model.solve(makeProblem({ wavelengthNm: 600, slitSeparationMm: 0.5, screenDistanceM: 2 }));
        const deltaYmm = r.diagnostics.maxValues.deltaYmm;
        expect(deltaYmm).toBeCloseTo(2.4, 5); // 600e-9 * 2 / 0.5e-3 = 0.0024 m = 2.4 mm
    });

    it('增大 d → Δy 减小 (反比关系)', () => {
        const r1 = model.solve(makeProblem({ slitSeparationMm: 0.5 }));
        const r2 = model.solve(makeProblem({ slitSeparationMm: 1.0 }));
        expect(r2.diagnostics.maxValues.deltaYmm).toBeCloseTo(r1.diagnostics.maxValues.deltaYmm / 2, 5);
    });

    it('增大 λ → Δy 增大 (正比关系)', () => {
        const r1 = model.solve(makeProblem({ wavelengthNm: 400 }));
        const r2 = model.solve(makeProblem({ wavelengthNm: 700 }));
        expect(r2.diagnostics.maxValues.deltaYmm).toBeGreaterThan(r1.diagnostics.maxValues.deltaYmm);
    });

    it('光强曲线中央 (x=0) 为峰值 (=1)', () => {
        const r = model.solve(makeProblem({ wavelengthNm: 600, slitSeparationMm: 0.5, screenDistanceM: 2 }));
        const chart = r.charts.x_t!;
        // 中间点 x ≈ 0
        const midIdx = Math.floor(chart.points.length / 2);
        expect(chart.points[midIdx]!.y).toBeCloseTo(1, 3);
    });

    it('光强曲线峰值等间距 (Δx = Δy)', () => {
        const r = model.solve(makeProblem({ wavelengthNm: 600, slitSeparationMm: 0.5, screenDistanceM: 2 }));
        const chart = r.charts.x_t!;
        // 找每个明纹峰值的"中心" (y=1 附近的中点)
        // 取所有 y>0.99 的点, 按 x 聚类：相邻点 x 差 > 0.2mm 视为不同峰
        const highPoints = chart.points.filter(p => p.y > 0.99);
        const peaks: number[] = [];
        let lastX = -Infinity;
        for (const p of highPoints) {
            if (p.x - lastX > 0.2) {
                peaks.push(p.x);
                lastX = p.x;
            }
        }
        // 应有 ≥3 个明纹 (k=0, ±1, ±2 中至少 3 个 y>0.99)
        expect(peaks.length).toBeGreaterThanOrEqual(3);
        // 相邻峰间距 ≈ 2.4mm，检查所有间距大致相等
        if (peaks.length >= 3) {
            const d1 = peaks[1]! - peaks[0]!;
            const d2 = peaks[2]! - peaks[1]!;
            expect(Math.abs(d1 - d2)).toBeLessThan(0.3); // 等间距
            expect(d1).toBeGreaterThan(1.5);
            expect(d1).toBeLessThan(3.0);
        }
    });

    it('summary 包含条纹间距', () => {
        const r = model.solve(makeProblem({ wavelengthNm: 500, slitSeparationMm: 0.25, screenDistanceM: 1.5 }));
        expect(r.explanation.summary).toContain('Δy=');
        expect(r.explanation.summary).toContain('λ=');
    });

    it('单缝加薄片：filmThickness=0 或 filmN=1 时零平移 (#181)', () => {
        const base = model.solve(makeProblem({ wavelengthNm: 600, slitSeparationMm: 0.5, screenDistanceM: 2 }));
        const zeroT = model.solve(
            makeProblem({
                wavelengthNm: 600,
                slitSeparationMm: 0.5,
                screenDistanceM: 2,
                filmThicknessUm: 0,
                filmN: 1.38
            })
        );
        const unitN = model.solve(
            makeProblem({
                wavelengthNm: 600,
                slitSeparationMm: 0.5,
                screenDistanceM: 2,
                filmThicknessUm: 0.5,
                filmN: 1
            })
        );

        for (const r of [zeroT, unitN]) {
            expect(r.diagnostics.maxValues.fringeShiftMm).toBe(0);
            expect(r.diagnostics.maxValues.filmOpticalPathDiffUm).toBe(0);
            expect(r.diagnostics.maxValues.filmShiftOrders).toBe(0);
            expect(r.diagnostics.maxValues.deltaYmm).toBeCloseTo(base.diagnostics.maxValues.deltaYmm, 6);
            expect(r.charts.x_t!.points).toEqual(base.charts.x_t!.points);
        }
    });

    it('单缝加薄片：λ=600nm, d=0.5mm, L=2m, t=0.5μm, n=1.38 → Δ_opt=190nm, Δx=0.76mm, Δy 不变 (#181)', () => {
        const base = model.solve(makeProblem({ wavelengthNm: 600, slitSeparationMm: 0.5, screenDistanceM: 2 }));
        const shifted = model.solve(
            makeProblem({
                wavelengthNm: 600,
                slitSeparationMm: 0.5,
                screenDistanceM: 2,
                filmThicknessUm: 0.5,
                filmN: 1.38
            })
        );
        const mv = shifted.diagnostics.maxValues;
        expect(mv.deltaYmm).toBeCloseTo(2.4, 6);
        expect(mv.filmOpticalPathDiffUm).toBeCloseTo(0.19, 6); // 190 nm = 0.19 μm
        expect(mv.fringeShiftMm).toBeCloseTo(0.76, 6); // 0.19e-6 * 2 / 0.5e-3 = 0.76 mm
        expect(mv.filmShiftOrders).toBeCloseTo(190 / 600, 6);

        // 中央明纹关键帧平移至 x = +0.76 mm
        const centerKf = shifted.keyframes.find(kf => kf.label.includes('k=0'));
        expect(centerKf?.position.x).toBeCloseTo(0.76, 5);

        // intensityCurve 相对无薄片确实发生对应平移：x=0.76mm 处光强为极大 (~1)，而 x=0 处不再是 1
        const pts = shifted.charts.x_t!.points;
        const nearest = (xMm: number) =>
            pts.reduce((best, p) => (Math.abs(p.x - xMm) < Math.abs(best.x - xMm) ? p : best), pts[0]!);
        expect(nearest(0.76).y).toBeGreaterThan(0.99);
        expect(nearest(0.76 + 2.4).y).toBeGreaterThan(0.99);
        expect(nearest(0.76 - 2.4).y).toBeGreaterThan(0.99);
        expect(nearest(0).y).toBeLessThan(0.6); // cos²(π * 190/600) ≈ 0.296
        expect(pts).not.toEqual(base.charts.x_t!.points);

        // fringeOrderCurve 在 x = 0.76 mm 处光程差归零
        const orderPts = shifted.charts.y_t!.points;
        const orderAtShift = orderPts.reduce(
            (best, p) => (Math.abs(p.x - 0.76) < Math.abs(best.x - 0.76) ? p : best),
            orderPts[0]!
        );
        expect(Math.abs(orderAtShift.y)).toBeLessThan(0.05);
    });

    it('红/绿/蓝/窄缝预设参数零回归 (#181)', () => {
        const presets = [
            { wavelengthNm: 650, slitSeparationMm: 0.5, screenDistanceM: 2.0, expectedDy: 2.6 },
            { wavelengthNm: 550, slitSeparationMm: 0.5, screenDistanceM: 2.0, expectedDy: 2.2 },
            { wavelengthNm: 450, slitSeparationMm: 0.5, screenDistanceM: 2.0, expectedDy: 1.8 },
            { wavelengthNm: 600, slitSeparationMm: 0.2, screenDistanceM: 2.0, expectedDy: 6.0 }
        ];
        for (const p of presets) {
            const r = model.solve(makeProblem(p));
            expect(r.diagnostics.maxValues.deltaYmm).toBeCloseTo(p.expectedDy, 5);
            expect(r.diagnostics.maxValues.fringeShiftMm).toBe(0);
        }
    });
});
