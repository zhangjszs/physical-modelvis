import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 运动合成分解模型 — 必修二 §1 (蜡块实验)
 *
 * 物理: 合运动 = 各分运动的向量叠加。蜡块实验:
 *       (1) 水平: x = vxConst · t       (匀速)
 *       (2) 竖直: y = ½ · a_y · t²    (匀加速)
 *   → 合运动轨迹: y = (a_y / (2·vxConst²)) · x²  (抛物线)
 *
 *   合速度: v_合 = √(vx² + vy²)
 *   合速度方向: tan θ = vy / vx
 *   其中 vy = a_y · t, vx = vxConst (恒定)
 *
 * 本模型等价于平抛运动在 "横轴匀速、纵轴匀加速" 下的特例。
 */
export class MotionCompositionModel extends PhysicsModelBase {
    readonly name = '运动合成分解';
    readonly version = '1.0.0';
    readonly description = '合运动 = 水平匀速 (x=vx·t) + 竖直匀加速 (y=½·a·t²), 用以演示运动的合成与分解';
    readonly modelType = 'motion-composition' as const;
    readonly assumptions = [
        '两个分运动在同一质点上独立进行',
        '水平分运动为匀速直线运动',
        '竖直分运动为初速 0 的匀加速直线运动',
        '合运动轨迹是光滑曲线 (抛物线)',
        '无外力耦合, 两方向相互独立 (运动独立性原理)'
    ];
    readonly applicableRange = '平抛运动、斜抛运动、蜡块实验等可分解为两个正交独立方向直线运动的系统';
    readonly errorSources = ['实际中两方向可能存在耦合 (如流体阻力)', '质点尺寸不可忽略时刚体效应显现'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'vxConst', description: '水平方向匀速速度 (m/s)', unit: 'm/s', required: true },
        { name: 'vyAccel', description: '竖直方向匀加速度 (m/s²)', unit: 'm/s²', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.motionComposition;
        if (!c) {
            throw new Error('运动合成分解模型需要 motionComposition 约束配置');
        }

        const vxConst = c.vxConst;
        const ay = c.vyAccel;
        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        const dt = duration / sampleCount;

        const body = problem.bodies[0]!;
        const m = body.mass.value;

        // 解析解采样: 水平匀速 x=vx·t + 竖直匀加速 y=½ay·t² (公共脚手架 sampleTrajectory)
        const trajectory = sampleTrajectory({
            sampleCount, duration,
            sampleAt: (t) => {
                const y = 0.5 * ay * t * t;
                return {
                    position: { x: vxConst * t, y },
                    velocity: { x: vxConst, y: ay * t },
                    acceleration: { x: 0, y: ay },
                    kineticEnergy: kineticEnergy(m, Math.hypot(vxConst, ay * t)),
                    potentialEnergy: m * Math.max(0, 9.8 * y)
                };
            }
        });

        // 关键帧: 3 等分点 (t=T/4, T/2, 3T/4) + 起点 + 末点
        const keyframes: Keyframe[] = [];

        keyframes.push({
            label: '起点 (0,0)',
            t: 0,
            position: { x: 0, y: 0 },
            velocity: { x: vxConst, y: 0 },
            description: `t=0 时从原点出发, 水平速度 vx=${vxConst}m/s, 竖直初速度 vy=0`
        });

        // T/4, T/2, 3T/4 三个等分点
        const fractions = [1 / 4, 1 / 2, 3 / 4];
        for (const f of fractions) {
            const tF = duration * f;
            const vyT = ay * tF;
            const vRes = Math.sqrt(vxConst * vxConst + vyT * vyT);
            const thetaDeg = (Math.atan2(vyT, vxConst) * 180) / Math.PI;
            keyframes.push({
                label: `等分点 t=${(f * 100).toFixed(0)}%T`,
                t: tF,
                position: { x: vxConst * tF, y: 0.5 * ay * tF * tF },
                velocity: { x: vxConst, y: vyT },
                description: `t=${tF.toFixed(2)}s: x=${(vxConst * tF).toFixed(2)}m, y=${(0.5 * ay * tF * tF).toFixed(2)}m, vy=${vyT.toFixed(2)}m/s, v_合=${vRes.toFixed(2)}m/s, θ=${thetaDeg.toFixed(1)}°`
            });
        }

        {
            const p = trajectory[trajectory.length - 1]!;
            const vyEnd = ay * duration;
            const vEnd = Math.sqrt(vxConst * vxConst + vyEnd * vyEnd);
            const thetaEnd = (Math.atan2(vyEnd, vxConst) * 180) / Math.PI;
            keyframes.push({
                label: '末点',
                t: duration,
                position: p.position,
                velocity: p.velocity,
                description: `t=${duration.toFixed(2)}s: x=${p.position.x.toFixed(2)}m, y=${p.position.y.toFixed(2)}m, vy=${vyEnd.toFixed(2)}m/s, v_合=${vEnd.toFixed(2)}m/s, θ=${thetaEnd.toFixed(1)}°`
            });
        }

        // 图表: x_t, y_t, v_t (合速度), vy_t
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: 'x 坐标 (水平匀速)',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.x }))
        };
        const y_t: ChartSeries = {
            xLabel: '时间',
            yLabel: 'y 坐标 (竖直匀加速)',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.y }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '合速度大小',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2) }))
        };
        const vy_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '竖直分速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: p.velocity.y }))
        };
        const vx_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '水平分速度 (恒量)',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: p.velocity.x }))
        };
        // 轨迹方程图 (y-x 抛物线)
        const y_x: ChartSeries = {
            xLabel: 'x',
            yLabel: 'y 轨迹',
            xUnit: 'm',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.position.x, y: p.position.y }))
        };

        // 理论量
        const aOverVxsq = ay / (2 * vxConst * vxConst); // 抛物线系数 y = aOverVxsq · x²
        const totalX = vxConst * duration;
        const totalY = 0.5 * ay * duration * duration;
        const finalVy = ay * duration;
        const finalV = Math.sqrt(vxConst * vxConst + finalVy * finalVy);

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '水平分运动 (匀速)',
                formula: 'x = vx · t',
                calculation: `vx=${vxConst}m/s → x(t)=${vxConst}·t`
            },
            {
                order: 2,
                description: '竖直分运动 (匀加速, 初速 0)',
                formula: 'y = ½·a_y·t²,  vy = a_y·t',
                calculation: `a_y=${ay}m/s² → y(t)=½·${ay}·t²`
            },
            {
                order: 3,
                description: '合运动轨迹 (抛物线)',
                formula: 'y = (a_y / (2·vx²))·x²',
                calculation: `y = ${aOverVxsq.toFixed(4)}·x²`
            },
            {
                order: 4,
                description: '合速度的大小与方向',
                formula: 'v_合 = √(vx² + vy²),  tanθ = vy/vx',
                calculation: `t=${duration}s 时, vy=${finalVy.toFixed(2)}m/s, v_合=${finalV.toFixed(2)}m/s, θ=${((Math.atan2(finalVy, vxConst) * 180) / Math.PI).toFixed(1)}°`
            }
        ];
        const formulas: FormulaUsage[] = [
            { name: '水平分运动', formula: 'x = vx·t', variables: { vx: { value: vxConst, unit: 'm/s' } } },
            {
                name: '竖直分运动',
                formula: 'y = ½·a_y·t², vy = a_y·t',
                variables: { a_y: { value: ay, unit: 'm/s²' } }
            },
            {
                name: '合速度大小',
                formula: 'v_合 = √(vx² + vy²)',
                variables: {
                    vx: { value: vxConst, unit: 'm/s' },
                    vy: { value: finalVy, unit: 'm/s' },
                    v: { value: finalV, unit: 'm/s' }
                }
            },
            {
                name: '合速度方向',
                formula: 'tanθ = vy/vx',
                variables: { θ: { value: (Math.atan2(finalVy, vxConst) * 180) / Math.PI, unit: '°' } }
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, y_t, v_t, vy_t, vx_t, 'y-x': y_x },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    totalX,
                    totalY,
                    finalVy,
                    finalV,
                    finalThetaDeg: (Math.atan2(finalVy, vxConst) * 180) / Math.PI,
                    parabolaCoeff: aOverVxsq
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `运动合成分解 (蜡块实验): vx=${vxConst}m/s, a_y=${ay}m/s², 轨迹 y=${aOverVxsq.toFixed(4)}·x², 水平射程=${totalX.toFixed(2)}m, 竖直射程=${totalY.toFixed(2)}m, 末合速度 v=${finalV.toFixed(2)}m/s`,
                steps,
                formulas
            },
            errors: [],
            warnings: []
        };
    }
}
