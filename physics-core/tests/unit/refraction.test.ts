import { describe, it, expect } from 'vitest';
import { RefractionModel } from '../../src/models/refraction.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new RefractionModel();

function makeProblem(
    overrides: {
        n1?: number;
        n2?: number;
        incidentAngleDeg?: number;
    } = {}
): PhysicsProblem {
    const { n1 = 1.0, n2 = 1.5, incidentAngleDeg = 30 } = overrides;
    return {
        id: 'refraction-test',
        model: 'refraction',
        bodies: [{ id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { refraction: { n1, n2, incidentAngleDeg } },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 10 }
    };
}

describe('RefractionModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('refraction');
        expect(model.name).toBe('光的折射定律');
    });

    it('空气→玻璃 30°入射 → sinθ₂ = (1/1.5)·sin30° ≈ 0.333', () => {
        const r = model.solve(makeProblem({ n1: 1.0, n2: 1.5, incidentAngleDeg: 30 }));
        const sinTheta2 = r.diagnostics.maxValues.sinTheta2;
        expect(sinTheta2).toBeCloseTo(0.3333, 3);
    });

    it('空气→玻璃 30°入射 → θ₂ ≈ 19.47°', () => {
        const r = model.solve(makeProblem({ n1: 1.0, n2: 1.5, incidentAngleDeg: 30 }));
        const theta2 = r.diagnostics.maxValues.refractionAngleDeg;
        expect(theta2).toBeCloseTo(19.47, 1);
    });

    it('θ₁=0 → θ₂=0 (垂直入射无偏折)', () => {
        const r = model.solve(makeProblem({ incidentAngleDeg: 0 }));
        expect(r.diagnostics.maxValues.refractionAngleDeg).toBeCloseTo(0, 5);
    });

    it('n₁>n₂ 大角度 → 全反射 (玻璃→空气 60°)', () => {
        const r = model.solve(makeProblem({ n1: 1.5, n2: 1.0, incidentAngleDeg: 60 }));
        expect(r.diagnostics.maxValues.totalInternalReflection).toBe(1);
        expect(r.warnings.length).toBeGreaterThan(0);
        expect(r.warnings[0]).toContain('全反射');
    });

    it('玻璃→空气临界角 ≈ 41.8°', () => {
        const r = model.solve(makeProblem({ n1: 1.5, n2: 1.0, incidentAngleDeg: 50 }));
        const critical = r.diagnostics.maxValues.criticalAngleDeg;
        expect(critical).toBeCloseTo(41.8, 0);
    });

    it('空气→玻璃大角度 (45°) 不发生全反射', () => {
        const r = model.solve(makeProblem({ n1: 1.0, n2: 1.5, incidentAngleDeg: 45 }));
        expect(r.diagnostics.maxValues.totalInternalReflection).toBe(0);
        expect(r.warnings.length).toBe(0);
    });

    it('生成 sinθ₁-sinθ₂ 线性关系图', () => {
        const r = model.solve(makeProblem({ n1: 1.0, n2: 1.5 }));
        expect(r.charts.x_t).toBeDefined();
        expect(r.charts.x_t!.points.length).toBeGreaterThan(10);
        // 线性：sinθ₂ / sinθ₁ = n₁/n₂ = 2/3
        const third = r.charts.x_t!.points[3]!;
        expect(third.y / third.x).toBeCloseTo(2 / 3, 1);
    });

    it('summary 包含折射定律结果', () => {
        const r = model.solve(makeProblem({ n1: 1.0, n2: 1.5, incidentAngleDeg: 30 }));
        expect(r.explanation.summary).toContain('折射');
        expect(r.explanation.summary).toContain('θ₂=');
    });

    it('全反射 summary 提示全反射', () => {
        const r = model.solve(makeProblem({ n1: 1.5, n2: 1.0, incidentAngleDeg: 60 }));
        expect(r.explanation.summary).toContain('全反射');
        expect(r.explanation.summary).toContain('θ_c=');
    });

    it('光路几何: 折射线必须落在入射线的同一侧 (旧版 refractEndX 取负号 ⇒ 折射线跑到法线另一侧)', () => {
        const r = model.solve(makeProblem({ n1: 1.0, n2: 1.5, incidentAngleDeg: 30 }));
        const traj = r.trajectories[0]!;
        // 轨迹点序: [入射起点, 界面点(原点), 折射终点, 反射终点]
        const incidentStart = traj[0]!.position;
        const hit = traj[1]!.position;
        const refractEnd = traj[2]!.position;
        const reflectEnd = traj[3]!.position;

        expect(hit.x).toBeCloseTo(0, 12);
        expect(hit.y).toBeCloseTo(0, 12);
        // 入射起点在法线左侧 ⇒ 行进方向 x 分量为正
        expect(incidentStart.x).toBeLessThan(0);
        expect(incidentStart.y).toBeGreaterThan(0);
        // 折射终点必须与入射行进方向同侧 (x > 0) 且在界面下方 (y < 0)
        expect(refractEnd.x).toBeGreaterThan(0);
        expect(refractEnd.y).toBeLessThan(0);
        // 反射终点回到介质 1 (y > 0), 与入射起点关于法线对称
        expect(reflectEnd.y).toBeGreaterThan(0);
        expect(reflectEnd.x).toBeCloseTo(-incidentStart.x, 12);
        expect(reflectEnd.y).toBeCloseTo(incidentStart.y, 12);
    });

    it('折射角与折射终点几何自洽: |x| / |y| = tanθ₂', () => {
        const r = model.solve(makeProblem({ n1: 1.0, n2: 1.5, incidentAngleDeg: 30 }));
        const traj = r.trajectories[0]!;
        const refractEnd = traj[2]!.position;
        const theta2 = r.diagnostics.maxValues.refractionAngleDeg!;
        expect(Math.abs(refractEnd.x) / Math.abs(refractEnd.y)).toBeCloseTo(Math.tan((theta2 * Math.PI) / 180), 9);
    });

    it('全反射时不存在折射线 (轨迹只有入射 + 反射三点)', () => {
        const r = model.solve(makeProblem({ n1: 1.5, n2: 1.0, incidentAngleDeg: 60 }));
        expect(r.trajectories[0]!.length).toBe(3);
        expect(r.diagnostics.maxValues.refractionAngleDeg).toBe(-1);
    });
});
