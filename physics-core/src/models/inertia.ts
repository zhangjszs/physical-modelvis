import type { PhysicsProblem, InertiaMode } from '../types/problem.js';
import { kineticEnergy } from '../physics/kinematics.js';
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

/**
 * 惯性实验组合模型 — 牛顿第一定律 (必修一 第四章)
 *
 * 惯性 = 物体保持原运动状态 (静止或匀速直线运动) 的性质。
 * 质量是惯性大小的唯一量度。
 *
 * 三种典型惯性演示:
 *   1. stroke (棋子叠放打击): 打击中间棋子 → 下方棋子飞出, 上方棋子因惯性保持静止落在原处
 *   2. stop (小车急停木块倒伏): 小车急停 → 木块上半部分因惯性继续向前倾倒
 *   3. smoothPull (鸡蛋落入水杯): 硬纸板弹出 → 鸡蛋因惯性保持静止落入水中
 *
 * 物理要点: 惯性不是一种"力", 而是物体本身的固有属性。
 */
export class InertiaModel extends PhysicsModelBase {
    readonly name = '惯性实验组合';
    readonly version = '1.0.0';
    readonly description = '牛顿第一定律 — 三种惯性现象演示: 棋子打击 / 鸡蛋落水 / 小车急停';
    readonly modelType = 'inertia' as const;
    readonly assumptions = [
        '物体视为质点或刚体模型',
        '忽略空气阻力',
        '接触面光滑 (除摩擦系数 μ 外无其它阻力)',
        '正常力等于重力 (水平面)',
        '重力加速度恒定 g = 9.8 m/s²'
    ];
    readonly applicableRange = '牛顿第一定律适用于惯性参考系, 不适用于加速参考系';
    readonly errorSources = ['存在摩擦力/空气阻力时物体实际会减速', '实验存在测量误差', '质量分布不均匀影响转动效应'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'mode', description: '演示模式 (stroke/stop/smoothPull)', unit: '', required: true },
        {
            name: 'massRatio',
            description: '质量比 m_top/m_bottom',
            unit: '',
            required: false,
            defaultValue: 0.1,
            min: 0,
            max: 10
        },
        { name: 'initialSpeed', description: '初速度 (m/s)', unit: 'm/s', required: false, defaultValue: 2, min: 0 },
        { name: 'frictionCoeff', description: '摩擦系数 μ', unit: '', required: false, defaultValue: 0.3, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.inertia;
        if (!c) {
            throw new Error('惯性模型需要 constraints.inertia 配置');
        }

        // 参数默认值
        const massRatio = c.massRatio ?? 0.1;
        const initialSpeed = c.initialSpeed ?? 2;
        const frictionCoeff = c.frictionCoeff ?? 0.3;
        const mode: InertiaMode = c.mode;

        const mBottom = 1; // 下方物体质量基准 1 kg
        const mTop = mBottom * massRatio; // 上方物体质量
        const g = problem.environment?.gravity?.value ?? 9.8;
        const mu = frictionCoeff;

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 500;
        const dt = duration / sampleCount;

        // 重力加速度方向: y 轴向上为正 (物理坐标系), 重力 a_y = -g
        const gravity = { x: 0, y: -g };

        const trajTop: TrajectoryPoint[] = [];
        const trajBottom: TrajectoryPoint[] = [];
        let keyframes: Keyframe[] = [];
        let v_t_points: Array<{ x: number; y: number }> = [];
        let x_t_points: Array<{ x: number; y: number }> = [];
        let summary = '';
        let steps: ExplanationStep[] = [];
        let formulas: FormulaUsage[] = [];
        let inertiaPreserveTime = 0; // 惯性保持时间 (上方/被研究物体保持原状态的持续时间)
        let finalVelocity = 0;

        if (mode === 'stroke') {
            // === 棋子叠放打击 ===
            // 初始: 上方棋子位于 (0, 1), 下方棋子位于 (0, 0), 两者都静止
            // 打击瞬间: 下方棋子获得初速度 v0 向右飞出
            // 上方棋子因惯性 — 水平方向不受力 (忽略摩擦), 保持水平位置 x=0 不动
            // 但受重力作用开始自由落体, 落在原处 (x ≈ 0)
            // 下方棋子: 受摩擦力 μmg 减速, 最终停止

            const a_friction = -mu * g; // 摩擦力提供的减速度 (下方棋子)
            const tStop = -initialSpeed / a_friction; // 下方棋子停止时刻
            const tFall = Math.sqrt((2 * 1) / g); // 上方棋子从 y=1 自由落体到 y=0 的时间 ≈ 0.45 s

            const startTop = { x: 0, y: 1 };
            const startBottom = { x: 0, y: 0 };

            for (let i = 0; i <= sampleCount; i++) {
                const t = i * dt;

                // 上方棋子: 水平 x 保持不变 (惯性), 自由落体
                const yTop = Math.max(0, startTop.y + 0.5 * gravity.y * t * t);
                const xTop = startTop.x; // 水平保持静止
                const vTopX = 0;
                const vTopY = gravity.y * t;

                // 下方棋子: 水平减速 (初速度 v0 + 摩擦力), y=0 不变
                const bottomActive = t < tStop;
                const xBottom = bottomActive
                    ? startBottom.x + initialSpeed * t + 0.5 * a_friction * t * t
                    : startBottom.x + initialSpeed * tStop + 0.5 * a_friction * tStop * tStop;
                const vBottomX = bottomActive ? initialSpeed + a_friction * t : 0;
                const vBottomY = 0;

                const keTop = 0.5 * mTop * (vTopX * vTopX + vTopY * vTopY);
                const peTop = mTop * g * yTop;

                trajTop.push({
                    t,
                    position: { x: xTop, y: yTop },
                    velocity: { x: vTopX, y: vTopY },
                    acceleration: { x: 0, y: gravity.y },
                    kineticEnergy: keTop,
                    potentialEnergy: peTop
                });

                trajBottom.push({
                    t,
                    position: { x: xBottom, y: 0 },
                    velocity: { x: vBottomX, y: vBottomY },
                    acceleration: { x: bottomActive ? a_friction : 0, y: 0 },
                    kineticEnergy: kineticEnergy(mBottom, vBottomX),
                    potentialEnergy: 0
                });
            }

            keyframes = [
                {
                    label: '打击前',
                    t: 0,
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 },
                    description: '棋子叠放静止, 下方棋子即将受到打击'
                },
                {
                    label: '打击瞬间',
                    t: dt,
                    position: { x: startBottom.x + initialSpeed * dt, y: 0 },
                    velocity: { x: initialSpeed, y: 0 },
                    description: `打击给予下方棋子初速度 v₀=${initialSpeed} m/s, 上方棋子因惯性水平保持静止`
                },
                {
                    label: '上方棋子落下',
                    t: Math.min(tFall, duration),
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: gravity.y * Math.min(tFall, duration) },
                    description: `上方棋子落到原处正下方 (x≈0), 体现水平方向惯性`
                },
                {
                    label: '终点',
                    t: duration,
                    position: { x: trajBottom[trajBottom.length - 1].position.x, y: 0 },
                    velocity: { x: 0, y: 0 },
                    description: `下方棋子因摩擦停止于 ${trajBottom[trajBottom.length - 1].position.x.toFixed(3)} m`
                }
            ];

            v_t_points = trajTop.map(p => ({ x: p.t, y: Math.hypot(p.velocity.x, p.velocity.y) }));
            x_t_points = trajTop.map(p => ({ x: p.t, y: p.position.y }));

            inertiaPreserveTime = tStop; // 下方棋子运动持续即上方惯性维持的时间
            finalVelocity = 0;

            summary = `棋子打击: 下方棋子以 v₀=${initialSpeed}m/s 飞出, 上方棋子因惯性水平静止落到原处`;
            steps = [
                {
                    order: 1,
                    description: '惯性定义',
                    formula: '物体保持原运动状态的性质',
                    calculation: '质量越大, 惯性越大'
                },
                {
                    order: 2,
                    description: '打击分析',
                    formula: '打击时间极短, 力仅作用于下方棋子',
                    calculation: '上方棋子水平不受力'
                },
                {
                    order: 3,
                    description: '上方棋子水平运动',
                    formula: 'x_top(t) = x₀ (水平惯性)',
                    calculation: `x_top(t) = ${startTop.x} (恒定)`
                },
                {
                    order: 4,
                    description: '上方棋子竖直运动',
                    formula: 'y_top(t) = y₀ - ½gt² (自由落体)',
                    calculation: `从 y₀=${startTop.y}m 落到 y=0 用时 t=√(2y₀/g)=${tFall.toFixed(3)}s`
                },
                {
                    order: 5,
                    description: '下方棋子减速',
                    formula: 'a = -μmg/m = -μg',
                    calculation: `a = -${mu}×${g} = ${a_friction.toFixed(2)} m/s², 经 t=${tStop.toFixed(3)}s 停止`
                }
            ];
            formulas = [
                {
                    name: '惯性定义',
                    formula: '质量是惯性大小的唯一量度',
                    variables: { m_top: { value: mTop, unit: 'kg' }, m_bottom: { value: mBottom, unit: 'kg' } }
                },
                {
                    name: '自由落体',
                    formula: 'y(t) = y₀ - ½gt²',
                    variables: { y0: { value: startTop.y, unit: 'm' }, g: { value: g, unit: 'm/s²' } }
                },
                {
                    name: '滑动摩擦',
                    formula: 'f = μN = μmg, a = -μg',
                    variables: {
                        μ: { value: mu, unit: '' },
                        m: { value: mBottom, unit: 'kg' },
                        g: { value: g, unit: 'm/s²' }
                    }
                },
                {
                    name: '水平惯性',
                    formula: '水平方向无力 → vx 保持不变',
                    variables: { vx: { value: 0, unit: 'm/s' } }
                }
            ];
        } else if (mode === 'stop') {
            // === 小车急停木块倒伏 ===
            // 初始: 木块立在小车上, 两者以 v0 共同向右匀速
            // 小车突然停止 → 木块下半部分随小车停, 上半部分因惯性继续向前 → 向前倾倒
            // 简化模型: 用两个质点 (顶部/底部) 表示木块
            //   - 底部质点: 随小车急停 (与小车一起减速至 0)
            //   - 顶部质点: 因惯性继续向前 (水平匀速, 仅受重力/约束)

            const tStop = 0.5; // 小车急停持续的时间
            const x0 = 0;
            const yBottom = 0; // 底部接触小车面
            const yTop = 0.5; // 顶部高度

            const aStop = -initialSpeed / tStop; // 小车提供的减速度

            for (let i = 0; i <= sampleCount; i++) {
                const t = i * dt;

                // 顶部质点 (木块上半): 因惯性继续向前 (匀速, 仅受重力)
                const xTop = x0 + initialSpeed * t;
                const yTopPos = Math.max(yBottom, yTop + 0.5 * gravity.y * Math.max(0, t - 0.1) * Math.max(0, t - 0.1));
                const vTopX = initialSpeed;
                const vTopY = t > 0.1 ? gravity.y * (t - 0.1) : 0; // 开始倾倒后受重力

                // 底部质点 (随小车): 急停后速度为 0
                const slowingDown = t < tStop;
                const xBottom = slowingDown
                    ? x0 + initialSpeed * t + 0.5 * aStop * t * t
                    : x0 + initialSpeed * tStop + 0.5 * aStop * tStop * tStop;
                const vBottomX = slowingDown ? initialSpeed + aStop * t : 0;

                trajTop.push({
                    t,
                    position: { x: xTop, y: yTopPos },
                    velocity: { x: vTopX, y: vTopY },
                    acceleration: { x: 0, y: t > 0.1 ? gravity.y : 0 },
                    kineticEnergy: 0.5 * mTop * (vTopX * vTopX + vTopY * vTopY),
                    potentialEnergy: mTop * g * yTopPos
                });

                trajBottom.push({
                    t,
                    position: { x: xBottom, y: yBottom },
                    velocity: { x: vBottomX, y: 0 },
                    acceleration: { x: slowingDown ? aStop : 0, y: 0 },
                    kineticEnergy: kineticEnergy(mBottom, vBottomX),
                    potentialEnergy: 0
                });
            }

            const xFrontAtStop = x0 + initialSpeed * tStop + 0.5 * aStop * tStop * tStop;

            keyframes = [
                {
                    label: '匀速前进',
                    t: 0,
                    position: { x: 0, y: 0 },
                    velocity: { x: initialSpeed, y: 0 },
                    description: `小车与木块共同以 v₀=${initialSpeed}m/s 向右匀速`
                },
                {
                    label: '小车急停',
                    t: tStop,
                    position: { x: xFrontAtStop, y: 0 },
                    velocity: { x: 0, y: 0 },
                    description: `小车在 t=${tStop}s 内停止, 木块底部随小车停住`
                },
                {
                    label: '木块倒伏',
                    t: Math.min(tStop + 0.3, duration),
                    position: { x: trajTop[Math.min(sampleCount, Math.floor((tStop + 0.3) / dt))].position.x, y: 0 },
                    velocity: { x: initialSpeed, y: gravity.y * 0.3 },
                    description: '木块上半部分因惯性继续向前倾倒'
                },
                {
                    label: '终点',
                    t: duration,
                    position: trajTop[trajTop.length - 1].position,
                    velocity: trajTop[trajTop.length - 1].velocity,
                    description: `木块顶部最终落在 x=${trajTop[trajTop.length - 1].position.x.toFixed(3)}m`
                }
            ];

            v_t_points = trajTop.map(p => ({ x: p.t, y: p.velocity.x }));
            x_t_points = trajTop.map(p => ({ x: p.t, y: p.position.x }));

            inertiaPreserveTime = duration; // 顶部在整段时间中保持前进
            finalVelocity = initialSpeed;

            summary = `小车急停: 车停但木块上半因惯性继续向前倾倒 (v₀=${initialSpeed}m/s 保持)`;
            steps = [
                {
                    order: 1,
                    description: '惯性定义',
                    formula: '物体保持原运动状态的性质',
                    calculation: '木块原以 v₀ 向右运动'
                },
                {
                    order: 2,
                    description: '小车急停',
                    formula: 'C → v_C = 0, a_stop = -v₀/t_stop',
                    calculation: `a_stop = ${aStop.toFixed(2)} m/s²`
                },
                {
                    order: 3,
                    description: '木块底部',
                    formula: '底部与小车接触 → 随小车停止',
                    calculation: `底部与小车一同经 ${tStop}s 停下`
                },
                {
                    order: 4,
                    description: '木块顶部惯性',
                    formula: '顶部保持原速度 v₀ (水平惯性)',
                    calculation: `v_top = ${initialSpeed} m/s 不变`
                },
                {
                    order: 5,
                    description: '倒伏原因',
                    formula: '底部停 + 顶部继续 → 倾倒',
                    calculation: '倒伏方向: 向前 (运动方向)'
                }
            ];
            formulas = [
                {
                    name: '惯性',
                    formula: 'F_net = 0 → v 保持不变',
                    variables: { v0: { value: initialSpeed, unit: 'm/s' } }
                },
                {
                    name: '急停减速度',
                    formula: 'a = (v - v₀) / t',
                    variables: {
                        v: { value: 0, unit: 'm/s' },
                        v0: { value: initialSpeed, unit: 'm/s' },
                        t: { value: tStop, unit: 's' }
                    }
                }
            ];
        } else {
            // === smoothPull (鸡蛋落入水杯) ===
            // 初始: 硬纸板上放鸡蛋, 水杯在纸板正下方
            // 快速抽出纸板 → 纸板飞出, 鸡蛋因惯性保持水平位置静止, 落入水中
            // 鸡蛋: x 保持不变 (惯性), 在重力作用下自由落体
            // 纸板: 抽出后快速水平飞出

            const vCard = 3; // 纸板抽出速度
            const x0 = 0;
            const y0 = 0.5; // 鸡蛋初始高度
            const tFall = Math.sqrt((2 * y0) / g); // 自由落体时间

            for (let i = 0; i <= sampleCount; i++) {
                const t = i * dt;

                // 鸡蛋: x 不变 (惯性), 竖直自由落体
                const yEgg = Math.max(0, y0 - 0.5 * g * t * t);
                const xEgg = x0;
                const vEggX = 0; // 水平惯性使水平速度保持 0
                const vEggY = -g * t;

                // 纸板: 快速向右飞出 (假设纸板受恒定水平力飞出)
                const xCard = x0 + vCard * t; // 纸板快速向右
                const yCard = y0; // 纸板与鸡蛋同一高度向右抽出

                trajTop.push({
                    t,
                    position: { x: xEgg, y: yEgg },
                    velocity: { x: vEggX, y: vEggY },
                    acceleration: { x: 0, y: gravity.y },
                    kineticEnergy: 0.5 * mTop * (vEggX * vEggX + vEggY * vEggY),
                    potentialEnergy: mTop * g * yEgg
                });

                trajBottom.push({
                    t,
                    position: { x: xCard, y: yCard },
                    velocity: { x: vCard, y: 0 },
                    acceleration: { x: 0, y: 0 },
                    kineticEnergy: kineticEnergy(mBottom, vCard),
                    potentialEnergy: mBottom * g * yCard
                });
            }

            keyframes = [
                {
                    label: '初始',
                    t: 0,
                    position: { x: 0, y: y0 },
                    velocity: { x: 0, y: 0 },
                    description: `鸡蛋静止在纸板上, 纸杯在正下方 y=0`
                },
                {
                    label: '纸板抽出',
                    t: dt,
                    position: { x: vCard * dt, y: y0 },
                    velocity: { x: vCard, y: 0 },
                    description: `纸板以 v=${vCard}m/s 迅速抽出`
                },
                {
                    label: '鸡蛋落入水中',
                    t: Math.min(tFall, duration),
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: -g * Math.min(tFall, duration) },
                    description: `鸡蛋因惯性水平静止, 自由落入水中 (用时 ${tFall.toFixed(3)}s)`
                },
                {
                    label: '终点',
                    t: duration,
                    position: trajTop[trajTop.length - 1].position,
                    velocity: trajTop[trajTop.length - 1].velocity,
                    description: `鸡蛋最终停在 y=${trajTop[trajTop.length - 1].position.y.toFixed(3)}m`
                }
            ];

            v_t_points = trajTop.map(p => ({ x: p.t, y: Math.abs(p.velocity.y) }));
            x_t_points = trajTop.map(p => ({ x: p.t, y: p.position.y }));

            inertiaPreserveTime = tFall; // 鸡蛋水平惯性保持到落入水中
            finalVelocity = g * tFall;

            summary = `鸡蛋落水: 纸板抽出, 鸡蛋因惯性水平静止落入水中 (t_fall=${tFall.toFixed(3)}s)`;
            steps = [
                { order: 1, description: '惯性定义', formula: '鸡蛋保持原静止状态', calculation: '水平方向不受力' },
                {
                    order: 2,
                    description: '纸板抽出',
                    formula: '纸板受快速水平力 → 飞出',
                    calculation: `纸板速度 v=${vCard}m/s`
                },
                {
                    order: 3,
                    description: '鸡蛋水平惯性',
                    formula: '鸡蛋水平不受力 → x 恒定',
                    calculation: `x_egg(t) = ${x0}`
                },
                {
                    order: 4,
                    description: '鸡蛋竖直落体',
                    formula: 'y(t) = y₀ - ½gt²',
                    calculation: `从 y₀=${y0}m 落到 y=0 用时 t=${tFall.toFixed(3)}s`
                },
                {
                    order: 5,
                    description: '结论',
                    formula: '鸡蛋落入水中正下方',
                    calculation: '水平惯性体现: 抽出纸板不影响鸡蛋水平位置'
                }
            ];
            formulas = [
                {
                    name: '惯性 (静止物体)',
                    formula: '静止 → a = 0, x 恒定',
                    variables: { x: { value: x0, unit: 'm' } }
                },
                {
                    name: '自由落体',
                    formula: 'y(t) = y₀ - ½gt²',
                    variables: { y0: { value: y0, unit: 'm' }, g: { value: g, unit: 'm/s²' } }
                },
                {
                    name: '下落时间',
                    formula: 't = √(2y₀/g)',
                    variables: {
                        y0: { value: y0, unit: 'm' },
                        g: { value: g, unit: 'm/s²' },
                        t: { value: tFall, unit: 's' }
                    }
                }
            ];
        }

        // 图表: v-t (顶部物体速度-时间)
        const v_t: ChartSeries = {
            xLabel: '时间 t',
            yLabel: '|v| (惯性现象速度)',
            xUnit: 's',
            yUnit: 'm/s',
            points: v_t_points
        };

        // 图表: x-t (位置-时间)
        const x_t: ChartSeries = {
            xLabel: '时间 t',
            yLabel: '位置',
            xUnit: 's',
            yUnit: 'm',
            points: x_t_points
        };

        const body0 = problem.bodies[0];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajTop, trajBottom],
            keyframes,
            charts: { v_t, x_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    inertiaPreserveTime,
                    finalVelocity,
                    massRatio,
                    topMass: mTop,
                    bottomMass: mBottom,
                    frictionCoeff: mu
                },
                rangeCheck: {
                    withinRange: true,
                    warnings:
                        massRatio <= 0 ? ['质量比应大于 0'] : massRatio > 5 ? ['质量比过大, 不符合常见实验设置'] : []
                }
            },
            explanation: {
                summary,
                steps,
                formulas
            },
            renderHints: [
                {
                    bodyId: body0?.id ?? 'top',
                    renderLabel: mode === 'stroke' ? '上方棋子' : mode === 'stop' ? '木块顶部' : '鸡蛋',
                    renderColor: '#e74c3c'
                },
                {
                    bodyId: problem.bodies[1]?.id ?? 'bottom',
                    renderLabel: mode === 'stroke' ? '下方棋子' : mode === 'stop' ? '小车' : '纸板',
                    renderColor: '#3498db'
                }
            ],
            errors: [],
            warnings: []
        };
    }
}
