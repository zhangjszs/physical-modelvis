import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ConservedQuantity,
    ExplanationStep
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 电流天平模型 — 安培力平衡实验 (选必二第一章)
 *
 * 原理：矩形线圈置于匀强磁场中，通电流后受到安培力；
 *       当天平两侧力矩平衡时，有 m·g = n·B·I·l。
 *
 * 公式：
 *   安培力 (单匝) F₁ = B·I·l  (l 为垂直于磁场方向的导线有效长度)
 *   总力     F = n·B·I·l      (n 匝)
 *   平衡条件 m·g = n·B·I·l → 可求：
 *     - 已知 B 求 I: I = m·g/(n·B·l)
 *     - 已知 I 求 B: B = m·g/(n·I·l)
 *     - 已知 I,B 求 m: m = n·B·I·l/g
 *
 * 倾角变化 (偏离平衡时)：
 *   当线圈偏离平衡位置 θ 角时，回复力矩使天平回到水平。
 *   近似 (小角度): M = −n·B·I·l²·θ + m·g·l·θ 等
 */
export class CurrentBalanceModel extends PhysicsModelBase {
    readonly name = '电流天平';
    readonly version = '1.0.0';
    readonly description = '电流天平安培力平衡实验：m·g = n·B·I·l，展示倾角、电流、质量关系';
    readonly modelType = 'current-balance';
    readonly assumptions = [
        '匀强磁场，磁感应强度 B 恒定',
        '导线有效长度 l 严格垂直于磁场方向',
        '天平臂轻质，质量集中在砝码处',
        '线圈平面始终与磁场垂直',
        '小角度近似 (sinθ ≈ θ, cosθ ≈ 1)'
    ];
    readonly applicableRange = 'B = 0.01–2 T, I = 0–10 A, n = 1–200 匝, l = 1–20 cm';
    readonly errorSources = [
        '实际磁场非均匀 → 有效 B 随位置变化',
        '线圈自感 → 接通瞬间有感生电流冲击',
        '天平臂质量不可忽略 → 系统误差',
        '导线电阻发热 → 长时间实验 B/I 关系偏离线性'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'wireLen', description: '导线有效长度 l (m)', unit: 'm', required: true, min: 0, max: 1 },
        { name: 'turns', description: '线圈匝数 n', unit: '', required: true, min: 1, max: 1000 },
        { name: 'mass', description: '砝码质量 m (kg)', unit: 'kg', required: true, min: 0, max: 1 },
        { name: 'current', description: '电流 I (A)', unit: 'A', required: true, min: 0, max: 100 },
        { name: 'magneticField', description: '磁感应强度 B (T)', unit: 'T', required: true, min: 0, max: 10 },
        { name: 'armLen', description: '天平臂长 (m)', unit: 'm', required: false, min: 0.01, max: 2 },
        { name: 'gravity', description: '重力加速度 g (m/s²)', unit: 'm/s²', required: false }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const cb = problem.constraints?.currentBalance;
        if (!cb) throw new Error('currentBalance 模型需要 currentBalance 约束配置');

        const l = cb.wireLen; // m
        if (l <= 0) throw new Error('导线有效长度 wireLen 必须为正');

        const n = cb.turns; // 匝数
        if (n <= 0) throw new Error('线圈匝数 turns 必须为正');

        const m = cb.mass; // kg
        if (m <= 0) throw new Error('砝码质量 mass 必须为正');

        const I = cb.current; // A
        const B = cb.magneticField; // T (必填字段, 类型化直接访问)
        if (B <= 0) throw new Error('磁感应强度 B 必须为正');

        const g = cb.gravity ?? 9.8; // m/s²

        // 安培力 (n匝导线)
        const F_ampere = n * B * I * l; // N
        // 重力
        const F_gravity = m * g; // N
        // 合力 (向下为正方向)
        const F_net = F_gravity - F_ampere; // N

        // 平衡时的电流 I_eq
        const I_eq = F_gravity / (n * B * l); // A

        // 平衡时的质量 m_eq
        const m_eq = (n * B * I * l) / g; // kg

        // 倾角模型：设天平臂长度为 armLen，小角度偏离时回复力矩
        // M_net = F_gravity*armLen*sin(theta) - F_ampere*armLen*sin(theta) = 0 时 theta=0
        // 这里简化：倾斜角度 theta_tilt = arctan(F_net / (F_gravity+F_ampere))（仅为示意）
        // 实际分析：天平角度与合力矩成正比，近似线性 M = k·theta (回复力矩)
        // k 为扭转刚度 (虚拟，比例归一化为 1)
        const k = 1.0; // N·m/rad，扭转刚度比例系数
        const thetaTilt = F_net / k; // rad (示意)
        // 限定小角度，防止用户设置的不合理参数导致摇摆过大
        const thetaTiltClamped = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, thetaTilt));

        // 时间轨迹：电流从 0 增加到 I，倾角从负走向平衡 (小扰动振荡)
        const sampleCount = problem.timeConfig.sampleCount ?? 500;
        const duration = problem.timeConfig.duration;
        const dt = duration / sampleCount;

        const trajectory: TrajectoryPoint[] = [];
        // 倾角衰减：theta(t) = theta_init * exp(-gamma*t) * cos(omega_d*t)
        // 简化：最大倾角 thetaTiltClamped，5s 内衰减到 5%
        const gamma = 3 / Math.max(duration, 1); // 衰减系数 (5% 误差带)
        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            const theta = thetaTiltClamped * Math.exp(-gamma * t); // 简谐衰减
            trajectory.push({
                t,
                position: { x: t, y: (theta * 180) / Math.PI }, // x: time (s), y: tilt angle (deg)
                velocity: { x: 1, y: 0 },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        // 图表 1: 倾角 vs 电流 (在平衡电流处倾角为 0)
        const tiltAngleVsCurrent: ChartSeries = {
            xLabel: '电流 I (A)',
            yLabel: '倾角 θ (度)',
            xUnit: 'A',
            yUnit: '°',
            points: []
        };
        const Imax = Math.max(I * 1.5, I_eq * 1.2, 1);
        const N1 = 200;
        for (let i = 0; i <= N1; i++) {
            const Ii = (Imax * i) / N1; // A
            const Fi = n * B * Ii * l; // 安培力
            const Fi_net = F_gravity - Fi;
            let theta_i = Fi_net / k;
            theta_i = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, theta_i));
            tiltAngleVsCurrent.points.push({
                x: parseFloat(Ii.toFixed(4)),
                y: parseFloat(((theta_i * 180) / Math.PI).toFixed(4))
            });
        }

        // 图表 2: m·g vs 时间 (模拟从空载到加砝码)
        const mgVsT: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '安培力 F (N)',
            xUnit: 's',
            yUnit: 'N',
            points: []
        };
        const N2 = 200;
        for (let i = 0; i <= N2; i++) {
            const ti = (duration * i) / N2;
            // 加砝码过程：t=0 时 F=Fg，随后 F 减小 (电流增加)
            const Fi_t = n * B * I * (1 - Math.exp(-gamma * ti)) * l;
            mgVsT.points.push({
                x: parseFloat(ti.toFixed(4)),
                y: parseFloat(Fi_t.toFixed(4))
            });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '初始 (电流=0)',
                t: 0,
                position: { x: 0, y: (thetaTiltClamped * 180) / Math.PI },
                velocity: { x: 0, y: 0 },
                description: `电流=0, 安培力=0, 倾角=${((thetaTiltClamped * 180) / Math.PI).toFixed(2)}° (最大倾斜)`
            },
            {
                label: '平衡点',
                t: 1 / gamma,
                position: { x: 1 / gamma, y: ((thetaTiltClamped / Math.E) * 180) / Math.PI },
                velocity: { x: 0, y: 0 },
                description: `m·g=${F_gravity.toFixed(3)}N, F_安=${F_ampere.toFixed(3)}N, I_eq=${I_eq.toFixed(4)}A, m_eq=${(m_eq * 1000).toFixed(3)}g`
            },
            {
                label: '模拟终点',
                t: duration,
                position: { x: duration, y: trajectory[trajectory.length - 1]!.position.y },
                velocity: { x: 0, y: 0 },
                description: `倾角衰减到 ${((thetaTiltClamped * Math.exp(-gamma * duration) * 180) / Math.PI).toFixed(4)}°`
            }
        ];

        const warnings: string[] = [];
        if (Math.abs(F_net) / F_gravity > 0.2) {
            warnings.push(
                `合力 ${F_net.toFixed(3)}N 相对重力 ${F_gravity.toFixed(3)}N 偏大，建议调整电流至 I_eq=${I_eq.toFixed(3)}A 附近`
            );
        }
        if (I_eq > 10) warnings.push(`平衡电流 ${I_eq.toFixed(2)}A 偏大，注意线圈散热`);
        if (n * l > 50) warnings.push(`总导线长度 ${(n * l).toFixed(1)}m 较大，需考虑线圈自感`);

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '安培力公式',
                formula: 'F = n·B·I·l',
                calculation: `F = ${n} × ${B}T × ${I}A × ${l}m = ${F_ampere.toFixed(4)} N`
            },
            {
                order: 2,
                description: '重力',
                formula: 'F_g = m·g',
                calculation: `F_g = ${m}kg × ${g}m/s² = ${F_gravity.toFixed(4)} N`
            },
            {
                order: 3,
                description: '平衡条件',
                formula: 'm·g = n·B·I·l → I_eq = m·g/(n·B·l)',
                calculation: `I_eq = ${F_gravity.toFixed(4)}/${(n * B * l).toFixed(4)} = ${I_eq.toFixed(4)} A`
            },
            {
                order: 4,
                description: '结论',
                formula: 'm_eq = n·B·I·l/g',
                result: `当前电流下平衡质量 m_eq=${(m_eq * 1000).toFixed(3)}g; 合力 F_net=${F_net.toFixed(4)}N (${F_net > 0 ? '砝码侧重' : F_net < 0 ? '线圈侧重' : '恰好平衡'})`
            }
        ];

        const conservedQuantities: ConservedQuantity[] = [];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                tilt_angle_vs_current: tiltAngleVsCurrent,
                mg_vs_t: mgVsT
            },
            diagnostics: {
                conservedQuantities,
                maxValues: {
                    F_ampere,
                    F_gravity,
                    F_net,
                    I_eq_A: I_eq,
                    m_eq_kg: m_eq,
                    tiltAngleDeg: (thetaTiltClamped * 180) / Math.PI,
                    current_A: I,
                    magneticField_T: B,
                    wireLen_M: l,
                    turns_N: n
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `电流天平: n=${n}匝, l=${l}m, B=${B}T, I=${I}A → F_安=${F_ampere.toFixed(4)}N vs m·g=${F_gravity.toFixed(4)}N, 平衡电流 I_eq=${I_eq.toFixed(4)}A`,
                steps,
                formulas: [
                    {
                        name: '安培力',
                        formula: 'F = n·B·I·l',
                        variables: {
                            n: { value: n, unit: '匝' },
                            B: { value: B, unit: 'T' },
                            I: { value: I, unit: 'A' },
                            l: { value: l, unit: 'm' },
                            F: { value: F_ampere, unit: 'N' }
                        }
                    },
                    {
                        name: '平衡条件',
                        formula: 'm·g = n·B·I·l',
                        variables: {
                            m: { value: m, unit: 'kg' },
                            g: { value: g, unit: 'm/s²' },
                            I_eq: { value: I_eq, unit: 'A' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
