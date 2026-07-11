import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/** 重力加速度标准值 (m/s²), 地球半径, 地月距离, 月球周期 (s) */
const G_STD = 9.80665;
const R_EARTH_STD = 6.371e6;
const R_MOON_STD = 3.844e8;
const T_MOON_STD = 27.3 * 86400; // 恒星月

/**
 * 月地检验 — 必修二 第三章 §2 (牛顿万有引力定律的实验验证)
 *
 * 牛顿猜想: 维持月球绕地球运动的力与地球吸引苹果的力是同一种力。
 * 猜想: 地球对月球的引力使其向心加速度 a_月 应满足平方反比律:
 *
 *   a_月 / g = (R_地 / r_月)²
 *
 * 关键推理:
 *   R_地 ≈ 6.371×10⁶ m
 *   r_月 ≈ 3.844×10⁸ m ≈ 60·R_地
 *   ⇒ (R/r)² = 1/3600
 *
 *   由 a_月 = 4π²·r / T²
 *       a_月 ≈ 4π² × 3.844×10⁸ / (27.3×86400)² ≈ 2.72×10⁻³ m/s²
 *       g/3600 = 9.8/3600 ≈ 2.72×10⁻³ m/s²
 *
 *   两者吻合 — 天体运动与地面重力满足同一平方反比律，万有引力定律成立。
 *
 * 这是演示验证型模型 — 输入 R, r, T, 计算 a_月 并与 g/3600 对比。
 */
export class MoonEarthTestModel extends PhysicsModelBase {
    readonly name = '月地检验';
    readonly version = '1.0.0';
    readonly description = '验证牛顿猜想: a_月 = g·R²/r² ≈ g/3600 (r≈60R)';
    readonly modelType = 'moon-earth-test' as const;
    readonly assumptions = [
        '月球轨道近似为圆 (实际椭圆偏心率 e≈0.055)',
        '月球周期为恒星月 (27.3 天), 排除太阳引力摄动一阶项',
        '地球质量中心引力，忽略地球形状带来的扁率修正',
        '月球质量远小于地球，地心参考系近似惯'
    ];
    readonly applicableRange = 'R∈[5, 8]×10⁶ m, r∈[3, 6]×10⁸ m, T∈[20, 32] × 86400 s';
    readonly errorSources = [
        '月球轨道偏心率 e≈0.055 (约 5.5% 修正)',
        '太阳引力对月球的三体摄动',
        '地球赤道隆起 (J₂) 对 g 的微小差异',
        '月球公转周期引用恒星月还是朔望月差异 (恒星月更合适)'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'earthRadius', description: '地球半径 R (m)', unit: 'm', required: true, min: 5e6, max: 8e6 },
        { name: 'moonDistance', description: '地月距离 r (m)', unit: 'm', required: true, min: 3e8, max: 6e8 },
        {
            name: 'moonPeriod',
            description: '月球周期 T (s)',
            unit: 's',
            required: true,
            min: 10 * 86400,
            max: 35 * 86400
        }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.moonEarthTest ?? {
            earthRadius: R_EARTH_STD,
            moonDistance: R_MOON_STD,
            moonPeriod: T_MOON_STD
        };

        const R = c.earthRadius;
        const r = c.moonDistance;
        const T = c.moonPeriod;

        // ===== 核心计算 =====
        const omega = (2 * Math.PI) / T; // 月球角速度 rad/s
        const aMoon = omega * omega * r; // a = ω²·r = 4π²r/T²
        const ratioRr = R / r; // R/r
        const expectedRatio = 1 / 60; // 公认比值
        const squareInv = ratioRr * ratioRr; // (R/r)²
        const gOver3600 = G_STD / 3600; // g/3600 (常数参考)
        const aFromSquareInv = G_STD * squareInv; // g·(R/r)² (与本 R 一致的理论值)
        // 主要验证: 实际 a_月 与 "按 R/r 比例推导的理论值" 是否一致;
        // 同时与常数 g/3600 比较作为对照组
        const discrepancyRatio = (Math.abs(aMoon - aFromSquareInv) / aFromSquareInv) * 100;
        const discrepancyRef = (Math.abs(aMoon - gOver3600) / gOver3600) * 100;
        const relDiff = Math.max(discrepancyRatio, discrepancyRef);
        const pass = relDiff < 5; // 5% 误差内即视为验证通过

        // ===== 图表 1: 静态数据对比 (a_月 vs g/3600) =====
        // 用 "x" 表示 a_月 计算值, 用 "y" 表示 g/3600; 两者应几乎重合
        const moon_earth_data: ChartSeries = {
            xLabel: '数据序号 (1=a_月实测, 2=g/3600)',
            yLabel: '加速度 (m/s²)',
            xUnit: '',
            yUnit: 'm/s²',
            points: [
                { x: 1, y: aMoon },
                { x: 2, y: gOver3600 },
                { x: 3, y: aFromSquareInv }
            ]
        };

        // ===== 图表 2: 比例 R/r = 1/60 (扫描月地距离下的不同 R/r) =====
        const sweepPoints = 200;
        const duration = problem.timeConfig.duration ?? 1;
        const ratioPoints: { x: number; y: number }[] = [];
        const scanTraj: TrajectoryPoint[] = [];

        const rMin = 50 * R;
        const rMax = 70 * R;
        for (let i = 0; i <= sweepPoints; i++) {
            const t = (i / sweepPoints) * duration;
            const ri = rMin + (rMax - rMin) * (i / sweepPoints);
            const ratio = R / ri;
            const aI = G_STD * ratio * ratio;
            ratioPoints.push({ x: ri / R, y: ratio });
            scanTraj.push({
                t,
                position: { x: ri / 1e8, y: ratio },
                velocity: { x: aI, y: aMoon },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: aI
            });
        }

        const ratio_R_r: ChartSeries = {
            xLabel: '月-地距离 / 地球半径 (r / R)',
            yLabel: '比例 R / r',
            xUnit: '',
            yUnit: '',
            points: ratioPoints
        };

        // ===== 关键帧 =====
        const keyframes: Keyframe[] = [
            {
                label: '月球位置',
                t: 0,
                position: { x: r / 1e8, y: 0 },
                velocity: { x: aMoon, y: omega },
                description: `月球距地 r=${r.toExponential(3)} m, 角速度 ω=${omega.toExponential(3)} rad/s`
            },
            {
                label: '实测向心加速度',
                t: duration / 2,
                position: { x: 0, y: aMoon },
                velocity: { x: G_STD, y: gOver3600 },
                description: `a_月 = 4π²r/T² = ${aMoon.toExponential(3)} m/s²`
            },
            {
                label: '结论: 验证牛顿猜想',
                t: duration,
                position: { x: ratioRr, y: expectedRatio },
                velocity: { x: relDiff, y: 60 },
                description: `a_月=${aMoon.toExponential(3)} ≈ g/3600=${gOver3600.toExponential(3)} ≈ g(R/r)²=${aFromSquareInv.toExponential(3)} (R/r=${ratioRr.toFixed(5)}, max偏差 ${relDiff.toFixed(2)}%)`
            }
        ];

        const steps = this.buildSteps(
            R,
            r,
            T,
            aMoon,
            omega,
            ratioRr,
            gOver3600,
            expectedRatio,
            squareInv,
            aFromSquareInv,
            relDiff,
            pass
        );

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [scanTraj],
            keyframes,
            charts: { 'moon-earth-data': moon_earth_data, ratio_R_r },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    aMoon,
                    omega,
                    ratioRr,
                    expectedRatio,
                    squareInv,
                    gOver3600,
                    aFromSquareInv,
                    discrepancyRatio_pct: discrepancyRatio,
                    discrepancyRef_pct: discrepancyRef,
                    relDiff_pct: relDiff,
                    R,
                    r,
                    T
                },
                rangeCheck: {
                    withinRange: pass,
                    warnings: pass
                        ? []
                        : [`最大偏差 ${relDiff.toFixed(2)}% > 5%, 不在公认范围内 (可能 R, r, T 取值偏差过大)`]
                }
            },
            explanation: {
                summary: `月地检验: a_月=${aMoon.toExponential(3)} m/s² ≈ g/3600=${gOver3600.toExponential(3)} m/s² (R/r=${ratioRr.toFixed(5)}, ${pass ? '验证通过' : '可疑'})`,
                steps,
                formulas: [
                    {
                        name: '月球向心加速度',
                        formula: 'a_月 = ω²r = 4π²r/T²',
                        variables: {
                            ω: { value: omega, unit: 'rad/s' },
                            r: { value: r, unit: 'm' },
                            T: { value: T, unit: 's' }
                        }
                    },
                    {
                        name: '平方反比律',
                        formula: 'a_月 / g = (R/r)²',
                        variables: { R: { value: R, unit: 'm' }, r: { value: r, unit: 'm' } }
                    },
                    {
                        name: '理论值',
                        formula: 'a_月(理论) = g·(R/r)²',
                        variables: { g: { value: G_STD, unit: 'm/s²' } }
                    }
                ]
            },
            renderHints: [
                { bodyId: 'earth', renderColor: '#3b82f6', renderLabel: '地球' },
                { bodyId: 'moon', renderColor: '#cfd8dc', renderLabel: '月球' },
                { bodyId: 'orbit', renderColor: '#ffffff', renderLabel: '月球轨道' }
            ],
            errors: [],
            warnings: pass ? [] : [`最大偏差 ${relDiff.toFixed(2)}%, 建议核对 R, r, T 输入值`]
        };
    }

    private buildSteps(
        R: number,
        r: number,
        T: number,
        aMoon: number,
        omega: number,
        ratioRr: number,
        gOver3600: number,
        expectedRatio: number,
        squareInv: number,
        aFromSquareInv: number,
        relDiff: number,
        pass: boolean
    ) {
        const aMoon_calc = `a_月 = ω²·r = (${omega.toExponential(3)})² × ${r.toExponential(3)}`;
        const ratio_calc = `R / r = ${R.toExponential(3)} / ${r.toExponential(3)}`;
        const expected_calc = `g/3600 = 9.8/3600`;
        return [
            {
                order: 1,
                description: '牛顿猜想 — 地球吸引月球的力与吸引苹果的力是同一种力, 遵从同一平方反比律',
                formula: 'F_月 = g·(R/r)²; F_苹 = g',
                calculation: `R/r = ${(R / r).toFixed(5)} ≈ 1/60`,
                result: `月球轨道半径约为地球半径的 ${(r / R).toFixed(0)} 倍`
            },
            {
                order: 2,
                description: '月-地数据 (教科书参考值)',
                formula: 'R_地 ≈ 6.371×10⁶ m, r ≈ 3.844×10⁸ m, T ≈ 27.3 天',
                calculation: `R=${R.toExponential(3)}, r=${r.toExponential(3)}, T=${T.toExponential(3)}s`,
                result: `ω ${omega.toExponential(3)} rad/s`
            },
            {
                order: 3,
                description: '计算验证 — 分别按圆轨道公式和平方反比律求 a_月',
                formula: 'a_月 = 4π²r/T² = g·R²/r²',
                calculation: `${aMoon_calc} = ${aMoon.toExponential(3)} m/s²; a_理论(R/r) = ${aFromSquareInv.toExponential(3)} m/s²; ${expected_calc} = ${gOver3600.toExponential(3)} m/s²`,
                result: `R/r = ${ratioRr.toFixed(5)}, (R/r)² = ${squareInv.toExponential(3)}, 1/3600 = ${(1 / 3600).toExponential(3)}, ${ratio_calc} = 1/${(1 / ratioRr).toFixed(1)}`
            },
            {
                order: 4,
                description: '结论 — 地面重力与天体引力遵循同一平方反比律, 万有引力定律成立',
                formula: '|a_月 − g/3600| / (g/3600) < 5% ?',
                calculation: `偏差 ${relDiff.toFixed(2)}%, 验证${pass ? '通过' : '可疑'}`,
                result: `${pass ? '✓' : '✗'} 牛顿月地检验成立: 天体引力 = 同一万有引力, 万有引力定律被实验验证`
            }
        ];
    }
}
