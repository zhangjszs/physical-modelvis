/**
 * 光学 / 波动 / 统计模型数值契约 (#11)
 *
 * 覆盖五类已修复的缺陷:
 *   1. doppler: 超声速 (v_s·cosθ ≥ v) 时 f' 变负 → log2(负数)=NaN 进 diagnostics。
 *      这是**跨参数**约束, 单参数 min/max 无法表达, 故在 validate() 中拦截。
 *   2. diffraction-grating: λ ≥ d 时 sqrt(负数) → NaN, 再 toFixed 包成字符串
 *      "NaN" 直接显示给用户 (NaN 在字符串内, 有限性检查拦不住);
 *      另补 a > d 非物理组合告警。
 *   3. diffusion: gridSize/diffusionCoeff 是**可选**约束字段, 不在 requiredParameters,
 *      基类 min/max 拦不到; 零值使 tSample=0 → 浓度分布除零整列 NaN。
 *   4. coulomb-force-explore: sampleCount=0 → dt=Inf; rRange/qRange 退化或含 0
 *      → k/r² 除零、幂律拟合 0/0。
 *   5. refraction: 哨兵值约定此前只散落在代码里, 现文档化并命名常量。
 */

import { describe, it, expect } from 'vitest';
import { DopplerModel } from '../../src/models/doppler.js';
import { DiffractionGratingModel } from '../../src/models/diffraction-grating.js';
import { DiffusionModel } from '../../src/models/diffusion.js';
import { CoulombForceExploreModel } from '../../src/models/coulomb-force-explore.js';
import { RefractionModel } from '../../src/models/refraction.js';
import { PhysicsError } from '../../src/errors/index.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

function makeProblem(model: PhysicsProblem['model'], constraints: Record<string, unknown>): PhysicsProblem {
    return {
        id: 'optics-test',
        model,
        bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        environment: {},
        timeConfig: { duration: 5, sampleCount: 100 }
    };
}

/**
 * 递归查找结果中所有非有限数值的路径 (含被包进字符串的 "NaN")
 *
 * 折线断开标记 {NaN, NaN} (x/y 同时为 NaN) 是仓库 charts 约定下的合法断点,
 * 见 visualization/tests/accuracy/physics-correctness.shared.ts 的 L9 有限性检查。
 */
function findNonFinite(value: unknown, path = ''): string[] {
    if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path}=${value}`];
    if (typeof value === 'string') return /\bNaN\b|\bInfinity\b/.test(value) ? [`${path}="${value}"`] : [];
    if (Array.isArray(value)) return value.flatMap((v, i) => findNonFinite(v, `${path}[${i}]`));
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) => findNonFinite(v, path ? `${path}.${k}` : k));
    }
    return [];
}

/** 只检查非 charts 字段 (charts 允许 {NaN,NaN} 断点) */
function findNonFiniteOutsideCharts(result: Record<string, unknown>): string[] {
    return findNonFinite({ ...result, charts: undefined, trajectories: undefined });
}

/** 校验 charts 中的 NaN 均为合法 {NaN,NaN} 断点 */
function assertChartsOnlyBreakMarkers(result: Record<string, unknown>): void {
    const charts = (result.charts ?? {}) as Record<string, { points?: Array<{ x: number; y: number }> }>;
    for (const [key, series] of Object.entries(charts)) {
        for (const [i, p] of (series.points ?? []).entries()) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
                expect(
                    Number.isNaN(p.x) && Number.isNaN(p.y),
                    `chart ${key}[${i}] 出现非 {NaN,NaN} 断点: x=${p.x}, y=${p.y}`
                ).toBe(true);
            }
        }
    }
}

describe('#11 多普勒: 超声速区跨参数拦截', () => {
    const model = new DopplerModel();

    it('正例: v_s=330 < v=340 → 正常求解且全部有限', () => {
        const r = model.solve(
            makeProblem('doppler', {
                doppler: { sourceFreq: 1000, soundSpeed: 340, sourceSpeed: 330, observerSpeed: 0, directionAngle: 0 }
            })
        );
        expect(findNonFinite(r)).toEqual([]);
        expect(Number.isFinite(r.diagnostics.maxValues.semitoneRatio)).toBe(true);
    });

    it('v_s 与 v 各自在声明范围内, 但 v_s·cosθ ≥ v → 拒绝 (SUPERSONIC_SOURCE)', () => {
        // soundSpeed=300 (min 300) 与 sourceSpeed=330 (max 330) 都在声明范围内
        const problem = makeProblem('doppler', {
            doppler: { sourceFreq: 1000, soundSpeed: 300, sourceSpeed: 330, observerSpeed: 0, directionAngle: 0 }
        });
        const v = model.validate(problem);
        expect(v.valid).toBe(false);
        expect(v.errors[0]?.code).toBe('SUPERSONIC_SOURCE');
        expect(v.errors[0]?.message).toContain('马赫锥');
        expect(() => model.solve(problem)).toThrow(PhysicsError);
    });

    it('大 directionAngle (远离) 时即使 v_s 较大也合法', () => {
        // θ=180° → cosθ=-1 → 分母 = v + v_s > 0, 总是合法
        const r = model.solve(
            makeProblem('doppler', {
                doppler: { sourceFreq: 1000, soundSpeed: 300, sourceSpeed: 330, observerSpeed: 0, directionAngle: 180 }
            })
        );
        expect(findNonFiniteOutsideCharts(r as unknown as Record<string, unknown>)).toEqual([]);
        assertChartsOnlyBreakMarkers(r as unknown as Record<string, unknown>);
        expect(Number.isFinite(r.diagnostics.maxValues.semitoneRatio)).toBe(true);
    });

    it('θ 扫描在分母非正处用 {NaN,NaN} 断点标记, 不静默填 f0', () => {
        // v_s=290 < v=300, 但扫描会经过 cosθ=+1 方向 → 分母非正, 必须断线而非填 f0
        const r = model.solve(
            makeProblem('doppler', {
                doppler: { sourceFreq: 1000, soundSpeed: 300, sourceSpeed: 290, observerSpeed: 0, directionAngle: 120 }
            })
        );
        assertChartsOnlyBreakMarkers(r as unknown as Record<string, unknown>);
        expect(findNonFiniteOutsideCharts(r as unknown as Record<string, unknown>)).toEqual([]);
    });
});

describe('#11 光栅: λ≥d 发散与 a>d 非物理组合', () => {
    const model = new DiffractionGratingModel();
    const build = (gratingConstant: number, slitWidth: number, wavelength: number) =>
        model.solve(
            makeProblem('diffraction-grating', {
                diffractionGrating: { gratingConstant, slitWidth, wavelength, orderMax: 3, slitCount: 100 }
            })
        );

    it('正例: d=2µm, λ=500nm → 角色散为有限值', () => {
        const r = build(2, 1, 500);
        const step = r.explanation.steps.find(s => s.description.includes('角色散'))!;
        expect(step.calculation).not.toMatch(/NaN/);
        expect(findNonFinite(r)).toEqual([]);
    });

    it('λ=780nm ≥ d=500nm → 角色散发散, 展示文案不得出现 "NaN"', () => {
        const r = build(0.5, 0.3, 780);
        const step = r.explanation.steps.find(s => s.description.includes('角色散'))!;
        expect(step.calculation).not.toMatch(/NaN/);
        expect(step.calculation).toContain('发散');
        // 全结果(递归, 含字符串内部)不得出现 NaN/Infinity
        expect(findNonFinite(r)).toEqual([]);
        expect(r.warnings.join()).toContain('角色散发散');
    });

    it('缝宽 a > 光栅常数 d → 显式告警', () => {
        const r = build(0.5, 2, 500);
        expect(r.warnings.join()).toContain('非物理组合');
    });
});

describe('#11 扩散: 可选约束字段的零值守卫', () => {
    const model = new DiffusionModel();
    const build = (extra: Record<string, unknown>) =>
        makeProblem('diffusion', { diffusion: { temperature: 300, mode: 'liquid', particleCount: 100, ...extra } });

    it('正例: 正常参数求解有限', () => {
        expect(findNonFinite(model.solve(build({})))).toEqual([]);
    });

    it('gridSize=0 → 拒绝 (否则 tSample=0 使浓度分布整列 NaN)', () => {
        const problem = build({ gridSize: 0 });
        const v = model.validate(problem);
        expect(v.valid).toBe(false);
        expect(v.errors[0]?.param).toBe('gridSize');
        expect(() => model.solve(problem)).toThrow(PhysicsError);
    });

    it('gridSize 为负 → 拒绝', () => {
        expect(model.validate(build({ gridSize: -1e-6 })).valid).toBe(false);
    });

    it('diffusionCoeff=0 → 拒绝 (作分母)', () => {
        const problem = build({ diffusionCoeff: 0 });
        expect(model.validate(problem).valid).toBe(false);
        expect(() => model.solve(problem)).toThrow(PhysicsError);
    });
});

describe('#11 库仑探究: 采样点数与扫描区间守卫', () => {
    const model = new CoulombForceExploreModel();
    const build = (extra: Record<string, unknown>) =>
        makeProblem('coulomb-force-explore', {
            coulombForce: { q1: 1, q2: 1, distance: 10, mode: 'varyQ', ...extra }
        });

    it('正例: 正常参数求解有限', () => {
        expect(findNonFinite(model.solve(build({})))).toEqual([]);
    });

    it('sampleCount=0 → 拒绝 (dt=Inf 会污染整条轨迹)', () => {
        const problem = build({ sampleCount: 0 });
        expect(model.validate(problem).valid).toBe(false);
        expect(() => model.solve(problem)).toThrow(PhysicsError);
    });

    it('rRange 退化 [0,0] → 拒绝 (含 r=0, k/r² 除零)', () => {
        const problem = build({ rRange: [0, 0] });
        const v = model.validate(problem);
        expect(v.valid).toBe(false);
        expect(v.errors.some(e => e.code === 'NON_POSITIVE_PARAMETER')).toBe(true);
    });

    it('rRange 上限 ≤ 下限 → 拒绝 (DEGENERATE_RANGE)', () => {
        const problem = build({ rRange: [20, 5] });
        expect(model.validate(problem).errors.some(e => e.code === 'DEGENERATE_RANGE')).toBe(true);
    });

    it('qRange 下限为 0 → 拒绝', () => {
        expect(model.validate(build({ qRange: [0, 5] })).valid).toBe(false);
    });
});

describe('#11 折射: 哨兵值约定文档化', () => {
    const model = new RefractionModel();

    it('全反射 → refractionAngleDeg = -1 且 totalInternalReflection = 1', () => {
        const r = model.solve(
            makeProblem('refraction', {
                refraction: { n1: 1.5, n2: 1.0, incidentAngleDeg: 70 }
            })
        );
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(mv.totalInternalReflection).toBe(1);
        expect(mv.refractionAngleDeg).toBe(-1);
        expect(r.diagnostics.rangeCheck.withinRange).toBe(false);
        expect(r.diagnostics.rangeCheck.warnings.join()).toContain('全反射');
        expect(findNonFinite(r)).toEqual([]);
    });

    it('n₁ ≤ n₂ → criticalAngleDeg = -1 (无临界角, 哨兵非真实角度)', () => {
        const r = model.solve(makeProblem('refraction', { refraction: { n1: 1.0, n2: 1.5, incidentAngleDeg: 30 } }));
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(mv.criticalAngleDeg).toBe(-1);
        expect(mv.totalInternalReflection).toBe(0);
    });

    it('正常折射 → 角度为真实值 (非哨兵)', () => {
        const r = model.solve(makeProblem('refraction', { refraction: { n1: 1.0, n2: 1.5, incidentAngleDeg: 30 } }));
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(mv.refractionAngleDeg).toBeGreaterThan(0);
    });
});
