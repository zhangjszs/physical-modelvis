/**
 * 数值积分稳定性契约 (#6)
 *
 * 覆盖四处已修复的缺陷:
 *   1. forced-vibration / simple-pendulum 的 Velocity Verlet 无 ω·dt 稳定性守卫,
 *      大步长下轨迹指数发散 (实测 forced-vibration ω₀=316 rad/s、dt=0.05 时
 *      x 达 6×10¹⁷⁷ 甚至 NaN) → 改为子步进
 *   2. forced-vibration 无阻尼共振时返回 A=0, 与物理 (A→∞) **恰好相反**且极具误导性
 *   3. em-combined-field 的 Boris 无回旋分辨率检查, |q|B·dt/2m 过大时回旋被抹平
 *   4. em-combined-field 的 tTurn 公式忽略 B; 速度选择器 v=E/B 可超光速无告警
 */

import { describe, it, expect } from 'vitest';
import { ForcedVibrationModel } from '../../src/models/forced-vibration.js';
import { SimplePendulumModel } from '../../src/models/simple-pendulum.js';
import { EMCombinedFieldModel } from '../../src/models/em-combined-field.js';
import { PHYSICS_CONSTANTS } from '../../src/units/constants.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const ELECTRON = {
    id: 'e',
    mass: { value: PHYSICS_CONSTANTS.electronMass.value, unit: 'kg' as const },
    charge: { value: -PHYSICS_CONSTANTS.e.value, unit: 'C' as const },
    position: { x: 0, y: 0 },
    velocity: { x: 1e5, y: 0 }
};

/** 一维振子从静止释放 (forced-vibration / simple-pendulum 专用, 勿复用电子初速) */
const AT_REST = {
    id: 'b1',
    mass: { value: 1, unit: 'kg' as const },
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 }
};

function problem(
    model: PhysicsProblem['model'],
    constraints: Record<string, unknown>,
    sampleCount: number,
    duration = 10,
    environment: Record<string, unknown> = {},
    body: Record<string, unknown> = AT_REST
): PhysicsProblem {
    return {
        id: 'stability-test',
        model,
        bodies: [body] as unknown as PhysicsProblem['bodies'],
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        environment: environment as PhysicsProblem['environment'],
        timeConfig: { duration, sampleCount }
    };
}

function maxAbsTrajectory(result: { trajectories: Array<Array<{ position: { x: number; y: number } }>> }): number {
    const traj = result.trajectories[0]!;
    let max = 0;
    for (const p of traj) max = Math.max(max, Math.abs(p.position.x), Math.abs(p.position.y));
    return max;
}

/**
 * 稳态振幅: 只取最后 2 个驱动周期, 排除启动瞬态的过冲。
 *
 * 瞬态峰值天然大于稳态幅值 (阶跃驱动会过冲), 与解析公式 A 对比的应是稳态幅值。
 */
function steadyStateAmplitude(
    result: { trajectories: Array<Array<{ t: number; position: { x: number } }>> },
    driveFreq: number,
    duration: number
): number {
    const traj = result.trajectories[0]!;
    const steady = traj.filter(p => p.t >= duration - 2 / driveFreq);
    if (steady.length < 3) return Number.NaN;
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of steady) {
        lo = Math.min(lo, p.position.x);
        hi = Math.max(hi, p.position.x);
    }
    return (hi - lo) / 2;
}

describe('#6 受迫振动: Verlet 子步进保证稳定', () => {
    const model = new ForcedVibrationModel();
    const fv = (mass: number, k: number, sampleCount: number) =>
        model.solve(
            problem(
                'forced-vibration',
                { forcedVibration: { mass, springConstant: k, dampingBeta: 0.1, forceAmplitude: 10, drivingFreq: 20 } },
                sampleCount
            )
        );

    it('大步长 (ω₀·dt=15.8) 不再发散, 轨迹全部有限', () => {
        // 修复前: maxX = NaN (sc=200) / 6.18e+177 (sc=50)
        const r = fv(0.01, 1000, 200);
        expect(Number.isFinite(maxAbsTrajectory(r))).toBe(true);
        // 受迫稳态振幅量级应在 mm 级, 不应达到天文数字
        expect(maxAbsTrajectory(r)).toBeLessThan(10);
    });

    it('极端大步长 (ω₀·dt=63) 仍不发散', () => {
        const r = fv(0.01, 1000, 50);
        expect(Number.isFinite(maxAbsTrajectory(r))).toBe(true);
        expect(maxAbsTrajectory(r)).toBeLessThan(10);
    });

    it('采样足够时稳态振幅收敛到理论值 (子步进不改变物理, 只保稳定)', () => {
        // 理论: A = (F0/m)/√((ω₀²−ω_d²)²+(2βω_d)²) = 0.00635 m
        // 注意: 采样过疏时 (dt 接近驱动周期) 稳态幅值会混叠, 属采样极限而非积分误差,
        // 故只在采样充分 (sc ≥ 1000, 每驱动周期 ≥ 20 点) 的区间比较收敛性。
        const expected = 0.00635;
        for (const sc of [1000, 4000, 20000]) {
            const a = steadyStateAmplitude(fv(0.1, 4, sc), 20, 10);
            expect(a, `sc=${sc} 稳态振幅 ${a} 应接近理论值 ${expected}`).toBeGreaterThan(expected * 0.8);
            expect(a).toBeLessThan(expected * 1.5);
        }
    });

    it('采样过疏时仍给出告警提示提高分辨率', () => {
        // sc=100 → dt=0.1s, 驱动周期 0.05s → 每周期仅 2 个采样点, 必然混叠
        const r = fv(0.1, 4, 100);
        expect(r.warnings.join()).toContain('采样点数');
    });

    it('触发子步进时给出可操作告警', () => {
        const r = fv(0.01, 1000, 100);
        expect(r.warnings.join()).toContain('子步');
    });
});

describe('#6 受迫振动: 无阻尼共振不得报 A=0', () => {
    const model = new ForcedVibrationModel();

    it('β=0 且 f_drive=f₀ → 振幅标注发散, 且告警', () => {
        // m=0.1, k=100 → f₀ = √(k/m)/2π = 5.038 Hz
        const f0 = Math.sqrt(100 / 0.1) / (2 * Math.PI);
        const r = model.solve(
            problem(
                'forced-vibration',
                {
                    forcedVibration: {
                        mass: 0.1,
                        springConstant: 100,
                        dampingBeta: 0,
                        forceAmplitude: 1,
                        drivingFreq: f0
                    }
                },
                2000
            )
        );
        const mv = r.diagnostics.maxValues as Record<string, number>;
        // 修复前返回 0 (与物理恰好相反)
        expect(mv.amplitudeTheoretical).toBe(Number.POSITIVE_INFINITY);
        expect(r.warnings.join()).toContain('无阻尼共振');
    });

    it('展示文案不得出现字符串 "Infinity"', () => {
        const f0 = Math.sqrt(100 / 0.1) / (2 * Math.PI);
        const r = model.solve(
            problem(
                'forced-vibration',
                {
                    forcedVibration: {
                        mass: 0.1,
                        springConstant: 100,
                        dampingBeta: 0,
                        forceAmplitude: 1,
                        drivingFreq: f0
                    }
                },
                2000
            )
        );
        const text = JSON.stringify(r.explanation);
        expect(text).not.toMatch(/"Infinity"|\\bInfinity\\b/);
        expect(text).toContain('发散');
    });

    it('共振曲线在发散点用 {NaN,NaN} 断开标记', () => {
        const f0 = Math.sqrt(100 / 0.1) / (2 * Math.PI);
        const r = model.solve(
            problem(
                'forced-vibration',
                {
                    forcedVibration: {
                        mass: 0.1,
                        springConstant: 100,
                        dampingBeta: 0,
                        forceAmplitude: 1,
                        drivingFreq: f0
                    }
                },
                2000
            )
        );
        const curve = (r.charts as Record<string, { points?: Array<{ x: number; y: number }> }>).A_f_drive!;
        for (const p of curve.points ?? []) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
                expect(Number.isNaN(p.x) && Number.isNaN(p.y)).toBe(true);
            }
        }
    });

    it('正例: 有阻尼时 A 为有限值', () => {
        const r = model.solve(
            problem(
                'forced-vibration',
                {
                    forcedVibration: {
                        mass: 0.1,
                        springConstant: 100,
                        dampingBeta: 0.5,
                        forceAmplitude: 1,
                        drivingFreq: 5
                    }
                },
                2000
            )
        );
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(Number.isFinite(mv.amplitudeTheoretical)).toBe(true);
        expect(r.warnings.join()).not.toContain('无阻尼共振');
    });
});

describe('#6 单摆: Verlet 子步进保证稳定', () => {
    const model = new SimplePendulumModel();
    const pend = (length: number, sampleCount: number) =>
        model.solve(
            problem(
                'simple-pendulum',
                { simplePendulum: { length, g: 9.8, initialAngleDeg: 20, pivot: { x: 0, y: 0 } } },
                sampleCount
            )
        );

    it('小摆长 + 少采样点 (ω·dt 很大) 时轨迹仍有限', () => {
        const r = pend(0.01, 100); // ω = √(9.8/0.01) = 31.3 rad/s, dt = 0.1 → ω·dt = 3.1
        for (const p of r.trajectories[0]!) {
            expect(Number.isFinite(p.position.x)).toBe(true);
            expect(Number.isFinite(p.velocity.x)).toBe(true);
        }
    });

    it('子步进后能量守恒 (无阻尼时)', () => {
        const r = pend(1, 200);
        const cq = r.diagnostics.conservedQuantities[0];
        expect(cq).toBeDefined();
        expect(cq!.conserved, `能量漂移 ${cq!.maxDeviation} 应在容差 ${cq!.tolerance} 内`).toBe(true);
    });

    it('触发子步进时给出可操作告警', () => {
        const r = pend(0.01, 100);
        expect(r.warnings.join()).toContain('子步');
    });
});

describe('#6 电磁复合场: Boris 回旋分辨率检查', () => {
    const model = new EMCombinedFieldModel();

    it('单步转角过大时告警 (电子 q/m≈1.76e11)', () => {
        // B=1T, dt=1e-11 → |q|B·dt/2m = 0.879 rad > π/4
        const r = model.solve(
            problem('em-combined-field', {}, 1000, 1e-8, { magneticField: { fieldStrength: 1 } }, ELECTRON)
        );
        expect(r.warnings.join()).toContain('回旋分辨率不足');
        expect(r.diagnostics.rangeCheck.withinRange).toBe(false);
    });

    it('单步转角足够小时不告警', () => {
        const r = model.solve(
            problem('em-combined-field', {}, 1000, 1e-12, { magneticField: { fieldStrength: 1 } }, ELECTRON)
        );
        expect(r.warnings.join()).not.toContain('回旋分辨率不足');
    });

    it('速度选择器 v=E/B 超光速时告警', () => {
        // E/B = 1e10/1e-6 = 1e16 m/s >> c
        const r = model.solve(
            problem(
                'em-combined-field',
                {},
                200,
                1e-8,
                {
                    electricField: { fieldVector: { x: 0, y: 1e10 } },
                    magneticField: { fieldStrength: 1e-6 }
                },
                ELECTRON
            )
        );
        expect(r.warnings.join()).toContain('超过光速');
    });

    it('tTurn 关键帧在 B≠0 时标注为近似', () => {
        // E.y≠0 且 B≠0 → 转折公式忽略磁场, 须标注近似
        const r = model.solve(
            problem(
                'em-combined-field',
                {},
                500,
                1e-9,
                {
                    electricField: { fieldVector: { x: 0, y: 1 } },
                    magneticField: { fieldStrength: 0.5 }
                },
                ELECTRON
            )
        );
        const kf = r.keyframes.find(k => k.label.includes('转折点'));
        if (kf) {
            expect(kf.label).toContain('近似');
            expect(kf.description).toContain('忽略磁场');
        }
    });
});
