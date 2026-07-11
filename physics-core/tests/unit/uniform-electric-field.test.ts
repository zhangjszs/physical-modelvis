import { describe, it, expect } from 'vitest';
import { UniformElectricModel } from '../../src/models/uniform-electric-field.js';
import type { PhysicalBody, EnvironmentConfig } from '../../src/types/problem.js';
import type { Vector2D } from '../../src/types/common.js';

/**
 * 匀强电场模型测试 — physics-asserting, 不是 smoke。
 *
 * 约定与 xuanbi2.test.ts 一致 (makeBody / makeProblem)。
 * 本模型需要在 body 上挂 charge、在 environment 上挂 electricField，
 * 所以 helpers 在这两个维度上做了扩展。
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
    const { id = 'b1', mass = 1, charge, position = vec(0, 0), velocity = vec(0, 0) } = opts;
    return {
        id,
        mass: { value: mass, unit: 'kg' },
        position,
        velocity,
        ...(charge !== undefined ? { charge: { value: charge, unit: 'C' } } : {})
    };
}

function fieldEnv(fieldVector: Vector2D): EnvironmentConfig {
    return { electricField: { enabled: true, fieldVector, unit: 'N/C' } };
}

function makeProblem(
    environment: EnvironmentConfig,
    bodies: PhysicalBody[],
    timeConfig = { duration: 1, sampleCount: 1000 }
) {
    return {
        id: 'test-uniform-electric-field',
        model: 'uniform-electric-field' as const,
        bodies,
        environment,
        constraints: {},
        timeConfig
    };
}

/** 机械能 = 动能 + 电势能 */
const mechanicalEnergy = (p: { kineticEnergy?: number; potentialEnergy?: number }) =>
    (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0);

describe('UniformElectricModel — 匀强电场中的带电粒子', () => {
    const model = new UniformElectricModel();

    // ─── TEST 1 ────────────────────────────────────────────────────────────────
    // 纯 Ex 场、粒子从原点静止出发。旧代码 U≡0 导致机械能明显不守恒；
    // 新代码 U = -q(Ex·x + Ey·y) 必须守恒 (误差 < 1e-6·scale)。
    it('conserves mechanical energy in a pure-EX field with particle starting at rest', () => {
        const q = 1;
        const m = 1;
        const body = makeBody({ mass: m, charge: q, position: vec(0, 0), velocity: vec(0, 0) });
        const res = model.solve(makeProblem(fieldEnv(vec(100, 0)), [body], { duration: 1, sampleCount: 1000 }));

        const traj = res.trajectories[0]!;
        const E0 = mechanicalEnergy(traj[0]!);
        // 能量尺度取 (|KE| + |U|) 的最大值，使容差随问题规模自适应
        const scale = Math.max(...traj.map((p) => Math.abs(p.kineticEnergy ?? 0) + Math.abs(p.potentialEnergy ?? 0)));
        const tol = 1e-6 * scale + 1e-12;

        const finalE = mechanicalEnergy(traj[traj.length - 1]!);
        expect(Math.abs(finalE - E0)).toBeLessThan(tol);

        // 逐帧检查 (真正验证整条轨迹守恒, 而非只有端点碰巧)
        for (const p of traj) {
            expect(Math.abs(mechanicalEnergy(p) - E0)).toBeLessThan(tol);
        }
    });

    // ─── TEST 2 ────────────────────────────────────────────────────────────────
    // 完整 2D 场 (Ex≠0, Ey≠0) + 非零初速度。同样守恒，并额外检查中间帧。
    it('conserves mechanical energy in a full 2D field with nonzero initial velocity', () => {
        const q = 1;
        const m = 1;
        const body = makeBody({ mass: m, charge: q, position: vec(0, 0), velocity: vec(3, 4) });
        const res = model.solve(makeProblem(fieldEnv(vec(50, 80)), [body], { duration: 2, sampleCount: 2000 }));

        const traj = res.trajectories[0]!;
        const E0 = mechanicalEnergy(traj[0]!);
        const scale = Math.max(...traj.map((p) => Math.abs(p.kineticEnergy ?? 0) + Math.abs(p.potentialEnergy ?? 0)));
        const tol = 1e-6 * scale + 1e-12;

        const mid = traj[Math.floor(traj.length / 2)]!;
        const final = traj[traj.length - 1]!;

        expect(Math.abs(mechanicalEnergy(mid) - E0)).toBeLessThan(tol);
        expect(Math.abs(mechanicalEnergy(final) - E0)).toBeLessThan(tol);
    });

    // ─── TEST 3 ────────────────────────────────────────────────────────────────
    // 竖直速度能减为零 → 出现 '最高点' 关键帧, 且 t≈-v0y/ay、vy≈0。
    // v0y>0, ay<0: 取 q>0, Ey<0。
    it("emits a '最高点' keyframe when the vertical velocity reverses", () => {
        const q = 1;
        const m = 1;
        const body = makeBody({ mass: m, charge: q, position: vec(0, 0), velocity: vec(2, 10) });
        const res = model.solve(makeProblem(fieldEnv(vec(0, -50)), [body], { duration: 1, sampleCount: 1000 }));

        const kf = res.keyframes.find((k) => k.label === '最高点');
        expect(kf).toBeDefined();
        // ay = q·Ey/m = -50 → tTurn = -v0y/ay = -10/(-50) = 0.2
        expect(kf!.t).toBeCloseTo(0.2, 5);
        expect(kf!.velocity.y).toBeCloseTo(0, 6);
    });

    // ─── TEST 4 ────────────────────────────────────────────────────────────────
    // 零质量 → throwIfInvalid 抛出 (INVALID_MASS → ParameterOutOfRangeError)。
    it('throws on zero mass', () => {
        const body = makeBody({ mass: 0, charge: 1 });
        expect(() => model.solve(makeProblem(fieldEnv(vec(100, 0)), [body]))).toThrow();
    });

    // ─── TEST 5 ────────────────────────────────────────────────────────────────
    // a=0 退化 (E=0): 静止粒子保持在 x0 不动 — 运动学积分器中性 sanity 检查。
    it('keeps a resting body at its initial position when E=0', () => {
        const body = makeBody({ mass: 1, charge: 1, position: vec(5, 3), velocity: vec(0, 0) });
        const res = model.solve(makeProblem(fieldEnv(vec(0, 0)), [body], { duration: 1, sampleCount: 500 }));

        const traj = res.trajectories[0]!;
        for (const p of traj) {
            expect(p.position.x).toBeCloseTo(5, 10);
            expect(p.position.y).toBeCloseTo(3, 10);
        }
    });

    // ─── TEST 6 (额外) ─────────────────────────────────────────────────────────
    // 加速度正确性: a = qE/m，直接读 trajectory 首帧加速度核对。
    it('produces the correct acceleration a = qE/m', () => {
        const q = 2;
        const m = 4;
        const body = makeBody({ mass: m, charge: q, position: vec(0, 0), velocity: vec(0, 0) });
        const res = model.solve(makeProblem(fieldEnv(vec(10, -6)), [body]));

        const a = res.trajectories[0]![0]!.acceleration!;
        expect(a.x).toBeCloseTo((q * 10) / m, 10); // 5
        expect(a.y).toBeCloseTo((q * -6) / m, 10); // -3
    });

    // ─── TEST 7 (额外) ─────────────────────────────────────────────────────────
    // 轨迹解析正确性: 在任意帧上都满足 x = x0 + v0·t + ½·a·t²。
    it('matches the analytical parabolic trajectory at an arbitrary frame', () => {
        const q = 1;
        const m = 1;
        const x0 = vec(1, -2);
        const v0 = vec(3, 4);
        const E = vec(12, -8);
        const body = makeBody({ mass: m, charge: q, position: x0, velocity: v0 });
        const res = model.solve(makeProblem(fieldEnv(E), [body], { duration: 3, sampleCount: 3000 }));

        const ax = (q * E.x) / m;
        const ay = (q * E.y) / m;
        const traj = res.trajectories[0]!;
        // 抽一个靠中间的采样帧
        const idx = Math.floor(traj.length * 0.37);
        const p = traj[idx]!;
        const t = p.t;

        expect(p.position.x).toBeCloseTo(x0.x + v0.x * t + 0.5 * ax * t * t, 6);
        expect(p.position.y).toBeCloseTo(x0.y + v0.y * t + 0.5 * ay * t * t, 6);
        expect(p.velocity.x).toBeCloseTo(v0.x + ax * t, 6);
        expect(p.velocity.y).toBeCloseTo(v0.y + ay * t, 6);
    });
});
