/**
 * 力学模型物理正确性契约 (#12)
 *
 * 覆盖三处已修复的缺陷:
 *   1. inclined-plane: μ=0、θ=0 且有下滑初速时被误判为"静止" —— 摩擦不能刹停
 *      一个已经在运动的物体, 无摩擦水平面应匀速直线滑行 (此前直接讲错)
 *   2. projectile: 判别式 disc < 0 (抛物线与地面无交点) 时静默回退 tLand=duration,
 *      算出伪射程; 现显式标记 neverLands + 告警
 *   3. galileo-incline: MIN_SIN_THETA 钳位把"平面需无穷长时间"掩盖成有限值;
 *      现对发散区显式告警
 *
 * 除零/NaN 拦截 (L=0、g=0、r=0) 已由 base-validate.test.ts 覆盖 (#8)。
 */

import { describe, it, expect } from 'vitest';
import { InclinedPlaneModel } from '../../src/models/inclined-plane.js';
import { ProjectileModel } from '../../src/models/projectile.js';
import { GalileoInclineModel } from '../../src/models/galileo-incline.js';
import { Vec2 } from '../../src/math/vector2d.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

function makeProblem(
    model: PhysicsProblem['model'],
    constraints: Record<string, unknown>,
    position = { x: 0, y: 5 },
    velocity = { x: 0, y: 0 }
): PhysicsProblem {
    return {
        id: 'mechanics-test',
        model,
        bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position, velocity }],
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        environment: { gravity: { enabled: true, value: 9.8 } },
        timeConfig: { duration: 5, sampleCount: 200 }
    };
}

describe('#12 斜面: 静摩擦只能保持静止, 不能刹停运动物体', () => {
    const model = new InclinedPlaneModel();
    const build = (angle: number, mu: number, vx: number) =>
        model.solve(
            makeProblem(
                'inclined-plane',
                { inclinedPlane: { angle, frictionCoefficient: mu } },
                { x: 0, y: 5 },
                { x: vx, y: 0 }
            )
        );

    it('正例: θ=0、μ=0、v∥=0 → 静止 (无重力分量, 无摩擦)', () => {
        const r = build(0, 0, 0);
        expect(r.keyframes.map(k => k.label)).toContain('物体静止');
    });

    it('正例: tanθ ≤ μ 且 v∥=0 → 静摩擦保持静止', () => {
        const r = build(10, 0.5, 0); // tan10° = 0.176 < 0.5
        expect(r.keyframes.map(k => k.label)).toContain('物体静止');
        expect(r.trajectories[0]![200]!.velocity.x).toBeCloseTo(0, 9);
    });

    it('θ=0、μ=0、v∥=3 → 无摩擦水平面匀速滑行 (修复前误判为静止)', () => {
        const r = build(0, 0, 3);
        const traj = r.trajectories[0]!;
        // 全程速率恒为 3 m/s
        for (const p of traj) expect(Math.hypot(p.velocity.x, p.velocity.y)).toBeCloseTo(3, 6);
        expect(r.keyframes.map(k => k.label)).toContain('匀速滑行');
        expect(r.keyframes.map(k => k.label)).not.toContain('物体静止');
        expect(r.explanation.summary).toContain('匀速');
    });

    it('θ=0、μ=0.5、v∥=3 → 动摩擦减速至停下, 不倒退', () => {
        const r = build(0, 0.5, 3);
        const traj = r.trajectories[0]!;
        // 单调减速
        for (let i = 1; i < traj.length; i++) {
            expect(traj[i]!.velocity.x).toBeLessThanOrEqual(traj[i - 1]!.velocity.x + 1e-9);
        }
        // 停下后保持 0, 不出现负速度 (不上滑)
        for (let i = 60; i < traj.length; i++) {
            expect(traj[i]!.velocity.x).toBeCloseTo(0, 9);
        }
        expect(r.keyframes.map(k => k.label)).toContain('停下');
        expect(r.warnings.join()).toContain('动摩擦');
    });

    it('tanθ > μ 且 v∥=0 → 正常加速下滑 (回归保护)', () => {
        const r = build(30, 0.2, 0);
        const expectedA = 9.8 * (Math.sin((30 * Math.PI) / 180) - 0.2 * Math.cos((30 * Math.PI) / 180));
        expect(r.charts.a_t!.points[1].y).toBeCloseTo(expectedA, 4);
        expect(r.keyframes.map(k => k.label)).toContain('到达底端');
    });
});

describe('#12 抛体: 判别式 ≤ 0 时不得伪造射程', () => {
    const model = new ProjectileModel();

    it('正例: h₀=0、v₀y>0 → 正常落地并给出射程', () => {
        const r = model.solve(makeProblem('projectile', {}, { x: 0, y: 0 }, { x: 10, y: 20 }));
        const t = (2 * 20) / 9.8;
        expect(r.diagnostics.maxValues.flightTime).toBeCloseTo(t, 6);
        expect(r.diagnostics.rangeCheck.withinRange).toBe(true);
        expect(r.warnings).toHaveLength(0);
    });

    it('h₀ 很负 (判别式 < 0) → neverLands, 射程记 0 且告警', () => {
        // h₀=-50, v₀y=20 → disc = 400 + 2*9.8*(-50) = -580 < 0
        const r = model.solve(makeProblem('projectile', {}, { x: 0, y: -50 }, { x: 10, y: 20 }));
        expect(r.diagnostics.maxValues.range).toBe(0);
        expect(r.diagnostics.rangeCheck.withinRange).toBe(false);
        expect(r.warnings.length).toBeGreaterThan(0);
        expect(r.warnings.join()).toContain('不落地');
        // 关键帧必须明确标注未落地, 不得出现"落地点"
        expect(r.keyframes.map(k => k.label)).toContain('未落地(模拟终点)');
        expect(r.explanation.summary).toContain('未落地');
    });

    it('neverLands 关键帧的 y 保持真实抛物线值 (不被 Math.max(groundY,…) 夹到地面)', () => {
        const r = model.solve(makeProblem('projectile', {}, { x: 0, y: -50 }, { x: 10, y: 20 }));
        const last = r.keyframes.find(k => k.label.startsWith('未落地'))!;
        const expectedY = -50 + 20 * 5 - 0.5 * 9.8 * 25;
        expect(last.position.y).toBeCloseTo(expectedY, 4);
        expect(last.position.y).toBeLessThan(0);
    });
});

describe('#12 伽利略斜面: 发散区不得静默给出有限时间', () => {
    const model = new GalileoInclineModel();
    const build = (angleDeg: number) =>
        model.solve(
            makeProblem(
                'galileo-incline',
                { galileoIncline: { angleDeg, gravity: 9.8, inclineLength: 2, mode: 'single' } },
                { x: 0, y: 0 },
                { x: 0, y: 0 }
            )
        );

    it('正例: θ=30° 正常下滑, 无告警', () => {
        const r = build(30);
        expect(r.warnings).toHaveLength(0);
    });

    it('θ 极小 (tEnd 发散到 > 60s) → 显式告警说明该有限值是数值外推', () => {
        const r = build(0.005);
        expect(r.warnings.length).toBeGreaterThan(0);
        expect(r.warnings.join()).toContain('趋于无穷');
    });

    it('θ=0.0001° → 落入既有 θ≈0 分支告警', () => {
        const r = build(0.0001);
        expect(r.warnings.join()).toContain('无法计时');
    });

    it('中等倾角 (tEnd 合理) 不产生发散告警', () => {
        for (const th of [0.05, 1, 5, 30]) {
            expect(build(th).warnings, `θ=${th}° 不应告警`).toHaveLength(0);
        }
    });
});

describe('#12 轨迹不产生 NaN/Inf (常规参数)', () => {
    const incline = new InclinedPlaneModel();
    const proj = new ProjectileModel();

    it('斜面三种工况轨迹全部有限', () => {
        for (const [angle, mu, vx] of [
            [0, 0, 3],
            [0, 0.5, 3],
            [30, 0.2, 0]
        ] as const) {
            const r = incline.solve(
                makeProblem(
                    'inclined-plane',
                    { inclinedPlane: { angle, frictionCoefficient: mu } },
                    { x: 0, y: 5 },
                    { x: vx, y: 0 }
                )
            );
            for (const p of r.trajectories[0]!) {
                expect(Number.isFinite(p.position.x) && Number.isFinite(p.position.y)).toBe(true);
                expect(Number.isFinite(p.velocity.x) && Number.isFinite(p.velocity.y)).toBe(true);
            }
        }
    });

    it('抛体轨迹沿斜面位移与速度自洽', () => {
        const r = proj.solve(makeProblem('projectile', {}, { x: 0, y: 0 }, { x: 10, y: 20 }));
        const traj = r.trajectories[0]!;
        for (const p of traj) {
            expect(Number.isFinite(p.position.y)).toBe(true);
            // 竖直速度单调递减 (自由落体), t=0 处恰为 v₀y
            expect(p.velocity.y).toBeLessThanOrEqual(20);
        }
        // 确有下降 (t>0 时严格小于初速)
        expect(traj[1]!.velocity.y).toBeLessThan(20);
        // 水平速度守恒
        expect(traj[50]!.velocity.x).toBeCloseTo(10, 9);
    });
});
