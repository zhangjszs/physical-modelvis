import { describe, it, expect } from 'vitest';
import { NewtonThirdLawModel } from '../../src/models/newton-third-law.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new NewtonThirdLawModel();

function makeProblem(
    overrides: Partial<{ forceAB: number; massA: number; massB: number; allowMotion: boolean }> = {}
): PhysicsProblem {
    const { forceAB = 5, massA = 1, massB = 2, allowMotion = false } = overrides;
    return {
        id: 'newton-third-law-test',
        model: 'newton-third-law',
        bodies: [
            { id: 'A', mass: { value: massA, unit: 'kg' }, position: { x: -1, y: 0 }, velocity: { x: 0, y: 0 } },
            { id: 'B', mass: { value: massB, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } }
        ],
        constraints: { newtonThirdLaw: { forceAB, allowMotion } },
        environment: {},
        timeConfig: { duration: 2, sampleCount: 200 }
    };
}

describe('NewtonThirdLawModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('newton-third-law');
        expect(model.name).toBe('牛顿第三定律');
    });

    it('F_AB 与 F_BA 大小相等、方向相反', () => {
        const r = model.solve(makeProblem({ forceAB: 5 }));
        expect(r.diagnostics.maxValues.forceAB).toBe(5);
        expect(r.diagnostics.maxValues.forceBA).toBe(5); // |F_BA| = |F_AB|
        // 力的方向相反 (F_AB = +5, F_BA = -5)
        const forces = r.charts.force_diagram!.forces;
        expect(forces[0]!.vector.x).toBe(5); // F_AB
        expect(forces[1]!.vector.x).toBe(-5); // F_BA
    });

    it('守恒量: 作用力 = 反作用力 + 系统总动量守恒', () => {
        const r = model.solve(makeProblem({ forceAB: 8 }));
        expect(r.diagnostics.conservedQuantities).toHaveLength(2);
        const cq = r.diagnostics.conservedQuantities.find(q => q.name === '作用力 = 反作用力')!;
        expect(cq).toBeDefined();
        expect(cq.conserved).toBe(true);
        expect(cq.maxDeviation).toBe(0);
    });

    it('allowMotion=false: 两物体保持静止 (a=0)', () => {
        const r = model.solve(makeProblem({ allowMotion: false }));
        expect(r.diagnostics.maxValues.acceleration).toBe(0);
        // 末时刻速度仍为 0
        const trajA = r.trajectories[0]!;
        const finalA = trajA[trajA.length - 1]!;
        expect(finalA.velocity.x).toBe(0);
    });

    it('allowMotion=true 正内力: 背向分离 a_A=-F/mA, a_B=F/mB, 总动量守恒质心不动', () => {
        const r = model.solve(makeProblem({ forceAB: 6, massA: 1, massB: 2, allowMotion: true }));
        // 质心加速度恒为 0, 各自加速度带符号
        expect(r.diagnostics.maxValues.acceleration).toBe(0);
        expect(r.diagnostics.maxValues.accelA).toBeCloseTo(-6, 6);
        expect(r.diagnostics.maxValues.accelB).toBeCloseTo(3, 6);
        const trajA = r.trajectories[0]!;
        const trajB = r.trajectories[1]!;
        for (let i = 0; i < trajA.length; i++) {
            const pA = trajA[i]!;
            const pB = trajB[i]!;
            // 初速 0 → 系统总动量恒为 0
            expect(pA.velocity.x + 2 * pB.velocity.x).toBeCloseTo(0, 9);
            // 质心位置恒定 x_cm = (1·(−1)+2·1)/3 = 1/3
            expect((pA.position.x + 2 * pB.position.x) / 3).toBeCloseTo(1 / 3, 6);
            // 背向分离: A 向左、B 向右, 不穿透
            expect(pB.position.x).toBeGreaterThan(pA.position.x);
        }
    });

    it('质量比: v_A/v_B = −m_B/m_A', () => {
        const r = model.solve(makeProblem({ forceAB: 4, massA: 2, massB: 5, allowMotion: true }));
        const lastA = r.trajectories[0]![r.trajectories[0]!.length - 1]!;
        const lastB = r.trajectories[1]![r.trajectories[1]!.length - 1]!;
        expect(lastA.velocity.x / lastB.velocity.x).toBeCloseTo(-5 / 2, 6);
    });

    it('负内力相向靠拢: 接触截断于质心, 不穿透且接触后停住', () => {
        const r = model.solve(makeProblem({ forceAB: -6, massA: 1, massB: 2, allowMotion: true }));
        const trajA = r.trajectories[0]!;
        const trajB = r.trajectories[1]!;
        // 全程不穿透: x_A <= x_B
        for (let i = 0; i < trajA.length; i++) {
            expect(trajA[i]!.position.x).toBeLessThanOrEqual(trajB[i]!.position.x + 1e-9);
        }
        const kf = r.keyframes.find(k => k.label === '相向接触')!;
        expect(kf, '应产出相向接触关键帧').toBeDefined();
        // 解析解: t_contact = 2/3 s, 接触点 = 质心 x = 1/3 m (初速 0)
        expect(kf.t).toBeCloseTo(2 / 3, 3);
        expect(kf.position.x).toBeCloseTo(1 / 3, 3);
        // 接触后 (v_cm=0): 速度与加速度归零, 停在质心
        const lastA = trajA[trajA.length - 1]!;
        const lastB = trajB[trajB.length - 1]!;
        expect(lastA.velocity.x).toBe(0);
        expect(lastB.velocity.x).toBe(0);
        expect(lastA.acceleration?.x ?? 0).toBe(0);
        expect(lastA.position.x).toBeCloseTo(1 / 3, 6);
        expect(lastB.position.x).toBeCloseTo(1 / 3, 6);
    });

    it('ΣF_ext = dP/dt = 0: 正/负内力全程总动量波动 < 1e-9', () => {
        for (const forceAB of [6, -6]) {
            const r = model.solve(makeProblem({ forceAB, massA: 1, massB: 2, allowMotion: true }));
            const pq = r.diagnostics.conservedQuantities.find(q => q.name === '系统总动量守恒')!;
            expect(pq, `forceAB=${forceAB}`).toBeDefined();
            expect(pq.conserved, `forceAB=${forceAB}`).toBe(true);
            expect(pq.maxDeviation).toBeLessThan(1e-9);
        }
    });

    it('生成 F-t 图表', () => {
        const r = model.solve(makeProblem({ forceAB: 5 }));
        expect(r.charts.F_t).toBeDefined();
        // F_AB 恒为 5
        expect(r.charts.F_t!.points[0]!.y).toBe(5);
        expect(r.charts.F_t!.points[r.charts.F_t!.points.length - 1]!.y).toBe(5);
    });

    it('公式说明包含 F_AB = -F_BA', () => {
        const r = model.solve(makeProblem({ forceAB: 5 }));
        const formulaNames = r.explanation.formulas.map(f => f.name);
        expect(formulaNames).toContain('牛顿第三定律');
        expect(formulaNames).toContain('大小相等');
        expect(formulaNames).toContain('同时性');
        expect(formulaNames).toContain('系统性');
    });

    it('需要两个物体 (单物体抛错)', () => {
        const problem: PhysicsProblem = {
            id: 'fail',
            model: 'newton-third-law',
            bodies: [
                { id: 'only', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { newtonThirdLaw: { forceAB: 5 } },
            environment: {},
            timeConfig: { duration: 1, sampleCount: 100 }
        };
        expect(() => model.solve(problem)).toThrow('两个物体');
    });

    it('缺少 newtonThirdLaw 约束抛错', () => {
        const problem: PhysicsProblem = {
            id: 'fail',
            model: 'newton-third-law',
            bodies: [
                { id: 'A', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
                { id: 'B', mass: { value: 1, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {},
            environment: {},
            timeConfig: { duration: 1, sampleCount: 100 }
        };
        expect(() => model.solve(problem)).toThrow('newtonThirdLaw');
    });
});
