/**
 * L8: Boris 数值积分正确性 + 收敛性自检 (电磁复合场 em-combined)
 *
 * 电磁复合场模型用 Boris 算法 (辛二阶) 数值积分 Lorentz 力 F = qE + qv×B。
 * 本层验证数值积分的物理正确性, 不是"不报错"级别:
 *   1. 纯电场 (B=0): Boris 精确退化为解析解 (匀速加速 + 梯形积分对常加速度精确)
 *   2. 纯磁场 (E=0): Boris 旋转精保持速率 → |v(t)| 全程恒定; 磁场力不做功 → 能量守恒
 *   3. 纯磁场圆周几何: 半径 R = m|v|/(|q||B|), 周期 T = 2πm/(|q||B|), 轨迹为圆
 *   4. 收敛阶: Boris 为二阶法, sampleCount 翻倍 → 终点误差缩 ~4 倍 (O(dt²))
 *   5. 极端参数 (极小 dt / 极大 E,B): 不产生 NaN/Infinity, 不抛异常
 */

import { describe, it, expect } from 'vitest';
import { EMCombinedFieldModel } from '../../src/models/em-combined-field.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

function makeProblem(opts: {
    q: number;
    m: number;
    x0?: { x: number; y: number };
    v0?: { x: number; y: number };
    E?: { x: number; y: number };
    Bz?: number;
    duration?: number;
    sampleCount?: number;
}): PhysicsProblem {
    const {
        q,
        m,
        x0 = { x: 0, y: 0 },
        v0 = { x: 8, y: 6 },
        E = { x: 0, y: 0 },
        Bz = 0,
        duration = 1,
        sampleCount = 1000,
    } = opts;
    return {
        id: 'em',
        model: 'em-combined-field',
        bodies: [
            {
                id: 'p',
                mass: { value: m, unit: 'kg' },
                charge: { value: q, unit: 'C' },
                position: x0,
                velocity: v0,
            },
        ],
        environment: {
            electricField: { enabled: true, fieldVector: E },
            magneticField: { enabled: true, fieldStrength: Bz },
        },
        timeConfig: { duration, sampleCount },
    };
}

function allFinite(result: { trajectories: Array<Array<{ t: number; position: { x: number; y: number }; velocity: { x: number; y: number } }>> }): boolean {
    for (const traj of result.trajectories) {
        for (const p of traj) {
            if (![p.t, p.position.x, p.position.y, p.velocity.x, p.velocity.y].every(Number.isFinite)) {
                return false;
            }
        }
    }
    return true;
}

const model = new EMCombinedFieldModel();

describe('L8: 纯电场 (B=0) — Boris 精确退化为解析解', () => {
    it('y 位移 = v0y·t + ½·(qEy/m)·t² (解析解, 高精度)', () => {
        const q = 1, m = 1, Ey = 5;
        const v0 = { x: 3, y: 2 };
        const duration = 0.5;
        const r = model.solve(makeProblem({ q, m, v0, E: { x: 0, y: Ey }, Bz: 0, duration, sampleCount: 2000 }));
        const a = (q * Ey) / m;
        const last = r.trajectories[0]![r.trajectories[0]!.length - 1]!;
        const yAna = v0.y * duration + 0.5 * a * duration * duration;
        const vyAna = v0.y + a * duration;
        expect(last.position.y).toBeCloseTo(yAna, 6);
        expect(last.velocity.y).toBeCloseTo(vyAna, 6);
        // x 方向无电场 → 匀速
        expect(last.position.x).toBeCloseTo(v0.x * duration, 6);
        expect(last.velocity.x).toBeCloseTo(v0.x, 6);
    });

    it('负电荷 + 反向电场 → 加速度反向, 解析一致', () => {
        const q = -1, m = 2, Ey = 10;
        const v0 = { x: 0, y: 4 };
        const duration = 0.25;
        const r = model.solve(makeProblem({ q, m, v0, E: { x: 0, y: Ey }, Bz: 0, duration, sampleCount: 2000 }));
        const a = (q * Ey) / m; // 应为负
        const last = r.trajectories[0]![r.trajectories[0]!.length - 1]!;
        expect(a).toBeLessThan(0);
        expect(last.velocity.y).toBeCloseTo(v0.y + a * duration, 6);
    });
});

describe('L8: 纯磁场 (E=0) — 速率守恒 + 能量守恒', () => {
    it('Boris 旋转精保持速率: |v(t)| 全程恒定 (<1e-9)', () => {
        const q = 1, m = 1, Bz = 1; // ω = qB/m = 1 rad/s
        const v0 = { x: 8, y: 6 }; // |v0| = 10
        const r = model.solve(makeProblem({ q, m, v0, E: { x: 0, y: 0 }, Bz, duration: 1.5, sampleCount: 3000 }));
        const speeds = r.trajectories[0]!.map(p => Math.hypot(p.velocity.x, p.velocity.y));
        const maxSp = Math.max(...speeds);
        const minSp = Math.min(...speeds);
        expect(maxSp - minSp).toBeLessThan(1e-9);
        expect(maxSp).toBeCloseTo(10, 6);
    });

    it('磁场力不做功 → 总能量守恒标志为 true', () => {
        const q = 1, m = 1, Bz = 1;
        const v0 = { x: 8, y: 6 };
        const r = model.solve(makeProblem({ q, m, v0, E: { x: 0, y: 0 }, Bz, duration: 1.5, sampleCount: 3000 }));
        const cq = r.diagnostics.conservedQuantities[0]!;
        expect(cq.name).toContain('能量');
        expect(cq.conserved).toBe(true);
        expect(cq.maxDeviation).toBeLessThan(1e-2);
    });
});

describe('L8: 纯磁场圆周几何 — 半径/周期', () => {
    it('轨迹为圆: 到回旋中心距离恒等于 R = m|v|/(|q||B|)', () => {
        const q = 1, m = 1, Bz = 1; // ω = 1, R = |v0|/|ω| = 10
        const v0 = { x: 8, y: 6 };
        const omega = (q * Bz) / m;
        const R = Math.hypot(v0.x, v0.y) / Math.abs(omega); // 10
        // 纯磁场无电场时, 粒子做匀速圆周运动, 回旋中心 (guiding center):
        //   r_c = (x0 + vy0/ω, y0 - vx0/ω)   (由 v = ω ẑ × (r - r_c) 推导)
        // 本用例 x0 = y0 = 0 → r_c = (6, -8)
        const xc = v0.y / omega;
        const yc = -v0.x / omega;
        const r = model.solve(makeProblem({ q, m, v0, E: { x: 0, y: 0 }, Bz, duration: 1.5, sampleCount: 8000 }));
        const traj = r.trajectories[0]!;
        let maxDev = 0;
        for (const p of traj) {
            const dist = Math.hypot(p.position.x - xc, p.position.y - yc);
            maxDev = Math.max(maxDev, Math.abs(dist - R));
        }
        expect(maxDev).toBeLessThan(1e-2); // 圆周半径稳定 (Boris 位置半步更新引入 O(dt) 误差)
    });

    it('角速度 = qB/m: 终态速度方向旋转 -ω·t (v×B 约定 → +Bz 顺时针)', () => {
        const q = 1, m = 1, Bz = 1;
        const v0 = { x: 8, y: 6 };
        const omega = (q * Bz) / m;
        const duration = 1.5;
        const r = model.solve(makeProblem({ q, m, v0, E: { x: 0, y: 0 }, Bz, duration, sampleCount: 8000 }));
        const vf = r.trajectories[0]!.at(-1)!.velocity;
        // 解析旋转: v(t) = R(-ωt)·v0  (Lorentz v×B, +Bz 顺时针)
        const ang = -omega * duration;
        const c = Math.cos(ang), s = Math.sin(ang);
        const vxAna = v0.x * c - v0.y * s;
        const vyAna = v0.x * s + v0.y * c;
        expect(vf.x).toBeCloseTo(vxAna, 3);
        expect(vf.y).toBeCloseTo(vyAna, 3);
    });
});

describe('L8: Boris 收敛阶 — O(dt²)', () => {
    it('sampleCount 翻倍 → 终点误差缩 ~4 倍 (二阶法)', () => {
        const q = 1, m = 1, Bz = 1;
        const E = { x: 0, y: 2 }; // 电场 + 磁场, 一般 Boris 路径
        const v0 = { x: 8, y: 6 };
        const duration = 1.0;
        const finalPos = (n: number) =>
            model.solve(makeProblem({ q, m, v0, E, Bz, duration, sampleCount: n })).trajectories[0]!.at(-1)!.position;
        const ref = finalPos(3200);
        const e = (n: number) => {
            const p = finalPos(n);
            return Math.hypot(p.x - ref.x, p.y - ref.y);
        };
        const e1 = e(200);
        const e2 = e(400);
        const e3 = e(800);
        // 二阶收敛: e(200)/e(400) ≈ e(400)/e(800) ≈ 4
        expect(e1 / e2).toBeGreaterThan(2.5);
        expect(e2 / e3).toBeGreaterThan(2.5);
        expect(e1 / e2).toBeLessThan(6);
        expect(e2 / e3).toBeLessThan(6);
    });
});

describe('L8: 极端参数 — 不产生 NaN/Inf, 不抛异常', () => {
    it('极小 dt + 强场 → 全部有限', () => {
        const r = model.solve(
            makeProblem({ q: 1, m: 1, v0: { x: 1e3, y: 1e3 }, E: { x: 1e4, y: -1e4 }, Bz: 1e3, duration: 0.01, sampleCount: 5000 }),
        );
        expect(allFinite(r)).toBe(true);
        for (const series of Object.values(r.charts)) {
            if (!series) continue;
            for (const pt of series.points) {
                expect(Number.isFinite(pt.x) && Number.isFinite(pt.y)).toBe(true);
            }
        }
    });

    it('零电场零磁场 (退化直匀运动) → 有限且速度恒定', () => {
        const r = model.solve(makeProblem({ q: 1, m: 1, v0: { x: 5, y: -3 }, E: { x: 0, y: 0 }, Bz: 0, duration: 2, sampleCount: 500 }));
        expect(allFinite(r)).toBe(true);
        const last = r.trajectories[0]!.at(-1)!;
        expect(last.velocity.x).toBeCloseTo(5, 6);
        expect(last.velocity.y).toBeCloseTo(-3, 6);
    });
});
