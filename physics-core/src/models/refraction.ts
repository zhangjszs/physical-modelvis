import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 折射定律模型 — 光的折射与全反射 (选必一 第四章)
 *
 * Snell 定律：n₁·sinθ₁ = n₂·sinθ₂
 *   入射角 θ₁, 折射角 θ₂ (相对法线)
 *   全反射条件：n₁ > n₂ 且 θ₁ ≥ θ_c = arcsin(n₂/n₁)
 *
 * 本模型为静态分析解：给定 n₁/n₂/θ₁，求 θ₂ (或全反射警告)
 * 图表：sinθ₁-sinθ₂ 线性验证, 光路示意图数据
 */
export class RefractionModel extends PhysicsModelBase {
    readonly name = '光的折射定律';
    readonly version = '1.0.0';
    readonly description = 'Snell 定律 n₁sinθ₁=n₂sinθ₂、全反射临界角';
    readonly modelType = 'refraction' as const;
    readonly assumptions = ['光在均匀介质中直线传播', '界面为平面', '理想单色光 (无色散)', '不考虑吸收'];
    readonly applicableRange = '平面界面的折射与全反射；介质折射率 1.0 ~ 2.5';
    readonly errorSources = ['实际光有反射+折射 (能量分配未模拟)', '色散使 n 随波长变化', '界面非理想平面'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'n1', description: '介质 1 折射率', unit: '', required: true, min: 1, max: 3 },
        { name: 'n2', description: '介质 2 折射率', unit: '', required: true, min: 1, max: 3 },
        { name: 'incidentAngleDeg', description: '入射角 (度)', unit: '°', required: true, min: 0, max: 89 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const rc = problem.constraints?.refraction;
        if (!rc) throw new Error('refraction 模型需要 refraction 约束配置');

        const n1 = rc.n1;
        const n2 = rc.n2;
        const theta1Deg = rc.incidentAngleDeg;
        const theta1Rad = (theta1Deg * Math.PI) / 180;

        // Snell 定律：n₁sinθ₁ = n₂sinθ₂ → sinθ₂ = (n₁/n₂)·sinθ₁
        const sinTheta1 = Math.sin(theta1Rad);
        const sinTheta2 = (n1 / n2) * sinTheta1;

        // 全反射判断 (n₁ > n₂ 且 sinθ₂ ≥ 1)
        const totalInternalReflection = sinTheta2 >= 1;
        const theta2Rad = totalInternalReflection ? NaN : Math.asin(Math.min(1, sinTheta2));
        const theta2Deg = totalInternalReflection ? NaN : (theta2Rad * 180) / Math.PI;

        // 临界角 (仅 n₁ > n₂ 时有意义)
        const criticalAngleDeg = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : NaN;

        // 反射定律：反射角恒等于入射角
        const reflectThetaRad = theta1Rad;
        const reflectThetaDeg = theta1Deg;

        // 构建图表：sinθ₁-sinθ₂ 线性关系 (n₂ 固定, θ₁ 从 0 到 80° 变化)
        const sinRelation: ChartSeries = {
            xLabel: 'sinθ₁',
            yLabel: 'sinθ₂',
            xUnit: '',
            yUnit: '',
            points: []
        };
        for (let deg = 0; deg <= 80; deg += 5) {
            const t1 = (deg * Math.PI) / 180;
            const s1 = Math.sin(t1);
            const s2 = (n1 / n2) * s1;
            if (s2 <= 1) {
                sinRelation.points.push({ x: parseFloat(s1.toFixed(4)), y: parseFloat(s2.toFixed(4)) });
            } else {
                // 全反射后 sinθ₂ 不存在, 仅画水平参考线 y=1
                sinRelation.points.push({ x: parseFloat(s1.toFixed(4)), y: 1 });
            }
        }

        // 折射角随入射角变化图 (重点展示当前点 + 临界角)
        const angleRelation: ChartSeries = {
            xLabel: '入射角 θ₁ (°)',
            yLabel: '折射角 θ₂ (°)',
            xUnit: '°',
            yUnit: '°',
            points: []
        };
        for (let deg = 0; deg <= 80; deg += 5) {
            const t1 = (deg * Math.PI) / 180;
            const s2 = (n1 / n2) * Math.sin(t1);
            if (s2 < 1) {
                angleRelation.points.push({ x: deg, y: parseFloat(((Math.asin(s2) * 180) / Math.PI).toFixed(2)) });
            }
        }

        // 光路图数据 (用于渲染：入射/反射/折射光线端点)
        const L = 1.0; // 示意光线长度 (归一化)
        const interfaceY = 0; // 界面 y=0
        const normalX = 0; // 法线 x=0
        // 入射光线：从介质 1 (y>0) 入射到 (0, 0)
        const incidentEndX = normalX;
        const incidentEndY = interfaceY;
        const incidentStartX = normalX - L * Math.sin(theta1Rad);
        const incidentStartY = interfaceY + L * Math.cos(theta1Rad);
        // 反射光线：从 (0,0) 反射回介质 1
        const reflectEndX = normalX + L * Math.sin(reflectThetaRad);
        const reflectEndY = interfaceY + L * Math.cos(reflectThetaRad);
        // 折射光线：仅在非全反射时存在
        const refractEndX = totalInternalReflection ? NaN : normalX - L * Math.sin(theta2Rad);
        const refractEndY = totalInternalReflection ? NaN : interfaceY - L * Math.cos(theta2Rad);

        // 关键帧 (静态模型仅供演示, 构造单一帧)
        const keyframes: Keyframe[] = [
            {
                label: totalInternalReflection ? '全反射' : '折射',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: totalInternalReflection
                    ? `θ₁=${theta1Deg}° > θ_c=${criticalAngleDeg.toFixed(1)}°, 全反射 (sinθ₂=${sinTheta2.toFixed(3)} > 1)`
                    : `θ₁=${theta1Deg}° → θ₂=${theta2Deg.toFixed(1)}° (${n1}·sin${theta1Deg}°=${(n1 * sinTheta1).toFixed(3)} = ${n2}·sin${theta2Deg.toFixed(1)}°=${(n2 * (totalInternalReflection ? NaN : Math.sin(theta2Rad))).toFixed(3)})`
            }
        ];

        // 构造示意轨迹 (仅 2 个起始点 + 一个终点，用于 Canvas 渲染)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: incidentStartX, y: incidentStartY },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            },
            {
                t: 0,
                position: { x: incidentEndX, y: incidentEndY },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];
        if (!totalInternalReflection) {
            trajectory.push({
                t: 0,
                position: { x: refractEndX, y: refractEndY },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }
        trajectory.push({
            t: 0,
            position: { x: reflectEndX, y: reflectEndY },
            velocity: { x: 0, y: 0 },
            kineticEnergy: 0,
            potentialEnergy: 0
        });

        const warnings: string[] = [];
        if (totalInternalReflection) {
            warnings.push(`全反射: 入射角 ${theta1Deg}° 超过临界角 θ_c=${criticalAngleDeg.toFixed(1)}° (${n1}→${n2})`);
        }
        if (theta1Deg > 85) {
            warnings.push('入射角过大，可能已接近掠射 (grazing incidence)');
        }

        // 计算步骤
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: 'Snell 定律',
                formula: 'n₁sinθ₁ = n₂sinθ₂',
                calculation: `${n1} × sin${theta1Deg}° = ${n2} × sinθ₂ → sinθ₂ = ${(n1 / n2).toFixed(3)} × ${sinTheta1.toFixed(3)} = ${sinTheta2.toFixed(3)}`
            },
            {
                order: 2,
                description: totalInternalReflection ? '全反射 (sinθ₂ ≥ 1, 无折射光)' : '折射角',
                formula: totalInternalReflection ? '全反射' : 'θ₂ = arcsin(sinθ₂)',
                calculation: totalInternalReflection
                    ? `sinθ₂=${sinTheta2.toFixed(3)} ≥ 1 → 全反射, 临界角 θ_c = arcsin(${n2}/${n1}) = ${criticalAngleDeg.toFixed(1)}°`
                    : `θ₂ = arcsin(${sinTheta2.toFixed(3)}) = ${theta2Deg.toFixed(1)}°`
            },
            {
                order: 3,
                description: '反射定律',
                formula: 'θ_r = θ₁',
                calculation: `反射角 θ_r = ${reflectThetaDeg}° = 入射角 θ₁`
            }
        ];

        return {
            meta: {
                model: 'refraction',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: sinRelation, y_t: angleRelation },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    criticalAngleDeg: isNaN(criticalAngleDeg) ? -1 : criticalAngleDeg,
                    totalInternalReflection: totalInternalReflection ? 1 : 0,
                    sinTheta1: sinTheta1,
                    sinTheta2: isNaN(sinTheta2) ? 1 : sinTheta2,
                    refractionAngleDeg: isNaN(theta2Deg) ? -1 : theta2Deg,
                    n1,
                    n2
                },
                rangeCheck: { withinRange: !totalInternalReflection, warnings }
            },
            explanation: {
                summary: totalInternalReflection
                    ? `全反射: θ₁=${theta1Deg}°≥θ_c=${criticalAngleDeg.toFixed(1)}° (${n1}→${n2})`
                    : `折射: ${n1}·sin${theta1Deg}° = ${n2}·sin${theta2Deg.toFixed(1)}° → θ₂=${theta2Deg.toFixed(1)}°`,
                steps,
                formulas: [
                    {
                        name: 'Snell 定律',
                        formula: 'n₁sinθ₁=n₂sinθ₂',
                        variables: {
                            n1: { value: n1, unit: '' },
                            n2: { value: n2, unit: '' },
                            'θ₁': { value: theta1Deg, unit: '°' },
                            'θ₂': { value: isNaN(theta2Deg) ? 0 : theta2Deg, unit: '°' }
                        }
                    },
                    {
                        name: '临界角',
                        formula: 'θ_c = arcsin(n₂/n₁) (n₁>n₂)',
                        variables: { n1: { value: n1, unit: '' }, n2: { value: n2, unit: '' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
