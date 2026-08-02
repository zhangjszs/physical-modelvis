import { describe, it, expect } from 'vitest';
import { UniformCircularMotionModel } from '../../src/models/uniform-circular-motion.js';
import type { PhysicalBody } from '../../src/types/common.js';
import type { Vector2D } from '../../src/types/common.js';
import type { CircularMotionConstraint } from '../../src/types/problem.js';

/**
 * 匀速圆周运动模型测试 — physics-asserting, 不是 smoke。
 * 验证:轨迹为圆周、速率恒定、向心力 F=mω²r、周期 T=2π/ω、圆锥摆 ω=√(g/(L·cosθ))。
 */

function vec(x: number, y: number): Vector2D {
    return { x, y };
}

function makeBody(mass = 1, position = vec(0, 0), velocity = vec(0, 1)): PhysicalBody {
    return { id: 'b1', mass: { value: mass, unit: 'kg' }, position, velocity };
}

function cmConstraint(opts: Partial<CircularMotionConstraint> = {}): CircularMotionConstraint {
    return {
        center: vec(0, 0),
        radius: 2,
        angularVelocity: 1,
        initialAngle: 0,
        ...opts
    };
}

function makeProblem(cm: CircularMotionConstraint, mass = 1, duration = 6.28) {
    return {
        id: 'test-uniform-circular-motion',
        model: 'uniform-circular-motion' as const,
        bodies: [makeBody(mass)],
        constraints: { circularMotion: cm },
        environment: {},
        timeConfig: { duration, sampleCount: 2000 }
    };
}

describe('UniformCircularMotionModel: 圆周运动基本量', () => {
    const model = new UniformCircularMotionModel();

    it('元数据完整', () => {
        expect(model.modelType).toBe('uniform-circular-motion');
        expect(model.name).toContain('圆周');
        expect(model.requiredParameters.length).toBeGreaterThanOrEqual(3);
    });

    it('轨迹保持半径恒定 (|r|=R)', () => {
        const R = 2;
        const r = model.solve(makeProblem(cmConstraint({ radius: R, angularVelocity: 1 })));
        const traj = r.trajectories[0]!;
        for (const p of [traj[200]!, traj[700]!, traj[1500]!]) {
            const dist = Math.hypot(p.position.x, p.position.y);
            expect(dist).toBeCloseTo(R, 6);
        }
    });

    it('速率 v = ωR 恒定', () => {
        const r = model.solve(makeProblem(cmConstraint({ radius: 2, angularVelocity: 3 })));
        const traj = r.trajectories[0]!;
        for (const p of [traj[100]!, traj[1000]!]) {
            expect(Math.hypot(p.velocity.x, p.velocity.y)).toBeCloseTo(6, 6);
        }
    });

    it('周期 T = 2π/ω', () => {
        const r = model.solve(makeProblem(cmConstraint({ radius: 1, angularVelocity: 2 })));
        const period = r.diagnostics.maxValues.period as number;
        expect(period).toBeCloseTo(Math.PI, 5);
    });

    it('向心力 F = mω²r', () => {
        const m = 3, omega = 2, R = 1.5;
        const r = model.solve(makeProblem(cmConstraint({ radius: R, angularVelocity: omega }), m));
        const F = r.diagnostics.maxValues.centripetalForce as number;
        expect(F).toBeCloseTo(m * omega * omega * R, 5);
    });

    it('动能守恒', () => {
        const r = model.solve(makeProblem(cmConstraint({ radius: 2, angularVelocity: 2 }), 2));
        const ke = r.diagnostics.conservedQuantities.find(q => q.name.includes('动能'));
        expect(ke?.conserved).toBe(true);
        expect(ke?.maxDeviation ?? 999).toBeLessThan(1e-9);
    });

    it('初相位:初始角 90° 时起点在 (0, R)', () => {
        const R = 2;
        const r = model.solve(
            makeProblem(cmConstraint({ radius: R, angularVelocity: 1, initialAngle: Math.PI / 2 }))
        );
        const p0 = r.trajectories[0]![0]!;
        expect(p0.position.x).toBeCloseTo(0, 6);
        expect(p0.position.y).toBeCloseTo(R, 6);
    });
});

describe('UniformCircularMotionModel: 圆锥摆模式', () => {
    const model = new UniformCircularMotionModel();

    it('ω = √(g / (L·cosθ))', () => {
        // L=1, θ=30°, g=9.8 → ω = √(9.8/(1·cos30°)) ≈ 3.364
        const r = model.solve(
            makeProblem(
                cmConstraint({
                    radius: 0,
                    angularVelocity: 99,
                    conicalAngleDeg: 30,
                    ropeLength: 1
                }),
                1,
                3
            )
        );
        const omega = (2 * Math.PI) / (r.diagnostics.maxValues.period as number);
        const expectOmega = Math.sqrt(9.8 / (1 * Math.cos((30 * Math.PI) / 180)));
        expect(omega).toBeCloseTo(expectOmega, 4);
    });

    it('圆锥摆投影半径 r = L·sinθ', () => {
        // L=2, θ=45° → r = 2·sin45° = √2
        const r = model.solve(
            makeProblem(
                cmConstraint({
                    radius: 0,
                    angularVelocity: 99,
                    conicalAngleDeg: 45,
                    ropeLength: 2
                }),
                1,
                2
            )
        );
        const traj = r.trajectories[0]!;
        const p = traj[100]!;
        const dist = Math.hypot(p.position.x, p.position.y);
        expect(dist).toBeCloseTo(2 * Math.sin(Math.PI / 4), 5);
    });

    it('forceDiagram 向心力指向圆心', () => {
        const r = model.solve(makeProblem(cmConstraint({ radius: 2, angularVelocity: 2 })));
        const fd = r.charts.force_diagram;
        expect(fd).toBeDefined();
        const force = fd!.forces.find(f => f.name.includes('向心力'));
        expect(force).toBeDefined();
        // 起始点 (2,0), 圆心 (0,0): 向心力方向 (-1, 0)
        expect(force!.vector.x).toBeLessThan(0);
        expect(Math.abs(force!.vector.y)).toBeLessThan(1e-9);
    });
});
