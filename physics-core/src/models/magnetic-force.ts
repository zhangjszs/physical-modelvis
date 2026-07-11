import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 安培力与洛伦兹力模型 — 选必二 第一章
 *
 * 安培力: F = B·I·L·sinθ   (通电导线在磁场中受力)
 *   方向: 左手定则 (磁穿掌心, 四指电流, 拇指力)
 *
 * 洛伦兹力: F = q·v·B·sinφ   (运动电荷在磁场中受力)
 *   方向: 左手定则 (四指正电荷运动方向; 负电荷反向)
 *
 * 圆周运动 (带电粒子垂直入射匀强磁场)：
 *   qvB = mv²/r  → r = mv/(qB)    T = 2πm/(qB)
 */

export class MagneticForceModel extends PhysicsModelBase {
    readonly name = '安培力与洛伦兹力';
    readonly version = '1.0.0';
    readonly description = 'F=BIL·sinθ 安培力; F=qvB·sinφ 洛伦兹力; 圆周运动半径';
    readonly modelType = 'magnetic-force' as const;
    readonly assumptions = ['匀强磁场', '导线/粒子速度垂直于磁场方向时为典型情况 (可指定夹角)', '忽略重力'];
    readonly applicableRange = '恒定磁场; 电流 0-30A; 速度非相对论性 (v≪c)';
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'magneticField', description: '磁感应强度 B (T)', unit: 'T', required: true, min: 0.001, max: 10 },
        { name: 'current', description: '电流 I (A)', unit: 'A', required: false, min: 0, max: 100 },
        { name: 'charge', description: '电荷 q (C)', unit: 'C', required: false, max: 1 }
    ];
    readonly errorSources = ['实际磁场边缘不均匀', '高速时需考虑质量增加 (相对论)'];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const mc = problem.constraints?.magneticForce;
        if (!mc) throw new Error('magnetic-force 模型需要 magneticForce 约束配置');

        const B = mc.magneticField;
        const hasAmpere = (mc.current ?? 0) > 0 && (mc.wireLength ?? 0) > 0;
        const hasLorentz = (mc.charge ?? 0) !== 0 && (mc.velocity ?? 0) > 0;

        let ampereForce = 0;
        let ampereForceTheta = 0;
        if (hasAmpere) {
            const I = mc.current!;
            const L = mc.wireLength!;
            const thetaDeg = mc.wireAngleDeg ?? 90;
            const thetaRad = (thetaDeg * Math.PI) / 180;
            ampereForce = B * I * L * Math.sin(thetaRad);
            ampereForceTheta = thetaDeg;
        }

        let lorentzForce = 0;
        let lorentzAngle = 0;
        let radius = 0;
        let period = 0;
        if (hasLorentz) {
            const q = mc.charge!;
            const v = mc.velocity!;
            const phiDeg = mc.velocityAngleDeg ?? 90;
            const phiRad = (phiDeg * Math.PI) / 180;
            lorentzForce = Math.abs(q) * v * B * Math.sin(phiRad);
            lorentzAngle = phiDeg;
            // 圆周运动 (φ = 90° 时粒子做匀速圆周)
            if (phiDeg === 90 && (mc.particleMass ?? 0) > 0) {
                radius = (mc.particleMass! * v) / (Math.abs(q) * B);
                period = (2 * Math.PI * mc.particleMass!) / (Math.abs(q) * B);
            }
        }

        // F-θ 图（安培力大小随导线与磁场夹角变化）
        const F_theta: ChartSeries = {
            xLabel: '夹角 θ (°)',
            yLabel: '力 F (N)',
            xUnit: '°',
            yUnit: 'N',
            points: []
        };
        const labelAmpere = hasAmpere;
        for (let deg = 0; deg <= 180; deg += 5) {
            const thetaRad = (deg * Math.PI) / 180;
            if (labelAmpere) {
                const F = B * (mc.current ?? 0) * (mc.wireLength ?? 0) * Math.sin(thetaRad);
                F_theta.points.push({ x: deg, y: parseFloat(F.toFixed(4)) });
            } else {
                const F = Math.abs(mc.charge ?? 0) * (mc.velocity ?? 0) * B * Math.sin(thetaRad);
                F_theta.points.push({ x: deg, y: parseFloat(F.toFixed(4)) });
            }
        }

        // 圆周轨迹数据（如果适用）
        const circularPath: TrajectoryPoint[] = [];
        if (radius > 0 && period > 0) {
            const steps = 200;
            for (let i = 0; i <= steps; i++) {
                const omega_t = (2 * Math.PI * i) / steps;
                const x = radius * Math.cos(omega_t);
                const y = radius * Math.sin(omega_t);
                circularPath.push({
                    t: i / steps,
                    position: { x: parseFloat(x.toFixed(5)), y: parseFloat(y.toFixed(5)) },
                    velocity: {
                        x: parseFloat((((-radius * Math.sin(omega_t)) / period) * 2 * Math.PI).toFixed(5)),
                        y: parseFloat((((radius * Math.cos(omega_t)) / period) * 2 * Math.PI).toFixed(5))
                    },
                    kineticEnergy: 0,
                    potentialEnergy: 0
                });
            }
        }

        // 关键帧
        const keyframes: Keyframe[] = [];
        if (hasAmpere) {
            keyframes.push({
                label: '安培力',
                t: 0,
                position: { x: ampereForceTheta, y: ampereForce },
                velocity: { x: 0, y: 0 },
                description: `F=BIL·sin${ampereForceTheta}° = ${B}×${mc.current}×${mc.wireLength}×${Math.sin((ampereForceTheta * Math.PI) / 180).toFixed(2)} = ${ampereForce.toFixed(2)}N`
            });
        }
        if (hasLorentz) {
            keyframes.push({
                label: '洛伦兹力',
                t: 0,
                position: { x: lorentzAngle, y: lorentzForce },
                velocity: { x: 0, y: 0 },
                description: `F=|q|vB·sin${lorentzAngle}°=${lorentzForce.toFixed(2)}N${radius > 0 ? `, 圆周运动 r=${radius.toFixed(3)}m, T=${period.toFixed(3)}s` : ''}`
            });
            if (radius > 0) {
                keyframes.push({
                    label: '圆周轨迹终点',
                    t: 0,
                    position: { x: parseFloat(radius.toFixed(4)), y: 0 },
                    velocity: { x: 0, y: 0 },
                    description: `回旋半径 r=mv/(qB)=${radius.toFixed(3)}m, 周期 T=2πm/(qB)=${period.toFixed(3)}s`
                });
            }
        }

        const warnings: string[] = [];
        if (B > 5) warnings.push('强磁场, 实际电路或粒子加速器才使用');
        if (hasAmpere && (mc.current ?? 0) > 20) warnings.push('大电流, 注意导线和电源安全');

        const stepsExpl: ExplanationStep[] = [];
        if (hasAmpere) {
            stepsExpl.push({
                order: 1,
                description: '安培力公式',
                formula: 'F = B·I·L·sinθ',
                calculation: `F = ${B} × ${mc.current} × ${mc.wireLength} × sin${ampereForceTheta}° = ${ampereForce.toFixed(2)} N`
            });
            stepsExpl.push({
                order: 2,
                description: '左手定则',
                formula: '磁穿掌心, 四指电流, 拇指 = F',
                result: 'F 垂直于 B 与 I 所确定的平面'
            });
        }
        if (hasLorentz) {
            stepsExpl.push({
                order: hasAmpere ? 3 : 1,
                description: '洛伦兹力公式',
                formula: 'F = |q|·v·B·sinφ',
                calculation: `F = ${Math.abs(mc.charge!)} × ${mc.velocity} × ${B} × sin${lorentzAngle}° = ${lorentzForce.toFixed(2)} N`
            });
            stepsExpl.push({
                order: hasAmpere ? 4 : 2,
                description: '洛伦兹力不做功',
                formula: 'F⊥v → P = F·v = 0',
                result: '只改变速度方向, 不改变速率'
            });
            if (radius > 0) {
                stepsExpl.push({
                    order: 5,
                    description: '匀速圆周运动',
                    formula: 'qvB = mv²/r → r = mv/(qB), T = 2πm/(qB)',
                    calculation: `r=${radius.toFixed(4)} m, T=${period.toFixed(4)} s`
                });
            }
        }

        const summaryArr: string[] = [];
        if (hasAmpere) summaryArr.push(`安培力 F=${ampereForce.toFixed(2)}N`);
        if (hasLorentz) summaryArr.push(`洛伦兹力 F=${lorentzForce.toFixed(2)}N`);
        if (radius > 0) summaryArr.push(`回旋 r=${radius.toFixed(3)}m, T=${period.toFixed(3)}s`);
        const summary = summaryArr.join(', ');

        const trajectories = [
            circularPath.length > 0
                ? circularPath
                : [{ t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }]
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories,
            keyframes,
            charts: { x_t: F_theta },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    magneticField: B,
                    ampereForce,
                    lorentzForce,
                    radius,
                    period,
                    hasAmpere: hasAmpere ? 1 : 0,
                    hasLorentz: hasLorentz ? 1 : 0
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: summary || `B=${B} T (待指定电流或粒子参数)`,
                steps: stepsExpl,
                formulas: [
                    {
                        name: '安培力',
                        formula: 'F=BIL·sinθ',
                        variables: { B: { value: B, unit: 'T' }, F: { value: ampereForce, unit: 'N' } }
                    },
                    {
                        name: '洛伦兹力',
                        formula: 'F=|q|vB·sinφ',
                        variables: { B: { value: B, unit: 'T' }, F: { value: lorentzForce, unit: 'N' } }
                    },
                    { name: '圆周半径', formula: 'r=mv/(qB)', variables: { r: { value: radius, unit: 'm' } } }
                ]
            },
            errors: [],
            warnings
        };
    }
}
