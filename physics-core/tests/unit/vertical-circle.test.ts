import { describe, it, expect } from 'vitest';
import { VerticalCircleModel, type VerticalCircleType } from '../../src/models/vertical-circle.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new VerticalCircleModel();

function makeProblem(
    opts: {
        length?: number;
        mass?: number;
        modelType?: VerticalCircleType;
        initialSpeed?: number;
        gravity?: number;
        duration?: number;
        sampleCount?: number;
    } = {}
): PhysicsProblem {
    const {
        length = 1,
        mass = 1,
        modelType = 'rope',
        initialSpeed = 7,
        gravity = 9.8,
        duration = 5,
        sampleCount = 500
    } = opts;
    return {
        id: 'vertical-circle-test',
        model: 'vertical-circle',
        bodies: [
            {
                id: 'ball',
                mass: { value: mass, unit: 'kg' },
                position: { x: 0, y: 0 },
                velocity: { x: initialSpeed, y: 0 }
            }
        ],
        constraints: { verticalCircle: { length, mass, modelType, initialSpeed, gravity } },
        timeConfig: { duration, sampleCount }
    };
}

describe('VerticalCircleModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('vertical-circle');
        expect(model.name).toBe('竖直圆周最高点条件');
    });

    it('vMin: rope v_min = √(gr), rod v_min = 0, ring v_min = √(gr)', () => {
        expect(VerticalCircleModel.vMin('rope', 1, 9.8)).toBeCloseTo(Math.sqrt(9.8), 6);
        expect(VerticalCircleModel.vMin('rod', 1, 9.8)).toBe(0);
        expect(VerticalCircleModel.vMin('ring', 1, 9.8)).toBeCloseTo(Math.sqrt(9.8), 6);
    });

    it('rope 通过最高点: v₀² ≥ 5gr 时能通过', () => {
        const r = model.solve(makeProblem({ modelType: 'rope', length: 1, initialSpeed: 7.5 }));
        // v₀² = 56.25, 5gr = 49 → 能通过
        expect(r.diagnostics.flags!.passesTop).toBe(true);
        expect(r.diagnostics.maxValues.vTop).toBeGreaterThan(0);
    });

    it('rope 不能过最高点: v₀² < 5gr 时不通过', () => {
        const r = model.solve(makeProblem({ modelType: 'rope', length: 1, initialSpeed: 6 }));
        // v₀² = 36, 5gr = 49 → 不能
        expect(r.diagnostics.flags!.passesTop).toBe(false);
    });

    it('rod 底端需 v₀ ≥ √(4gr) 才能通过最高点, 低速只在圆弧内摆动', () => {
        const slow = model.solve(makeProblem({ modelType: 'rod', length: 1, initialSpeed: 0.5 }));
        expect(slow.diagnostics.flags!.passesTop).toBe(false);
        expect(slow.diagnostics.flags!.canComplete).toBe(false);

        const fast = model.solve(makeProblem({ modelType: 'rod', length: 1, initialSpeed: Math.sqrt(4 * 9.8) + 0.1 }));
        expect(fast.diagnostics.flags!.passesTop).toBe(true);
        expect(fast.diagnostics.flags!.canComplete).toBe(true);
    });

    it('最高点速度 v_top = √(v₀² − 4gr)', () => {
        const r = model.solve(makeProblem({ modelType: 'rope', length: 1, initialSpeed: 7 }));
        // v_top² = 49 - 39.2 = 9.8
        expect(r.diagnostics.maxValues.vTopSq).toBeCloseTo(9.8, 6);
        expect(r.diagnostics.maxValues.vTop).toBeCloseTo(Math.sqrt(9.8), 6);
    });

    it('最高点张力 T = m(v²/r + g·cosθ), 临界 v₀²=5gr 时 T_top≈0', () => {
        // v₀² = 5gr = 49 → 通过临界; v_top² = gr = 9.8
        const res = model.solve(makeProblem({ modelType: 'rope', length: 1, initialSpeed: Math.sqrt(5 * 9.8) }));
        const pts = res.charts.tension_angle!.points;
        // 图表采样 θ ∈ [0, 2π], 最高点 (θ=π) 在中间
        const topIdx = Math.floor(pts.length / 2);
        const topPt = pts[topIdx]!;
        // T_top = m(v_top²/r + g·cosπ) = 1·(gr/r + g·(−1)) = g·r/r − g = 0
        expect(Math.abs(topPt.y)).toBeLessThan(0.1);
    });

    it('tension_angle 图最高点附近 T > 0 (通过)', () => {
        const r = model.solve(makeProblem({ modelType: 'rope', initialSpeed: 8 }));
        const pts = r.charts.tension_angle!.points;
        const topPt = pts.find(p => Math.abs(p.x - Math.PI) < 0.05);
        expect(topPt!.y).toBeGreaterThan(0);
    });

    it('rod 最高点附近 N 可能为 0 或负 (支持力)', () => {
        const r = model.solve(makeProblem({ modelType: 'rod', length: 1, initialSpeed: Math.sqrt(4 * 9.8) }));
        // v_top = 0, N_top = m·(0 - g) = -mg (向上支持)
        const pts = r.charts.tension_angle!.points;
        const topPt = pts.find(p => Math.abs(p.x - Math.PI) < 0.05);
        expect(topPt).toBeDefined();
        // 负值 = 支持力
        expect(topPt!.y).toBeLessThan(0);
    });

    it('轨迹点数 = sampleCount + 1', () => {
        const r = model.solve(makeProblem({ sampleCount: 400 }));
        expect(r.trajectories[0]!.length).toBe(401);
    });

    it('机械能近似守恒', () => {
        const r = model.solve(makeProblem({ modelType: 'rod' }));
        const cq = r.diagnostics.conservedQuantities.find(c => c.name.includes('机械能'));
        expect(cq).toBeDefined();
        expect(cq!.conserved).toBe(true);
    });

    it('静态示意图为半径等于 length 的圆', () => {
        const r = model.solve(makeProblem({ length: 2 }));
        const pts = r.charts['static-diagram']!.points;
        // 所有点到原点 (0, r=2) 的距离 ≈ 2
        expect(pts.length).toBe(128);
        for (const p of pts) {
            const dist = Math.hypot(p.x, p.y - 2);
            expect(Math.abs(dist - 2)).toBeLessThan(1e-6);
        }
    });

    it('vc_speed_angle 图: v 在最低点 (θ=0) 最大, 最高点 (θ=π) 最小', () => {
        const r = model.solve(makeProblem({ initialSpeed: 8 }));
        const pts = r.charts.vc_speed_angle!.points;
        const lowPt = pts.find(p => Math.abs(p.x) < 0.05)!;
        const topPt = pts.find(p => Math.abs(p.x - Math.PI) < 0.05)!;
        expect(lowPt.y).toBeGreaterThan(topPt.y);
    });

    it('vmin_markers 图: √r 关系 (非杆)', () => {
        const r = model.solve(makeProblem({ modelType: 'rope', length: 1 }));
        const pts = r.charts.vmin_markers!.points;
        // 对每一点 (r, √(gr))
        for (const p of pts) {
            expect(Math.abs(p.y - Math.sqrt(9.8 * p.x))).toBeLessThan(1e-6);
        }
    });

    it('受力分析图: 包含重力与张力/杆力', () => {
        const r = model.solve(makeProblem());
        const fd = r.charts.force_diagram!;
        expect(fd.forces.length).toBe(2);
        const hasGravity = fd.forces.some(f => f.name.includes('重力'));
        expect(hasGravity).toBe(true);
    });

    it('explanation 摘要包含 v₀ 与 v_min', () => {
        const r = model.solve(makeProblem({ modelType: 'rope', length: 1 }));
        expect(r.explanation.summary).toContain('v₀=');
        expect(r.explanation.summary).toContain('v_min=');
    });

    it('rope 最高点张力最小点出现在 θ=π', () => {
        const r = model.solve(makeProblem({ modelType: 'rope', initialSpeed: 8 }));
        const pts = r.charts.tension_angle!.points;
        // 在下半圆采样 T, 最小应该出现在接近 π
        const minPt = pts.reduce((min, p) => (p.y < min.y ? p : min), pts[0]!);
        expect(Math.abs(minPt.x - Math.PI)).toBeLessThan(0.3);
    });

    it('无效参数抛出错误', () => {
        expect(() => model.solve(makeProblem({ initialSpeed: -1 }))).toThrow();
        expect(() => model.solve(makeProblem({ length: 0 }))).toThrow();
        expect(() => model.solve(makeProblem({ mass: -1 }))).toThrow();
    });

    it('v₀ = 0 静止边界: 全程位置保持最低点且无 NaN', () => {
        const r = model.solve(makeProblem({ modelType: 'rod', initialSpeed: 0, duration: 2, sampleCount: 200 }));
        const traj = r.trajectories[0]!;
        expect(r.diagnostics.flags!.passesTop).toBe(false);
        expect(r.diagnostics.maxValues.period).toBe(0);
        for (const p of traj) {
            expect(Number.isFinite(p.position.x)).toBe(true);
            expect(Number.isFinite(p.position.y)).toBe(true);
            expect(p.position.x).toBeCloseTo(0, 6);
            expect(p.position.y).toBeCloseTo(0, 6);
            expect(Math.hypot(p.velocity.x, p.velocity.y)).toBeCloseTo(0, 6);
        }
        expect(r.charts.tension_angle!.points[0]!.y).toBeCloseTo(9.8, 5);
    });

    it('RK4 约束积分位置导数 dx/dt ≈ vx (v = r|ω|, 修正旧版匀速转角自相矛盾)', () => {
        const res = model.solve(
            makeProblem({ modelType: 'rope', length: 1, initialSpeed: 8, duration: 1, sampleCount: 500 })
        );
        const traj = res.trajectories[0]!;
        const dt = 1 / 500;
        for (let i = 1; i < traj.length - 1; i += 25) {
            const dxDt = (traj[i + 1]!.position.x - traj[i - 1]!.position.x) / (2 * dt);
            const dyDt = (traj[i + 1]!.position.y - traj[i - 1]!.position.y) / (2 * dt);
            expect(dxDt).toBeCloseTo(traj[i]!.velocity.x, 2);
            expect(dyDt).toBeCloseTo(traj[i]!.velocity.y, 2);
        }
    });

    it('rope 当 2gr < v₀² < 5gr 时在 cosθ_det=(2gr−v₀²)/(3gr) 脱离并转斜抛', () => {
        const g = 9.8;
        const length = 1;
        const v0 = Math.sqrt(3 * g * length); // cosθ_det = (2-3)/3 = -1/3
        const res = model.solve(
            makeProblem({ modelType: 'rope', length, initialSpeed: v0, duration: 3, sampleCount: 600 })
        );
        expect(res.diagnostics.flags!.passesTop).toBe(false);
        const detKf = res.keyframes.find(k => k.label === '脱离圆周');
        expect(detKf).toBeDefined();
        // 脱离点相对于圆心 (0, length) 的 cosθ = (r - y)/r 应 ≈ -1/3
        const cosDetActual = (length - detKf!.position.y) / length;
        expect(cosDetActual).toBeCloseTo(-1 / 3, 2);

        // 脱离后抛体点距圆心 < r 且加速度为 (0, -g)
        const traj = res.trajectories[0]!;
        const afterDet = traj.filter(p => p.t > detKf!.t + 0.02);
        const freeFallPt = afterDet[0]!;
        expect(Math.hypot(freeFallPt.position.x, freeFallPt.position.y - length)).toBeLessThan(length);
        expect(freeFallPt.acceleration!.x).toBeCloseTo(0, 6);
        expect(freeFallPt.acceleration!.y).toBeCloseTo(-g, 6);

        // 碰撞前机械能严格守恒
        expect(res.diagnostics.conservedQuantities[0]!.conserved).toBe(true);
    });

    it('ring 与 rope 同为单向约束: 4gr < v₀² < 5gr 时不能过最高点且会脱离', () => {
        const res = model.solve(makeProblem({ modelType: 'ring', length: 1, initialSpeed: Math.sqrt(4.5 * 9.8) }));
        expect(res.diagnostics.flags!.passesTop).toBe(false);
        expect(res.keyframes.some(k => k.label === '脱离圆周')).toBe(true);
    });

    it('rod 当 v₀² < 2gr 在圆弧内往复摆动, force_diagram 最高点矢量方向自洽', () => {
        const swing = model.solve(
            makeProblem({ modelType: 'rod', length: 1, initialSpeed: Math.sqrt(1.5 * 9.8), duration: 3 })
        );
        expect(swing.diagnostics.flags!.passesTop).toBe(false);
        expect(swing.keyframes.some(k => k.label === '最高摆角折返')).toBe(true);
        expect(swing.diagnostics.conservedQuantities[0]!.conserved).toBe(true);

        const critRod = model.solve(
            makeProblem({ modelType: 'rod', length: 1, mass: 1, initialSpeed: Math.sqrt(4 * 9.8) })
        );
        const fd = critRod.charts.force_diagram!;
        const nForce = fd.forces.find(f => f.name.includes('杆力'))!;
        // v_top=0 时杆提供向上支持力 +mg (+y), 与重力 -mg 平衡
        expect(nForce.vector.y).toBeCloseTo(9.8, 3);
        expect(fd.netForce.y).toBeCloseTo(0, 3);
    });
});
