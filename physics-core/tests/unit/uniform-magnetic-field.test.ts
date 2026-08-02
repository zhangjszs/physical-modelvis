import { describe, it, expect } from 'vitest';
import { UniformMagneticModel } from '../../src/models/uniform-magnetic-field.js';
import type { EnvironmentConfig } from '../../src/types/problem.js';
import type { PhysicalBody, Vector2D } from '../../src/types/common.js';

/**
 * 匀强磁场模型测试 — physics-asserting, 不是 smoke。
 * 验证:回旋半径 R=mv/(|q|B)、周期 T=2πm/(|q|B)、动能守恒、旋转方向 (洛伦兹力 F=qv×B)。
 */

function vec(x: number, y: number): Vector2D {
    return { x, y };
}

function makeBody(opts: {
    id?: string;
    mass?: number;
    charge?: number;
    position?: Vector2D;
    velocity?: Vector2D;
} = {}): PhysicalBody {
    const { id = 'b1', mass = 1, charge = 1.6e-19, position = vec(0, 0), velocity = vec(1, 0) } = opts;
    return {
        id,
        mass: { value: mass, unit: 'kg' },
        position,
        velocity,
        ...(charge !== undefined ? { charge: { value: charge, unit: 'C' } } : {})
    };
}

function magEnv(Bz: number): EnvironmentConfig {
    return { magneticField: { enabled: true, fieldStrength: Bz, unit: 'T' } };
}

function makeProblem(environment: EnvironmentConfig, bodies: PhysicalBody[], duration = 1) {
    return {
        id: 'test-uniform-magnetic-field',
        model: 'uniform-magnetic-field' as const,
        bodies,
        environment,
        constraints: {},
        timeConfig: { duration, sampleCount: 1000 }
    };
}

describe('UniformMagneticModel: 回旋半径与周期', () => {
    const model = new UniformMagneticModel();

    it('元数据完整', () => {
        expect(model.modelType).toBe('uniform-magnetic-field');
        expect(model.name).toContain('磁场');
        expect(model.requiredParameters.length).toBeGreaterThanOrEqual(3);
    });

    it('回旋半径 R = mv/(|q|B)', () => {
        // m=1e-27, v=1, q=1.6e-19, B=1 → R = 1e-27/1.6e-19 = 6.25e-9 m
        const r = model.solve(
            makeProblem(
                magEnv(1),
                [makeBody({ mass: 1e-27, charge: 1.6e-19, velocity: vec(1, 0) })],
                2
            )
        );
        expect(r.diagnostics.maxValues.cyclotronRadius).toBeCloseTo(6.25e-9, 3);
    });

    it('回旋周期 T = 2πm/(|q|B)', () => {
        // T = 2π × 1e-27 / 1.6e-19 = 3.927e-8 s
        const r = model.solve(
            makeProblem(
                magEnv(1),
                [makeBody({ mass: 1e-27, charge: 1.6e-19, velocity: vec(2, 0) })],
                1e-7
            )
        );
        const T = r.diagnostics.maxValues.cyclotronPeriod as number;
        expect(T).toBeCloseTo((2 * Math.PI * 1e-27) / 1.6e-19, 4);
    });

    it('半径随 B 增大而减小 (反比)', () => {
        const r1 = model.solve(makeProblem(magEnv(1), [makeBody({ velocity: vec(1, 0) })], 1));
        const r2 = model.solve(makeProblem(magEnv(2), [makeBody({ velocity: vec(1, 0) })], 1));
        expect((r1.diagnostics.maxValues.cyclotronRadius as number) / 2).toBeCloseTo(
            r2.diagnostics.maxValues.cyclotronRadius as number,
            5
        );
    });
});

describe('UniformMagneticModel: 运动守恒与方向', () => {
    const model = new UniformMagneticModel();

    it('动能守恒 (洛伦兹力不做功)', () => {
        const r = model.solve(
            makeProblem(magEnv(1), [makeBody({ mass: 1e-27, velocity: vec(3, 4) })], 1)
        );
        const ke = r.diagnostics.conservedQuantities.find(q => q.name.includes('动能'));
        expect(ke?.conserved).toBe(true);
        const v0 = 5; // |(3,4)|
        expect(ke?.maxDeviation ?? 999).toBeLessThan(1e-9);
        expect(ke?.initialValue).toBeCloseTo(0.5 * 1e-27 * v0 * v0, 5);
    });

    it('速率保持恒定 (轨迹上任意采样点 |v| 不变)', () => {
        const r = model.solve(makeProblem(magEnv(1), [makeBody({ velocity: vec(3, 4) })], 2));
        const traj = r.trajectories[0]!;
        const v0 = 5;
        for (const p of [traj[100]!, traj[500]!, traj[999]!]) {
            const v = Math.hypot(p.velocity.x, p.velocity.y);
            expect(v).toBeCloseTo(v0, 9);
        }
    });

    it('正电荷 Bz>0 顺时针旋转 (先向下弯)', () => {
        // v=(1,0), B=(0,0,1), q>0: F = qv×B = (0, -qBz) → 力指向 -y, 顺时针绕 (0,-R)
        // m=1, q=1, B=1, v=1 → R=1, ω=1; duration=2π → 1/4 圈在 t=π/2 (idx 250)
        const r = model.solve(
            makeProblem(magEnv(1), [makeBody({ charge: 1, velocity: vec(1, 0) })], 2 * Math.PI)
        );
        const traj = r.trajectories[0]!;
        const early = traj[50]!;
        const quarter = traj[250]!;
        expect(early.position.y).toBeLessThan(0); // 先向下弯
        expect(quarter.position.y).toBeCloseTo(-1, 1); // 1/4 圈到达最低点 y=-R
        expect(early.position.x).toBeGreaterThan(0); // x 持续增大
    });

    it('负电荷旋转方向相反 (逆时针, 向上弯)', () => {
        const r = model.solve(
            makeProblem(magEnv(1), [makeBody({ charge: -1, velocity: vec(1, 0) })], 1)
        );
        const traj = r.trajectories[0]!;
        const early = traj[50]!;
        expect(early.position.y).toBeGreaterThan(0); // 向上弯
        expect(early.position.x).toBeGreaterThan(0);
    });

    it('B=0 退化为匀速直线运动', () => {
        const r = model.solve(
            makeProblem(magEnv(0), [makeBody({ velocity: vec(2, 3) })], 1)
        );
        const traj = r.trajectories[0]!;
        const last = traj[999]!; // sampleCount=1000 → 末点 t=0.999
        expect(last.position.x).toBeCloseTo(2 * 0.999, 5);
        expect(last.position.y).toBeCloseTo(3 * 0.999, 5);
        expect(r.diagnostics.maxValues.cyclotronRadius).toBe(0);
    });

    it('v=0 时静止', () => {
        const r = model.solve(
            makeProblem(magEnv(1), [makeBody({ velocity: vec(0, 0) })], 1)
        );
        const last = r.trajectories[0]![999]!;
        expect(last.position.x).toBeCloseTo(0, 9);
        expect(last.position.y).toBeCloseTo(0, 9);
    });
});
