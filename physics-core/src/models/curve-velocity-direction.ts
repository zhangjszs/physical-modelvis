import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import type { CurveTrackShape } from '../types/problem.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 曲线运动速度方向模型 — 必修二 §1 (曲线运动)
 *
 * 物理: 质点做曲线运动时, 某点的速度方向沿曲线在该点的切线方向。
 *
 * 实现:
 *   1. 根据 trackShape 生成一条基准轨道 (纯几何曲线, 作为 "轨道")
 *   2. 在 [0,T] 内等间距取 sampleCount 个脱离点
 *   3. 每个脱离点: 质点在该点以切向速度脱离, 之后沿切向作匀速直线运动
 *   4. 输出 3-5 条完整的 "曲线段 + 切线段" 组合轨迹
 *
 * 基准轨道参数方程 (轨道上 s∈[0,1]):
 *   - circle:  x = R·cos(2π·s),            y = R·sin(2π·s)
 *   - parabola:x = -L + 2·L·s,             y = k·x²
 *   - spiral:  r = r₀ + b·(2π·s), θ = 2π·s, x = r·cosθ, y = r·sinθ
 *
 * 速度方向 = 轨道切线方向 (该点处的时间导数):
 *   - circle:  v = ω·R·(-sinθ, cosθ)
 *   - parabola:v = (v₀, 2k·x·v₀)
 *   - spiral:  v = (dr/dt·cosθ - r·sinθ·ω, dr/dt·sinθ + r·cosθ·ω)
 *
 * 切线长度 = initialSpeed × releaseDuration
 */
export class CurveVelocityDirectionModel extends PhysicsModelBase {
    readonly name = '曲线运动速度方向';
    readonly version = '1.0.0';
    readonly description = '质点做曲线运动时, 某点的速度方向沿曲线在该点的切线方向';
    readonly modelType = 'curve-velocity-direction' as const;
    readonly assumptions = [
        '质点视为质点',
        '脱离前以恒定 "角速度" 沿轨道运动 (仅用于几何采样)',
        '脱离后不受外力, 保持脱离时的速度做匀速直线运动 (牛顿第一定律)',
        '忽略一切阻力'
    ];
    readonly applicableRange = '用于演示 "曲线运动的速度方向沿切线" 这一基本结论, 适用轨道: 圆 / 抛物线 / 螺线';
    readonly errorSources = [
        '实际中质点释放后可能受重力/阻力影响',
        '角速度恒定假设在抛物线/螺线上不对应真实物理, 仅作为几何采样工具'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'trackShape', description: '轨道形状 (circle/parabola/spiral)', unit: 'shape', required: true },
        {
            name: 'angularSpeed',
            description: '角速度 ω (rad/s) 或切向初速度大小 (m/s)',
            unit: 'rad/s',
            required: true,
            min: 0
        }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.curveVelocity;
        if (!c) {
            throw new Error('曲线运动速度方向模型需要 curveVelocity 约束配置');
        }

        const shape = c.trackShape;
        const omega = c.angularSpeed;
        const sampleCount: number = toInt(c.sampleCount, 5, 3, 5); // 3-5 条子轨迹
        const radius = c.radius ?? 2;
        const spiralGrowth = c.spiralGrowth ?? 0.5;
        const parabolaK = c.parabolaK ?? 0.5;
        const initialSpeed = c.initialSpeed ?? omega;

        const duration = problem.timeConfig.duration;
        const totalSamples = problem.timeConfig.sampleCount ?? 600;
        const dt = duration / totalSamples;

        // 子轨迹的长度 (步数) = 总的 1/sampleCount 用于 "轨道曲线段"
        const subLen = Math.floor(totalSamples / sampleCount);

        // ===== 几何采样函数: 由归一化参数 s∈[0,1] 给出轨道点与切线单位向量 =====
        interface TrackSample {
            pos: { x: number; y: number };
            tangent: { x: number; y: number };
        }
        function trackPoint(s: number): TrackSample {
            switch (shape) {
                case 'circle': {
                    const theta = 2 * Math.PI * s;
                    const x = radius * Math.cos(theta);
                    const y = radius * Math.sin(theta);
                    // 切线方向: (dx/dθ, dy/dθ) = (-R·sinθ, R·cosθ) → 单位向量 (-sinθ, cosθ)
                    const tx = -Math.sin(theta);
                    const ty = Math.cos(theta);
                    return { pos: { x, y }, tangent: { x: tx, y: ty } };
                }
                case 'parabola': {
                    const L = 2 * radius;
                    const x = -L + 2 * L * s;
                    const y = parabolaK * x * x;
                    // 切线方向: (dx/ds, dy/ds) = (2L, 2k·x·2L) → 单位化
                    const dx = 2 * L;
                    const dy = 4 * parabolaK * L * x;
                    const mag = Math.sqrt(dx * dx + dy * dy);
                    return { pos: { x, y }, tangent: { x: dx / mag, y: dy / mag } };
                }
                case 'spiral': {
                    const r0 = radius;
                    const theta = 2 * Math.PI * s;
                    const r = r0 + spiralGrowth * theta;
                    const x = r * Math.cos(theta);
                    const y = r * Math.sin(theta);
                    // dr/ds = b·(2π) ; dx/ds = dr/ds·cosθ − r·sinθ·(2π)
                    // dy/ds = dr/ds·sinθ + r·cosθ·(2π)
                    const dr = spiralGrowth * 2 * Math.PI;
                    const twoPi = 2 * Math.PI;
                    const dx = dr * Math.cos(theta) - r * Math.sin(theta) * twoPi;
                    const dy = dr * Math.sin(theta) + r * Math.cos(theta) * twoPi;
                    const mag = Math.sqrt(dx * dx + dy * dy);
                    return { pos: { x, y }, tangent: { x: dx / mag, y: dy / mag } };
                }
            }
        }

        // ===== 生成 sampleCount 条独立轨迹 (各自从不等间距的脱离点出发) =====
        const allTrajectories: TrajectoryPoint[][] = [];
        const keyframes: Keyframe[] = [];

        for (let k = 0; k < sampleCount; k++) {
            // 第 k 条轨迹: 脱离点在 s_release = k/(sampleCount) 处 (等间距采样点)
            const sRelease = k / sampleCount;
            const releaseInfo = trackPoint(sRelease);
            const traj: TrajectoryPoint[] = [];

            for (let i = 0; i <= totalSamples; i++) {
                const t = i * dt;
                // 前 subLen 步: 沿轨道走 (曲线), 每步 s 前进 1/subLen
                // 后段: 从脱离点以切向速度作直线
                let px: number, py: number, vx: number, vy: number;
                if (i < subLen) {
                    // 沿轨道走一段: sScale = (1/subLen)*i
                    const s = sRelease + (i / subLen) * 0.1; // 只走一小段展示
                    const pt = trackPoint(((s % 1) + 1) % 1);
                    px = pt.pos.x;
                    py = pt.pos.y;
                    // 速度 = 切线方向 × 速率 (沿轨道的 "角速度缩放" 对应速率)
                    // 对于 circle: v = ω·R; parabola/spiral: 用 initialSpeed 近似
                    const speed = shape === 'circle' ? omega * radius : initialSpeed;
                    vx = pt.tangent.x * speed;
                    vy = pt.tangent.y * speed;
                } else {
                    // 脱离: 脱离时位置 = releaseInfo.pos, 切线方向 = releaseInfo.tangent
                    const tAfter = t - subLen * dt; // 脱离后经过的时间
                    const speed = shape === 'circle' ? omega * radius : initialSpeed;
                    px = releaseInfo.pos.x + releaseInfo.tangent.x * speed * tAfter;
                    py = releaseInfo.pos.y + releaseInfo.tangent.y * speed * tAfter;
                    vx = releaseInfo.tangent.x * speed;
                    vy = releaseInfo.tangent.y * speed;
                }

                const speed = Math.sqrt(vx * vx + vy * vy);
                traj.push({
                    t,
                    position: { x: px, y: py },
                    velocity: { x: vx, y: vy },
                    acceleration: { x: 0, y: 0 },
                    kineticEnergy: 0.5 * speed * speed,
                    potentialEnergy: 0
                });
            }
            allTrajectories.push(traj);
        }

        // ===== 关键帧 (在 first trajectory 上标出 起点/弯折点/末点 + 其他轨迹起点) =====
        const firstTraj = allTrajectories[0]!;
        // 起点
        keyframes.push({
            label: '轨迹 0 起点 (轨道)',
            t: 0,
            position: firstTraj[0]!.position,
            velocity: firstTraj[0]!.velocity,
            description: `沿 ${cnShape(shape)} 轨道运动, 速度方向为切线`
        });
        // 弯折点 (脱离点)
        const releaseTime = subLen * dt;
        keyframes.push({
            label: '脱离点 (速度沿切线)',
            t: releaseTime,
            position: firstTraj[subLen]!.position,
            velocity: firstTraj[subLen]!.velocity,
            description: `t=${releaseTime.toFixed(2)}s 时从轨道脱离, 此后沿切向作匀速直线运动`
        });
        // 末点
        keyframes.push({
            label: '末点',
            t: duration,
            position: firstTraj[firstTraj.length - 1]!.position,
            velocity: firstTraj[firstTraj.length - 1]!.velocity,
            description: `轨迹 0 末位置 (${firstTraj[firstTraj.length - 1].position.x.toFixed(2)}, ${firstTraj[firstTraj.length - 1].position.y.toFixed(2)})m`
        });
        // 其余轨迹起点
        for (let k = 1; k < sampleCount; k++) {
            const tk = allTrajectories[k]!;
            keyframes.push({
                label: `轨迹 ${k} 起点`,
                t: 0,
                position: tk[0]!.position,
                velocity: tk[0]!.velocity,
                description: `轨迹 ${k} 从 s=${(k / sampleCount).toFixed(2)} 处开始, 经脱离后沿切向出射`
            });
        }

        // ===== 图表 =====
        // x_t: 第一条轨迹的 x-t (位置 x-时间)
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: 'x 坐标',
            xUnit: 's',
            yUnit: 'm',
            points: firstTraj.map(p => ({ x: p.t, y: p.position.x }))
        };
        // vx_t: 切向速度 (使用轨迹 0 的切向速率, 即速度大小, 因为是沿切线方向)
        const v_tang_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '切向速度大小',
            xUnit: 's',
            yUnit: 'm/s',
            points: firstTraj.map(p => ({ x: p.t, y: Vec2.magnitude(p.velocity) }))
        };
        // vy_t: 法向速度 (对于沿切线运动的质点, 法向速度 = 0; 此处画 0 直线用于教材对比)
        const v_norm_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '法向速度 (理论=0)',
            xUnit: 's',
            yUnit: 'm/s',
            points: firstTraj.map(p => ({ x: p.t, y: 0 }))
        };
        // 多条子轨迹 x 对比 (图表展示 不同脱离点的 x-t) — 已移除未使用的 x_t_multi

        // ===== 解释 =====
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '轨道形状与参数',
                formula:
                    shape === 'circle'
                        ? `(x, y) = (R·cosθ, R·sinθ),  θ = 2π·s`
                        : shape === 'parabola'
                          ? `(x, y) = (-L + 2L·s, k·x²)`
                          : `(r, θ) = (r₀ + b·2π·s, 2π·s),  x = r·cosθ, y = r·sinθ`,
                calculation: `R=${radius}m, ω=${omega}rad/s, sub-sample=${sampleCount}`
            },
            {
                order: 2,
                description: '切线方向 (速度方向)',
                formula: `v⃗ ∥ dP⃗/ds |_(脱离点)  —  曲线运动速度沿切线`
            },
            {
                order: 3,
                description: '脱离后匀速直线 (牛顿第一定律)',
                formula: `r⃗(t) = r⃗₀ + v⃗·(t−t_release),  t ≥ t_release`
            }
        ];
        const formulas: FormulaUsage[] = [
            {
                name: '切线方向',
                formula: shape === 'circle' ? 'v⃗ = ωR·(-sinθ, cosθ)' : 'v⃗ = v₀·dP⃗/|dP⃗|',
                variables: { ω: { value: omega, unit: 'rad/s' }, v0: { value: initialSpeed, unit: 'm/s' } }
            },
            {
                name: '脱离后运动',
                formula: 'r⃗(t) = r⃗₀ + v⃗·(t − t_rel)',
                variables: { v: { value: initialSpeed, unit: 'm/s' } }
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: allTrajectories,
            keyframes,
            charts: { x_t, vx_t: v_tang_t, vy_t: v_norm_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    subTrajectories: sampleCount,
                    releaseTime,
                    speed: initialSpeed,
                    radius
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `曲线运动速度方向演示: 轨道=${cnShape(shape)}, R=${radius}m, ω=${omega}rad/s, 共 ${sampleCount} 条子轨迹, 每段从不同脱离点沿切线出射`,
                steps,
                formulas
            },
            errors: [],
            warnings: []
        };
    }
}

/** 安全整数转换 */
function toInt(v: unknown, defaultValue: number, min: number, max: number): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return defaultValue;
    const rounded = Math.round(n);
    if (rounded < min) return min;
    if (rounded > max) return max;
    return rounded;
}

function cnShape(s: CurveTrackShape): string {
    switch (s) {
        case 'circle':
            return '圆周';
        case 'parabola':
            return '抛物线';
        case 'spiral':
            return '螺线';
    }
}
