/**
 * 伽利略斜面理想实验模型 — 必修一 第四章 (牛顿第一定律引入实验)
 *
 * 核心物理 ("冲淡重力"):
 *   沿斜面分力: F∥ = mg·sinθ  →  a = g·sinθ
 *   斜面位移:   x(t) = ½·g·sinθ·t²      (从静止释放, 初速 v₀ = 0)
 *   底部速度:   v = √(2·g·sinθ·L) = √(2·g·h)  其中 h = L·sinθ
 *   底部时间:   t_end = √(2·L / (g·sinθ))
 *   外推结论:   θ → 90° 时 a → g, 退化为自由落体
 *
 * 三段理想实验推理链:
 *   1. [冲淡重力] 小 θ → a 小 → t_end 大 → 便于测量 (克服脉搏计时的困难)
 *   2. [对接斜面] 小球滚下后滚上对接斜面, 回到原来高度 (机械能守恒)
 *                      减小对接斜面倾角, 小球走更远距离才能回到原高
 *   3. [水平面外推] 无摩擦水平面 → 永远匀速直线运动 (牛顿第一定律)
 *
 * 演示模式 (mode):
 *   - 'single'    : 沿斜面匀加速 一段
 *   - 'docked'    : 斜面滚下 + 对接斜面滚上 (回到原高)
 *   - 'horizontal': 水平面匀速运动 (牛顿第一定律直推)
 *   - 'all'       : 三段完整: 斜面 → 对接斜面 → 水平面 (动画演示)
 *
 * 关键帧 (keyframes):
 *   起点 → 斜面底端(速度最大) → [可选]对接斜面最高点 → [可选]水平面匀速段
 *
 * 图表:
 *   - x_t           : 沿斜面位移-时间 (抛物线)
 *   - theta_a       : 不同 θ 对应的加速度 a = g·sinθ (直线)
 *   - sin_theta_t_end: 不同 θ 对应的斜面下落时间 (∝ 1/√(sinθ), 随 θ→0 趋向无穷)
 */

import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy } from '../physics/kinematics.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import type { GalileoInclineMode } from '../types/problem.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/** 防止 t_end 在 θ→0 时除零的极小值 (sinθ 阈值) */
const MIN_SIN_THETA = 1e-6;

/** 每段轨迹采样数 */
const SAMPLES_PER_PHASE = 256;

export class GalileoInclineModel extends PhysicsModelBase {
    readonly name = '伽利略斜面理想实验';
    readonly version = '1.0.0';
    readonly description =
        '伽利略"冲淡重力"理想实验 (必修一第四章) — 斜面运动 + 对接斜面能量守恒 + 水平外推牛顿第一定律';
    readonly modelType = 'galileo-incline' as const;
    readonly assumptions = [
        '斜面光滑无摩擦',
        '小球视为质点, 无转动动能',
        '理想实验推理: 对接斜面机械能守恒, 水平面无摩擦 (外推极限)',
        '重力加速度 g 恒定',
        '从静止释放 (v₀ = 0)'
    ];
    readonly applicableRange = '高中物理必修一第四章: 牛顿第一定律引入实验 (斜面 θ ∈ [0°, 90°])';
    readonly errorSources = [
        '计时误差: 古代用脉搏/水钟计时, 精度低 → 伽利略用小 θ 放大时间',
        '空气阻力被忽略',
        '实际无法完全光滑, 对接斜面和水平面均为理想外推'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'angleDeg', description: '斜面倾角 θ', unit: '°', required: true, min: 0, max: 90 },
        { name: 'gravity', description: '重力加速度', unit: 'm/s²', required: false, defaultValue: 9.8 },
        {
            name: 'inclineLength',
            description: '斜面长度',
            unit: 'm',
            required: false,
            defaultValue: 2,
            min: 0.1,
            max: 100
        }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0];
        const m = body.mass.value;
        const c = problem.constraints?.galileoIncline;
        const angleDeg = c?.angleDeg ?? 30;
        const g = c?.gravity ?? problem.environment?.gravity?.value ?? 9.8;
        const L = c?.inclineLength ?? 2;
        const mode: GalileoInclineMode = c?.mode ?? 'single';

        const theta = (angleDeg * Math.PI) / 180;
        const sinTheta = Math.max(Math.sin(theta), MIN_SIN_THETA);
        const cosTheta = Math.cos(theta);
        const h = L * sinTheta; // 斜面竖直落差
        const a = g * sinTheta; // 沿斜面加速度 a = g·sinθ

        // 底部时间 & 底部速度 (解析解)
        const tEnd = Math.sqrt((2 * L) / a);
        const vEnd = a * tEnd; // √(2·a·L) = √(2·g·sinθ·L) = √(2·g·h)

        // 速度 vEnd 两种等价: vEnd = √(2·g·h) (能量守恒)
        const vEndCheck = Math.sqrt(2 * g * h);
        const energyConserved = Math.abs(vEnd - vEndCheck) < 1e-9 * vEnd;

        // 沿斜面方向单位向量: 下滑方向 = (+cosθ, +sinθ) (原点为斜面顶端, +x 向右, +y 向下)
        // 此约定与 inclined-plane.ts 几何一致 (y 向量为正表示向下), 便于可视化.
        const inclineDir: Vector2D = { x: cosTheta, y: sinTheta };

        // ====== 构建分段轨迹 ======
        // Phase 1: 斜面匀加速 (t ∈ [0, tEnd])
        // Phase 2 (docked/all): 对接斜面匀减速回原高 (t ∈ [tEnd, 2·tEnd])
        //   对接斜面方向 = -inclineDir, 加速度 = -a 沿 +inclineDir (即 deceleration = a 沿 +inclineDir)
        //   沿 +inclineDir 位移 s₂(t′) = vEnd·t′ − ½·a·t′², t′_up = vEnd / a = tEnd, s₂_max = L
        // Phase 3 (all/horizontal 尾段): 水平匀速 (速度大小 = vEnd, 方向 = +x)

        const trajectory: TrajectoryPoint[] = [];
        const keyframes: Keyframe[] = [];
        const warnings: string[] = [];
        const conservedQuantities: SimulationResult['diagnostics']['conservedQuantities'] = [];

        // 起始点 (斜面顶端)
        const origin: Vector2D = { x: 0, y: 0 };
        keyframes.push({
            label: '起点 (斜面顶端)',
            t: 0,
            position: origin,
            velocity: Vec2.zero(),
            description: `小球从静止释放, 斜面倾角 θ = ${angleDeg}°, 斜面长 L = ${L} m, 竖直落差 h = ${h.toFixed(3)} m`
        });

        // --- Phase 1 ---
        this.addPhaseIncline(trajectory, {
            t0: 0,
            samples: SAMPLES_PER_PHASE,
            a,
            dir: inclineDir,
            startPos: origin,
            mass: m,
            g,
            endAtLength: L
        });
        keyframes.push({
            label: '斜面底端 (速度最大)',
            t: tEnd,
            position: Vec2.scale(inclineDir, L),
            velocity: Vec2.scale(inclineDir, vEnd),
            description: `小球到达斜面底端, v = ${vEnd.toFixed(3)} m/s, t_end = ${tEnd.toFixed(3)} s`
        });

        conservedQuantities.push({
            name: '机械能守恒 (mgh ↔ ½mv²)',
            law: '机械能守恒',
            initialValue: m * g * h,
            finalValue: kineticEnergy(m, vEnd),
            maxDeviation: Math.abs(m * g * h - kineticEnergy(m, vEnd)),
            tolerance: 1e-9 * (m * g * h),
            conserved: energyConserved
        });

        // --- Phase 2: 对接斜面 (可选) ---
        // 几何: 对接斜面是原斜面的镜像 (绕 x 轴翻折).
        // 原斜面方向 inclineDir = (cosθ, sinθ) [y 向下为正]
        // 对接斜面方向 dockedDir = (cosθ, -sinθ) [y 向上] (镜像方向)
        // 对接斜面与原斜面倾角绝对值相同, 加速度幅值 a = g·sinθ, 起减速作用.
        let phase2End = tEnd;
        let phase2EndPos: Vector2D = Vec2.scale(inclineDir, L);
        if (mode === 'docked' || mode === 'all') {
            const phase2StartPos = Vec2.scale(inclineDir, L);
            const dockedDir: Vector2D = { x: cosTheta, y: -sinTheta };
            const dockedAccelerationVec: Vector2D = Vec2.scale(dockedDir, -a); // 沿 dockedDir 负方向 (即 +inclineDir 方向) 加速幅值
            const docked = this.buildDockedTrajectory({
                t0: tEnd,
                samples: SAMPLES_PER_PHASE,
                vEnd,
                dockedDir,
                dockedAccelerationVec,
                startPos: phase2StartPos,
                m,
                g
            });
            for (const p of docked.points) trajectory.push(p);
            phase2End = tEnd + docked.tUp;
            phase2EndPos = docked.endPos;
            keyframes.push({
                label: '对接斜面最高点',
                t: phase2End,
                position: phase2EndPos,
                velocity: Vec2.zero(),
                description: `小球滚上对接斜面至最高点, 回到原来高度 h = ${h.toFixed(3)} m (能量守恒)`
            });
            conservedQuantities.push({
                name: '对接斜面回到原高',
                law: '机械能守恒 (对接斜面理想外推)',
                initialValue: m * g * h,
                finalValue: m * g * h,
                maxDeviation: 0,
                tolerance: 1e-9 * (m * g * h),
                conserved: true
            });
        }

        // --- Phase 3: 水平面匀速 (可选) ---
        let phase3End = phase2End;
        if (mode === 'horizontal' || mode === 'all') {
            const horizontalStart: Vector2D = mode === 'all' ? phase2EndPos : Vec2.scale(inclineDir, L);
            const vHorizontal: Vector2D = { x: vEnd, y: 0 };
            const tStart = phase2End;
            const tHoriz = Math.max(2, tEnd);
            for (let i = 1; i <= SAMPLES_PER_PHASE; i++) {
                const tPrime = (i / SAMPLES_PER_PHASE) * tHoriz;
                const t = tStart + tPrime;
                const pos: Vector2D = { x: horizontalStart.x + vHorizontal.x * tPrime, y: horizontalStart.y };
                trajectory.push({
                    t,
                    position: pos,
                    velocity: vHorizontal,
                    acceleration: Vec2.zero(),
                    kineticEnergy: kineticEnergy(m, vEnd),
                    potentialEnergy: m * g * pos.y
                });
            }
            phase3End = tStart + tHoriz;
            keyframes.push({
                label: '水平面匀速 (牛顿第一定律)',
                t: phase3End,
                position: { x: horizontalStart.x + vHorizontal.x * tHoriz, y: horizontalStart.y },
                velocity: vHorizontal,
                description: `水平面匀速运动 v = ${vEnd.toFixed(3)} m/s — 无摩擦时永远运动 (牛顿第一定律)`
            });
        }

        if (Math.abs(sinTheta) <= 2 * MIN_SIN_THETA) {
            warnings.push('θ ≈ 0°, 沿斜面分力趋近于零, 外推"无法计时", 所以伽利略选用较大倾角外推');
        }

        // ====== 图表 ======
        // 1) x_t: 沿斜面位移-时间 (Phase 1 段, 即下滑段)
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '沿斜面位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory
                .filter(p => p.t <= tEnd + 1e-9)
                .map(p => ({ x: p.t, y: Vec2.dot(Vec2.sub(p.position, origin), inclineDir) }))
        };

        // 2) θ-a 直线 (0° → 90°, a = g·sinθ)
        const theta_a: ChartSeries = {
            xLabel: 'θ (度)',
            yLabel: '加速度 a',
            xUnit: '°',
            yUnit: 'm/s²',
            points: Array.from({ length: 19 }, (_, i) => {
                const deg = i * 5; // 0..90
                const aVal = g * Math.sin((deg * Math.PI) / 180);
                return { x: deg, y: aVal };
            })
        };

        // 3) sinθ-t_end 曲线 (不同 θ 对应的斜面下落时间, 固定 L)
        //    取 deg ∈ [5°, 90°], sinθ 单调 ∈ [sin5°, 1.0]
        const sin_theta_t_end: ChartSeries = {
            xLabel: 'sinθ',
            yLabel: '下滑时间 t_end',
            xUnit: '',
            yUnit: 's',
            points: Array.from({ length: 18 }, (_, i) => {
                const deg = (i + 1) * 5; // 5..90, 严格递增的 sinθ
                const s = Math.sin((deg * Math.PI) / 180);
                const tVal = Math.sqrt((2 * L) / (g * s));
                return { x: s, y: tVal };
            })
        };

        const halfVSquare = 0.5 * vEnd * vEnd;

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, theta_a, sin_theta_t_end },
            diagnostics: {
                conservedQuantities,
                maxValues: {
                    maxSpeed: vEnd,
                    finalSpeed: vEnd,
                    accelerationAlongIncline: a,
                    heightDrop: h,
                    inclineLength: L,
                    endTime: tEnd
                },
                rangeCheck: {
                    withinRange: true,
                    warnings
                }
            },
            explanation: {
                summary:
                    `伽利略"冲淡重力": θ = ${angleDeg}°, a = g·sin${angleDeg}° = ${a.toFixed(3)} m/s², L = ${L} m, ` +
                    `t_end = ${tEnd.toFixed(3)} s, v_end = ${vEnd.toFixed(3)} m/s (v² = 2gh = ${(2 * g * h).toFixed(3)} m²/s²)`,
                steps: [
                    {
                        order: 1,
                        description: '冲淡重力 — 小倾角实验',
                        formula: 'a = g·sinθ',
                        calculation: `a = ${g}·sin${angleDeg}° = ${a.toFixed(3)} m/s²`,
                        result: '小 θ 时 a 大幅减小 → 运动时间延长 → 便于脉搏/水钟计时'
                    },
                    {
                        order: 2,
                        description: '数据分析 — 位移时间关系',
                        formula: 'x = ½·a·t², v = a·t',
                        calculation: `t_end = √(2·L/a) = √(2·${L}/${a.toFixed(3)}) = ${tEnd.toFixed(3)} s, v_end = a·t = ${vEnd.toFixed(3)} m/s`,
                        result: 'x ∝ t² 表明匀加速, 同一 g 下时间由 θ 和作用长度 L 共同决定'
                    },
                    {
                        order: 3,
                        description: '对接斜面实验 — 小球滚上对接斜面回到原高',
                        formula: '½·m·v² = m·g·h',
                        calculation: `½·v_end² = ${halfVSquare.toFixed(2)} J/kg, m·g·h = ${(m * g * h).toFixed(2)} J`,
                        result: '能量守恒 → 对接倾角越小 → 滚动距离越远才能回到等高 (推理链)'
                    },
                    {
                        order: 4,
                        description: '水平面极限外推',
                        formula: 'F_net = 0 (无摩擦水平面)',
                        calculation: 'a = 0, 球永保匀速 v = v_end',
                        result: '若水平面无限长且无摩擦, 球永远运动 → 牛顿第一定律 (惯性定律)'
                    },
                    {
                        order: 5,
                        description: 'θ → 90° 自由落体外推',
                        formula: 'a = g·sinθ → g (θ = 90°)',
                        calculation: `当 θ = 90° 时 a = g = ${g} m/s², 退化为自由落体`,
                        result: '斜面倾角趋近竖直, 运动趋于自由落体 — 外推与实测一致 → 证明 s ∝ t² 对自由落体成立'
                    }
                ],
                formulas: [
                    {
                        name: '沿斜面加速度',
                        formula: 'a = g·sinθ',
                        variables: {
                            g: { value: g, unit: 'm/s²' },
                            θ: { value: angleDeg, unit: '°' },
                            sinθ: { value: sinTheta, unit: '' }
                        }
                    },
                    {
                        name: '斜面位移',
                        formula: 'x(t) = ½·g·sinθ·t²',
                        variables: { g: { value: g, unit: 'm/s²' }, sinθ: { value: sinTheta, unit: '' } }
                    },
                    {
                        name: '底部速度 (能量守恒)',
                        formula: 'v = √(2·g·L·sinθ) = √(2·g·h)',
                        variables: { '2·g·h': { value: 2 * g * h, unit: 'm²/s²' }, v: { value: vEnd, unit: 'm/s' } }
                    },
                    {
                        name: '下滑时间',
                        formula: 't_end = √(2·L / (g·sinθ))',
                        variables: {
                            L: { value: L, unit: 'm' },
                            'g·sinθ': { value: a, unit: 'm/s²' },
                            t_end: { value: tEnd, unit: 's' }
                        }
                    },
                    { name: '自由落体外推', formula: 'θ → 90° : a → g', variables: { g: { value: g, unit: 'm/s²' } } }
                ]
            },
            errors: [],
            warnings
        };
    }

    /** Phase 1: 斜面下滑 — 匀加速直线运动, s = ½·a·t², v = a·t */
    private addPhaseIncline(
        out: TrajectoryPoint[],
        opts: {
            t0: number;
            samples: number;
            a: number;
            dir: Vector2D;
            startPos: Vector2D;
            mass: number;
            g: number;
            endAtLength: number;
        }
    ): void {
        const { t0, samples, a, dir, startPos, mass: m, g, endAtLength: L } = opts;
        const tEnd = Math.sqrt((2 * L) / a);
        for (let i = 0; i <= samples; i++) {
            const t = (i / samples) * tEnd;
            const s = 0.5 * a * t * t;
            const v = a * t;
            const pos: Vector2D = { x: startPos.x + dir.x * s, y: startPos.y + dir.y * s };
            const vel: Vector2D = { x: dir.x * v, y: dir.y * v };
            const acc: Vector2D = { x: dir.x * a, y: dir.y * a };
            out.push({
                t: t0 + t,
                position: pos,
                velocity: vel,
                acceleration: acc,
                kineticEnergy: kineticEnergy(m, v),
                potentialEnergy: m * g * pos.y
            });
        }
    }

    /**
     * Phase 2: 对接斜面匀减速轨迹 — 小球从原斜面底端滚上对接斜面回到等高.
     *
     * 几何:
     *   对接斜面方向 dockedDir = (cosθ, -sinθ), 是原斜面 inclineDir 关于 x 轴的镜像.
     *   从 startPos = (L·cosθ, L·sinθ) 出发, 沿 dockedDir 前进距离 L 到达
     *   endPos = (2L·cosθ, 0) — 回到竖直起始高度 (y = 0).
     *
     * 运动学:
     *   沿 dockedDir 方向速度 v_proj(t′) = vEnd′ − a·t′,
     *   其中 vEnd′ = vEnd (能量守恒使两段速率相同), a = g·sinθ,
     *   停下时 t′_up = vEnd′ / a = tEnd, s_max = vEnd′² / (2a) = L.
     */
    private buildDockedTrajectory(opts: {
        t0: number;
        samples: number;
        vEnd: number;
        dockedDir: Vector2D;
        dockedAccelerationVec: Vector2D;
        startPos: Vector2D;
        m: number;
        g: number;
    }): { points: TrajectoryPoint[]; tUp: number; endPos: Vector2D } {
        const { t0, samples, vEnd, dockedDir, dockedAccelerationVec, startPos, m, g } = opts;
        const aMag = Math.sqrt(
            dockedAccelerationVec.x * dockedAccelerationVec.x + dockedAccelerationVec.y * dockedAccelerationVec.y
        );
        const tUp = vEnd / aMag; // = tEnd
        const sMax = (vEnd * vEnd) / (2 * aMag); // = L

        const points: TrajectoryPoint[] = [];
        for (let i = 1; i <= samples; i++) {
            const tPrime = (i / samples) * tUp;
            const t = t0 + tPrime;
            const vProjNow = vEnd - aMag * tPrime;
            const sNow = vEnd * tPrime - 0.5 * aMag * tPrime * tPrime;
            const pos: Vector2D = {
                x: startPos.x + dockedDir.x * sNow,
                y: startPos.y + dockedDir.y * sNow
            };
            const vel: Vector2D = {
                x: dockedDir.x * vProjNow,
                y: dockedDir.y * vProjNow
            };
            points.push({
                t,
                position: pos,
                velocity: vel,
                acceleration: dockedAccelerationVec,
                kineticEnergy: kineticEnergy(m, vProjNow),
                potentialEnergy: m * g * pos.y
            });
        }
        const endPos: Vector2D = {
            x: startPos.x + dockedDir.x * sMax,
            y: startPos.y + dockedDir.y * sMax
        };
        return { points, tUp, endPos };
    }
}
