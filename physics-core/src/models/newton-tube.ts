import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, Keyframe, ChartSeries, TrajectoryPoint } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { PHYSICS_CONSTANTS } from '../units/constants.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';

/**
 * 牛顿管模型 — 硬币/羽毛双体自由落体 (真空 vs 空气)。
 *
 * 双体契约 (#174):
 *   - 坐标系: y = H 为管顶释放点, y = 0 为管底地面 (触地即止, 速度归零)。
 *   - trajectories[0] = 硬币 (忽略空气阻力): y(t) = max(0, H − ½·g·t²)。
 *   - trajectories[1] = 羽毛:
 *       · 真空 (withAir=false): 与硬币同落 (t_羽毛 = t_硬币);
 *       · 空气 (withAir=true): 线性阻力解析解, 终端速度 v_t (默认 1.6 m/s),
 *         时间常数 τ = v_t/g: v(t) = −v_t(1 − e^(−t/τ)),
 *         下落距离 d(t) = v_t[t − τ(1 − e^(−t/τ))], y(t) = max(0, H − d(t))。
 *         由于 d'(t) = v_t(1 − e^(−t/τ)) ≤ g·t = d'_硬币(t), 任意 t ≥ 0
 *         恒有 d_羽毛(t) ≤ d_硬币(t) —— 羽毛绝不领先硬币 (硬性不变量)。
 */
export class NewtonTubeModel extends PhysicsModelBase {
    readonly name = '牛顿管 (真空 vs 空气)';
    readonly version = '1.0.0';
    readonly description = '硬币与羽毛在真空/空气中下落的双体自由落体对照实验';
    readonly modelType = 'newton-tube' as const;
    readonly assumptions = [
        '硬币视为质点且忽略空气阻力',
        '羽毛在空气中受线性阻力 (终端速度 v_t, 时间常数 τ = v_t/g)',
        '管底 y = 0 为不可穿透地面, 触地即停',
        '两体从同一高度 y = H 同时由静止释放'
    ];
    readonly applicableRange = '适用于牛顿管自由落体演示: 真空中轻重物体同时落地, 空气中羽毛受阻滞后';
    readonly errorSources = [
        '真实羽毛阻力并非严格线性 (高速段趋二次阻力)',
        '硬币实际也受微弱空气阻力, 此处按理想自由落体处理'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'height', description: '管高/下落高度 H (m)', unit: 'm', required: true, min: 0 },
        {
            name: 'featherTerminalSpeed',
            description: '羽毛终端速度 v_t (m/s, 仅空气模式生效)',
            unit: 'm/s',
            required: false,
            min: 0,
            exclusiveMin: true
        }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const constraint = problem.constraints?.newtonTube;
        const coinBody = problem.bodies[0];
        const featherBody = problem.bodies[1] ?? problem.bodies[0];
        // y = H 为管顶释放点; 优先取约束高度, 回退取释放点 body 的 y 坐标
        const H = constraint?.height ?? Math.max(0, coinBody.position.y);
        const withAir = constraint?.withAir ?? false;
        const vTerminal = constraint?.featherTerminalSpeed ?? 1.6;
        const g =
            problem.environment?.gravity?.enabled !== false
                ? (problem.environment?.gravity?.value ?? PHYSICS_CONSTANTS.g.value)
                : PHYSICS_CONSTANTS.g.value;

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        const tau = vTerminal / g;

        // ---- 落地时刻 ----
        const tCoin = Math.sqrt((2 * H) / g);
        /** 羽毛下落距离 (线性阻力解析解; 真空中退化为自由落体) */
        const featherDrop = (t: number): number =>
            withAir ? vTerminal * (t - tau * (1 - Math.exp(-t / tau))) : 0.5 * g * t * t;
        // 二分求精羽毛落地时刻 (d(t) 单调递增, d(t_feather) = H)
        const tFeather = withAir ? bisectLanding(featherDrop, H, tCoin, tau) : tCoin;

        // ---- 双体轨迹 (y = H → 0, 触地钳制于 y = 0 且速度归零) ----
        const coinTrajectory = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => this.fallingPoint(t, H, g, 0.5 * g * t * t, -g * t, tCoin, coinBody.mass.value)
        });
        const featherTrajectory = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => {
                const drop = featherDrop(t);
                const v = withAir ? -vTerminal * (1 - Math.exp(-t / tau)) : -g * t;
                const a = withAir ? -g * Math.exp(-t / tau) : -g;
                return this.fallingPoint(t, H, g, drop, v, tFeather, featherBody.mass.value, a);
            }
        });

        // ---- 关键帧 ----
        const keyframes: Keyframe[] = [
            {
                label: '释放',
                t: 0,
                position: { x: coinBody.position.x, y: H },
                velocity: { x: 0, y: 0 },
                description: `硬币与羽毛从管顶 y=${H.toFixed(2)}m 同时由静止释放${withAir ? ' (空气介质)' : ' (真空介质)'}`
            }
        ];
        const landingPos = { x: coinBody.position.x, y: 0 };
        if (tCoin <= duration) {
            keyframes.push({
                label: '硬币落地',
                t: tCoin,
                position: { ...landingPos },
                velocity: { x: 0, y: 0 },
                description: `硬币在 t=${tCoin.toFixed(3)}s 落地 (自由落体 t=√(2H/g)), 触地速度 ${(g * tCoin).toFixed(
                    2
                )} m/s 后停于 y=0`
            });
        }
        if (withAir) {
            if (tFeather <= duration) {
                keyframes.push({
                    label: '羽毛落地',
                    t: tFeather,
                    position: { ...landingPos },
                    velocity: { x: 0, y: 0 },
                    description: `羽毛在 t=${tFeather.toFixed(3)}s 落地 (线性阻力滞后于硬币), 触地后停于 y=0`
                });
            }
        } else if (tCoin <= duration) {
            keyframes.push({
                label: '同时落地',
                t: tCoin,
                position: { ...landingPos },
                velocity: { x: 0, y: 0 },
                description: `真空中羽毛与硬币同时落地 (t=${tCoin.toFixed(3)}s), 轻重物体下落同样快`
            });
        }
        const coinEnd = coinTrajectory[coinTrajectory.length - 1];
        keyframes.push({
            label: '终点',
            t: duration,
            position: coinEnd.position,
            velocity: coinEnd.velocity,
            description: `t=${duration}s 时硬币 y=${coinEnd.position.y.toFixed(3)}m、羽毛 y=${featherTrajectory[featherTrajectory.length - 1].position.y.toFixed(3)}m`
        });

        // ---- 图表 (下落距离/速率-时间, 2D/3D/HUD 与数据抽屉共用同一真源) ----
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '硬币下落距离',
            xUnit: 's',
            yUnit: 'm',
            points: coinTrajectory.map(p => ({ x: p.t, y: H - p.position.y }))
        };
        const y_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '羽毛下落距离',
            xUnit: 's',
            yUnit: 'm',
            points: featherTrajectory.map(p => ({ x: p.t, y: H - p.position.y }))
        };
        const v1_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '硬币速率',
            xUnit: 's',
            yUnit: 'm/s',
            points: coinTrajectory.map(p => ({ x: p.t, y: Math.abs(p.velocity.y) }))
        };
        const v2_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '羽毛速率',
            xUnit: 's',
            yUnit: 'm/s',
            points: featherTrajectory.map(p => ({ x: p.t, y: Math.abs(p.velocity.y) }))
        };

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [coinTrajectory, featherTrajectory],
            keyframes,
            charts: { x_t, y_t, v1_t, v2_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    height: H,
                    g,
                    coinLandTime: tCoin,
                    featherLandTime: tFeather,
                    featherTerminalSpeed: vTerminal
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: withAir
                    ? `空气介质: 硬币自由落体于 t=${tCoin.toFixed(3)}s 落地, 羽毛受线性阻力于 t=${tFeather.toFixed(3)}s 落地, 任意时刻羽毛不领先硬币`
                    : `真空介质: 硬币与羽毛均做自由落体, 同时于 t=${tCoin.toFixed(3)}s 落地`,
                steps: [
                    {
                        order: 1,
                        description: '硬币自由落体',
                        formula: 'y = H − ½·g·t²',
                        calculation: `H=${H}m, g=${g}m/s², t_落=√(2H/g)=${tCoin.toFixed(3)}s`
                    },
                    ...(withAir
                        ? [
                              {
                                  order: 2,
                                  description: '羽毛线性阻力 (空气)',
                                  formula: 'd(t) = v_t·[t − τ·(1 − e^(−t/τ))], τ = v_t/g',
                                  calculation: `v_t=${vTerminal}m/s, τ=${tau.toFixed(4)}s, t_落=${tFeather.toFixed(3)}s`
                              },
                              {
                                  order: 3,
                                  description: '滞后不变量',
                                  formula: 'd_羽毛(t) ≤ d_硬币(t)',
                                  calculation: '线性阻力使羽毛任意时刻下落距离不超过硬币'
                              }
                          ]
                        : [
                              {
                                  order: 2,
                                  description: '真空同落',
                                  formula: 'y_羽毛(t) = y_硬币(t)',
                                  calculation: '无空气阻力时轻重物体下落同样快'
                              }
                          ]),
                    {
                        order: withAir ? 4 : 3,
                        description: '触地即止',
                        formula: 'y ≥ 0, v(t_落) = 0',
                        calculation: '管底 y=0 为终止边界, 落地后速度与加速度归零'
                    }
                ],
                formulas: [
                    {
                        name: '自由落体位移',
                        formula: 'd = ½·g·t²',
                        variables: { g: { value: g, unit: 'm/s²' }, t: { value: tCoin, unit: 's' } }
                    },
                    {
                        name: '自由落体落地时间',
                        formula: 't = √(2H/g)',
                        variables: { H: { value: H, unit: 'm' }, g: { value: g, unit: 'm/s²' } }
                    },
                    ...(withAir
                        ? [
                              {
                                  name: '线性阻力下落距离',
                                  formula: 'd(t) = v_t·[t − τ·(1 − e^(−t/τ))]',
                                  variables: {
                                      v_t: { value: vTerminal, unit: 'm/s' },
                                      tau: { value: tau, unit: 's' }
                                  }
                              }
                          ]
                        : [])
                ]
            },
            errors: [],
            warnings: []
        };
    }

    /** 单体下落帧: 触地 (t ≥ tLand) 后位置钳制 y=0、速度与加速度归零 */
    private fallingPoint(
        t: number,
        H: number,
        g: number,
        drop: number,
        vY: number,
        tLand: number,
        mass: number,
        aY = -g
    ): Omit<TrajectoryPoint, 't'> {
        const landed = t >= tLand;
        const position = { x: 0, y: landed ? 0 : Math.max(0, H - drop) };
        const velocity = { x: 0, y: landed ? 0 : vY };
        const acceleration = { x: 0, y: landed ? 0 : aY };
        return {
            position,
            velocity,
            acceleration,
            kineticEnergy: kineticEnergy(mass, Math.abs(velocity.y)),
            potentialEnergy: mass * g * position.y
        };
    }
}

/** 二分求精羽毛落地时刻: 单调函数 d(t) = H 的根, 上界由 tCoin 与匀速段估计取大者 */
function bisectLanding(drop: (t: number) => number, H: number, tCoin: number, tau: number): number {
    let lo = 0;
    let hi = Math.max(tCoin, tau, 1);
    // 上界倍增直到 d(hi) ≥ H (d 单调递增, 必然到达)
    let guard = 0;
    while (drop(hi) < H && guard++ < 64) hi *= 2;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (drop(mid) < H) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}
