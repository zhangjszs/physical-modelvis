import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 离心现象模型 — 必修二 §2
 *
 * 物体在水平转盘上距轴心 r 处随盘做匀速圆周运动, 向心力由 静摩擦 提供:
 *   F_需 = m·ω²·r
 *   F_实,max = μ·m·g
 *
 * 当 ω 较小时, F_需 ≤ F_实,max, 物体做圆周运动 (相对转盘静止).
 * 当 ω 大到 F_需 > F_实,max, 向心力不足, 物体沿切线 (惯性) 向外滑出 → 离心运动.
 *
 * 临界角速度: ω_crit = √(μ·g/r)
 * 临界线速度: v_crit = √(μ·g·r)
 *
 * 本模型:
 *   1. 静态演示 (物块随转盘圆周运动, 不超过临界)
 *   2. 若超过临界, 演示向外滑出的轨迹 (切向—径向外推的模式)
 */
export class CentrifugalModel extends PhysicsModelBase {
    readonly name = '离心现象';
    readonly version = '1.0.0';
    readonly description = '转盘上物块因向心力不足沿惯性方向滑出的离心运动 (F_实 < m·ω²·r)';
    readonly modelType = 'centrifugal' as const;
    readonly assumptions = [
        '物块初始相对转盘静止，且位于转盘半径 r 处',
        '转盘水平，物块竖直方向合力为 0',
        '最大静摩擦等于滑动摩擦',
        '物块滑出后水平面光滑 (不再有切向摩擦)'
    ];
    readonly applicableRange = '洗衣机脱水桶、棉花糖机、超速弯道、汽车打滑、离心沉淀';
    readonly errorSources = ['转盘并非绝对水平', '摩擦系数随速度变化', '物块形状非质点 (转动惯量)'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'mass', description: '物块质量 m (kg)', unit: 'kg', required: true, min: 0 },
        { name: 'radius', description: '物块所在旋转半径 r (m)', unit: 'm', required: true, min: 0 },
        { name: 'angularSpeed', description: '转盘角速度 ω (rad/s)', unit: 'rad/s', required: true, min: 0 },
        { name: 'frictionCoeff', description: '物块与转盘静摩擦系数 μ', unit: '', required: true, min: 0 },
        { name: 'gravity', description: '重力加速度 (m/s²)', unit: 'm/s²', required: false, defaultValue: 9.8, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.centrifugal;
        if (!c) throw new Error('离心现象模型需要 constraints.centrifugal 配置');

        const m = c.mass;
        const r0 = c.radius;
        const omega = c.angularSpeed;
        const mu = c.frictionCoeff;
        const g = c.gravity ?? 9.8;

        if (m <= 0) throw new Error('离心模型: 质量 mass 必须为正');
        if (r0 <= 0) throw new Error('离心模型: 半径 radius 必须为正');
        if (omega < 0) throw new Error('离心模型: 角速度 angularSpeed 必须为非负');
        if (mu < 0) throw new Error('离心模型: 摩擦系数 frictionCoeff 必须为非负');
        if (g <= 0) throw new Error('离心模型: gravity 必须为正');

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        const dt = duration / sampleCount;

        // 物理量
        const F_required = m * omega * omega * r0; // m·ω²·r
        const F_fricMax = mu * m * g;
        const omegaCrit = Math.sqrt((mu * g) / r0); // 临界角速度
        const vCrit = Math.sqrt(mu * g * r0); // 临界线速度
        const willSlip = F_required > F_fricMax;
        const safetyFactor = F_fricMax / (F_required > 0 ? F_required : 1); // 安全系数 (≥1 安全)

        // 轨迹生成
        // 物块在地面参考系 (惯性系) 的轨迹
        //   - 不滑动时: x = r·cos(ωt), y = r·sin(ωt)
        //   - 滑动时: 物块将沿转盘上滑动的切线方向继续向前,
        //            实际运动较复杂 (相对转盘向外), 这里简化为:
        //            近似认为任一时刻径向速度 v_r 正比于 (F_需 - F_实),
        //            切向速度保持当前切线方向 (转盘不再给力)
        //            本简化模型: 微粒一旦滑动, 沿切向"直线外推" (惯性保持线速度),
        //            加上一个适当的径向外移分量.
        //            由于教学重点是"是否会滑动", 这里轨迹演示是近似定性展示.
        const trajectory: TrajectoryPoint[] = [];
        let slipStartT = -1;
        let slipStartR = r0;
        let slipStartPhase = 0;

        const r = r0;
        let slipping = false;

        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            if (!slipping) {
                // 圆周运动 (惯性系)
                const phi = omega * t;
                const x = r * Math.cos(phi);
                const y = r * Math.sin(phi);
                trajectory.push({
                    t,
                    position: { x, y },
                    velocity: { x: -omega * r * Math.sin(phi), y: omega * r * Math.cos(phi) },
                    acceleration: { x: -omega * omega * r * Math.cos(phi), y: -omega * omega * r * Math.sin(phi) },
                    kineticEnergy: 0.5 * m * omega * omega * r * r
                });

                const Fnow = m * omega * omega * r;
                if (Fnow > F_fricMax && i > 0) {
                    slipping = true;
                    slipStartT = t;
                    slipStartR = r;
                    slipStartPhase = phi;
                    // tAccum 从 0 开始, 进入滑动段
                }
            } else {
                // 滑动阶段: 简化动力学
                // 地面系中, 微粒已脱离转盘束缚, 由于惯性和摩擦 (此处假设桌面光滑)
                // 近似: 微粒沿滑动开始时的切向方向前进 + 径向因"不足以跟随"而逐渐外移
                // 简化: 半径按 r(t) = r_slip + (滑动期间外移) × (t - slipStart)
                //        角度继续以当前 ω 前进 (因为转动惯量)
                const dsT = t - slipStartT; // 相对滑动起点时长
                // 教学演示半径外推 (假设近似力不足导致 v²/r > μg → 向外加速)
                // 这里不再复杂计算, 用简单的外推: 附加径向速度 ≈ √(ω²r - μg)·dsT
                const vExcess = Math.sqrt(Math.max(0, omega * omega * r0 - mu * g));
                const newR = r0 + vExcess * dsT;
                const newPhi = slipStartPhase + omega * dsT; // 角速度因惯性保留
                const x = newR * Math.cos(newPhi);
                const y = newR * Math.sin(newPhi);
                trajectory.push({
                    t,
                    position: { x, y },
                    velocity: {
                        x: -omega * newR * Math.sin(newPhi) + vExcess * Math.cos(newPhi),
                        y: omega * newR * Math.cos(newPhi) + vExcess * Math.sin(newPhi)
                    },
                    acceleration: { x: 0, y: 0 }, // 理想光滑桌面
                    kineticEnergy: 0.5 * m * (omega * omega * newR * newR + vExcess * vExcess)
                });
            }
        }

        const tSlip = willSlip ? slipStartT : -1;
        const slipR = willSlip ? slipStartR : -1;

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '起点',
                t: 0,
                position: trajectory[0]!.position,
                velocity: trajectory[0]!.velocity,
                description: willSlip
                    ? `ω=${omega.toFixed(2)} rad/s > ω_crit=${omegaCrit.toFixed(2)} rad/s → 物块将滑动 (离心)`
                    : `ω=${omega.toFixed(2)} rad/s ≤ ω_crit=${omegaCrit.toFixed(2)} rad/s → 物块随盘做圆周运动`
            }
        ];

        if (willSlip && tSlip > 0) {
            const slipIdx = Math.round(tSlip / dt);
            if (slipIdx < trajectory.length) {
                const p = trajectory[slipIdx]!;
                keyframes.push({
                    label: '开始滑动 (临界)',
                    t: tSlip,
                    position: p.position,
                    velocity: p.velocity,
                    description: `t=${tSlip.toFixed(3)}s, r=${slipR.toFixed(3)}m, F_需=${F_required.toFixed(2)}N = F_实,max=${F_fricMax.toFixed(2)}N`
                });
            }
            // 滑出 1/4 段后
            const predIdx = Math.min(trajectory.length - 1, slipIdx + Math.round(sampleCount * 0.25));
            if (predIdx > slipIdx) {
                const p = trajectory[predIdx]!;
                const rPred = Math.hypot(p.position.x, p.position.y);
                keyframes.push({
                    label: '滑动后外推',
                    t: p.t,
                    position: p.position,
                    velocity: p.velocity,
                    description: `r 由 ${slipR.toFixed(3)}m → ${rPred.toFixed(3)}m (离心外移)`
                });
            }
        } else {
            // 1/4 周期, 1/2 周期
            const T = (2 * Math.PI) / omega;
            for (const frac of [0.25, 0.5, 0.75]) {
                const tQ = frac * T;
                if (tQ > duration) break;
                const idx = Math.round(tQ / dt);
                if (idx < trajectory.length) {
                    const p = trajectory[idx]!;
                    keyframes.push({
                        label: `${(frac * 4).toFixed(0)}/4 周`,
                        t: tQ,
                        position: p.position,
                        velocity: p.velocity,
                        description: `圆周运动: r=const, ω=${omega.toFixed(2)}rad/s`
                    });
                }
            }
        }

        keyframes.push({
            label: '终点',
            t: duration,
            position: trajectory[trajectory.length - 1].position,
            velocity: trajectory[trajectory.length - 1].velocity,
            description: willSlip ? `t=${duration}s 物块已脱离转盘, 沿切向-径向外滑` : `t=${duration}s 物块做完整圆周`
        });

        // ===== 图表 =====

        // 1. omega_critical_curve: 临界 ω vs √r 曲线 (ω_crit = √(μ·g/r) → 1/√r 双曲线)
        const omega_critical_curve: ChartSeries = {
            xLabel: '半径 r (m)',
            xUnit: 'm',
            yLabel: '临界角速度 ω_crit (rad/s)',
            yUnit: 'rad/s',
            points: Array.from({ length: 80 }, (_, i) => {
                const rr = 0.1 + ((5 - 0.1) * i) / 79;
                return { x: rr, y: Math.sqrt((mu * g) / rr) };
            })
        };

        // 2. centrifugal_traj: 物块惯性系轨迹 (x-y)
        const centrifugal_traj: ChartSeries = {
            xLabel: 'x',
            xUnit: 'm',
            yLabel: 'y',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.position.x, y: p.position.y }))
        };

        // 3. required_vs_provided: F_需 vs F_实,max 随半径变化
        const required_vs_provided: ChartSeries = {
            xLabel: '半径 r (m)',
            xUnit: 'm',
            yLabel: '向心力 F_需 (N)',
            yUnit: 'N',
            points: Array.from({ length: 80 }, (_, i) => {
                const rr = 0.1 + ((5 - 0.1) * i) / 79;
                return { x: rr, y: m * omega * omega * rr };
            })
        };

        // 4. slip_diagnostics: 滑动是否判定边界 (按半径扫描, "是否会滑动")
        const slip_diagnostics: ChartSeries = {
            xLabel: '半径 r (m)',
            xUnit: 'm',
            yLabel: '安全系数 = F_实,max / F_需',
            yUnit: '',
            points: Array.from({ length: 80 }, (_, i) => {
                const rr = 0.1 + ((5 - 0.1) * i) / 79;
                const F_now = m * omega * omega * rr;
                return { x: rr, y: F_fricMax / (F_now > 0 ? F_now : 1) };
            })
        };

        // 静态示意: 转盘 + 物块位置
        const staticCircle: ChartSeries = {
            xLabel: 'x',
            xUnit: 'm',
            yLabel: 'y',
            yUnit: 'm',
            points: Array.from({ length: 128 }, (_, i) => {
                const a = (2 * Math.PI * i) / 127;
                return { x: r0 * Math.cos(a), y: r0 * Math.sin(a) };
            })
        };

        // 受力分析图
        // 1) 不滑动时: 静摩擦力 = m·ω²·r (指向圆心)
        // 2) 滑动时: 摩擦力达到极限 μm·g, 不足以提供 m·ω²·r
        const diagramForce = willSlip ? F_fricMax : F_required;
        const forceDiagram: ForceDiagram = {
            bodyId: problem.bodies[0]?.id ?? 'block-forces',
            forces: [
                {
                    name: '静摩擦提供的向心力 F_f',
                    vector: { x: -diagramForce, y: 0 },
                    magnitude: diagramForce,
                    unit: 'N'
                },
                { name: '实际所需 F_需 = mω²r', vector: { x: F_required, y: 0 }, magnitude: F_required, unit: 'N' },
                { name: '法向支持力 N = mg', vector: { x: 0, y: m * g }, magnitude: m * g, unit: 'N' },
                { name: '重力 mg', vector: { x: 0, y: -m * g }, magnitude: m * g, unit: 'N' }
            ],
            netForce: { x: willSlip ? diagramForce - F_required : 0, y: 0 }
        };

        return {
            meta: {
                model: 'centrifugal',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                omega_critical_curve,
                centrifugal_traj,
                required_vs_provided,
                slip_diagnostics,
                'static-diagram': staticCircle,
                force_diagram: forceDiagram
            },
            diagnostics: {
                conservedQuantities: willSlip
                    ? []
                    : [
                          {
                              name: '圆周运动角速度',
                              law: '转盘匀速转动时物块 ω 恒定',
                              initialValue: omega,
                              finalValue: omega,
                              maxDeviation: 0,
                              tolerance: 1e-9,
                              conserved: true
                          },
                          {
                              name: '圆周运动半径',
                              law: '物块不滑动时 r 恒定',
                              initialValue: r0,
                              finalValue: r0,
                              maxDeviation: 0,
                              tolerance: 1e-9,
                              conserved: true
                          }
                      ],
                maxValues: {
                    F_required,
                    F_fricMax,
                    omegaCrit,
                    vCrit,
                    omega,
                    r0,
                    safetyFactor,
                    slipStartT: tSlip,
                    slipStartR: slipR
                },
                rangeCheck: {
                    withinRange: true,
                    warnings: willSlip
                        ? [
                              `ω=${omega.toFixed(2)}rad/s > ω_crit=${omegaCrit.toFixed(2)}rad/s: 物块会滑动 (F_需=${F_required.toFixed(2)}N > F_实,max=${F_fricMax.toFixed(2)}N)`
                          ]
                        : []
                }
            },
            explanation: {
                summary: willSlip
                    ? `离心运动: m=${m}kg, r=${r0}m, ω=${omega.toFixed(2)}rad/s, F_需=${F_required.toFixed(2)}N > F_实,max=${F_fricMax.toFixed(2)}N (μg=${mu}×${g})`
                    : `不离心: m=${m}kg, r=${r0}m, ω=${omega.toFixed(2)}rad/s ≤ ω_crit=${omegaCrit.toFixed(2)}rad/s, F_需=${F_required.toFixed(2)}N ≤ F_实,max=${F_fricMax.toFixed(2)}N`,
                steps: [
                    {
                        order: 1,
                        description: '物块在转盘上做圆周运动，所需向心力 F_需 = m·ω²·r',
                        formula: 'F_需 = m·ω²·r',
                        calculation: `F_需 = ${m} × ${omega.toFixed(2)}² × ${r0} = ${F_required.toFixed(2)} N`,
                        result: `F_需 = ${F_required.toFixed(2)} N`
                    },
                    {
                        order: 2,
                        description: '实际能提供的最大静摩擦 F_实,max = μ·m·g',
                        formula: 'F_实,max = μ·m·g',
                        calculation: `F_实,max = ${mu} × ${m} × ${g} = ${F_fricMax.toFixed(2)} N`,
                        result: `F_实,max = ${F_fricMax.toFixed(2)} N`
                    },
                    {
                        order: 3,
                        description: '离心判据: 是否 F_需 > F_实,max',
                        formula: 'F_需 > F_实,max → 离心',
                        calculation: `${F_required.toFixed(2)} N ${willSlip ? '>' : '≤'} ${F_fricMax.toFixed(2)} N`,
                        result: willSlip ? '物块做离心运动 (向外滑动)' : '物块随盘做圆周运动'
                    },
                    {
                        order: 4,
                        description: '临界角速度: ω_crit = √(μ·g/r)',
                        formula: 'ω_crit = √(μ·g/r)',
                        calculation: `ω_crit = √(${mu}×${g}/${r0}) = ${omegaCrit.toFixed(2)} rad/s`,
                        result: `临界线速度 v_crit = ${vCrit.toFixed(2)} m/s`
                    },
                    {
                        order: 5,
                        description: '应用实例: 棉花糖机、超速弯道打滑、洗衣机脱水',
                        formula: '离心现象随处可见'
                    }
                ],
                formulas: [
                    {
                        name: '所需向心力',
                        formula: 'F_需 = m·ω²·r',
                        variables: {
                            m: { value: m, unit: 'kg' },
                            ω: { value: omega, unit: 'rad/s' },
                            r: { value: r0, unit: 'm' },
                            F_需: { value: F_required, unit: 'N' }
                        }
                    },
                    {
                        name: '最大静摩擦',
                        formula: 'F_实,max = μ·m·g',
                        variables: {
                            μ: { value: mu, unit: '' },
                            m: { value: m, unit: 'kg' },
                            g: { value: g, unit: 'm/s²' },
                            'F_实,max': { value: F_fricMax, unit: 'N' }
                        }
                    },
                    {
                        name: '临界角速度',
                        formula: 'ω_crit = √(μ·g/r)',
                        variables: {
                            ω_crit: { value: omegaCrit, unit: 'rad/s' },
                            μ: { value: mu, unit: '' },
                            g: { value: g, unit: 'm/s²' },
                            r: { value: r0, unit: 'm' }
                        }
                    }
                ]
            },
            errors: [],
            warnings: willSlip ? [`物块做离心运动: t=${slipStartT > 0 ? slipStartT.toFixed(3) : '0'}s 起滑动`] : []
        };
    }
}
