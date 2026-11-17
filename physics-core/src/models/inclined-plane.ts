import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';
import type { SimulationResult, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { PHYSICS_CONSTANTS } from '../units/constants.js';
import { Vec2 } from '../math/vector2d.js';
import { maxOf } from '../math/reduce.js';

/** 判定"有下滑初速"的速度阈值 (m/s) —— 低于此视为静止释放 */
const VELOCITY_EPS = 1e-9;

/** 斜面运动模型 */
export class InclinedPlaneModel extends PhysicsModelBase {
    readonly name = '斜面运动';
    readonly version = '1.0.0';
    readonly description = '物体在斜面上受重力、支持力和摩擦力作用的运动';
    readonly modelType = 'inclined-plane' as const;
    readonly assumptions = ['物体视为质点', '斜面为刚性平面', '重力加速度恒定', '摩擦系数恒定', '忽略空气阻力'];
    readonly applicableRange = '适用于物体在斜面上的运动，含或不含摩擦力';
    readonly errorSources = ['实际摩擦系数可能随速度变化', '斜面可能非理想刚性', '空气阻力被忽略'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'angle', description: '斜面倾角 (°)', unit: '°', required: true, min: 0, max: 90 },
        {
            name: 'frictionCoefficient',
            description: '动摩擦系数 μ',
            unit: '',
            required: false,
            min: 0,
            defaultValue: 0
        },
        {
            name: 'gravity',
            description: '重力加速度',
            unit: 'm/s²',
            required: false,
            defaultValue: PHYSICS_CONSTANTS.g.value
        }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0];
        const m = body.mass.value;
        const v0 = body.velocity;
        const x0 = body.position;

        const angleDeg = problem.constraints?.inclinedPlane?.angle ?? 30;
        const angleRad = (angleDeg * Math.PI) / 180;
        const mu = problem.constraints?.inclinedPlane?.frictionCoefficient ?? 0;
        const g = problem.environment?.gravity?.value ?? PHYSICS_CONSTANTS.g.value;

        const sinTheta = Math.sin(angleRad);
        const cosTheta = Math.cos(angleRad);

        // 力的分解
        const gravityParallel = m * g * sinTheta; // F∥ = mg sinθ (沿斜面向下)
        const normalForce = m * g * cosTheta; // N = mg cosθ
        const frictionForce = mu * normalForce; // f = μN

        // 沿斜面加速度 (向下为正): 下滑/向下运动用 aDown = g(sinθ - μcosθ); 上滑用 aUp = g(sinθ + μcosθ)
        const aDown = g * (sinTheta - mu * cosTheta);
        const aUp = g * (sinTheta + mu * cosTheta);

        // 沿斜面方向的单位向量 (向下为正)
        const inclineDir = { x: cosTheta, y: -sinTheta };
        // 垂直斜面方向 (指向斜面上方)
        const normalDir = { x: sinTheta, y: cosTheta };

        // 初始沿斜面向下的速度分量 (m/s; 负值表示沿斜面向上)
        const v0Along = Vec2.dot(v0, inclineDir);

        /**
         * 静摩擦判据 (tanθ ≤ μ):
         * 静摩擦只能在 v∥ = 0 时保持静止, 不能在零时刻刹停已经在运动的物体:
         *   - v∥ < 0 (上滑)   : 动摩擦沿斜面向下, 加速度 aUp = g(sinθ + μcosθ) 使其减速;
         *                       过零时刻若 tanθ ≤ μ 则驻留最高点, 否则以 aDown = g(sinθ - μcosθ) 折返下滑
         *   - v∥ = 0 & tanθ≤μ : 静摩擦保持静止
         *   - v∥ > 0 (下滑)   : 动摩擦沿斜面向上, 加速度 aDown = g(sinθ - μcosθ)
         */
        const staticCanHold = sinTheta <= mu * cosTheta + 1e-10;
        const movingUpInitially = v0Along < -VELOCITY_EPS;
        const isMoving = movingUpInitially || !staticCanHold || v0Along > VELOCITY_EPS;

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;

        /**
         * 斜面长度与「上下边界截断」(#159 / #169):
         * 显式给出 inclineLength 时, 有效斜面区间为 s ∈ [0, inclineLength]:
         *   - 上滑到达顶端 s <= 0 截断停在顶端 s = 0
         *   - 下滑到达底端 s >= inclineLength 截断停在底端 s = inclineLength
         * 未给出时保持无界斜面行为 (或由起点高度反推长度用于诊断)。
         */
        const declaredLength = problem.constraints?.inclinedPlane?.inclineLength;
        const hasDeclaredLength = typeof declaredLength === 'number' && declaredLength > 0;
        const h = Math.abs(x0.y) || 10;
        const totalInclineLength = hasDeclaredLength
            ? (declaredLength as number)
            : sinTheta > 0
              ? h / sinTheta
              : Number.POSITIVE_INFINITY;
        const finiteBounds = hasDeclaredLength && sinTheta > 0;

        // 识别初位置在标准斜面 [0, L] 上的坐标 s0 (顶端 (0, L·sinθ) → s=0, 底端 (L·cosθ, 0) → s=L)
        const canonicalTop = finiteBounds ? { x: 0, y: totalInclineLength * sinTheta } : x0;
        const relX0 = Vec2.sub(x0, canonicalTop);
        const onCanonicalLine =
            finiteBounds &&
            Math.abs(Vec2.dot(relX0, normalDir)) < 1e-4 &&
            Vec2.dot(relX0, inclineDir) >= -1e-6 &&
            Vec2.dot(relX0, inclineDir) <= totalInclineLength + 1e-6;
        const s0 = onCanonicalLine ? Math.min(totalInclineLength, Math.max(0, Vec2.dot(relX0, inclineDir))) : 0;
        const topPos = onCanonicalLine ? canonicalTop : x0;

        // 分段运动学临界时刻预计算
        const tPeak = movingUpInitially && aUp > 1e-12 ? -v0Along / aUp : Number.POSITIVE_INFINITY;
        const sPeak =
            movingUpInitially && Number.isFinite(tPeak) ? s0 + v0Along * tPeak + 0.5 * aUp * tPeak * tPeak : s0;
        const hitsTop =
            movingUpInitially &&
            finiteBounds &&
            (s0 <= 1e-12 || (Number.isFinite(tPeak) && sPeak <= 1e-12) || (aUp <= 1e-12 && s0 > 0));
        let tTop = Number.POSITIVE_INFINITY;
        if (hitsTop) {
            if (s0 <= 1e-12) {
                tTop = 0;
            } else if (aUp > 1e-12) {
                const discTop = Math.max(0, v0Along * v0Along - 2 * aUp * s0);
                tTop = Math.max(0, (-v0Along - Math.sqrt(discTop)) / aUp);
            } else {
                tTop = s0 / -v0Along;
            }
        }

        const deceleratingDown = !movingUpInitially && staticCanHold && isMoving && aDown < 0;
        const stopTimeDown = deceleratingDown ? v0Along / -aDown : Number.POSITIVE_INFINITY;

        /** 计算任意时刻 t 的沿斜面位置 s (m)、速度 (m/s) 与加速度 (m/s²) */
        const stateAt = (t: number): { s: number; vAlong: number; aAlong: number } => {
            if (!isMoving) return { s: s0, vAlong: 0, aAlong: 0 };

            if (movingUpInitially) {
                if (hitsTop && t >= tTop) {
                    return { s: 0, vAlong: 0, aAlong: 0 };
                }
                if (t <= tPeak) {
                    const s = s0 + v0Along * t + 0.5 * aUp * t * t;
                    return {
                        s: finiteBounds ? Math.max(0, Math.min(totalInclineLength, s)) : s,
                        vAlong: v0Along + aUp * t,
                        aAlong: aUp
                    };
                }
                if (staticCanHold) {
                    return { s: sPeak, vAlong: 0, aAlong: 0 };
                }
                const dt = t - tPeak;
                const sRaw = sPeak + 0.5 * aDown * dt * dt;
                if (finiteBounds && sRaw >= totalInclineLength) {
                    return { s: totalInclineLength, vAlong: 0, aAlong: 0 };
                }
                return { s: sRaw, vAlong: aDown * dt, aAlong: aDown };
            }

            if (deceleratingDown && t > stopTimeDown) {
                const sStop = s0 + v0Along * stopTimeDown + 0.5 * aDown * stopTimeDown * stopTimeDown;
                if (finiteBounds && sStop >= totalInclineLength) {
                    return { s: totalInclineLength, vAlong: 0, aAlong: 0 };
                }
                return { s: sStop, vAlong: 0, aAlong: 0 };
            }
            const sRaw = s0 + v0Along * t + 0.5 * aDown * t * t;
            if (finiteBounds && sRaw >= totalInclineLength) {
                return { s: totalInclineLength, vAlong: 0, aAlong: 0 };
            }
            return { s: sRaw, vAlong: v0Along + aDown * t, aAlong: aDown };
        };

        // 解析解采样: 斜面分段运动 (公共脚手架 sampleTrajectory)
        const initialAccel = movingUpInitially ? aUp : isMoving ? aDown : 0;
        const trajectory = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => {
                const { s, vAlong: vAlongIncline, aAlong } = stateAt(t);
                const position = Vec2.add(topPos, Vec2.scale(inclineDir, s));
                const velocity = Vec2.scale(inclineDir, vAlongIncline);
                const speed = Math.abs(vAlongIncline);
                const accelVec = aAlong === 0 ? Vec2.zero() : Vec2.scale(inclineDir, aAlong);

                return {
                    position,
                    velocity,
                    acceleration: accelVec,
                    kineticEnergy: kineticEnergy(m, speed),
                    potentialEnergy: m * g * position.y
                };
            }
        });

        // 关键帧
        const keyframes: Keyframe[] = [];
        const startWhere =
            finiteBounds && Math.abs(s0 - totalInclineLength) < 1e-6
                ? '底端'
                : s0 > 1e-6
                  ? `s=${s0.toFixed(2)}m 处`
                  : '顶端';
        keyframes.push({
            label: '起始点',
            t: 0,
            position: { ...x0 },
            velocity: { ...v0 },
            description: `物体在斜面${startWhere}，倾角 ${angleDeg}°，摩擦系数 μ=${mu}`
        });

        const warnings: string[] = [];
        if (!isMoving) {
            keyframes.push({
                label: '物体静止',
                t: duration,
                position: { ...x0 },
                velocity: Vec2.zero(),
                description: `tanθ = ${(sinTheta / Math.max(cosTheta, 1e-12)).toFixed(4)} ≤ μ = ${mu}，且初速度为 0，静摩擦保持静止`
            });
            warnings.push(`物体在 ${angleDeg}° 斜面上因摩擦力大于重力分量而保持静止`);
        } else if (movingUpInitially) {
            if (hitsTop && tTop <= duration) {
                const posTop = { ...topPos };
                keyframes.push({
                    label: '到达顶端',
                    t: tTop,
                    position: posTop,
                    velocity: Vec2.zero(),
                    description: `沿斜面上滑以 a_up=${aUp.toFixed(2)} m/s² 减速，在 t=${tTop.toFixed(3)}s 抵达斜面顶端 s=0 并截断停住`
                });
                warnings.push(`物体上滑至斜面顶端 (s=0, t=${tTop.toFixed(3)}s) 处截断停住，未越出斜面`);
            } else if (!hitsTop && tPeak <= duration) {
                const posPeak = Vec2.add(topPos, Vec2.scale(inclineDir, sPeak));
                if (staticCanHold) {
                    keyframes.push({
                        label: '停下',
                        t: tPeak,
                        position: posPeak,
                        velocity: Vec2.zero(),
                        description: `上滑初速 ${(-v0Along).toFixed(2)} m/s, 动摩擦 a_up=${aUp.toFixed(2)} m/s², t=${tPeak.toFixed(3)}s 停在 s=${sPeak.toFixed(2)}m 后静摩擦持住`
                    });
                    warnings.push(
                        `tanθ = ${(sinTheta / Math.max(cosTheta, 1e-12)).toFixed(4)} ≤ μ = ${mu}，上滑减速在 t=${tPeak.toFixed(3)}s 到达最高点后静摩擦保持静止`
                    );
                } else {
                    keyframes.push({
                        label: '最高点折返',
                        t: tPeak,
                        position: posPeak,
                        velocity: Vec2.zero(),
                        description: `t=${tPeak.toFixed(3)}s 速度归零 (s=${sPeak.toFixed(2)}m)，动摩擦方向反转为沿斜面向上，以 a_down=${aDown.toFixed(2)} m/s² 折返下滑`
                    });
                    if (sinTheta > 0 && aDown > 0 && Number.isFinite(totalInclineLength)) {
                        const remain = Math.max(0, totalInclineLength - sPeak);
                        const tBottom = tPeak + Math.sqrt((2 * remain) / aDown);
                        if (tBottom <= duration) {
                            const posAtEnd = Vec2.add(topPos, Vec2.scale(inclineDir, totalInclineLength));
                            const vAtEnd = aDown * (tBottom - tPeak);
                            keyframes.push({
                                label: '到达底端',
                                t: tBottom,
                                position: posAtEnd,
                                velocity: Vec2.scale(inclineDir, vAtEnd),
                                description: `物体折返后在 t=${tBottom.toFixed(3)}s 到达斜面底端，速度 ${vAtEnd.toFixed(2)} m/s`
                            });
                        }
                    }
                }
            }
        } else if (deceleratingDown) {
            const sStop = s0 + v0Along * stopTimeDown + 0.5 * aDown * stopTimeDown * stopTimeDown;
            const posStop = Vec2.add(topPos, Vec2.scale(inclineDir, sStop));
            keyframes.push({
                label: '停下',
                t: stopTimeDown,
                position: posStop,
                velocity: Vec2.zero(),
                description: `初速 ${v0Along.toFixed(2)} m/s, 动摩擦 a=${aDown.toFixed(2)} m/s², t=${stopTimeDown.toFixed(3)}s 停下后保持静止`
            });
            warnings.push(
                `tanθ = ${(sinTheta / Math.max(cosTheta, 1e-12)).toFixed(4)} ≤ μ = ${mu}，但物体已有下滑初速 ${v0Along.toFixed(2)} m/s，动摩擦使其减速并在 t=${stopTimeDown.toFixed(3)}s 停下`
            );
        } else if (sinTheta > 0) {
            const remain = totalInclineLength - s0;
            if (aDown > 0 && remain >= 0) {
                const discriminant = v0Along * v0Along + 2 * aDown * remain;
                if (discriminant >= 0) {
                    const tEnd = (-v0Along + Math.sqrt(discriminant)) / aDown;
                    if (tEnd > 0 && tEnd <= duration) {
                        const posAtEnd = Vec2.add(topPos, Vec2.scale(inclineDir, totalInclineLength));
                        const vAtEnd = Math.sqrt(v0Along * v0Along + 2 * aDown * remain);
                        keyframes.push({
                            label: '到达底端',
                            t: tEnd,
                            position: posAtEnd,
                            velocity: Vec2.scale(inclineDir, vAtEnd),
                            description: `物体在 t=${tEnd.toFixed(3)}s 到达斜面底端，速度 ${vAtEnd.toFixed(2)} m/s`
                        });
                    }
                }
            }
        } else if (Math.abs(v0Along) > VELOCITY_EPS) {
            keyframes.push({
                label: '匀速滑行',
                t: duration,
                position: trajectory[trajectory.length - 1].position,
                velocity: Vec2.scale(inclineDir, v0Along),
                description: `θ=0 且 μ=0：水平面无摩擦也无重力分量，保持 ${Math.abs(v0Along).toFixed(2)} m/s 匀速直线运动`
            });
        }

        const finalPos = trajectory[trajectory.length - 1].position;
        keyframes.push({
            label: '终点',
            t: duration,
            position: finalPos,
            velocity: trajectory[trajectory.length - 1].velocity,
            description: `t=${duration}s 时位置 (${finalPos.x.toFixed(3)}, ${finalPos.y.toFixed(3)})`
        });

        // 图表数据
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '沿斜面位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({
                x: p.t,
                y: Vec2.dot(Vec2.sub(p.position, x0), inclineDir)
            }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '沿斜面速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({
                x: p.t,
                y: Vec2.dot(p.velocity, inclineDir)
            }))
        };
        const a_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '沿斜面加速度',
            xUnit: 's',
            yUnit: 'm/s²',
            points: trajectory.map(p => ({
                x: p.t,
                y: p.acceleration ? Vec2.dot(p.acceleration, inclineDir) : 0
            }))
        };

        // 受力分析图 (t=0 瞬时受力: 上滑时动摩擦沿斜面向下, 下滑时动摩擦沿斜面向上)
        const frictionSigned = movingUpInitially ? frictionForce : -frictionForce;
        const forces = [
            {
                name: '重力分量(F∥)',
                vector: Vec2.scale(inclineDir, gravityParallel),
                magnitude: gravityParallel,
                unit: 'N'
            },
            { name: '支持力(N)', vector: Vec2.scale(normalDir, normalForce), magnitude: normalForce, unit: 'N' },
            { name: '摩擦力(f)', vector: Vec2.scale(inclineDir, frictionSigned), magnitude: frictionForce, unit: 'N' }
        ];
        const netForceMag = isMoving ? gravityParallel + frictionSigned : 0;
        const forceDiagram: ForceDiagram = {
            bodyId: body.id,
            forces,
            netForce: Vec2.scale(inclineDir, netForceMag)
        };

        // 临界角
        const criticalAngle = mu > 0 ? (Math.atan(mu) * 180) / Math.PI : 0;
        const accelFormulaText = movingUpInitially ? 'a = g(sinθ + μcosθ)' : 'a = g(sinθ - μcosθ)';

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, v_t, a_t, force_diagram: forceDiagram },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    maxSpeed: maxOf(trajectory.map(p => Vec2.magnitude(p.velocity))),
                    maxAcceleration: initialAccel,
                    normalForce,
                    frictionForce,
                    criticalAngle,
                    /** 斜面长度 (m) —— 显式给出约束时为该长度, 否则由起点高度反推; -1 = 无限斜面 */
                    inclineLength: Number.isFinite(totalInclineLength) ? totalInclineLength : -1
                },
                rangeCheck: {
                    withinRange: true,
                    warnings: !isMoving
                        ? [
                              `tanθ = ${(sinTheta / Math.max(cosTheta, 1e-12)).toFixed(4)} ≤ μ = ${mu} 且初速度为 0，静摩擦保持静止`
                          ]
                        : []
                }
            },
            explanation: {
                summary: !isMoving
                    ? `倾角 ${angleDeg}° ≤ 临界角 ${criticalAngle.toFixed(1)}° (tanθ = ${(sinTheta / Math.max(cosTheta, 1e-12)).toFixed(4)} ≤ μ = ${mu}) 且初速度为 0，物体静止`
                    : isMoving && sinTheta <= 1e-12 && mu === 0
                      ? `水平面 (θ=0) 无摩擦，物体以 ${Math.abs(v0Along).toFixed(2)} m/s 匀速直线滑行 (a=0)`
                      : movingUpInitially
                        ? `物体沿 ${angleDeg}° 斜面上滑减速 (a_up = g(sinθ + μcosθ) = ${aUp.toFixed(2)} m/s²)${staticCanHold ? '，停在最高点' : `，过零后若未到顶则以 a_down = ${aDown.toFixed(2)} m/s² 折返下滑`}`
                        : `物体沿 ${angleDeg}° 斜面运动，加速度 a = g(sinθ - μcosθ) = ${initialAccel.toFixed(2)} m/s²`,
                steps: [
                    {
                        order: 1,
                        description: '分解重力',
                        formula: 'F∥ = mg sinθ, N = mg cosθ',
                        calculation: `F∥ = ${m}×${g}×sin${angleDeg}° = ${gravityParallel.toFixed(2)} N, N = ${m}×${g}×cos${angleDeg}° = ${normalForce.toFixed(2)} N`
                    },
                    {
                        order: 2,
                        description: '计算摩擦力',
                        formula: 'f = μN',
                        calculation: `f = ${mu}×${normalForce.toFixed(2)} = ${frictionForce.toFixed(2)} N`
                    },
                    {
                        order: 3,
                        description: movingUpInitially ? '计算上滑期加速度' : '计算加速度',
                        formula: accelFormulaText,
                        calculation: movingUpInitially
                            ? `a_up = ${g}×(sin${angleDeg}° + ${mu}×cos${angleDeg}°) = ${aUp.toFixed(2)} m/s²`
                            : `a = ${g}×(sin${angleDeg}° - ${mu}×cos${angleDeg}°) = ${initialAccel.toFixed(2)} m/s²`
                    },
                    {
                        order: 4,
                        description: '临界角条件',
                        formula: 'tanθ = μ',
                        calculation: `θ_critical = arctan(${mu}) = ${criticalAngle.toFixed(1)}°`
                    }
                ],
                formulas: [
                    {
                        name: '重力分量',
                        formula: 'F∥ = mg sinθ',
                        variables: {
                            m: { value: m, unit: 'kg' },
                            g: { value: g, unit: 'm/s²' },
                            θ: { value: angleDeg, unit: '°' }
                        }
                    },
                    {
                        name: '支持力',
                        formula: 'N = mg cosθ',
                        variables: {
                            m: { value: m, unit: 'kg' },
                            g: { value: g, unit: 'm/s²' },
                            θ: { value: angleDeg, unit: '°' }
                        }
                    },
                    {
                        name: '摩擦力',
                        formula: 'f = μN',
                        variables: { μ: { value: mu, unit: '' }, N: { value: normalForce, unit: 'N' } }
                    },
                    {
                        name: '加速度',
                        formula: accelFormulaText,
                        variables: {
                            g: { value: g, unit: 'm/s²' },
                            sinθ: { value: sinTheta, unit: '' },
                            μcosθ: { value: mu * cosTheta, unit: '' }
                        }
                    },
                    {
                        name: '临界角',
                        formula: 'tanθ = μ',
                        variables: { μ: { value: mu, unit: '' }, θ_critical: { value: criticalAngle, unit: '°' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
