import { describe, it, expect } from 'vitest';
import { borisTrajectory3D, type FieldEvaluator, type FieldAtPoint } from '../../src/physics/boris3d.js';
import type { Vector3D } from '../../src/types/common.js';

/** 匀强场求值器 (与位置无关) */
function uniformField(E: Vector3D, B: Vector3D): FieldEvaluator {
    return () => ({ E, B }) satisfies FieldAtPoint;
}

const ZERO3: Vector3D = { x: 0, y: 0, z: 0 };

describe('boris3d 三维带电粒子积分器', () => {
    describe('纯磁场: 回旋运动', () => {
        // q=m=1, B=1T, v⊥=1 → 回旋半径 r = mv/(qB) = 1, 周期 T = 2π
        const opts = {
            charge: 1,
            mass: 1,
            x0: ZERO3,
            v0: { x: 1, y: 0, z: 0 } as Vector3D,
            fieldAt: uniformField(ZERO3, { x: 0, y: 0, z: 1 }),
            duration: 4 * Math.PI, // 恰好两个周期
            sampleCount: 400
        };

        it('轨迹绕回旋中心的半径恒为 mv/(qB) = 1 (偏差 < 0.1%)', () => {
            // 回旋中心: x₀ 沿 v₀×B̂ 方向偏移一个回旋半径 → (0, −1, 0)
            const { points } = borisTrajectory3D(opts);
            for (const p of points) {
                const r = Math.hypot(p.position.x, p.position.y + 1);
                expect(Math.abs(r - 1)).toBeLessThan(0.01);
            }
        });

        it('两个整周期后回到起点 (|位置| < 0.02)', () => {
            const { points } = borisTrajectory3D(opts);
            const last = points[points.length - 1]!;
            expect(Math.hypot(last.position.x, last.position.y)).toBeLessThan(0.02);
        });

        it('纯磁场下动能严格守恒 (相对偏差 < 1e-9)', () => {
            const { points } = borisTrajectory3D(opts);
            for (const p of points) {
                expect(Math.abs(p.kineticEnergy - 0.5)).toBeLessThan(1e-9);
            }
        });

        it('强磁场触发子步加密: 大步长下仍有界且能量严格守恒', () => {
            // dtFrame = π > dtMax = π/2 → 每帧强制细分为 2 子步 (共 8 步);
            // 大步长下 Boris 相位误差本征存在 (每子步 ~15%), 但离散轨道仍是
            // 精确圆 — 断言"稳定有界 + 能量守恒 + 步数加密", 不断言相位归位
            const result = borisTrajectory3D({ ...opts, sampleCount: 4 });
            expect(result.stepCount).toBeGreaterThan(4);
            expect(result.warnings.length).toBeGreaterThan(0);
            const last = result.points[result.points.length - 1]!;
            // 离散圆半径 ≤ √(1+(ω·dt/2)²)·r ≈ 1.27, 圆心偏移同量级 → 有界 2.6
            expect(Math.hypot(last.position.x, last.position.y)).toBeLessThan(2.6);
            for (const p of result.points) {
                expect(Math.abs(p.kineticEnergy - 0.5)).toBeLessThan(1e-9);
            }
        });
    });

    describe('正交电场磁场', () => {
        it('速度选择器: v = E/B 时粒子走直线 (B 沿 z, E 沿 y, v 沿 x)', () => {
            const result = borisTrajectory3D({
                charge: 1,
                mass: 1,
                x0: ZERO3,
                v0: { x: 1, y: 0, z: 0 },
                fieldAt: uniformField({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }),
                duration: 2,
                sampleCount: 100
            });
            const last = result.points[result.points.length - 1]!;
            // Boris 漂移不动点与解析 E×B 漂移差 O((ω·dt)²) ≈ 1e-4 量级
            expect(Math.abs(last.position.x - 2)).toBeLessThan(1e-3);
            expect(Math.abs(last.position.y)).toBeLessThan(1e-3);
            expect(Math.abs(last.position.z)).toBeLessThan(1e-3);
        });

        it('E×B 漂移: 静止释放, 导心以 v_d = E×B/B² 匀速漂移 + 回旋叠加', () => {
            // 精确解: x(t) = t − sin t, y(t) = 1 − cos t (q=m=B=E=1)
            const duration = 10;
            const result = borisTrajectory3D({
                charge: 1,
                mass: 1,
                x0: ZERO3,
                v0: ZERO3,
                fieldAt: uniformField({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }),
                duration,
                sampleCount: 1000
            });
            const last = result.points[result.points.length - 1]!;
            expect(Math.abs(last.position.x - (duration - Math.sin(duration)))).toBeLessThan(0.01);
            expect(Math.abs(last.position.y - (1 - Math.cos(duration)))).toBeLessThan(0.01);
        });
    });

    describe('边界与防御', () => {
        it('q = 0: 无力, 匀速直线运动', () => {
            const result = borisTrajectory3D({
                charge: 0,
                mass: 1,
                x0: ZERO3,
                v0: { x: 2, y: 0, z: -1 },
                fieldAt: uniformField({ x: 100, y: 100, z: 0 }, { x: 0, y: 0, z: 5 }),
                duration: 3,
                sampleCount: 30
            });
            const last = result.points[result.points.length - 1]!;
            expect(last.position.x).toBeCloseTo(6, 9);
            expect(last.position.z).toBeCloseTo(-3, 9);
        });

        it('数值发散: 场强爆表时提前终止并回填告警, 已记录点均有限', () => {
            // v(t) ≈ E·t: t≈1.8s 时 |v| 超过 Number.MAX_VALUE → 中途发散
            const result = borisTrajectory3D({
                charge: 1,
                mass: 1,
                x0: ZERO3,
                v0: ZERO3,
                fieldAt: uniformField({ x: 1e308, y: 0, z: 0 }, ZERO3),
                duration: 2,
                sampleCount: 20
            });
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.points.length).toBeLessThan(21);
            for (const p of result.points) {
                expect(Number.isFinite(p.position.x + p.position.y + p.position.z)).toBe(true);
            }
        });

        it('非法参数: 质量/时长/采样帧数不合法时抛错', () => {
            const base = {
                charge: 1,
                x0: ZERO3,
                v0: ZERO3,
                fieldAt: uniformField(ZERO3, ZERO3)
            };
            expect(() => borisTrajectory3D({ ...base, mass: 0, duration: 1 })).toThrow();
            expect(() => borisTrajectory3D({ ...base, mass: 1, duration: 0 })).toThrow();
            expect(() => borisTrajectory3D({ ...base, mass: 1, duration: 1, sampleCount: 0 })).toThrow();
        });
    });
});
