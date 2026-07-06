import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 桌面微小形变光杠杆放大法 — 选必一 §5 (实验)
 *
 * 物理原理：
 *   桌面上压一重物，产生微小压缩形变 Δh：
 *     Δh = F·L₀ / (E·A)          (F = 压力, L₀ = 厚度, E = 杨氏模量, A = 截面积)
 *   桌面倾角 α ≈ tanα = Δh / L_table (L_table = 桌面长度)
 *   光杠杆放大：反射光点位移 Δs = 2·D·tan(2α) ≈ 4·D·α  (D = 镜面到屏距离)
 *
 * 这是静态分析 — 给定压力 F，计算 Δh 和 Δs。
 * 为图表能力复用，将不同 F 下的响应作为"扫过轨迹"返回。
 */
export class MicroDeformationModel extends PhysicsModelBase {
    readonly name = '桌面微小形变光杠杆放大';
    readonly version = '1.0.0';
    readonly description = '用光杠杆放大法演示桌面微小形变, 研究 ∆h 与光点位移 ∆s 的关系';
    readonly modelType = 'micro-deformation' as const;
    readonly assumptions = [
        '桌面板为均匀线弹性材料 (遵循胡克定律)',
        '微小形变条件: Δh << L₀',
        '倾角 α 极小: tanα ≈ α, sinα ≈ α',
        '光杠杆镜面初始位置水平',
        '激光入射角等于反射角 (光学反射定律)',
        '桌面截面积为 1 m² 标准化处理 (便于线性换算)'
    ];
    readonly applicableRange = '受力在弹性限度内, 桌面尺寸 0.1–5 m, 压力 1–10⁴ N';
    readonly errorSources = [
        'Δh 极小 (nm 级), 实际难用肉眼直接测量',
        '光路调节误差 (镜面与光源、标尺需严格水平)',
        '温度漂移引起杨氏模量变化',
        '桌面本身弯曲形变与压缩形变的叠加'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'pressure', description: '桌面压力 F (N)', unit: 'N', required: true, min: 0, max: 1e6 },
        { name: 'youngModulus', description: '桌面杨氏模量 E (Pa)', unit: 'Pa', required: true, min: 1e8, max: 1e12 },
        { name: 'thickness', description: '桌面厚度 L₀ (m)', unit: 'm', required: true, min: 0.001, max: 1 },
        { name: 'tableLength', description: '桌面长度 L (m)', unit: 'm', required: true, min: 0.05, max: 10 },
        { name: 'mirrorDist', description: '镜面到投影屏距离 D (m)', unit: 'm', required: true, min: 0.1, max: 50 },
        { name: 'laserDist', description: '激光到镜面距离 (m)', unit: 'm', required: false, defaultValue: 1 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.microDeformation;
        if (!c) {
            throw new Error('桌面微小形变光杠杆模型需要 constraints.microDeformation 配置');
        }

        const F = c.pressure ?? 100;
        const E = c.youngModulus ?? 1e10;
        const L0 = c.thickness ?? 0.05;
        const L = c.tableLength ?? 1;
        const D = c.mirrorDist ?? 5;
        const laserDist = c.laserDist ?? 1;

        const A = 1; // 截面积标准化为 1 m²

        // 核心静态计算
        const deltaH = (F * L0) / (E * A);
        const alpha = deltaH / L;
        const deltaS = 2 * D * Math.tan(2 * alpha);
        const deltaSLinear = 4 * D * alpha;
        const magnification = deltaH > 0 ? deltaS / deltaH : 0;

        // 静态单帧轨迹
        const staticTraj: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: 0, y: -deltaH },
                velocity: { x: deltaS, y: 0 },
                acceleration: { x: alpha, y: 0 },
                kineticEnergy: deltaH,
                potentialEnergy: deltaS
            }
        ];

        // 压力扫描轨迹 — 从 0 扫到 2F
        const sampleCount = problem.timeConfig.sampleCount ?? 200;
        const duration = problem.timeConfig.duration;
        const sweepDeltaH: TrajectoryPoint[] = [];
        const sweepDeltaS: TrajectoryPoint[] = [];

        for (let i = 0; i <= sampleCount; i++) {
            const t = (i / sampleCount) * duration;
            const fScan = (i / sampleCount) * 2 * F;
            const dh = (fScan * L0) / (E * A);
            const al = dh / L;
            const ds = 2 * D * Math.tan(2 * al);

            sweepDeltaH.push({
                t,
                position: { x: fScan, y: dh },
                velocity: { x: al, y: ds },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: dh
            });
            sweepDeltaS.push({
                t,
                position: { x: fScan, y: ds },
                velocity: { x: al, y: ds },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: ds
            });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '零载荷 (参考)',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: '未加载荷: Δh = 0, Δs = 0'
            },
            {
                label: '当前压力',
                t: duration / 2,
                position: { x: F, y: -deltaH },
                velocity: { x: alpha, y: deltaS },
                description: `F=${F}N -> Δh=${formatSi(deltaH)}m, Δs=${formatSi(deltaS)}m, k=${magnification.toFixed(1)}`
            },
            {
                label: '2 倍压力 (上限)',
                t: duration,
                position: { x: 2 * F, y: -2 * deltaH },
                velocity: { x: 2 * alpha, y: 2 * deltaS },
                description: `F=${2 * F}N -> Δh=${formatSi(2 * deltaH)}m, Δs=${formatSi(2 * deltaS)}m (线性区)`
            }
        ];

        // 图表 1: 压力-光点位移 (线性)
        const pressure_deltaS: ChartSeries = {
            xLabel: '压力 F',
            yLabel: '光点位移 Δs',
            xUnit: 'N',
            yUnit: 'm',
            points: sweepDeltaS.map(p => ({ x: p.position.x, y: p.position.y }))
        };

        // 图表 2: 压力-桌面形变 (线性, 量级 nm)
        const pressure_deltaH: ChartSeries = {
            xLabel: '压力 F',
            yLabel: '桌面形变 Δh',
            xUnit: 'N',
            yUnit: 'm',
            points: sweepDeltaH.map(p => ({ x: p.position.x, y: p.position.y }))
        };

        // 近似公式对比 (作为附加数据)
        const approxCompare = `精确 Δs = ${deltaS.toExponential(4)} m, 近似 4D·α = ${deltaSLinear.toExponential(4)} m, 差异 ${Math.abs(deltaS - deltaSLinear).toExponential(4)} m`;
        const calcDeltaH = `Δh = F·L₀/(E·A) = ${F}×${L0}/(${E.toExponential()}×${A}) = ${deltaH.toExponential(4)} m`;
        const calcAlpha = `α = Δh/L = ${deltaH.toExponential(4)}/${L} = ${alpha.toExponential(4)} rad`;
        const calcDeltaS = `Δs = 2D·tan(2α) = 2×${D}·tan(${(2 * alpha).toExponential(4)}) = ${deltaS.toExponential(4)} m`;

        return {
            meta: {
                model: 'micro-deformation',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [staticTraj, sweepDeltaH, sweepDeltaS],
            keyframes,
            charts: { pressure_deltaS, pressure_deltaH },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    deltaH,
                    deltaS,
                    magnification,
                    alpha,
                    linearMagnification: (4 * D) / L,
                    youngModulus: E,
                    pressure: F,
                    thickness: L0,
                    tableLength: L,
                    mirrorDist: D,
                    laserDist
                },
                rangeCheck: {
                    withinRange: true,
                    warnings: this.buildWarnings(deltaH, alpha)
                }
            },
            explanation: {
                summary: `压力 F=${N2(F)} N 作用于桌面, 压缩形变 Δh=${formatSi(deltaH)} m, 光点位移 Δs=${formatSi(deltaS)} m, 放大倍数 k=${magnification.toFixed(1)}`,
                steps: [
                    {
                        order: 1,
                        description: '光杠杆原理: 桌面微小倾角 α 经镜面反射到距镜面 D 处的标尺上，反射光偏转角 2α',
                        formula: '光学反射定律: 入射角 = 反射角, 镜面转过 α → 反射光转过 2α',
                        result: `反射光线偏转角 2α = ${(2 * alpha).toExponential(4)} rad`
                    },
                    {
                        order: 2,
                        description: '微小形变计算: 线弹性压缩',
                        formula: 'Δh = F·L₀ / (E·A)',
                        calculation: calcDeltaH,
                        result: `Δh = ${formatSi(deltaH)} m (${(deltaH * 1e9).toFixed(3)} nm)`
                    },
                    {
                        order: 3,
                        description: '光路放大: 由几何与反射定律求光点位移',
                        formula: 'α = Δh/L;  Δs = 2·D·tan(2α) ≈ 4·D·α (α 很小时)',
                        calculation: `${calcAlpha}; ${calcDeltaS}`,
                        result: `Δs ≈ 4D·α ≈ ${(4 * D * alpha).toExponential(4)} m (线性近似)`
                    },
                    {
                        order: 4,
                        description: '读数方法: 通过光点位移反推微小形变',
                        formula: 'Δh ≈ Δs·L / (4D)  (用近似公式反解)',
                        calculation: `Δh ≈ ${deltaS.toExponential(4)}×${L}/(4×${D}) = ${((deltaS * L) / (4 * D)).toExponential(4)} m`,
                        result: `与直接计算值 ${deltaH.toExponential(4)} m 接近`
                    },
                    {
                        order: 5,
                        description: '误差分析: 主要误差来自光路调节、温度漂移和弯曲形变叠加',
                        formula: 'k = 4D/L (放大倍数)',
                        calculation: `k = 4×${D}/${L} = ${((4 * D) / L).toFixed(1)}; 当前实际放大倍数 = ${magnification.toFixed(1)}`,
                        result: approxCompare
                    }
                ],
                formulas: [
                    {
                        name: '微小形变',
                        formula: 'Δh = F·L₀/(E·A)',
                        variables: {
                            F: { value: F, unit: 'N' },
                            'L₀': { value: L0, unit: 'm' },
                            E: { value: E, unit: 'Pa' },
                            A: { value: A, unit: 'm²' }
                        }
                    },
                    {
                        name: '桌面倾角',
                        formula: 'α ≈ Δh/L',
                        variables: { Δh: { value: deltaH, unit: 'm' }, L: { value: L, unit: 'm' } }
                    },
                    {
                        name: '光点位移 (精确)',
                        formula: 'Δs = 2D·tan(2α)',
                        variables: { D: { value: D, unit: 'm' }, '2α': { value: 2 * alpha, unit: 'rad' } }
                    },
                    {
                        name: '光点位移 (近似)',
                        formula: 'Δs ≈ 4D·α',
                        variables: { D: { value: D, unit: 'm' }, α: { value: alpha, unit: 'rad' } }
                    },
                    {
                        name: '放大倍数',
                        formula: 'k = Δs/Δh ≈ 4D/L',
                        variables: { D: { value: D, unit: 'm' }, L: { value: L, unit: 'm' } }
                    },
                    {
                        name: '形变反推',
                        formula: 'Δh ≈ ΔsL/(4D)',
                        variables: {
                            Δs: { value: deltaS, unit: 'm' },
                            L: { value: L, unit: 'm' },
                            D: { value: D, unit: 'm' }
                        }
                    }
                ]
            },
            renderHints: [
                { bodyId: 'laser-spot', renderColor: '#ff3333', renderLabel: '光点' },
                { bodyId: 'mirror', renderColor: '#aaa', renderLabel: '反射镜' },
                { bodyId: 'table', renderColor: '#b97a57', renderLabel: '桌面' },
                { bodyId: 'scale', renderColor: '#fff', renderLabel: '标尺' }
            ],
            errors: [],
            warnings: this.buildWarnings(deltaH, alpha)
        };
    }

    private buildWarnings(deltaH: number, alpha: number): string[] {
        const warnings: string[] = [];
        if (deltaH > 1e-4) {
            warnings.push(`形变 Δh=${deltaH.toExponential(2)} m 已超过 nm 级, 近似公式误差增大`);
        }
        if (alpha > 0.01) {
            warnings.push(`倾角 α=${alpha.toExponential(2)} rad 较大, 小角度近似 tanα ≈ α 不再精确`);
        }
        if (deltaH === 0) {
            warnings.push('压力为 0, 无可观测形变');
        }
        return warnings;
    }
}

function formatSi(v: number): string {
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1) return `${v.toFixed(3)}`;
    if (abs >= 1e-3) return `${(v * 1e3).toFixed(3)} m`;
    if (abs >= 1e-6) return `${(v * 1e6).toFixed(3)} μ`;
    if (abs >= 1e-9) return `${(v * 1e9).toFixed(3)} n`;
    return `${v.toExponential(3)}`;
}

function N2(v: number): string {
    if (Number.isFinite(v) && v >= 1000) return v.toExponential(2);
    return v.toString();
}
