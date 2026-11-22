import { describe, it, expect } from 'vitest';
import { MicroDeformationModel } from '../../src/models/micro-deformation.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new MicroDeformationModel();

function makeProblem(
    overrides: Partial<{
        laserDist: number;
        mirrorDist: number;
        pressure: number;
        youngModulus: number;
        thickness: number;
        tableLength: number;
    }> = {}
): PhysicsProblem {
    const {
        laserDist = 1,
        mirrorDist = 5,
        pressure = 100,
        youngModulus = 1e10,
        thickness = 0.05,
        tableLength = 1
    } = overrides;
    return {
        id: 'micro-deformation-test',
        model: 'micro-deformation',
        bodies: [{ id: 'table', mass: { value: 10, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
            microDeformation: { laserDist, mirrorDist, pressure, youngModulus, thickness, tableLength }
        },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 200 }
    };
}

describe('MicroDeformationModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('micro-deformation');
        expect(model.name).toBe('桌面微小形变光杠杆放大');
        expect(model.version).toBe('1.0.0');
        expect(model.assumptions.length).toBeGreaterThanOrEqual(3);
    });

    it('正例: F=100N 桌面压缩 Δh 在 nm 级', () => {
        // Δh = F·L₀/(E·A) = 100 * 0.05 / (1e10 * 1) = 5e-10 m = 0.5 nm
        const r = model.solve(makeProblem({ pressure: 100, thickness: 0.05, youngModulus: 1e10 }));
        const deltaH = r.diagnostics.maxValues.deltaH as number;
        expect(deltaH).toBeCloseTo(5e-10, 12);
        // nm 级
        expect(deltaH).toBeLessThan(1e-8);
    });

    it('正例: F=100N, D=5m 时光点位移 Δs = D·tan(2α) ≈ 2D·α = 5nm, 远大于 Δh (#176)', () => {
        // 物理量级：Δh = F·L₀/(E·A) = 100*0.05/(1e10*1) = 5e-10 m = 0.5 nm
        // α = 5e-10 rad, Δs = D·tan(2α) ≈ 2D·α = 2·5·5e-10 = 5e-9 m = 5 nm
        const r = model.solve(makeProblem({ pressure: 100, mirrorDist: 5 }));
        const deltaS = r.diagnostics.maxValues.deltaS as number;
        const deltaSLinear = r.diagnostics.maxValues.deltaSLinear as number;
        expect(deltaS).toBeCloseTo(5e-9, 15);
        expect(deltaSLinear).toBeCloseTo(5e-9, 15);
        expect(deltaS / deltaSLinear).toBeCloseTo(1, 6);
        expect(deltaS).toBeGreaterThan(r.diagnostics.maxValues.deltaH as number); // 放大成立
    });

    it('线性: Δs ∝ F (压力翻倍, Δh也翻倍)', () => {
        const r1 = model.solve(makeProblem({ pressure: 50 }));
        const r2 = model.solve(makeProblem({ pressure: 100 }));
        const ratio = (r2.diagnostics.maxValues.deltaH as number) / (r1.diagnostics.maxValues.deltaH as number);
        expect(ratio).toBeCloseTo(2, 5);
    });

    it('边界: F=0 时 Δh=0, Δs=0', () => {
        const r = model.solve(makeProblem({ pressure: 0 }));
        expect(r.diagnostics.maxValues.deltaH).toBe(0);
        expect(r.diagnostics.maxValues.deltaS).toBe(0);
    });

    it('边界: 压力很大时形变仍遵守胡克定律, 不产生 NaN', () => {
        const r = model.solve(makeProblem({ pressure: 1e5, thickness: 0.05, youngModulus: 1e10 }));
        expect(Number.isFinite(r.diagnostics.maxValues.deltaH as number)).toBe(true);
        expect(Number.isFinite(r.diagnostics.maxValues.deltaS as number)).toBe(true);
    });

    it('放大倍数 k = Δs/Δh = 2D/L (线性近似, #176)', () => {
        const r = model.solve(makeProblem({ mirrorDist: 5, tableLength: 1 }));
        const k = r.diagnostics.maxValues.magnification as number;
        // k ≈ 2×5/1 = 10
        expect(k).toBeCloseTo(10, 4);
        expect(r.diagnostics.maxValues.linearMagnification).toBeCloseTo(10, 6);
        expect(r.explanation.formulas.every(f => !f.formula.includes('4D'))).toBe(true);
    });

    it('独立公式回归 (α=0.01rad, D=5m): Δs=D·tan(2α)≈0.100013m 且压力扫描与关键帧一致 (#176)', () => {
        // Δh = F·L0/(E·1) = 1e6 * 1 / 1e8 = 0.01 m, L = 1 m → α = 0.01 rad (全部在 requiredParameters 合法范围内)
        const r = model.solve(
            makeProblem({ pressure: 1e6, thickness: 1, youngModulus: 1e8, tableLength: 1, mirrorDist: 5 })
        );
        const { alpha, deltaS, deltaSLinear } = r.diagnostics.maxValues;
        expect(alpha).toBeCloseTo(0.01, 10);
        expect(deltaSLinear).toBeCloseTo(0.1, 10);
        expect(deltaS).toBeCloseTo(5 * Math.tan(0.02), 10);
        expect(deltaS / deltaSLinear).toBeCloseTo(Math.tan(0.02) / 0.02, 8);
        expect(r.keyframes[1]!.velocity!.y).toBeCloseTo(deltaS, 10);

        // 压力扫描中点 (F=pressure) 与精确 Δs 一致
        const dsPts = r.charts.pressure_deltaS!.points;
        const midPt = dsPts[Math.floor(dsPts.length / 2)]!;
        expect(midPt.y).toBeCloseTo(deltaS, 8);
    });

    it('边界: 较大倾角 (α=0.2rad, 参数极限内) 时精确 D·tan(2α) 有限且触发大角告警 (#176)', () => {
        // Δh = 1e6 * 1 / 1e8 = 0.01 m, L = 0.05 m → α = 0.2 rad, 2α = 0.4 rad
        const r = model.solve(
            makeProblem({ pressure: 1e6, thickness: 1, youngModulus: 1e8, tableLength: 0.05, mirrorDist: 5 })
        );
        expect(Number.isFinite(r.diagnostics.maxValues.deltaS)).toBe(true);
        expect(r.diagnostics.maxValues.deltaS).toBeCloseTo(5 * Math.tan(0.4), 10);
        expect(r.diagnostics.maxValues.deltaSLinear).toBeCloseTo(2.0, 10);
        expect(r.warnings.length).toBeGreaterThan(0);
    });

    it('生成 pressure-deltaS 和 pressure-deltaH 两个图表', () => {
        const r = model.solve(makeProblem());
        expect(r.charts.pressure_deltaS).toBeDefined();
        expect(r.charts.pressure_deltaH).toBeDefined();
        const dsPoints = r.charts.pressure_deltaS!.points;
        const dhPoints = r.charts.pressure_deltaH!.points;
        expect(dsPoints.length).toBeGreaterThan(100);
        expect(dhPoints.length).toBeGreaterThan(100);
        // 起点 (F=0): Δs=0, Δh=0
        expect(dsPoints[0]!.y).toBeCloseTo(0, 15);
        expect(dhPoints[0]!.y).toBeCloseTo(0, 15);
        // 终点 (F=200N) Δs>0, Δh>0
        expect(dsPoints[dsPoints.length - 1]!.y).toBeGreaterThan(0);
        expect(dhPoints[dhPoints.length - 1]!.y).toBeGreaterThan(0);
    });

    it('静态轨迹返回长度 1', () => {
        const r = model.solve(makeProblem());
        expect(r.trajectories[0]).toHaveLength(1);
    });

    it('解释包含 5 步', () => {
        const r = model.solve(makeProblem());
        expect(r.explanation.steps).toHaveLength(5);
        const descriptions = r.explanation.steps.map(s => s.description);
        expect(descriptions.some(d => d.includes('光杠杆'))).toBe(true);
        expect(descriptions.some(d => d.includes('形变'))).toBe(true);
        expect(descriptions.some(d => d.includes('光路'))).toBe(true);
        expect(descriptions.some(d => d.includes('读数'))).toBe(true);
        expect(descriptions.some(d => d.includes('误差'))).toBe(true);
    });

    it('公式列表包含 微小形变 和 放大倍数', () => {
        const r = model.solve(makeProblem());
        const formulaNames = r.explanation.formulas.map(f => f.name);
        expect(formulaNames).toContain('微小形变');
        expect(formulaNames).toContain('放大倍数');
    });

    it('缺少 microDeformation 约束抛错', () => {
        const problem: PhysicsProblem = {
            id: 'fail',
            model: 'micro-deformation',
            bodies: [{ id: 't', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
            constraints: {},
            environment: {},
            timeConfig: { duration: 1 }
        };
        expect(() => model.solve(problem)).toThrow('microDeformation');
    });

    it('杨氏模量 E 越大, 形变越小', () => {
        const soft = model.solve(makeProblem({ youngModulus: 1e8 }));
        const hard = model.solve(makeProblem({ youngModulus: 1e11 }));
        expect(soft.diagnostics.maxValues.deltaH as number).toBeGreaterThan(
            hard.diagnostics.maxValues.deltaH as number
        );
    });
});
