/**
 * L1-diff: 解析模型差分测试 — 随机参数 vs 独立解析公式
 *
 * 思路与 L1 fixtures 不同:fixtures 用固定参数点;本层用固定种子 PRNG 生成随机参数,
 * 将模型轨迹与【测试内自写的独立解析公式】(不从模型内部函数借用任何计算) 逐点对比。
 *
 * 覆盖 9 个有闭式解析解的模型:
 *   - uniform-linear          x = x₀ + v·t
 *   - uniform-accelerated     x = x₀ + v₀t + ½at²  (a 由重力提取)
 *   - projectile              x = v₀x·t, y = y₀ + v₀y·t − ½gt²
 *   - uniform-electric-field  a = qE/m
 *   - uniform-magnetic-field  圆轨迹 (R=mv/|q|B, 圆心方向由 q·Bz 决定)
 *   - uniform-circular-motion x = c + R·(cos(φ₀+ωt), sin(φ₀+ωt))
 *   - spring-oscillator (无阻尼)  x(t) = A·cos(ωt+φ)
 *   - capacitor-charge (charts)   Uc = E(1−e^(−t/τ))
 *   - radioactive-decay (charts)  N = N₀·e^(−λt)
 *
 * 每模型随机 3~4 组参数, 每组取 4 个时间点断言位置/速度与公式一致。
 * 种子固定 → CI 完全可复现;若模型被误改(符号/系数漂移)本层必红。
 */

import { describe, it, expect } from 'vitest';

import { UniformLinearModel } from '../../src/models/uniform-linear.js';
import { UniformAcceleratedModel } from '../../src/models/uniform-accelerated.js';
import { ProjectileModel } from '../../src/models/projectile.js';
import { UniformElectricModel } from '../../src/models/uniform-electric-field.js';
import { UniformMagneticModel } from '../../src/models/uniform-magnetic-field.js';
import { UniformCircularMotionModel } from '../../src/models/uniform-circular-motion.js';
import { SpringOscillatorModel } from '../../src/models/spring-oscillator.js';
import { CapacitorChargeModel } from '../../src/models/capacitor-charge.js';
import { RadioactiveDecayModel } from '../../src/models/radioactive-decay.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

// ========== 确定性 PRNG (mulberry32) ==========

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function makeRng(label: string): () => number {
    let seed = 0;
    for (const ch of label) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    return mulberry32(seed ^ 0x9e3779b9);
}

/** 在 [lo, hi) 区间取随机数 (幂次用于跨数量级采样) */
function randRange(rng: () => number, lo: number, hi: number, power = 1): number {
    const u = rng();
    return lo + (hi - lo) * Math.pow(u, power);
}

/** 取轨迹上距目标 t 最近的点 (解析模型 dt 已知, 最近点误差 < dt) */
function pointAt<T extends { t: number }>(traj: T[], t: number): T {
    const idx = Math.round((t / traj[traj.length - 1]!.t) * (traj.length - 1));
    return traj[Math.max(0, Math.min(traj.length - 1, idx))]!;
}

// ========== 1. 匀速直线 ==========

describe('差分: uniform-linear x = x₀ + v·t (随机 4 组)', () => {
    const model = new UniformLinearModel();

    function makeProblem(vx: number, vy: number, x0: number, y0: number, duration: number): PhysicsProblem {
        return {
            id: 'diff-linear',
            model: 'uniform-linear',
            bodies: [
                { id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: x0, y: y0 }, velocity: { x: vx, y: vy } }
            ],
            timeConfig: { duration, sampleCount: 500 }
        };
    }

    for (let g = 0; g < 4; g++) {
        const rng = makeRng(`linear-${g}`);
        const vx = randRange(rng, -20, 20);
        const vy = randRange(rng, -20, 20);
        const x0 = randRange(rng, -10, 10);
        const y0 = randRange(rng, -10, 10);
        const duration = randRange(rng, 0.5, 5);

        it(`组 ${g}: v=(${vx.toFixed(2)},${vy.toFixed(2)}) x₀=(${x0.toFixed(2)},${y0.toFixed(2)})`, () => {
            const r = model.solve(makeProblem(vx, vy, x0, y0, duration));
            const traj = r.trajectories[0]!;
            for (const t of [0, duration * 0.3, duration * 0.7, duration]) {
                const p = pointAt(traj, t);
                expect(p.position.x).toBeCloseTo(x0 + vx * t, 6);
                expect(p.position.y).toBeCloseTo(y0 + vy * t, 6);
                expect(p.velocity.x).toBeCloseTo(vx, 6);
                expect(p.velocity.y).toBeCloseTo(vy, 6);
            }
        });
    }
});

// ========== 2. 匀变速 (重力) ==========

describe('差分: uniform-accelerated x = x₀ + v₀t + ½at² (随机 4 组)', () => {
    const model = new UniformAcceleratedModel();

    function makeProblem(vx: number, vy: number, x0: number, y0: number, g: number, duration: number): PhysicsProblem {
        return {
            id: 'diff-accel',
            model: 'uniform-accelerated',
            bodies: [
                { id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: x0, y: y0 }, velocity: { x: vx, y: vy } }
            ],
            environment: { gravity: { enabled: true, value: g } },
            timeConfig: { duration, sampleCount: 500 }
        };
    }

    for (let g2 = 0; g2 < 4; g2++) {
        const rng = makeRng(`accel-${g2}`);
        const vx = randRange(rng, -10, 10);
        const vy = randRange(rng, -10, 10);
        const x0 = randRange(rng, -5, 5);
        const y0 = randRange(rng, -5, 5);
        const g = randRange(rng, 1, 25);
        const duration = randRange(rng, 0.3, 3);

        it(`组 ${g2}: v₀=(${vx.toFixed(2)},${vy.toFixed(2)}) g=${g.toFixed(2)}`, () => {
            const r = model.solve(makeProblem(vx, vy, x0, y0, g, duration));
            const traj = r.trajectories[0]!;
            for (const t of [0, duration * 0.3, duration * 0.7, duration]) {
                const p = pointAt(traj, t);
                expect(p.position.x).toBeCloseTo(x0 + vx * t, 6);
                expect(p.position.y).toBeCloseTo(y0 + vy * t - 0.5 * g * t * t, 6);
                expect(p.velocity.y).toBeCloseTo(vy - g * t, 5);
            }
        });
    }
});

// ========== 3. 抛体运动 ==========

describe('差分: projectile (随机 4 组, 含跨临界参数)', () => {
    const model = new ProjectileModel();

    function makeProblem(vx: number, vy: number, y0: number, g: number, duration: number): PhysicsProblem {
        return {
            id: 'diff-proj',
            model: 'projectile',
            bodies: [
                { id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: y0 }, velocity: { x: vx, y: vy } }
            ],
            environment: { gravity: { enabled: true, value: g } },
            timeConfig: { duration, sampleCount: 800 }
        };
    }

    for (let g3 = 0; g3 < 4; g3++) {
        const rng = makeRng(`proj-${g3}`);
        const vx = randRange(rng, 2, 30);
        const vy = randRange(rng, -5, 25);
        const y0 = randRange(rng, 0, 5);
        const g = randRange(rng, 1, 20);
        const duration = randRange(rng, 0.5, 4);

        it(`组 ${g3}: v₀=(${vx.toFixed(2)},${vy.toFixed(2)}) g=${g.toFixed(2)}`, () => {
            const r = model.solve(makeProblem(vx, vy, y0, g, duration));
            const traj = r.trajectories[0]!;
            for (const t of [0, duration * 0.3, duration * 0.7, duration]) {
                const p = pointAt(traj, t);
                expect(p.position.x).toBeCloseTo(vx * t, 6);
                expect(p.position.y).toBeCloseTo(y0 + vy * t - 0.5 * g * t * t, 6);
                expect(p.velocity.x).toBeCloseTo(vx, 5);
                expect(p.velocity.y).toBeCloseTo(vy - g * t, 5);
            }
        });
    }
});

// ========== 4. 匀强电场 ==========

describe('差分: uniform-electric a=qE/m (随机 4 组, 含负电荷)', () => {
    const model = new UniformElectricModel();

    function makeProblem(q: number, Ex: number, Ey: number, vx: number, vy: number, duration: number): PhysicsProblem {
        return {
            id: 'diff-elec',
            model: 'uniform-electric-field',
            bodies: [
                {
                    id: 'p',
                    mass: { value: 1, unit: 'kg' },
                    charge: { value: q, unit: 'C' },
                    position: { x: 0, y: 0 },
                    velocity: { x: vx, y: vy }
                }
            ],
            environment: { electricField: { enabled: true, fieldVector: { x: Ex, y: Ey } } },
            timeConfig: { duration, sampleCount: 500 }
        };
    }

    for (let g4 = 0; g4 < 4; g4++) {
        const rng = makeRng(`elec-${g4}`);
        const q = g4 % 2 === 0 ? randRange(rng, 0.5, 5) : -randRange(rng, 0.5, 5);
        const Ex = randRange(rng, -20, 20);
        const Ey = randRange(rng, -20, 20);
        const vx = randRange(rng, -5, 5);
        const vy = randRange(rng, -5, 5);
        const duration = randRange(rng, 0.5, 3);
        const ax = (q * Ex) / 1;
        const ay = (q * Ey) / 1;

        it(`组 ${g4}: q=${q.toFixed(2)} E=(${Ex.toFixed(2)},${Ey.toFixed(2)})`, () => {
            const r = model.solve(makeProblem(q, Ex, Ey, vx, vy, duration));
            const traj = r.trajectories[0]!;
            for (const t of [0, duration * 0.3, duration * 0.7, duration]) {
                const p = pointAt(traj, t);
                expect(p.position.x).toBeCloseTo(vx * t + 0.5 * ax * t * t, 6);
                expect(p.position.y).toBeCloseTo(vy * t + 0.5 * ay * t * t, 6);
                expect(p.velocity.x).toBeCloseTo(vx + ax * t, 5);
                expect(p.velocity.y).toBeCloseTo(vy + ay * t, 5);
            }
        });
    }
});

// ========== 5. 匀强磁场 (刚修复的方向 bug 回归防护) ==========

describe('差分: uniform-magnetic 圆轨迹 (随机 4 组, 正/负电荷)', () => {
    const model = new UniformMagneticModel();

    function makeProblem(q: number, m: number, vx: number, vy: number, Bz: number, duration: number): PhysicsProblem {
        return {
            id: 'diff-mag',
            model: 'uniform-magnetic-field',
            bodies: [
                {
                    id: 'p',
                    mass: { value: m, unit: 'kg' },
                    charge: { value: q, unit: 'C' },
                    position: { x: 0, y: 0 },
                    velocity: { x: vx, y: vy }
                }
            ],
            environment: { magneticField: { enabled: true, fieldStrength: Bz, unit: 'T' } },
            timeConfig: { duration, sampleCount: 600 }
        };
    }

    for (let g5 = 0; g5 < 4; g5++) {
        const rng = makeRng(`mag-${g5}`);
        const q = g5 % 2 === 0 ? 1 : -1;
        const m = randRange(rng, 0.5, 3);
        const vx = randRange(rng, 0.5, 5);
        const vy = randRange(rng, -3, 3);
        const Bz = randRange(rng, 0.5, 3);
        const duration = randRange(rng, 0.5, 2);
        const vMag = Math.hypot(vx, vy);
        const R = (m * vMag) / (Math.abs(q) * Math.abs(Bz));
        // 独立解析解: 圆心在向心力方向 (F=qv×B ∝ (vy,−vx)·sign(qBz))
        const s = q * Bz > 0 ? 1 : -1;
        const perp = { x: (s * vy) / vMag, y: (-s * vx) / vMag };
        const center = { x: R * perp.x, y: R * perp.y };

        it(`组 ${g5}: q=${q} m=${m.toFixed(2)} v₀=(${vx.toFixed(2)},${vy.toFixed(2)}) Bz=${Bz.toFixed(2)}`, () => {
            const r = model.solve(makeProblem(q, m, vx, vy, Bz, duration));
            const traj = r.trajectories[0]!;
            // 每点必在圆周上: |p−center| = R
            for (const t of [0, duration * 0.3, duration * 0.7, duration]) {
                const p = pointAt(traj, t);
                const dist = Math.hypot(p.position.x - center.x, p.position.y - center.y);
                expect(dist).toBeCloseTo(R, 5);
                // 速率恒定
                expect(Math.hypot(p.velocity.x, p.velocity.y)).toBeCloseTo(vMag, 5);
            }
            // 起点处切向速度即初速度 (方向正确性)
            expect(traj[0]!.velocity.x).toBeCloseTo(vx, 6);
            expect(traj[0]!.velocity.y).toBeCloseTo(vy, 6);
        });
    }
});

// ========== 6. 匀速圆周运动 ==========

describe('差分: uniform-circular x = c + R·(cos(φ₀+ωt), sin(φ₀+ωt)) (随机 4 组)', () => {
    const model = new UniformCircularMotionModel();

    function makeProblem(cx: number, cy: number, R: number, w: number, phi0: number, duration: number): PhysicsProblem {
        return {
            id: 'diff-circ',
            model: 'uniform-circular-motion',
            bodies: [
                {
                    id: 'b',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: cx + R * Math.cos(phi0), y: cy + R * Math.sin(phi0) },
                    velocity: { x: -R * w * Math.sin(phi0), y: R * w * Math.cos(phi0) }
                }
            ],
            constraints: {
                circularMotion: { center: { x: cx, y: cy }, radius: R, angularVelocity: w, initialAngle: phi0 }
            },
            timeConfig: { duration, sampleCount: 500 }
        };
    }

    for (let g6 = 0; g6 < 4; g6++) {
        const rng = makeRng(`circ-${g6}`);
        const cx = randRange(rng, -5, 5);
        const cy = randRange(rng, -5, 5);
        const R = randRange(rng, 0.5, 5);
        const w = randRange(rng, 0.5, 5);
        const phi0 = randRange(rng, 0, 2 * Math.PI);
        const duration = randRange(rng, 0.5, 2);

        it(`组 ${g6}: R=${R.toFixed(2)} ω=${w.toFixed(2)} φ₀=${phi0.toFixed(2)}`, () => {
            const r = model.solve(makeProblem(cx, cy, R, w, phi0, duration));
            const traj = r.trajectories[0]!;
            for (const t of [0, duration * 0.3, duration * 0.7, duration]) {
                const p = pointAt(traj, t);
                expect(p.position.x).toBeCloseTo(cx + R * Math.cos(phi0 + w * t), 5);
                expect(p.position.y).toBeCloseTo(cy + R * Math.sin(phi0 + w * t), 5);
                expect(p.velocity.x).toBeCloseTo(-R * w * Math.sin(phi0 + w * t), 4);
                expect(p.velocity.y).toBeCloseTo(R * w * Math.cos(phi0 + w * t), 4);
            }
        });
    }
});

// ========== 7. 弹簧振子 (无阻尼) ==========

describe('差分: spring-oscillator x(t)=A·cos(ωt+φ) 无阻尼 (随机 4 组)', () => {
    const model = new SpringOscillatorModel();

    function makeProblem(k: number, m: number, x0: number, v0: number, duration: number): PhysicsProblem {
        // 弹簧沿 x 轴: anchor=(0,0), body 在 (L0+x0, 0), 速度 (v0, 0)
        const L0 = 1;
        return {
            id: 'diff-spring',
            model: 'spring-oscillator',
            bodies: [
                { id: 'b', mass: { value: m, unit: 'kg' }, position: { x: L0 + x0, y: 0 }, velocity: { x: v0, y: 0 } }
            ],
            constraints: { spring: { springConstant: k, naturalLength: L0, anchorPoint: { x: 0, y: 0 } } },
            environment: {},
            timeConfig: { duration, sampleCount: 800 }
        };
    }

    for (let g7 = 0; g7 < 4; g7++) {
        const rng = makeRng(`spring-${g7}`);
        const k = randRange(rng, 1, 50);
        const m = randRange(rng, 0.5, 5);
        // x0 限制在 (-L0, ∞): 保证 body 始终在 anchor 右侧 (axisDir=+1), 避免拉伸量符号翻转
        const x0 = randRange(rng, -0.8, 2);
        const v0 = randRange(rng, -3, 3);
        const duration = randRange(rng, 0.5, 3);
        const w = Math.sqrt(k / m);
        const A = Math.sqrt(x0 * x0 + (v0 / w) * (v0 / w));
        const phi = Math.atan2(-v0 / w, x0);

        it(`组 ${g7}: k=${k.toFixed(2)} m=${m.toFixed(2)} x₀=${x0.toFixed(2)} v₀=${v0.toFixed(2)}`, () => {
            const r = model.solve(makeProblem(k, m, x0, v0, duration));
            const traj = r.trajectories[0]!;
            for (const t of [0, duration * 0.3, duration * 0.7, duration]) {
                const p = pointAt(traj, t);
                const xAna = A * Math.cos(w * t + phi);
                const vAna = -A * w * Math.sin(w * t + phi);
                expect(p.position.x).toBeCloseTo(1 + xAna, 4);
                expect(p.velocity.x).toBeCloseTo(vAna, 4);
                expect(p.acceleration!.x).toBeCloseTo(-A * w * w * Math.cos(w * t + phi), 3);
            }
        });
    }
});

// ========== 8. 电容充电 (charts) ==========

describe('差分: capacitor-charge Uc = E(1−e^(−t/τ)) (随机 4 组)', () => {
    const model = new CapacitorChargeModel();

    function makeProblem(R: number, C: number, E: number, timeSpanTau: number): PhysicsProblem {
        return {
            id: 'diff-cap',
            model: 'capacitor-charge',
            bodies: [{ id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
            constraints: {
                capacitor: { resistance: R, capacitance: C, emf: E, mode: 'charge', sampleCount: 200, timeSpanTau }
            },
            environment: {},
            timeConfig: { duration: 1, sampleCount: 10 }
        };
    }

    for (let g8 = 0; g8 < 4; g8++) {
        const rng = makeRng(`cap-${g8}`);
        const R = Math.pow(10, randRange(rng, 1, 5));
        const C = Math.pow(10, randRange(rng, -7, -4));
        const E = randRange(rng, 3, 24);
        const timeSpanTau = randRange(rng, 2, 8);
        const tau = R * C;

        it(`组 ${g8}: R=${R.toExponential(1)} C=${C.toExponential(1)} E=${E.toFixed(1)}`, () => {
            const r = model.solve(makeProblem(R, C, E, timeSpanTau));
            const pts = r.charts.Uc_t!.points;
            expect(pts.length).toBeGreaterThan(10);
            for (const frac of [0.05, 0.3, 0.7, 0.95]) {
                const idx = Math.floor((pts.length - 1) * frac);
                const pt = pts[idx]!;
                // 图表 x 轴单位是秒; 模型 x/y 均取整到 1e-6 → 用相对容差
                const expected = E * (1 - Math.exp(-pt.x / tau));
                expect(Math.abs(pt.y - expected) / expected).toBeLessThan(0.01);
            }
        });
    }
});

// ========== 9. 放射性衰变 (charts) ==========

describe('差分: radioactive-decay N = N₀·e^(−λt) (随机 4 组, 含 α/β 类型)', () => {
    const model = new RadioactiveDecayModel();

    function makeProblem(N0: number, halfLife: number, duration: number): PhysicsProblem {
        return {
            id: 'diff-decay',
            model: 'radioactive-decay',
            bodies: [{ id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
            constraints: { radioactive: { initialAtoms: N0, halfLife, duration } },
            environment: {},
            timeConfig: { duration: 1, sampleCount: 10 }
        };
    }

    for (let g9 = 0; g9 < 4; g9++) {
        const rng = makeRng(`decay-${g9}`);
        const N0 = Math.floor(randRange(rng, 1e4, 1e8));
        const halfLife = Math.pow(10, randRange(rng, -2, 2));
        const duration = randRange(rng, 1, 6) * halfLife;
        const lambda = Math.LN2 / halfLife;

        it(`组 ${g9}: N₀=${N0} T½=${halfLife.toExponential(2)}`, () => {
            const r = model.solve(makeProblem(N0, halfLife, duration));
            const pts = r.charts.x_t!.points;
            expect(pts.length).toBeGreaterThan(10);
            // 模型将 t 取整到 0.001s, y 取整到 0.1 个原子 → 用相对容差 1% (物理公式本身精确)
            for (const frac of [0.1, 0.4, 0.7, 0.95]) {
                const idx = Math.floor((pts.length - 1) * frac);
                const pt = pts[idx]!;
                const expected = N0 * Math.exp(-lambda * pt.x);
                expect(Math.abs(pt.y - expected) / expected).toBeLessThan(0.01);
            }
            // 半衰期定义: t=T½ 时 N=N₀/2
            expect(r.diagnostics.maxValues.halfLife).toBeCloseTo(halfLife, 6);
        });
    }
});
