import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { sampleTrajectory } from '../physics/kinematics.js';

/**
 * 双单摆步调比较模型 — 选必一 第二章 (两个单摆的振动步调)
 *
 * 演示两个摆长不同的单摆的位移-时间关系, 对比:
 *   - 同相振动 (phaseDiff=0): 两摆同时到达最大位移
 *   - 反相振动 (phaseDiff=pi): 两摆运动方向始终相反
 * 无相位差时两摆步调一致 (当 L1=L2).
 *
 * 小角度近似: theta_i(t) = A_i * cos(omega_i * t + phi_i)
 *   - omega_i = sqrt(g/L_i)
 *   - A_i = initialAngle_i (振幅, 弧度)
 *   - phi_i = phase of pendulum i
 */
export class DoublePendulumSyncModel extends PhysicsModelBase {
    readonly name = '双单摆步调';
    readonly version = '1.0.0';
    readonly description = '两个单摆的位移-时间对比图: 同相/反相';
    readonly modelType = 'double-pendulum' as const;
    readonly assumptions = [
        '两摆均处于小角度近似 (<15 deg)',
        '悬点固定在同一水平梁上',
        '摆球视为质点, 摆线轻质不可伸长',
        '无阻尼, 无空气阻力'
    ];
    readonly applicableRange = 'L1,L2: 0.1--5 m; initialAngle: 0--15 deg';
    readonly errorSources = [
        '大角度时周期与振幅有关, 小角度近似失效',
        '悬点梁并非绝对刚性',
        '摆线有质量 / 摆球体积不可忽略'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'length1', description: '摆1摆长 L1 (m)', unit: 'm', required: true, min: 0.1, max: 10 },
        { name: 'length2', description: '摆2摆长 L2 (m)', unit: 'm', required: true, min: 0.1, max: 10 },
        { name: 'initialAngle1', description: '摆1初始角 (度)', unit: 'deg', required: true, min: 0, max: 15 },
        { name: 'initialAngle2', description: '摆2初始角 (度)', unit: 'deg', required: true, min: 0, max: 15 },
        {
            name: 'phaseDiff',
            description: '相位差 phi2-phi1 (度) — 0=同相, 180=反相',
            unit: 'deg',
            required: true,
            min: 0,
            max: 360
        },
        { name: 'gravity', description: '重力加速度 (m/s^2)', unit: 'm/s^2', required: false, min: 1, max: 20 },
        { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0.1, max: 60 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.doublePendulum;
        if (!c) throw new Error('double-pendulum 模型需要 doublePendulum 约束配置');

        const L1 = c.length1;
        const L2 = c.length2;
        const th1Amp = (c.initialAngle1 * Math.PI) / 180;
        const th2Amp = (c.initialAngle2 * Math.PI) / 180;
        const phaseDiffRad = (c.phaseDiff * Math.PI) / 180;
        const g = c.gravity ?? 9.8;

        const omega1 = Math.sqrt(g / L1);
        const omega2 = Math.sqrt(g / L2);
        const T1 = (2 * Math.PI) / omega1;
        const T2 = (2 * Math.PI) / omega2;

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 500;

        // 解析解采样: 两单摆独立余弦振动 (公共脚手架 sampleTrajectory)
        //   θ₁(t) = θ1Amp·cos(ω₁·t),  θ₂(t) = θ2Amp·cos(ω₂·t + φ)
        // 注: 原始 trajectory 循有 i%5==0 decimation (渲染端临时优化, 非物理必需); 迁移后采用全量更精确
        const trajectory = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => {
                const th1 = th1Amp * Math.cos(omega1 * t);
                const dth1 = -th1Amp * omega1 * Math.sin(omega1 * t);
                return {
                    position: { x: th1, y: 0 },
                    velocity: { x: dth1, y: 0 },
                    acceleration: { x: -omega1 * omega1 * th1, y: 0 },
                    kineticEnergy: 0.5 * 1 * (dth1 * L1) * (dth1 * L1), // 摆球单位质量能量
                    potentialEnergy: 1 * g * L1 * (1 - Math.cos(th1))
                };
            }
        });

        // ChartSeries 由 trajectory 派生 (保持与原来 sc+1 全量点一致)
        const theta1Series: ChartSeries = {
            xLabel: '时间 (s)',
            yLabel: '摆1角位移 (度)',
            xUnit: 's',
            yUnit: 'deg',
            points: trajectory.map(p => ({
                x: parseFloat(p.t.toFixed(4)),
                y: parseFloat(((p.position.x * 180) / Math.PI).toFixed(4))
            }))
        };
        const theta2Series: ChartSeries = {
            xLabel: '时间 (s)',
            yLabel: '摆2角位移 (度)',
            xUnit: 's',
            yUnit: 'deg',
            points: trajectory.map(p => {
                const th2 = th2Amp * Math.cos(omega2 * p.t + phaseDiffRad);
                return { x: parseFloat(p.t.toFixed(4)), y: parseFloat(((th2 * 180) / Math.PI).toFixed(4)) };
            })
        };

        const pivot = { x: 0, y: 0 };
        const x1 = pivot.x + L1 * Math.sin(th1Amp);
        const y1 = pivot.y + L1 * Math.cos(th1Amp);

        const keyframes: Keyframe[] = [
            {
                label: '初始时刻 (t=0)',
                t: 0,
                position: { x: x1, y: y1 },
                velocity: { x: 0, y: 0 },
                description: `t=0: theta1=${((th1Amp * 180) / Math.PI).toFixed(1)} deg, theta2=${((th2Amp * Math.cos(phaseDiffRad) * 180) / Math.PI).toFixed(1)} deg, 相位差=${c.phaseDiff.toFixed(0)} deg`
            },
            {
                label: '经过 1/4 周期 T1/4',
                t: T1 / 4,
                position: { x: pivot.x, y: pivot.y + L1 },
                velocity: { x: th1Amp * omega1 * L1, y: 0 },
                description: `摆1到达最低点 (速度最大), T1=${T1.toFixed(3)}s`
            },
            {
                label: '经过 T1 (摆1完成一个周期)',
                t: T1,
                position: { x: x1, y: y1 },
                velocity: { x: 0, y: 0 },
                description: `摆1完成一个周期, T1=${T1.toFixed(3)}s, T2=${T2.toFixed(3)}s, sync=${Math.abs(T1 - T2) < 1e-6}`
            }
        ];

        // 判定步调
        let syncLabel: string;
        const periodRatio = T1 / T2;
        const sameLen = Math.abs(L1 - L2) < 1e-6;
        const isAnti = Math.abs(c.phaseDiff - 180) < 1;
        const isInPhase = Math.abs(c.phaseDiff) < 1 || Math.abs(c.phaseDiff - 360) < 1;

        if (sameLen && isInPhase) {
            syncLabel = '步调一致 (同相同长度)';
        } else if (sameLen && isAnti) {
            syncLabel = '步调相反 (反相)';
        } else if (!sameLen && Math.abs(periodRatio - Math.round(periodRatio)) < 0.05) {
            syncLabel = '周期整数比, 部分步调一致';
        } else {
            syncLabel = '步调不同 (长度不同)';
        }

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '摆1周期',
                formula: 'T1 = 2*pi*sqrt(L1/g)',
                calculation: `T1 = 2*pi*sqrt(${L1}/${g}) = ${T1.toFixed(4)}s`
            },
            {
                order: 2,
                description: '摆2周期',
                formula: 'T2 = 2*pi*sqrt(L2/g)',
                calculation: `T2 = 2*pi*sqrt(${L2}/${g}) = ${T2.toFixed(4)}s`
            },
            {
                order: 3,
                description: '步调判定',
                formula: '同相 + 同长度 => 步调一致',
                result: syncLabel
            }
        ];

        const warnings: string[] = [];
        if ((th1Amp * 180) / Math.PI > 15) warnings.push('摆1初始角过大, 小角度近似失效');
        if ((th2Amp * 180) / Math.PI > 15) warnings.push('摆2初始角过大, 小角度近似失效');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                theta_t: theta1Series,
                y_t: theta2Series
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    T1,
                    T2,
                    omega1,
                    omega2,
                    periodRatio,
                    maxTheta1Deg: Math.abs((th1Amp * 180) / Math.PI),
                    maxTheta2Deg: Math.abs((th2Amp * 180) / Math.PI)
                },
                flags: {
                    sameLength: sameLen,
                    inPhase: isInPhase,
                    antiPhase: isAnti
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `双单摆: L1=${L1}m (T1=${T1.toFixed(3)}s), L2=${L2}m (T2=${T2.toFixed(3)}s), 相位差=${c.phaseDiff.toFixed(0)} deg; ${syncLabel}`,
                steps,
                formulas: [
                    {
                        name: '单摆周期',
                        formula: 'T = 2*pi*sqrt(L/g)',
                        variables: {
                            L1: { value: L1, unit: 'm' },
                            T1: { value: T1, unit: 's' },
                            L2: { value: L2, unit: 'm' },
                            T2: { value: T2, unit: 's' }
                        }
                    },
                    { name: '步调一致条件', formula: '等长同相', variables: {} }
                ]
            },
            errors: [],
            warnings
        };
    }
}
