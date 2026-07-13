import type { PhysicsProblem } from '../types/problem.js';
import { sampleTrajectory } from '../physics/kinematics.js';
import type { SimulationResult, Keyframe, ChartSeries, ConservedQuantity, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 涡流现象模型 — 涡流热效应与趋肤效应 (选必二第三章)
 *
 * 导体在交变磁场中产生涡流，热功率近似：
 *   P = (π² · B² · f² · d² · V) / (6 · ρ)
 *   其中 B 为磁感应强度峰值 (T)，f 为磁场频率 (Hz)，
 *        d 为导体厚度 (m)，V 为体积 (m³)，ρ 为电阻率 (Ω·m)
 *
 * 趋肤深度 (涡流主要分布在表面深度)：
 *   δ = √(ρ / (π · f · μ))
 *   其中 μ = μ₀·μᵣ, μ₀=4π×10⁻⁷ H/m
 *
 * 物理意义：
 *   - 频率越高 → 涡流越大 → 加热越快
 *   - 但趋肤深度越小 → 有效体积减小 → 深层不加热
 *   - 高频时等效电阻增大 (电流集中于表面)
 */
export class EddyCurrentModel extends PhysicsModelBase {
    readonly name = '涡流现象';
    readonly version = '1.0.0';
    readonly description = '交变磁场中的涡流热功率与趋肤效应分布';
    readonly modelType = 'eddy-current';
    readonly assumptions = [
        '导体为各向同性均匀介质',
        '磁场均匀且垂直于导体表面',
        '厚度 d 远小于导体横向尺寸 (平板近似)',
        '磁导率 μ 近似为真空磁导率 (非铁磁体)',
        '温度对电阻率的影响忽略'
    ];
    readonly applicableRange = 'f = 1 Hz–1 MHz；B = 0.001–2 T；ρ = 1.7×10⁻⁸ (Cu) 到 10⁻⁶ Ω·m';
    readonly errorSources = [
        '趋肤深度接近导体厚度时平板公式偏差',
        '电阻率随温度升高而变化 (铜 +0.4%/°C)',
        '磁导率在铁磁材料中非线性',
        '位移电流在极高频率 (MHz 以上) 不可忽略'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'magneticField', description: '磁感应强度峰值 B (T)', unit: 'T', required: true, min: 0, max: 5 },
        { name: 'frequency', description: '磁场频率 f (Hz)', unit: 'Hz', required: true, min: 0.1, max: 1e7 },
        { name: 'conductivity', description: '电导率 σ (S/m)', unit: 'S/m', required: true, min: 1e3, max: 1e8 },
        { name: 'thickness', description: '导体厚度 d (m)', unit: 'm', required: true, min: 1e-5, max: 0.1 },
        { name: 'area', description: '导体面积 A (m²)', unit: 'm²', required: false, min: 1e-6, max: 10 },
        { name: 'muR', description: '相对磁导率 μᵣ', unit: '', required: false }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ec = problem.constraints?.eddyCurrent;
        if (!ec) throw new Error('eddyCurrent 模型需要 eddyCurrent 约束配置');

        const B = ec.magneticField; // T
        if (B <= 0) throw new Error('磁感应强度 B 必须为正');

        const f = ec.frequency; // Hz
        if (f <= 0) throw new Error('频率 f 必须为正');

        const sigma = ec.conductivity; // S/m
        if (sigma <= 0) throw new Error('电导率 conductivity 必须为正');

        const d = ec.thickness; // m
        if (d <= 0) throw new Error('厚度 thickness 必须为正');

        const area = ec.area ?? 0.01; // m²
        const muR = ec.muR ?? 1; // 相对磁导率

        // 电阻率 ρ = 1/σ
        const rho = 1 / sigma; // Ω·m
        // 磁导率 μ = μ₀·μᵣ
        const mu0 = 4 * Math.PI * 1e-7; // H/m
        const mu = mu0 * muR; // H/m

        // 体积 V = d·A
        const V = d * area; // m³

        // 趋肤深度 δ = √(ρ/(π·f·μ))
        const skinDepth = Math.sqrt(rho / (Math.PI * f * mu)); // m

        // 涡流热功率：P = (π²·B²·f²·d²·V) / (6·ρ)
        const pi2 = Math.PI * Math.PI;
        const P = (pi2 * B * B * f * f * d * d * V) / (6 * rho); // W

        // 等效涡流电阻 (近似) — 已移除未使用的 R_equiv
        // 实际 P = I²R → 使用涡流有效面积 (简化)

        // 功率密度 (单位体积)
        const powerDensity = P / V; // W/m³

        const sampleCount = problem.timeConfig.sampleCount ?? 500;
        const duration = problem.timeConfig.duration;

        // 时间轨迹：涡流产生温升 (绝热近似，简化), temp=25+(P/mc)·t (公共脚手架 sampleTrajectory)
        const heatCapacity = 385; // 铜比热容 J/(kg·K)，简化
        const density = 8960; // 铜密度 kg/m³
        const mass = V * density; // kg
        const tau_thermal = 10; // 简化热时间常数 (s) — 仅用于下方 warning 判定
        const dT_dt = P / (mass * heatCapacity); // 理想温升速率 (绝热)
        const trajectory = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => ({
                position: { x: t, y: 25 + dT_dt * t }, // x: time (s), y: temperature (degC)
                velocity: { x: 1, y: dT_dt },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            })
        });

        // 图表 1: 涡流热功率 vs 频率
        const eddyHeatPowerVsFreq: ChartSeries = {
            xLabel: '频率 f (Hz)',
            yLabel: '涡流热功率 P (W)',
            xUnit: 'Hz',
            yUnit: 'W',
            points: []
        };
        const fMax = Math.max(f * 2, 1000);
        const fMin = Math.max(0.1, f / 100);
        const logMin = Math.log10(fMin);
        const logMax = Math.log10(fMax);
        const N1 = 200;
        for (let i = 0; i <= N1; i++) {
            const fi = Math.pow(10, logMin + ((logMax - logMin) * i) / N1);
            const Pi = (pi2 * B * B * fi * fi * d * d * V) / (6 * rho);
            eddyHeatPowerVsFreq.points.push({
                x: parseFloat(fi.toFixed(4)),
                y: parseFloat(Pi.toFixed(6))
            });
        }

        // 图表 2: 趋肤深度 vs 深度分布 (涡流密度随深度的指数衰减 J = J₀·exp(-x/δ))
        const eddyVsDepth: ChartSeries = {
            xLabel: '距表面深度 x (mm)',
            yLabel: '相对涡流密度 J/J₀',
            xUnit: 'mm',
            yUnit: '',
            points: []
        };
        const xMax = Math.max(skinDepth * 5, d / 2, 0.001);
        const N2 = 200;
        for (let i = 0; i <= N2; i++) {
            const xi = (xMax * i) / N2; // m
            const ratio = Math.exp(-xi / skinDepth);
            eddyVsDepth.points.push({
                x: parseFloat((xi * 1000).toFixed(4)),
                y: parseFloat(ratio.toFixed(4))
            });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '工频 (50 Hz)',
                t: 0,
                position: { x: 50, y: (pi2 * B * B * 2500 * d * d * V) / (6 * rho) },
                velocity: { x: 0, y: 0 },
                description: `f=50Hz: P=${((pi2 * B * B * 2500 * d * d * V) / (6 * rho)).toFixed(4)}W, δ=${(Math.sqrt(rho / (Math.PI * 50 * mu)) * 1000).toFixed(3)}mm`
            },
            {
                label: '当前参数',
                t: duration / 4,
                position: { x: f, y: P },
                velocity: { x: 0, y: 0 },
                description: `f=${f}Hz: P=${P.toFixed(4)}W, δ=${(skinDepth * 1000).toFixed(3)}mm, d=${(d * 1000).toFixed(3)}mm`
            },
            {
                label: '高频 (f/δ>>1)',
                t: duration / 2,
                position: {
                    x: Math.min(f * 10, fMax),
                    y: (pi2 * B * B * Math.pow(Math.min(f * 10, fMax), 2) * d * d * V) / (6 * rho)
                },
                velocity: { x: 0, y: 0 },
                description: '频率升高: 趋肤深度减小，功率趋于 plateau'
            }
        ];

        const warnings: string[] = [];
        if (skinDepth < d / 10) {
            warnings.push(
                `趋肤深度 ${(skinDepth * 1000).toFixed(3)}mm 远小于厚度 ${(d * 1000).toFixed(3)}mm，内部几乎无涡流`
            );
        }
        if (skinDepth > d * 10) {
            warnings.push(
                `趋肤深度 ${(skinDepth * 1000).toFixed(3)}mm 远大于厚度 ${(d * 1000).toFixed(3)}mm，平板公式可能偏差`
            );
        }
        if (tau_thermal < 1) {
            warnings.push('热时间常数极小，实际温度会迅速上升');
        }

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '电阻率与厚度',
                formula: 'ρ = 1/σ, V = A·d',
                calculation: `ρ=${(rho * 1e8).toFixed(2)}×10⁻⁸ Ω·m, V=${(V * 1e6).toFixed(2)} cm³`
            },
            {
                order: 2,
                description: '涡流热功率 (简化平板公式)',
                formula: 'P = π²·B²·f²·d²·V / (6·ρ)',
                calculation: `P = π² × ${B}² × ${f}² × ${d}² × ${(V * 1e6).toFixed(2)}cm³ / (6×${(rho * 1e8).toFixed(2)}×10⁻⁸) ≈ ${P.toFixed(4)} W`
            },
            {
                order: 3,
                description: '趋肤深度',
                formula: 'δ = √(ρ/(π·f·μ))',
                calculation: `δ = √(${(rho * 1e8).toFixed(2)}×10⁻⁸ / (π × ${f} × ${(mu * 1e6).toFixed(4)}×10⁻⁶)) = ${(skinDepth * 1000).toFixed(4)} mm`
            },
            {
                order: 4,
                description: '结论',
                formula: 'P ∝ f²·B²·d²/ρ',
                result: `功率随频率、磁场平方增长；高频趋肤效应显著 δ=${(skinDepth * 1000).toFixed(3)}mm`
            }
        ];

        const conservedQuantities: ConservedQuantity[] = [];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                eddy_heat_power_vs_freq: eddyHeatPowerVsFreq,
                eddy_vs_depth: eddyVsDepth
            },
            diagnostics: {
                conservedQuantities,
                maxValues: {
                    eddyPower_W: P,
                    skinDepth_mm: skinDepth * 1000,
                    powerDensity_W_per_m3: powerDensity,
                    frequency_Hz: f,
                    magneticField_T: B,
                    thickness_mm: d * 1000,
                    conductivity_S_per_m: sigma,
                    resistivity_uOhm_cm: rho * 1e8
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `涡流加热: B=${B}T, f=${f}Hz, σ=${(sigma / 1e6).toFixed(1)}MS/m, d=${(d * 1000).toFixed(2)}mm → P=${P.toFixed(4)}W, δ=${(skinDepth * 1000).toFixed(3)}mm`,
                steps,
                formulas: [
                    {
                        name: '涡流功率',
                        formula: 'P = π²B²f²d²V/(6ρ)',
                        variables: {
                            B: { value: B, unit: 'T' },
                            f: { value: f, unit: 'Hz' },
                            d: { value: d, unit: 'm' },
                            V: { value: V, unit: 'm³' },
                            rho: { value: rho, unit: 'Ω·m' },
                            P: { value: P, unit: 'W' }
                        }
                    },
                    {
                        name: '趋肤深度',
                        formula: 'δ = √(ρ/(πfμ))',
                        variables: {
                            rho: { value: rho, unit: 'Ω·m' },
                            f: { value: f, unit: 'Hz' },
                            mu: { value: mu, unit: 'H/m' },
                            delta: { value: skinDepth, unit: 'm' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
