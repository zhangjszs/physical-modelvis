import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 油膜法测分子直径约束 — 选必三 分子运动
 *
 * 物理: d = V_oil / S
 *   V_oil = 油酸浓度 × 每滴体积 × 滴数
 *   S = 油膜面积
 */
/**
 * 油膜法测分子大小模型 — 选必三 分子运动
 *
 * 物理原理：
 *   油酸分子在水面上形成单分子油膜
 *   分子直径: d = V_oil / S
 *   V_oil = concentration × dropVolume × drops
 *   数量级: d ~ 10^-10 m
 */
export class OilFilmModel extends PhysicsModelBase {
    readonly name = '油膜法测分子直径';
    readonly version = '1.0.0';
    readonly description = '油酸单分子油膜: d = V_oil / S ~ 10⁻¹⁰ m';
    readonly modelType = 'oil-film' as const;
    readonly assumptions = ['油酸分子球形, 紧密排列', '油膜为单分子层', '分子在水面上完全展开', '忽略酒精挥发后的残留'];
    readonly applicableRange = '油酸分子直径测定, 面积 10–1000 cm²';
    readonly errorSources = ['油膜并非完美单分子层', '边缘效应 (油膜边界判定)', '分子取向不一致', '滴体积标定误差'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'oilConcentration', description: '油酸浓度 (1:x)', unit: '', required: true, min: 100, max: 10000 },
        { name: 'dropsPerMl', description: '每毫升滴数', unit: '滴/mL', required: true, min: 10, max: 200 },
        { name: 'filmArea', description: '油膜面积 (cm²)', unit: 'cm²', required: true, min: 1, max: 10000 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const oc = problem.constraints?.oilFilm;
        if (!oc) throw new Error('oil-film 模型需要 oilFilm 约束配置');

        const concentration = oc.oilConcentration; // 1:x
        const dropsPerMl = oc.dropsPerMl;
        const filmArea = oc.filmArea; // cm²
        const drops = oc.drops ?? 1;

        // 每滴体积 (mL)
        const dropVolume = 1 / dropsPerMl; // mL
        // 纯油酸体积 (mL)
        const voMl = (dropVolume * drops) / concentration; // mL
        const vo = voMl * 1e-6; // m³
        // 油膜面积 (m²)
        const S = filmArea * 1e-4; // m²
        // 分子直径 (m)
        const d = vo / S; // m
        const dNm = d * 1e9; // nm

        // 直径直方图 (模拟多次测量的统计分布, 理论值附近 +- 10%)
        const histogram: ChartSeries = {
            xLabel: '直径 d (10⁻¹⁰ m)',
            yLabel: '频率',
            xUnit: '10⁻¹⁰ m',
            yUnit: '次',
            points: []
        };
        const nBins = 20;
        const sigma = d * 0.1; // 10% 标准差
        const mu = d;
        for (let i = 0; i <= nBins; i++) {
            const x = mu - 3 * sigma + (6 * sigma * i) / nBins;
            // 高斯分布
            const p = Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
            histogram.points.push({
                x: parseFloat((x * 1e10).toFixed(3)),
                y: parseFloat(p.toFixed(4))
            });
        }

        // 浓度-直径关系曲线 (扫描)
        const concentrationCurve: ChartSeries = {
            xLabel: '浓度 (1:x)',
            yLabel: '直径 d (10⁻¹⁰ m)',
            xUnit: '',
            yUnit: '10⁻¹⁰ m',
            points: []
        };
        const nScan = 30;
        for (let i = 1; i <= nScan; i++) {
            const conc = 100 + (10000 - 100) * (i / nScan);
            const vOil = ((dropVolume * drops) / conc) * 1e-6; // m³
            const dScan = vOil / S;
            concentrationCurve.points.push({
                x: parseFloat(conc.toFixed(0)),
                y: parseFloat((dScan * 1e10).toFixed(4))
            });
        }

        // 静态轨迹 (单帧)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: parseFloat(dNm.toFixed(4)), y: 0 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        const keyframes: Keyframe[] = [
            {
                label: '纯油酸体积',
                t: 0,
                position: { x: 0, y: voMl * 1e6 },
                velocity: { x: 0, y: 0 },
                description: `V_oil = ${voMl.toExponential(3)} mL = ${vo.toExponential(3)} m³`
            },
            {
                label: '油膜面积',
                t: 0,
                position: { x: filmArea, y: S * 1e4 },
                velocity: { x: 0, y: 0 },
                description: `S = ${filmArea} cm² = ${S.toExponential(3)} m²`
            },
            {
                label: '分子直径',
                t: 0,
                position: { x: parseFloat(dNm.toFixed(4)), y: parseFloat((d * 1e10).toFixed(4)) },
                velocity: { x: 0, y: 0 },
                description: `d = V/S = ${d.toExponential(3)} m = ${dNm.toFixed(3)} nm ≈ ${(d * 1e10).toFixed(1)}×10⁻¹⁰ m`
            }
        ];

        const warnings: string[] = [];
        if (d > 5e-10) warnings.push('测量值偏大, 可能油膜非单层');
        if (d < 5e-11) warnings.push('测量值偏小, 可能油膜未完全展开');
        if (filmArea > 1000) warnings.push('油膜面积过大, 边缘难以判定');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '纯油酸体积',
                formula: 'V_oil = (1 drops / drops_per_ml) / concentration',
                calculation: `V_oil = (${drops}/${dropsPerMl}) / ${concentration} = ${voMl.toExponential(3)} mL = ${vo.toExponential(3)} m³`
            },
            {
                order: 2,
                description: '油膜面积',
                formula: 'S = 油膜轮廓面积',
                calculation: `S = ${filmArea} cm² = ${S.toExponential(3)} m²`
            },
            {
                order: 3,
                description: '分子直径',
                formula: 'd = V_oil / S',
                calculation: `d = ${vo.toExponential(3)} / ${S.toExponential(3)} = ${d.toExponential(3)} m = ${(d * 1e10).toFixed(2)}×10⁻¹⁰ m`,
                result: '数量级 10⁻¹⁰ m (~1 Å), 对应分子尺度'
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: histogram, y_t: concentrationCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    oilConcentration: concentration,
                    dropsPerMl,
                    filmArea,
                    drops,
                    dropVolume,
                    voL: voMl,
                    vo,
                    S,
                    d,
                    dNm
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `油膜法: 浓度 1:${concentration}, ${dropsPerMl}滴/mL, S=${filmArea}cm², d=${(d * 1e10).toFixed(2)}×10⁻¹⁰m`,
                steps,
                formulas: [
                    {
                        name: '纯油酸体积',
                        formula: 'V_oil = V_drop × drops / c',
                        variables: {
                            V_drop: { value: dropVolume, unit: 'mL' },
                            drops: { value: drops, unit: '滴' },
                            c: { value: concentration, unit: '1:x' }
                        }
                    },
                    {
                        name: '分子直径',
                        formula: 'd = V_oil / S',
                        variables: {
                            V_oil: { value: vo, unit: 'm³' },
                            S: { value: S, unit: 'm²' },
                            d: { value: d, unit: 'm' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
