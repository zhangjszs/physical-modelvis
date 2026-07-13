import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 浸润与不浸润模型 — 选必三 §? (液体与固体相互作用)
 *
 * 物理原理:
 *   - 润湿: 接触角 θ < 90°, 液体在固体表面铺展 (附着力 > 内聚力)
 *   - 不润湿: 接触角 θ > 90°, 液体在固体表面收缩成球 (内聚力 > 附着力)
 *   - 接触角 θ 由液体种类与固体材质共同决定 (杨氏方程近似: cosθ = (γ_SV - γ_SL)/γ_LV)
 *
 * 本模型:
 *   - 根据 liquidMode (水/汞) 与 surfaceMode (玻璃/蜡面) 计算接触角
 *   - 生成接触角示意图数据 + 附着力与内聚力对比柱状数据
 */

/* 接触角查找表 (高中物理实验参考值, 度): 行=液体, 列=固体 */
const CONTACT_ANGLE_TABLE: Record<'water' | 'mercury', Record<'glass' | 'wax', number>> = {
    water: { glass: 30, wax: 110 },
    mercury: { glass: 140, wax: 150 }
};

/* 附着力与内聚力相对强度 (相对值 0-1) */
const ADHESIVE_TABLE: Record<'water' | 'mercury', Record<'glass' | 'wax', number>> = {
    water: { glass: 0.85, wax: 0.2 },
    mercury: { glass: 0.25, wax: 0.15 }
};

const COHESIVE_TABLE: Record<'water' | 'mercury', Record<'glass' | 'wax', number>> = {
    water: { glass: 0.55, wax: 0.55 },
    mercury: { glass: 0.9, wax: 0.9 }
};

/* 液体-玻璃的表面能参数 (mJ/m²) 用于杨氏方程展示 */
const GAMMA_TABLE: Record<'water' | 'mercury', { sv: number; sl: number; lv: number }> = {
    water: { sv: 73, sl: 45, lv: 73 },
    mercury: { sv: 480, sl: 380, lv: 480 }
};

export class WettingModel extends PhysicsModelBase {
    readonly name = '浸润与不浸润';
    readonly version = '1.0.0';
    readonly description = '接触角实验：润湿 (θ<90°) 与不润湿 (θ>90°) 的判断依据';
    readonly modelType = 'wetting' as const;
    readonly assumptions = [
        '接触角表基于高中物理实验参考值, 真实接触角受纯度/温度/粗糙度影响',
        '润湿判断仅基于接触角 θ=90° 分界线, 实际过程有时还考虑铺展系数',
        '液体与固体表面均为理想平面, 无微观粗糙度效应'
    ];
    readonly applicableRange = '常温常压下液体与光滑固体表面的润湿性判断';
    readonly errorSources = [
        '表面粗糙度会改变表观接触角 (Wenzel 模型)',
        '表面污染会大幅改变接触角',
        '温度对表面张力 (γ) 的影响未计入'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'liquidMode', description: '液体类型 (water=水, mercury=汞)', unit: '', required: true },
        { name: 'surfaceMode', description: '固体表面 (glass=玻璃, wax=蜡面)', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.wetting;
        if (!c) {
            throw new Error('wetting 模型需要 constraints.wetting 配置');
        }

        // Use module-level lookup with any cast to bypass strict Record indexing
        const liq: string = c.liquidMode ?? 'water';
        const surf: string = c.surfaceMode ?? 'glass';
        const thetaTable = CONTACT_ANGLE_TABLE as unknown as Record<string, Record<string, number>>;
        const theta = thetaTable[liq]?.[surf] ?? 60;
        const adhesTable = ADHESIVE_TABLE as unknown as Record<string, Record<string, number>>;
        const adhesive = adhesTable[liq]?.[surf] ?? 0.5;
        const cohesTable = COHESIVE_TABLE as unknown as Record<string, Record<string, number>>;
        const cohesive = cohesTable[liq]?.[surf] ?? 0.5;
        const GAMMA_ANY = GAMMA_TABLE as unknown as Record<string, { sv: number; sl: number; lv: number }>;
        const gamma = GAMMA_ANY[liq] ?? { sv: 73, sl: 45, lv: 73 };

        const wetting = theta < 90;
        const wetZh = wetting ? '浸润' : '不浸润';
        const forceZh = wetting ? '附着力 > 内聚力' : '附着力 < 内聚力';
        const waterZh = c.liquidMode === 'water' ? '水' : '水银';
        const matZh = c.surfaceMode === 'glass' ? '玻璃' : '蜡面';

        /* ---------- static-diagram (接触角示意) ---------- */
        /* 横轴 = 沿固体表面偏移 x (相对单位), 纵轴 = 液滴高度 y (相对单位)   以 θ=30° 和 θ=110° 两种典型液滴轮廓作为数据曲线展示 */
        const diagramPoints: Array<{ x: number; y: number }> = [];
        const thetaRad = (theta * Math.PI) / 180;
        const supportY = -0.05;
        /* 液滴顶点到达+y, 液滴底端与固体交点两侧 (-R·sinθ, 0) 到 (R·sinθ, 0) — 对于不浸润 (θ>90) 改用补角 */
        const halfSpan = Math.sin(thetaRad);
        for (let i = -12; i <= 12; i++) {
            const t = i / 12; // -1 ~ 1
            const baseX = t * halfSpan;
            const y = supportY + Math.sqrt(Math.max(0, 1 - t * t)) * Math.cos(thetaRad);
            diagramPoints.push({ x: parseFloat(baseX.toFixed(3)), y: parseFloat(y.toFixed(3)) });
        }
        const contactDiagram: ChartSeries = {
            xLabel: '液滴表面横向位置 (相对)',
            yLabel: '液滴高度 (相对)',
            xUnit: 'R',
            yUnit: 'R',
            points: diagramPoints
        };

        /* ---------- y_t = 附着力 vs 内聚力 对比柱状图 ---------- */
        const adhesiveVsCohesive: ChartSeries = {
            xLabel: '力类型',
            yLabel: '相对强度',
            xUnit: '',
            yUnit: '',
            points: [
                { x: 1, y: parseFloat(adhesive.toFixed(3)) },
                { x: 2, y: parseFloat(cohesive.toFixed(3)) }
            ]
        };

        /* ---------- keyframes ---------- */
        const keyframes: Keyframe[] = [
            {
                label: '接触角测定',
                t: 0,
                position: { x: theta, y: adhesive },
                velocity: { x: 0, y: 0 },
                description: `${waterZh} 在 ${matZh} 上, θ=${theta}°, ${wetZh}, ${forceZh}`
            }
        ];

        /* ---------- 示意轨迹 ---------- */
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: theta, y: adhesive },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        /* ---------- explanation ---------- */
        const cosTheta = (gamma.sv - gamma.sl) / gamma.lv;
        const cosThetaClamped = Math.max(-1, Math.min(1, cosTheta));
        const thetaFromYoung = (Math.acos(cosThetaClamped) * 180) / Math.PI;

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '杨氏方程 (接触角计算)',
                formula: 'cosθ = (γ_SV − γ_SL) / γ_LV',
                calculation: `(${gamma.sv} − ${gamma.sl}) / ${gamma.lv} = ${cosTheta.toFixed(3)}`
            },
            {
                order: 2,
                description: '接触角判断润湿性',
                formula: wetting ? 'θ < 90° → 浸润' : 'θ > 90° → 不浸润',
                result: `θ ≈ ${thetaFromYoung.toFixed(1)}° (实验参考值 ${theta}°)`
            },
            {
                order: 3,
                description: '润湿的微观解释',
                formula: wetting ? '附着力 (固-液)  > 内聚力 (液-液)' : '附着力 (固-液)  < 内聚力 (液-液)',
                result: `附着力 = ${(adhesive * 100).toFixed(0)}%, 内聚力 = ${(cohesive * 100).toFixed(0)}%`
            }
        ];

        const warnings: string[] = [];
        if (theta > 110) warnings.push('θ > 110° 属于超疏水范畴, 应考虑微观粗糙度修正');
        if (theta < 10) warnings.push('θ < 10° 属于超亲水范畴, 铺展系数可能才是真正的判据');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                'static-diagram': contactDiagram,
                y_t: adhesiveVsCohesive
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    contactAngleDeg: theta,
                    adhesive,
                    cohesive,
                    wettingFlag: wetting ? 1 : 0,
                    cosTheta: parseFloat(cosTheta.toFixed(4)),
                    thetaFromYoung: parseFloat(thetaFromYoung.toFixed(2))
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `${waterZh} 在 ${matZh} 上的接触角 θ=${theta}°, ${wetZh} (${forceZh})`,
                steps,
                formulas: [
                    {
                        name: 'Young equation',
                        formula: 'cosθ = (γ_SV − γ_SL) / γ_LV',
                        variables: {
                            gammaSV: { value: gamma.sv, unit: 'mJ/m²' },
                            gammaSL: { value: gamma.sl, unit: 'mJ/m²' },
                            gammaLV: { value: gamma.lv, unit: 'mJ/m²' },
                            cosTheta: { value: parseFloat(cosTheta.toFixed(4)), unit: '' },
                            theta: { value: theta, unit: 'deg' }
                        }
                    },
                    {
                        name: '润湿性判据',
                        formula: 'wetting ⇔ θ < 90°',
                        variables: {
                            theta: { value: theta, unit: 'deg' },
                            adhesive: { value: parseFloat(adhesive.toFixed(3)), unit: '' },
                            cohesive: { value: parseFloat(cohesive.toFixed(3)), unit: '' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
