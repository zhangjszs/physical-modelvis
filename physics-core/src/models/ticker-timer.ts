import type { PhysicsProblem } from '../types/problem.js';
import { sampleTrajectory } from '../physics/kinematics.js';
import type {
    SimulationResult,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage,
    ConservedQuantity
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 打点计时器模型 — 必修一 第一章 实验 (研究匀变速直线运动)
 *
 * 实验装置：
 *   小车在恒定合力作用下做匀变速直线运动，与运动方向平行的纸带
 *   穿过电磁打点计时器，每隔 T = 1/f 秒在纸带上打出一个点。
 *
 * 核心公式：
 *   - 中间时刻瞬时速度:  v_n = (x_n + x_{n+1}) / (2T)
 *   - 逐差法加速度:      a = [(x₄+x₅+x₆) − (x₁+x₂+x₃)] / (9T²)
 *   - 匀变速判据:        Δx = aT²  (相邻位移差恒定)
 *
 * 数值模拟静态图 (无实际 ODE 求解)：
 *   直接按匀变速运动学公式计算 40 个 tick 的位置，
 *   再从"纸带数据"反向推出 v_n 序列，复原 v-t 直线与逐差法 a 值。
 *
 * 教学价值：
 *   - 让学生看到原始纸带、点迹、计数点的"实验真实感"
 *   - 验证 v-t 线性 (R²→1) 和逐差法 â ≈ a
 *   - 理解 Δx 恒定性是匀变速的判据
 */
export class TickerTimerModel extends PhysicsModelBase {
    readonly name = '打点计时器 (匀变速研究)';
    readonly version = '1.0.0';
    readonly description = '用纸带点迹研究匀变速直线运动, 中间时刻瞬时速度, 逐差法求加速度';
    readonly modelType = 'ticker-timer' as const;
    readonly assumptions = [
        '小车视为质点',
        '纸带与运动方向平行 (无横向抖动)',
        '打点频率恒定',
        '加速度由外力恒定维持 (砝码重力远大于摩擦)',
        '测量精度: 毫米刻度尺, 估读到 0.1 mm'
    ];
    readonly applicableRange = '匀变速直线运动实验；频率 20–200 Hz；加速度 0.1–20 m/s²';
    readonly errorSources = [
        '电源频率不稳定导致实际 T 偏离标称值',
        '纸带与限位孔摩擦带来附加阻力',
        '测量点迹间距时的读数误差',
        '手按秒表/启动计时的人为操作误差'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        {
            name: 'frequency',
            description: '打点频率 (Hz)',
            unit: 'Hz',
            required: false,
            min: 1,
            max: 500,
            defaultValue: 50
        },
        {
            name: 'acceleration',
            description: '小车加速度 (m/s²)',
            unit: 'm/s²',
            required: false,
            min: 0,
            max: 100,
            defaultValue: 2
        }
    ];

    /** 默认 tick 总数 */
    private static readonly TICK_COUNT = 40;

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const tc = problem.constraints?.tickerTimer;
        const f = tc?.frequency ?? 50;
        const a = tc?.acceleration ?? 2;
        const v0 = tc?.initialVelocity ?? 0;
        const mu = tc?.frictionCoefficient ?? 0;

        // 防御: 频率过低会让模拟无意义 (最小 1 Hz)
        // 警告但不中断 — 调用方才适用范围内可选值
        const warnings: string[] = [];
        if (f < 10) {
            warnings.push(`频率 ${f} Hz 过低 (市电 50Hz), 实际打点稀疏, 测量误差增大`);
        }
        if (f > 200) {
            warnings.push(`频率 ${f} Hz 过高 (超出电磁打点计时器范围, 需电火花计时器)`);
        }
        if (a < 0.05 && a >= 0) {
            warnings.push('加速度接近零, Δx 判据对读数误差敏感');
        }
        if (mu > 0) {
            warnings.push(`摩擦系数 μ=${mu} 已记录; 本模型 a 为"实际"加速度, 不重复扣除摩擦`);
        }

        const T = 1 / f; // 相邻两点时间间隔 (s)
        const N = TickerTimerModel.TICK_COUNT; // tick 总数

        // === 解析解采样: 打点计时器匀加速 x=v₀·t+½a·t² (公共脚手架 sampleTrajectory) ===
        //   N 个 tick = N-1 个间隔 → sampleCount=N-1, duration=(N-1)·T
        const trajectory = sampleTrajectory({
            sampleCount: N - 1,
            duration: (N - 1) * T,
            sampleAt: t => ({
                position: { x: v0 * t + 0.5 * a * t * t, y: 0 },
                velocity: { x: v0 + a * t, y: 0 },
                acceleration: { x: a, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            })
        });

        // === 3. 图表 1 — x_t: 纸带点迹 (沿纸带位置 vs 时间) ===
        const tapeChart: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '沿纸带位置 x (m)',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: parseFloat(p.t.toFixed(5)), y: p.position.x }))
        };

        // === 4. 图表 2 — v_t: 相邻 tick 中点速度 vs 时间 ===
        //   对第 n 段 (tick n 与 tick n+1 之间):
        //     中点时刻:     t_mid,n = (n + 0.5) · T
        //     中点速度:     v_mid,n = (x_{n+1} − x_n) / T = v₀ + a · (n + 0.5) · T
        //   这是"纸带数据反推"的标准方法, 返回 v = v₀ + at (一致)
        const vPoints: Array<{ x: number; y: number }> = [];
        for (let n = 0; n < N - 1; n++) {
            const tMid = (trajectory[n]!.t + trajectory[n + 1]!.t) / 2; // (n+0.5)·T
            const vMid = (trajectory[n + 1]!.position.x - trajectory[n]!.position.x) / T; // Δx/T
            vPoints.push({ x: parseFloat(tMid.toFixed(5)), y: vMid });
        }
        const vtChart: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '瞬时速度 v (m/s)',
            xUnit: 's',
            yUnit: 'm/s',
            points: vPoints
        };

        // === 5. 图表 3 — Δx vs 段号 (匀变速判据: 所有 Δx − Δx_{n−1} = aT² 恒定) ===
        //   若 a = 0, 则 Δx 全部相等; 若 a > 0, Δx 随段号线性增大
        //   Δx_n = x_{n+1} − x_n
        const dxPoints: Array<{ x: number; y: number }> = [];
        for (let n = 0; n < N - 1; n++) {
            const dx = trajectory[n + 1]!.position.x - trajectory[n]!.position.x;
            dxPoints.push({ x: n + 1, y: dx }); // 段号从 1 开始 (符合教材习惯)
        }
        const dxChart: ChartSeries = {
            xLabel: '连续段序号 n',
            yLabel: '相邻位移差 Δx (m)',
            xUnit: '(段)',
            yUnit: 'm',
            points: dxPoints
        };

        // === 6. 诊断 — v-t 线性度 R² ===
        //   v_mid,n = v₀ + a · (n + 0.5) · T  是 t_mid,n 的线性函数
        //   对 v_t 做线性回归, 计算 R²
        const rSquared = computeRSquared(vPoints);

        // === 7. 诊断 — 逐差法求 â (仅用前 7 个 tick 的 6 段) ===
        //   教材公式: a = [(s₄+s₅+s₆) − (s₁+s₂+s₃)] / (9T²)
        //   其中 s_i = x_i − x_{i−1}, i = 1..6
        const s: number[] = [];
        for (let i = 1; i <= 6; i++) {
            s[i] = trajectory[i]!.position.x - trajectory[i - 1]!.position.x;
        }
        const aDiscrete = (s[4]! + s[5]! + s[6]! - s[1]! - s[2]! - s[3]!) / (9 * T * T);

        // 也可对全部 39 段做"最小二乘法"拟合作为交叉验证
        const aLeastSquares = fitLineSlope(vPoints);

        // === 8. 关键帧 — 实验标志性点 ===
        const keyframes: Keyframe[] = [
            {
                label: '起始点',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: v0, y: 0 },
                description: `t=0, x=0, v=${v0} m/s, a=${a} m/s², f=${f} Hz, T=${(T * 1000).toFixed(1)} ms`
            },
            {
                label: '计数点 4 (逐差法下组起点)',
                t: 3 * T,
                position: { x: trajectory[3]!.position.x, y: 0 },
                velocity: { x: v0 + a * 3 * T, y: 0 },
                description: `x₃ = ${trajectory[3]!.position.x.toFixed(4)} m, s₄ = ${(s[4]! * 100).toFixed(2)} cm`
            },
            {
                label: '终点',
                t: (N - 1) * T,
                position: { x: trajectory[N - 1]!.position.x, y: 0 },
                velocity: { x: v0 + a * (N - 1) * T, y: 0 },
                description: `总点数 N=${N}, 总时长 t=${((N - 1) * T).toFixed(3)} s, 末速度 v=${(v0 + a * (N - 1) * T).toFixed(3)} m/s`
            }
        ];

        // === 9. 误差分析 (定量) ===
        // 逐差法对 6 段"局部"的截断误差来自:
        //   x(t) 是 t 的二次函数, v_mid,n = v₀ + a·(n+0.5)T 是精确的 t_mid,n 导数
        //   逐差法 â 的数学推导也给出精确 a — 故理论误差应为 0
        // 实际实验误差来自测量, 本模型用 double 精度, â ≈ a (误差在 1e-12 量级)
        const absError = Math.abs(aDiscrete - a);
        if (absError > 1e-9) {
            warnings.push(
                `逐差法 â (${aDiscrete.toExponential(2)}) 与标称 a (${a.toExponential(2)}) 偏差超过浮点精度, 请检查数值`
            );
        }

        // === 10. 守恒量 (匀变速运动无特殊守恒, 仅记录末速度 − 初速度 = a·t) ===
        const totalTime = (N - 1) * T;
        const finalVelocity = v0 + a * totalTime;
        const conserved: ConservedQuantity[] = [
            {
                name: '速度变化量/加速度',
                law: 'Δv = a·Δt (匀变速运动学定义)',
                initialValue: v0,
                finalValue: finalVelocity,
                maxDeviation: Math.abs(finalVelocity - v0 - a * totalTime),
                tolerance: 1e-9,
                conserved: Math.abs(finalVelocity - v0 - a * totalTime) < 1e-9
            }
        ];

        // === 11. 解释步骤 (五步, 教材标准) ===
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '实验原理 — 电磁打点计时器',
                formula: 'T = 1/f',
                calculation: `f = ${f} Hz → T = 1/${f} = ${(T * 1000).toFixed(1)} ms`,
                result: '纸带上相邻两点的时间间隔 T 恒定, 通过测量位移反映速度变化'
            },
            {
                order: 2,
                description: '数据采集 — 纸带与计数点',
                formula: 'x_n = x(t_n),  t_n = n·T',
                calculation: `取 N = ${N} 个点, 编号 0..${N - 1}, 每 5 个点取一个计数点 (T₀ = 5T = ${(5 * T * 1000).toFixed(0)} ms)`,
                result: `测得各点位置 x₀=0, x₁=${trajectory[1]!.position.x.toFixed(4)} m, …, x_${N - 1}=${trajectory[N - 1]!.position.x.toFixed(4)} m`
            },
            {
                order: 3,
                description: '瞬时速度计算 — 中间时刻速度',
                formula: 'v_n = (x_{n+1} − x_n) / T',
                calculation: `v_n = v₀ + a·(n + 0.5)·T, 例: v₂ = ${vPoints[2]!.y.toFixed(4)} m/s`,
                result: 'v_t 直线的斜率即为加速度 a'
            },
            {
                order: 4,
                description: '加速度计算 — 逐差法',
                formula: 'â = [(s₄+s₅+s₆)−(s₁+s₂+s₃)] / (9T²)',
                calculation:
                    `s₁~s₆ = [${s
                        .slice(1)
                        .map(v => (v * 100).toFixed(2))
                        .join(', ')}] cm` + ` → â = ${aDiscrete.toFixed(4)} m/s²`,
                result: `标称 a = ${a} m/s², 偏差 ${(absError * 1e6).toFixed(2)}×10⁻⁶ m/s²`
            },
            {
                order: 5,
                description: '误差分析 — 匀变速判据',
                formula: 'Δx = x_{n+1} − x_n,  Δx_{n+1} − Δx_n = aT²',
                calculation: `理论 Δx 差 = aT² = ${a}·${T.toFixed(4)}² = ${(a * T * T).toFixed(6)} m`,
                result: '若连续 Δx 差为常数 → 匀变速成立; v_t 直线 R² → 1'
            }
        ];

        const explanationSummary =
            `打点计时器 (匀变速研究): f=${f} Hz, T=${(T * 1000).toFixed(1)} ms, v₀=${v0} m/s, a=${a} m/s², ` +
            `N=${N} 点, â(逐差)=${aDiscrete.toFixed(4)} m/s², R²=${rSquared.toPrecision(6)}`;

        const formulas: FormulaUsage[] = [
            {
                name: '中间时刻瞬时速度',
                formula: 'v_n = (x_{n+1} − x_n) / T',
                variables: {
                    T: { value: T, unit: 's' },
                    v_n: { value: vPoints[Math.floor(vPoints.length / 2)]?.y ?? 0, unit: 'm/s' }
                }
            },
            {
                name: '逐差法加速度',
                formula: 'a = [(s₄+s₅+s₆)−(s₁+s₂+s₃)]/(9T²)',
                variables: {
                    a: { value: aDiscrete, unit: 'm/s²' },
                    T: { value: T, unit: 's' }
                }
            },
            {
                name: '匀变速判据',
                formula: 'Δx = aT²',
                variables: {
                    a: { value: a, unit: 'm/s²' },
                    T: { value: T, unit: 's' },
                    deltaX: { value: a * T * T, unit: 'm/s²' }
                }
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: tapeChart, v_t: vtChart, y_t: dxChart },
            diagnostics: {
                conservedQuantities: conserved,
                maxValues: {
                    frequency_Hz: f,
                    tickInterval_s: T,
                    tickCount: N,
                    nominalAcceleration: a,
                    v0: v0,
                    finalVelocity,
                    totalTime,
                    tapeLength_m: trajectory[N - 1]!.position.x,
                    a_from_discrete_method: aDiscrete,
                    a_from_least_squares: aLeastSquares,
                    vt_r_squared: rSquared,
                    frictionCoefficient: mu
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: explanationSummary,
                steps,
                formulas
            },
            errors: [],
            warnings
        };
    }
}

/**
 * 计算散点到其线性回归的 R² 决定系数。
 * 退化 (共点或垂直) 情形返回 0。
 */
function computeRSquared(points: ReadonlyArray<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;
    const n = points.length;
    let sx = 0,
        sy = 0,
        sxy = 0,
        sxx = 0,
        syy = 0;
    for (const p of points) {
        sx += p.x;
        sy += p.y;
        sxy += p.x * p.y;
        sxx += p.x * p.x;
        syy += p.y * p.y;
    }
    const denom = n * sxx - sx * sx;
    const denomR = (n * sxx - sx * sx) * (n * syy - sy * sy);
    if (Math.abs(denom) < 1e-15 || Math.abs(denomR) < 1e-30) return 0;
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    const ssTot = syy - (sy * sy) / n;
    let ssRes = 0;
    for (const p of points) {
        const yHat = slope * p.x + intercept;
        ssRes += (p.y - yHat) * (p.y - yHat);
    }
    if (Math.abs(ssTot) < 1e-15) return 0;
    return Math.min(1, Math.max(0, 1 - ssRes / ssTot));
}

/**
 * 对 (x, y) 点集做最小二乘线性回归, 返回斜率。
 * f(x) = slope · x + intercept
 */
function fitLineSlope(points: ReadonlyArray<{ x: number; y: number }>): number {
    const n = points.length;
    if (n < 2) return 0;
    let sx = 0,
        sy = 0,
        sxy = 0,
        sxx = 0;
    for (const p of points) {
        sx += p.x;
        sy += p.y;
        sxy += p.x * p.y;
        sxx += p.x * p.x;
    }
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-15) return 0;
    return (n * sxy - sx * sy) / denom;
}
