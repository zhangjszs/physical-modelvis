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
import { Vec2 } from '../math/vector2d.js';

/**
 * 抛体运动模型 — 平抛 / 斜抛 (必修二 第一章)
 *
 * 物理关系 (忽略空气阻力)：
 *   水平：匀速直线   x = v₀·cosθ·t
 *   竖直：匀加速    y = h₀ + v₀·sinθ·t − ½gt²
 *   速度分量：vx = v₀·cosθ (恒定),  vy = v₀·sinθ − gt
 *
 * 特征量：
 *   最高点：t_apex = v₀·sinθ / g,  H = h₀ + (v₀·sinθ)²/(2g)
 *   飞行时间 (落地 y=0)：通过求根公式
 *   射程：x(t_land) = v₀·cosθ·t_land
 *
 * 比通用 uniform-accelerated 多了：关键物理量 (射程/最大高度/飞行时间)、
 *   上下分运动的分解、更贴合教材的讲解。
 */
export class ProjectileModel extends PhysicsModelBase {
    readonly name = '抛体运动';
    readonly version = '1.0.0';
    readonly description = '抛体运动的水平匀速+竖直匀加速运动分解';
    readonly modelType = 'projectile' as const;
    readonly assumptions = ['物体视为质点', '忽略空气阻力', '重力加速度恒定', '地面水平 (y=0)'];
    readonly applicableRange = '平抛 (θ=0°) 与 斜抛 (0°<θ≤90°)，落点高度不低于发射点';
    readonly errorSources = ['空气阻力在高速时不可忽略', '重力加速度 g 随纬度、海拔略有变化'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'v0', description: '初速度大小 (m/s)', unit: 'm/s', required: true, min: 0 },
        { name: 'angle', description: '发射角 (度)', unit: '°', required: true, min: 0, max: 90 },
        { name: 'g', description: '重力加速度 (m/s²)', unit: 'm/s²', required: true, min: 0 },
        { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0];
        const v0 = body.velocity;
        const m = body.mass.value;
        const x0 = body.position;
        const g = problem.environment?.gravity?.value ?? 9.8;
        const groundY = problem.environment?.ground?.y ?? 0;
        const a = { x: 0, y: -g };
        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        // 解析解采样: 平抛运动 (公共脚手架 sampleTrajectory)
        const trajectory = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: (t) => {
                const x = x0.x + v0.x * t;
                const y = x0.y + v0.y * t - 0.5 * g * t * t;
                const vx = v0.x;
                const vy = v0.y - g * t;
                const speed = Math.sqrt(vx * vx + vy * vy);
                return {
                    position: { x, y },
                    velocity: { x: vx, y: vy },
                    acceleration: { ...a },
                    kineticEnergy: kineticEnergy(m, speed),
                    potentialEnergy: m * g * Math.max(0, y - groundY)
                };
            }
        });

        // 特征量
        const v0y = v0.y;
        const v0x = v0.x;
        const h0 = x0.y;
        const tApex = v0y / g;
        const apexHeight = h0 + (v0y * v0y) / (2 * g);

        // 飞行时间 (落地解方程 h₀ + v₀y·t − ½gt² = 0)
        const disc = v0y * v0y + 2 * g * h0;
        const tLand = disc > 0 ? (v0y + Math.sqrt(disc)) / g : duration;
        const range = v0x * tLand;

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '发射点',
                t: 0,
                position: { ...x0 },
                velocity: { ...v0 },
                description: `从 (${x0.x.toFixed(1)}, ${x0.y.toFixed(1)})m 以 v₀=${Vec2.magnitude(v0).toFixed(1)}m/s 发射`
            }
        ];
        if (tApex > 0 && tApex <= duration) {
            keyframes.push({
                label: '最高点',
                t: tApex,
                position: { x: x0.x + v0x * tApex, y: apexHeight },
                velocity: { x: v0x, y: 0 },
                description: `t=${tApex.toFixed(2)}s 时达到最高点 H=${apexHeight.toFixed(2)}m，水平速度保持 ${v0x.toFixed(2)}m/s`
            });
        }
        {
            const tEnd = Math.min(tLand, duration);
            const landX = x0.x + v0x * tEnd;
            const landY = Math.max(groundY, h0 + v0y * tEnd - 0.5 * g * tEnd * tEnd);
            const vyEnd = v0y - g * tEnd;
            const vEnd = Math.sqrt(v0x * v0x + vyEnd * vyEnd);
            keyframes.push({
                label: tLand <= duration ? '落地点' : '模拟终点',
                t: tEnd,
                position: { x: landX, y: landY },
                velocity: { x: v0x, y: vEnd > 0 ? vyEnd : 0 },
                description:
                    tLand <= duration
                        ? `物体落回地面，射程 R=${range.toFixed(2)}m，末速度 v=${vEnd.toFixed(2)}m/s`
                        : `模拟结束，尚未落地`
            });
        }

        // 图表
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '水平位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.x }))
        };
        const y_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '竖直位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.y }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '速度大小',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({
                x: p.t,
                y: Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y)
            }))
        };
        const vx_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '水平分速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: p.velocity.x }))
        };
        const vy_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '竖直分速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: p.velocity.y }))
        };
        const ke_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '动能',
            xUnit: 's',
            yUnit: 'J',
            points: trajectory.map(p => ({ x: p.t, y: p.kineticEnergy ?? 0 }))
        };
        const energy_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '机械能',
            xUnit: 's',
            yUnit: 'J',
            points: trajectory.map(p => ({ x: p.t, y: (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0) }))
        };

        // 讲解步骤
        const angDeg = (Math.atan2(v0y, v0x) * 180) / Math.PI;
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '运动分解',
                formula: '水平:匀速; 竖直:自由落体',
                calculation: `v₀x = ${v0x.toFixed(2)} m/s (恒定), v₀y = ${v0y.toFixed(2)} m/s`
            },
            {
                order: 2,
                description: '最高点',
                formula: 'H = h₀ + v₀y² / (2g)',
                calculation: `H = ${h0.toFixed(2)} + ${v0y.toFixed(2)}² / (2×${g})`,
                result: `H = ${apexHeight.toFixed(3)} m`
            },
            {
                order: 3,
                description: '飞行时间',
                formula: 't = (v₀y + √(v₀y² + 2gh₀)) / g',
                calculation: `t = (${v0y.toFixed(2)} + √${disc.toFixed(2)}) / ${g}`,
                result: `t = ${tLand.toFixed(3)} s`
            },
            {
                order: 4,
                description: '射程',
                formula: 'R = v₀x · t',
                calculation: `R = ${v0x.toFixed(2)} × ${tLand.toFixed(3)}`,
                result: `R = ${range.toFixed(3)} m`
            }
        ];
        const formulas: FormulaUsage[] = [
            { name: '水平位移', formula: 'x = v₀·cosθ·t', variables: { 'v₀x': { value: v0x, unit: 'm/s' } } },
            {
                name: '竖直位移',
                formula: 'y = h₀ + v₀·sinθ·t − ½gt²',
                variables: { 'v₀y': { value: v0y, unit: 'm/s' }, g: { value: g, unit: 'm/s²' } }
            },
            { name: '射程', formula: 'R = v₀²·sin(2θ)/g (h₀=0 时)', variables: { R: { value: range, unit: 'm' } } },
            {
                name: '最大高度',
                formula: 'H = h₀ + v₀²·sin²θ / (2g)',
                variables: { H: { value: apexHeight, unit: 'm' } }
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, y_t, v_t, energy_t, ke_t, vx_t, vy_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { range, apexHeight, flightTime: tLand, thetaDeg: angDeg },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `抛体运动 (v₀=${Vec2.magnitude(v0).toFixed(1)}m/s, θ=${angDeg.toFixed(1)}°): 最高点 H=${apexHeight.toFixed(2)}m, 射程 R=${range.toFixed(2)}m, 飞行时间 t=${tLand.toFixed(2)}s`,
                steps,
                formulas
            },
            errors: [],
            warnings: []
        };
    }
}
