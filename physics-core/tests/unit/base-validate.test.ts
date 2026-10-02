/**
 * base.validate() 参数范围拦截契约 (#8)
 *
 * 背景: PhysicsModelBase.validate() 此前只检查 model/bodies/mass/duration,
 * 从不读取各模型 requiredParameters 中声明的 min/max, 导致"声明式参数下限形同虚设" —
 * 如 simple-pendulum.length=0 → sqrt(L/g)=NaN, magnetic-force.B=0 → radius=Inf。
 *
 * 本文件固化三条契约:
 *   1. 声明的 min/max 越界 → validate() 返回 valid:false, code 指向该参数
 *   2. 非有限值 (NaN/Inf) 一律拒绝, 即使 min/max 未声明
 *   3. 软限程模型 (enforcesParameterRanges() === false) 不做范围拦截但仍拒绝非有限值
 *   4. timeConfig.sampleCount <= 0 → 拒绝 (dt = duration/0 = Inf 会污染整条轨迹)
 */

import { describe, it, expect } from 'vitest';
import { SimplePendulumModel } from '../../src/models/simple-pendulum.js';
import { MagneticForceModel } from '../../src/models/magnetic-force.js';
import { OrbitalModel } from '../../src/models/orbital.js';
import { DiffractionGratingModel } from '../../src/models/diffraction-grating.js';
import { MicrometerModel } from '../../src/models/micrometer.js';
import { PhysicsModelBase } from '../../src/models/base.js';
// getModel 从包根导入: 模型注册发生在 solver/solver-router.ts 的模块副作用里,
// 直接从 base.js 拿 getModel 会看到空注册表 (UnsupportedModelError: 该模型尚未注册)。
import { getModel } from '../../src/index.js';
import { ParameterOutOfRangeError } from '../../src/errors/index.js';
import type { PhysicsProblem } from '../../src/types/problem.js';
import type { SimulationResult, TrajectoryPoint } from '../../src/types/result.js';

function makeBody(overrides: Partial<{ x: number; y: number; vx: number; vy: number }> = {}) {
    return {
        id: 'b1',
        mass: { value: 1, unit: 'kg' as const },
        position: { x: overrides.x ?? 0, y: overrides.y ?? 0 },
        velocity: { x: overrides.vx ?? 0, y: overrides.vy ?? 0 }
    };
}

function makeProblem(
    model: PhysicsProblem['model'],
    constraints: Record<string, unknown> = {},
    timeConfig: Partial<PhysicsProblem['timeConfig']> = {}
): PhysicsProblem {
    return {
        id: 'base-validate-test',
        model,
        bodies: [makeBody()],
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        environment: { gravity: { enabled: true, value: 9.8 } },
        timeConfig: { duration: 5, sampleCount: 200, ...timeConfig }
    };
}

describe('base.validate(): 声明式 min/max 拦截 (#8)', () => {
    describe('单摆: length / g 越界', () => {
        const model = new SimplePendulumModel();

        const base = (length: number, g: number): PhysicsProblem =>
            makeProblem('simple-pendulum', {
                simplePendulum: { length, g, initialAngleDeg: 10, pivot: { x: 0, y: 0 } }
            });

        it('正例: L=1m, g=9.8 校验通过', () => {
            const v = model.validate(base(1, 9.8));
            expect(v.valid, JSON.stringify(v.errors)).toBe(true);
        });

        it('L=0 → valid:false 且 code 指向 length', () => {
            const v = model.validate(base(0, 9.8));
            expect(v.valid).toBe(false);
            const err = v.errors.find(e => e.code === 'PARAMETER_OUT_OF_RANGE');
            expect(err, JSON.stringify(v.errors)).toBeDefined();
            expect(err!.param).toBe('length');
            expect(err!.value).toBe(0);
        });

        it('g=0 → valid:false 且 code 指向 g', () => {
            const v = model.validate(base(1, 0));
            expect(v.valid).toBe(false);
            const err = v.errors.find(e => e.param === 'g');
            expect(err, JSON.stringify(v.errors)).toBeDefined();
            expect(err!.code).toBe('PARAMETER_OUT_OF_RANGE');
        });

        it('solve() 对 L=0 抛 ParameterOutOfRangeError (不再静默产出 NaN)', () => {
            expect(() => model.solve(base(0, 9.8))).toThrow(ParameterOutOfRangeError);
        });
    });

    describe('磁场: B / charge 越界', () => {
        const model = new MagneticForceModel();

        const base = (B: number, charge: number): PhysicsProblem =>
            makeProblem('magnetic-force', {
                magneticForce: {
                    mode: 'particle',
                    magneticField: B,
                    charge,
                    velocity: 1e6,
                    particleMass: 9.11e-31,
                    velocityAngleDeg: 90
                }
            });

        it('正例: B=0.5T 校验通过', () => {
            const v = model.validate(base(0.5, 1.6e-19));
            expect(v.valid, JSON.stringify(v.errors)).toBe(true);
        });

        it('B=0 → valid:false 且 code 指向 magneticField', () => {
            const v = model.validate(base(0, 1.6e-19));
            expect(v.valid).toBe(false);
            expect(
                v.errors.find(e => e.param === 'magneticField'),
                JSON.stringify(v.errors)
            ).toBeDefined();
        });

        it('charge=0 → valid:false (除数零)', () => {
            const v = model.validate(base(0.5, 0));
            expect(v.valid).toBe(false);
            expect(
                v.errors.find(e => e.param === 'charge'),
                JSON.stringify(v.errors)
            ).toBeDefined();
        });
    });

    describe('轨道: radius 越界', () => {
        const model = new OrbitalModel();

        it('radius=0 (由 body.position 派生) → valid:false (sqrt(GM/r) 会为 Inf)', () => {
            const problem = makeProblem('orbital', { orbital: { GM: 3.986e14 } });
            problem.bodies = [makeBody({ vx: 7000 })]; // position = (0,0) → radius = 0
            const v = model.validate(problem);
            expect(v.valid).toBe(false);
            expect(
                v.errors.find(e => e.param === 'radius'),
                JSON.stringify(v.errors)
            ).toBeDefined();
        });

        it('radius 来自非零 body.position → 校验通过', () => {
            const problem = makeProblem('orbital', { orbital: { GM: 3.986e14 } });
            problem.bodies = [makeBody({ x: 7e6, vy: 7000 })]; // radius = 7e6 m
            const v = model.validate(problem);
            expect(v.valid, JSON.stringify(v.errors)).toBe(true);
        });
    });

    describe('非有限值守卫 (即使 min/max 未声明)', () => {
        const model = new SimplePendulumModel();

        it('length=NaN → NON_FINITE_PARAMETER', () => {
            const v = model.validate(
                makeProblem('simple-pendulum', { simplePendulum: { length: Number.NaN, g: 9.8, initialAngleDeg: 5 } })
            );
            expect(v.valid).toBe(false);
            expect(
                v.errors.find(e => e.code === 'NON_FINITE_PARAMETER'),
                JSON.stringify(v.errors)
            ).toBeDefined();
        });

        it('length=Infinity → NON_FINITE_PARAMETER', () => {
            const v = model.validate(
                makeProblem('simple-pendulum', { simplePendulum: { length: Infinity, g: 9.8, initialAngleDeg: 5 } })
            );
            expect(v.valid).toBe(false);
            expect(
                v.errors.find(e => e.code === 'NON_FINITE_PARAMETER'),
                JSON.stringify(v.errors)
            ).toBeDefined();
        });
    });

    describe('timeConfig.sampleCount 守卫', () => {
        const model = new SimplePendulumModel();
        const problem = (sampleCount: number): PhysicsProblem =>
            makeProblem(
                'simple-pendulum',
                { simplePendulum: { length: 1, g: 9.8, initialAngleDeg: 5, pivot: { x: 0, y: 0 } } },
                { sampleCount }
            );

        it('sampleCount=0 → INVALID_SAMPLE_COUNT (dt=Inf 会污染整条轨迹)', () => {
            const v = model.validate(problem(0));
            expect(v.valid).toBe(false);
            expect(
                v.errors.find(e => e.code === 'INVALID_SAMPLE_COUNT'),
                JSON.stringify(v.errors)
            ).toBeDefined();
        });

        it('sampleCount 省略 (undefined) → 合法 (各模型自行 ?? 默认值)', () => {
            const p = makeProblem('simple-pendulum', {
                simplePendulum: { length: 1, g: 9.8, initialAngleDeg: 5, pivot: { x: 0, y: 0 } }
            });
            delete (p.timeConfig as { sampleCount?: number }).sampleCount;
            const v = model.validate(p);
            expect(v.valid, JSON.stringify(v.errors)).toBe(true);
        });
    });

    describe('光栅: 声明区间外的档位被拦截', () => {
        const model = new DiffractionGratingModel();

        it('正例: d=2um, λ=500nm 校验通过', () => {
            const v = model.validate(
                makeProblem('diffraction-grating', {
                    diffractionGrating: {
                        gratingConstant: 2,
                        slitWidth: 1,
                        wavelength: 500,
                        orderMax: 3,
                        slitCount: 100
                    }
                })
            );
            expect(v.valid, JSON.stringify(v.errors)).toBe(true);
        });

        it('wavelength=100nm 低于声明 min=380 → valid:false', () => {
            const v = model.validate(
                makeProblem('diffraction-grating', {
                    diffractionGrating: {
                        gratingConstant: 2,
                        slitWidth: 1,
                        wavelength: 100,
                        orderMax: 3,
                        slitCount: 100
                    }
                })
            );
            expect(v.valid).toBe(false);
            expect(
                v.errors.find(e => e.param === 'wavelength'),
                JSON.stringify(v.errors)
            ).toBeDefined();
        });
    });

    describe('软限程模型: 不拦截范围但仍拒绝非有限值', () => {
        const model = new MicrometerModel();
        const problem = (thickness: number): PhysicsProblem => makeProblem('micrometer', { micrometer: { thickness } });

        it('thickness=26mm 超出声明 max=25 → 仍可求解 (产出量程告警)', () => {
            const v = model.validate(problem(26));
            expect(v.valid, JSON.stringify(v.errors)).toBe(true);
            const r = model.solve(problem(26));
            expect(r.warnings.some(w => w.includes('量程'))).toBe(true);
        });

        it('thickness=NaN → 仍被 NON_FINITE_PARAMETER 拒绝', () => {
            const v = model.validate(problem(Number.NaN));
            expect(v.valid).toBe(false);
            expect(
                v.errors.find(e => e.code === 'NON_FINITE_PARAMETER'),
                JSON.stringify(v.errors)
            ).toBeDefined();
        });
    });

    describe('enforcesParameterRanges() 钩子契约', () => {
        /** 最小可用模型: 暴露 protected 钩子供测试直接断言 */
        class ProbeModel extends PhysicsModelBase {
            readonly name = 'probe';
            readonly version = '1.0.0';
            readonly description = '用于验证 validate 钩子的探针模型';
            readonly modelType = 'orbital' as const;
            readonly assumptions: string[] = [];
            readonly applicableRange = '-';
            readonly errorSources: string[] = [];
            readonly requiredParameters = [
                { name: 'radius', description: '半径 r (m)', unit: 'm', required: true, min: 1, max: 10 }
            ];

            solve(problem: PhysicsProblem): SimulationResult {
                this.throwIfInvalid(problem);
                const point: TrajectoryPoint = { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
                return {
                    meta: this.makeMeta('analytical'),
                    trajectories: [[point]],
                    keyframes: [],
                    charts: {},
                    diagnostics: {
                        conservedQuantities: [],
                        maxValues: {},
                        rangeCheck: { withinRange: true, warnings: [] }
                    },
                    explanation: { summary: 'probe', steps: [], formulas: [] },
                    errors: [],
                    warnings: []
                };
            }
        }

        it('默认 enforcesParameterRanges() === true', () => {
            expect(
                (new ProbeModel() as unknown as { enforcesParameterRanges(): boolean }).enforcesParameterRanges()
            ).toBe(true);
        });

        it('软限程 override 为 false 时越界不报错', () => {
            class SoftProbe extends ProbeModel {
                protected overrides = false;
                protected enforcesParameterRanges(): boolean {
                    return this.overrides;
                }
            }
            const soft = new SoftProbe();
            const problem = makeProblem('orbital', { orbital: { radius: 999 } });
            expect(soft.validate(problem).valid).toBe(true);

            (soft as unknown as { overrides: boolean }).overrides = true;
            expect(soft.validate(problem).valid).toBe(false);
        });
    });

    describe('requiresBodies() 窄豁免 (纯场 / 传感器 / 仪器模型)', () => {
        /** 全文不读 problem.bodies 的 13 个模型 (各自都有 requiresBodies override) */
        const EXEMPT: PhysicsProblem['model'][] = [
            'electrostatic-shielding',
            'resistance-law',
            'load-voltage',
            'capacitor-charge',
            'parallel-plate-capacitor',
            'electrostatic-induction',
            'electroscope',
            'coulomb-force-explore',
            'faraday-cup',
            'vernier-caliper',
            'micrometer',
            'multimeter',
            'ampere-force'
        ];

        const noBodies = (
            model: PhysicsProblem['model'],
            constraints: Record<string, unknown> = {}
        ): PhysicsProblem => ({
            id: 'no-bodies-test',
            model,
            bodies: [],
            constraints,
            environment: {},
            timeConfig: { duration: 1, sampleCount: 50, dt: 0.02 }
        });

        it('13 个豁免模型不再产出 NO_BODIES (场景侧无需塞入假物体)', () => {
            for (const type of EXEMPT) {
                const v = getModel(type).validate(noBodies(type));
                expect(
                    v.errors.some(e => e.code === 'NO_BODIES'),
                    `${type} 仍要求 bodies`
                ).toBe(false);
            }
        });

        it('未豁免模型仍产出 NO_BODIES (防止钩子被误改成全局关闭)', () => {
            const v = getModel('simple-pendulum').validate(noBodies('simple-pendulum'));
            expect(v.errors.some(e => e.code === 'NO_BODIES')).toBe(true);
        });

        it('窄豁免只取消 NO_BODIES, 不关掉 NaN/Inf 守卫', () => {
            // 回归: 用 requiresValidation() 大锤豁免会连带关掉本断言里的 NON_FINITE_PARAMETER 拦截
            const v = getModel('micrometer').validate(noBodies('micrometer', { micrometer: { thickness: NaN } }));
            expect(v.errors.some(e => e.code === 'NON_FINITE_PARAMETER')).toBe(true);
        });
    });
});
