import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 热力学第二定律 / 永动机不可能模型 — 卡诺循环 + 第二定律判定
 *
 * 开尔文-普朗克表述:
 *   不可能把热量从低温物体传到高温物体, 而不引起其他变化 (第二定律).
 * 克劳修斯表述:
 *   不可能从单一热源吸收热量, 使之完全变成有用功, 而不引起其他变化.
 *
 * 卡诺循环 (可逆理想循环, 效率上限):
 *   η = 1 − T_cold / T_hot       (0 ≤ η < 1)
 *   W = η · Q_hot
 *
 * 图示:
 *   - x_t = T-S (温熵) 图
 *   - y_t = η 随温差比 ξ = T_cold / T_hot 变化
 *   - v_t = W 与 Q_hot 关系 (功率输出曲线)
 */

/* 卡诺效率 */
function carnotEfficiency(Th: number, Tc: number): number {
    if (Th <= 0) return 0;
    return Math.max(0, 1 - Tc / Th);
}

/* 温熵图: 等温膨胀 (S1→S2, T=Th), 绝热膨胀 (S2→S2, T:Th→Tc),
  等温压缩 (S2→S1, T=Tc), 绝热压缩 (S1→S1, T:Tc→Th)
 */
function carnotTS(S1: number, S2: number, Th: number, Tc: number, NperSeg: number): Array<{ x: number; y: number }> {
    const pts: Array<{ x: number; y: number }> = [];
    /* 等温膨胀 */
    for (let i = 0; i <= NperSeg; i++) {
        const S = S1 + (S2 - S1) * (i / NperSeg);
        pts.push({ x: parseFloat((S * 1e3).toFixed(3)), y: parseFloat(Th.toFixed(2)) });
    }
    /* 绝热膨胀 (T 从 Th→Tc, S 等值) */
    for (let i = 0; i <= NperSeg; i++) {
        const T = Th + (Tc - Th) * (i / NperSeg);
        pts.push({ x: parseFloat((S2 * 1e3).toFixed(3)), y: parseFloat(T.toFixed(2)) });
    }
    /* 等温压缩 */
    for (let i = 0; i <= NperSeg; i++) {
        const S = S2 + (S1 - S2) * (i / NperSeg);
        pts.push({ x: parseFloat((S * 1e3).toFixed(3)), y: parseFloat(Tc.toFixed(2)) });
    }
    /* 绝热压缩 */
    for (let i = 0; i <= NperSeg; i++) {
        const T = Tc + (Th - Tc) * (i / NperSeg);
        pts.push({ x: parseFloat((S1 * 1e3).toFixed(3)), y: parseFloat(T.toFixed(2)) });
    }
    return pts;
}

export class PerpetuumMobileModel extends PhysicsModelBase {
    readonly name = '热力学第二定律 (永动机不可能)';
    readonly version = '1.0.0';
    readonly description = '卡诺循环 T-S 图 + 效率上限 ηmax = 1 − Tc/Th + 第二定律判定';
    readonly modelType = 'perpetuum-mobile' as const;
    readonly assumptions = ['卡诺循环为两个绝热 + 两个等温可逆过程', '工质为理想气体', '所有过程准静态, 无摩擦或耗散'];
    readonly applicableRange = '热力学温度 30K~2000K, 温差 Th > Tc > 0';
    readonly errorSources = [
        '真实循环存在摩擦/绝热不可逆, 实际效率低于卡诺',
        '低温下热量不能精确地等于 T·dS (需统计力学)'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'hotTemp', description: '热源温度 (K)', unit: 'K', required: true, min: 0, max: 5000 },
        { name: 'coldTemp', description: '冷源温度 (K)', unit: 'K', required: true, min: 0, max: 5000 },
        { name: 'mode', description: '演示模式 (carnot / kelvin)', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.perpetuumMobile;
        if (!c) {
            throw new Error('perpetuum-mobile 模型需要 constraints.perpetuumMobile 配置');
        }

        const Th = Math.max(c.hotTemp, 1);
        const Tc = Math.max(c.coldTemp, 0);

        /* 第二定律判定 */
        const violates2ndLaw = Tc <= 0 && c.mode === 'kelvin';
        const etaCarnot = carnotEfficiency(Th, Th <= Tc ? 0 : Tc);

        /* 开尔文表述违反条件: Tc=0 且 η=1 违反第二定律 */
        const isPerpetuum2nd = c.mode === 'kelvin' && Th > 0 && Tc === 0;
        const isPerpetuum1st = c.mode === 'carnot' && etaCarnot >= 1;

        /* ---------- x_t = T-S 温熵图 (卡诺循环) ---------- */
        const S1 = 0.001; // J/K (归一化起点)
        const S2 = 0.01; // J/K
        const ptsTS = carnotTS(S1, S2, Th, Tc, 10);
        const chartTS: ChartSeries = {
            xLabel: '熵 S (mJ/K)',
            yLabel: '温度 T (K)',
            xUnit: 'mJ/K',
            yUnit: 'K',
            points: ptsTS
        };

        /* ---------- y_t = η 随温差比 ξ = Tc/Th 变化 ---------- */
        const N_xi = 25;
        const pointsEta: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N_xi; i++) {
            const xi = i / N_xi; // 0 ~ 1
            const Tc_try = Th * xi;
            const eta_i = carnotEfficiency(Th, Tc_try);
            pointsEta.push({ x: parseFloat(xi.toFixed(3)), y: parseFloat(eta_i.toFixed(4)) });
        }
        const chartEta: ChartSeries = {
            xLabel: '温差比 ξ = Tc / Th',
            yLabel: '卡诺效率 η',
            xUnit: '',
            yUnit: '',
            points: pointsEta
        };

        /* ---------- v_t = W 随 Q_hot 线性关系 ---------- */
        const QinMax = c.inputHeat ?? 1000;
        const pointsW: Array<{ x: number; y: number }> = [];
        const N_Q = 20;
        for (let i = 1; i <= N_Q; i++) {
            const Qin = (i / N_Q) * QinMax;
            const W = etaCarnot * Qin;
            pointsW.push({ x: parseFloat(Qin.toFixed(2)), y: parseFloat(W.toFixed(2)) });
        }
        const chartW: ChartSeries = {
            xLabel: '吸收热量 Q_hot (J)',
            yLabel: '输出功 W (J)',
            xUnit: 'J',
            yUnit: 'J',
            points: pointsW
        };

        /* ---------- keyframes ---------- */
        const modeZh = c.mode === 'carnot' ? '卡诺循环' : '开尔文表述';
        const statusZh = isPerpetuum2nd || isPerpetuum1st ? '违反热力学第二定律 (永动机不可能)' : '可行热机 (η < 1)';

        const keyframes: Keyframe[] = [
            {
                label: '热机判定',
                t: 0,
                position: { x: Th, y: Tc },
                velocity: { x: 0, y: 0 },
                description: `${modeZh}: Th=${Th}K, Tc=${Tc}K, η=${(etaCarnot * 100).toFixed(2)}% — ${statusZh}`
            }
        ];

        /* ---------- 示意轨迹 ---------- */
        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: Th, y: Tc }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        /* ---------- steps ---------- */
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '卡诺效率',
                formula: 'η = 1 − Tc / Th',
                calculation: `η = 1 − ${Tc} / ${Th} = ${(etaCarnot * 100).toFixed(2)}%`
            },
            {
                order: 2,
                description: '开尔文-普朗克表述',
                result: isPerpetuum2nd
                    ? 'Tc = 0, 单一热源取热完全做功 → 被第二定律否定'
                    : 'Tc > 0 → 必须有低温放热, 不能单源做功'
            },
            {
                order: 3,
                description: '永动机判定',
                result:
                    isPerpetuum2nd || isPerpetuum1st
                        ? '第二类永动机 (100% 效率) 不可能'
                        : `可逆卡诺热机效率上限 ${(etaCarnot * 100).toFixed(2)}%`
            }
        ];

        const warnings: string[] = [];
        if (Th <= Tc) warnings.push('热源温度 Th 必须大于冷源 Tc 否则热机无法循环');
        if (isPerpetuum2nd) warnings.push('Tc = 0 为绝对零度, 无法达到 (第三定律)');
        if (isPerpetuum1st) warnings.push('η ≥ 1 意味着违反能量守恒, 第一类永动机');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: chartTS,
                theta_t: chartEta,
                p_t: chartW
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    Th_K: Th,
                    Tc_K: Tc,
                    etaCarnot: parseFloat(etaCarnot.toFixed(4)),
                    violates2ndLaw: violates2ndLaw ? 1 : 0,
                    modeCode: c.mode === 'carnot' ? 0 : 1
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `卡诺循环 T-S 绘制 + 效率上限 η = ${(etaCarnot * 100).toFixed(2)}%${isPerpetuum2nd ? ': 违背第二定律' : ''}`,
                steps,
                formulas: [
                    {
                        name: 'Carnot efficiency',
                        formula: 'η = 1 − Tc / Th',
                        variables: {
                            Th: { value: Th, unit: 'K' },
                            Tc: { value: Tc, unit: 'K' },
                            eta: { value: parseFloat(etaCarnot.toFixed(4)), unit: '' }
                        }
                    },
                    {
                        name: 'Output work',
                        formula: 'W = η · Q_hot',
                        variables: {
                            eta: { value: parseFloat(etaCarnot.toFixed(4)), unit: '' },
                            Qin: { value: QinMax, unit: 'J' },
                            W: { value: parseFloat((etaCarnot * QinMax).toFixed(2)), unit: 'J' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
