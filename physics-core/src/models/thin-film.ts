import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/** 空气折射率 */
const N_AIR = 1.0;

/**
 * 计算单偏振 Airy 薄膜复振幅反射率 R_pol ∈ [0, 1]
 *
 * R_pol = | (r1 + r2·e^(iφ)) / (1 + r1·r2·e^(iφ)) |²
 *       = (r1² + r2² + 2·r1·r2·cosφ) / (1 + r1²·r2² + 2·r1·r2·cosφ)
 */
function airyPolarizationReflectance(r1: number, r2: number, phiProp: number): number {
    const c = Math.cos(phiProp);
    const r1sq = r1 * r1;
    const r2sq = r2 * r2;
    const cross = 2 * r1 * r2 * c;
    const num = r1sq + r2sq + cross;
    const den = 1 + r1sq * r2sq + cross;
    if (den <= 1e-15) return 1;
    return Math.min(1, Math.max(0, num / den));
}

/**
 * 计算两界面 (空气 n0=1 → 薄膜 n1 → 基底 n2) Fresnel 幅反射系数与非偏振 Airy 反射率
 *
 * s/p 偏振统一采用正入射同号约定:
 *   r_s = (n_i cosθ_i − n_t cosθ_t) / (n_i cosθ_i + n_t cosθ_t)
 *   r_p = (n_i cosθ_t − n_t cosθ_i) / (n_i cosθ_t + n_t cosθ_i)
 * 在正入射 θ=0 时二者严格相等且等于 (n_i − n_t) / (n_i + n_t)；
 * 在 d → 0 连续极限下严格收敛至空气/基底单界面反射率 R_02。
 */
export function computeThinFilmFresnel(
    dNm: number,
    nFilm: number,
    nSub: number,
    lambdaNm: number,
    thetaDeg: number
): {
    cosT: number;
    r1Normal: number;
    r2Normal: number;
    hasRelativeHalfWave: boolean;
    isSingleInterface: boolean;
    reflectance: number;
} {
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const sin0 = Math.sin(thetaRad);
    const cos0 = Math.max(0, Math.cos(thetaRad));

    const sin1 = (N_AIR * sin0) / nFilm;
    if (Math.abs(sin1) >= 1) throw new Error('全反射: 入射角超出临界角');
    const cos1 = Math.sqrt(Math.max(0, 1 - sin1 * sin1));

    const sin2 = (N_AIR * sin0) / nSub;
    const cos2 = Math.sqrt(Math.max(0, 1 - Math.min(1, sin2 * sin2)));

    const fresnelS = (ni: number, ci: number, nt: number, ct: number): number => {
        const den = ni * ci + nt * ct;
        return den <= 1e-15 ? -1 : (ni * ci - nt * ct) / den;
    };
    const fresnelP = (ni: number, ci: number, nt: number, ct: number): number => {
        const den = ni * ct + nt * ci;
        return den <= 1e-15 ? -1 : (ni * ct - nt * ci) / den;
    };

    const r1s = fresnelS(N_AIR, cos0, nFilm, cos1);
    const r2s = fresnelS(nFilm, cos1, nSub, cos2);
    const r1p = fresnelP(N_AIR, cos0, nFilm, cos1);
    const r2p = fresnelP(nFilm, cos1, nSub, cos2);

    const phiProp = (4 * Math.PI * nFilm * dNm * cos1) / lambdaNm;
    const rs = airyPolarizationReflectance(r1s, r2s, phiProp);
    const rp = airyPolarizationReflectance(r1p, r2p, phiProp);
    const reflectance = Math.min(1, Math.max(0, 0.5 * (rs + rp)));

    const r1Normal = (N_AIR - nFilm) / (N_AIR + nFilm);
    const r2Normal = (nFilm - nSub) / (nFilm + nSub);
    const isSingleInterface = Math.abs(r1Normal) < 1e-12 || Math.abs(r2Normal) < 1e-12;
    const hasRelativeHalfWave = !isSingleInterface && r1Normal * r2Normal < 0;

    return {
        cosT: cos1,
        r1Normal,
        r2Normal,
        hasRelativeHalfWave,
        isSingleInterface,
        reflectance
    };
}

/**
 * 薄膜干涉模型 — 选必一 第四章 (两界面 Fresnel 复振幅与真实相对半波损失)
 *
 * 物理原理:
 *   空气 (n0=1) → 薄膜 (n) → 基片 (n_s) 两界面反射:
 *     r1 = (1 − n)/(1 + n),  r2 = (n − n_s)/(n + n_s) (正入射)
 *     相对半波损失判据: hasRelativeHalfWave = (r1 · r2) < 0
 *       - 如 1 < 1.33 > 1.0 (肥皂膜): 仅上界面 π 相变 → 有相对半波损失 λ/2
 *       - 如 1 < 1.38 < 1.5 (MgF₂/玻璃): 两界面均 π 相变 → 相对相变为 0，无相对半波损失
 *     等效光程差: Δ = 2·n·d·cosθ_t + (hasRelativeHalfWave ? λ/2 : 0)
 *     总反射率 (Airy 非偏振平均): R = ½·(R_s + R_p), 天然满足 0 ≤ R ≤ 1
 */
export class ThinFilmModel extends PhysicsModelBase {
    readonly name = '薄膜干涉';
    readonly version = '1.1.0';
    readonly description = '薄膜等厚干涉: 两界面 Fresnel 复振幅反射率与真实相对半波损失';
    readonly modelType = 'thin-film' as const;
    readonly assumptions = [
        '薄膜上下两面平行且为非吸收均匀介质 (空气 n₀=1 → 薄膜 n → 基片 n_s)',
        '采用两界面真实 Fresnel 幅反射系数与 Airy 复振幅合成非偏振反射率 R = ½(R_s + R_p)',
        '相对半波损失由两界面反射系数乘积符号判定: hasRelativeHalfWave = (r₁·r₂) < 0',
        '单色平面波入射，忽略薄膜色散与表面散射'
    ];
    readonly applicableRange = 'thickness: 10--5000 nm; refIndex: 1--3; substrateIndex: 1--4; wavelength: 380--780 nm';
    readonly errorSources = ['实际薄膜厚度不均匀', '入射光并非严格单色', '表面粗糙度导致散射'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'thickness', description: '薄膜中心厚度 d (nm)', unit: 'nm', required: true, min: 10, max: 5000 },
        { name: 'refIndex', description: '薄膜折射率 n', unit: '', required: true, min: 1, max: 3 },
        { name: 'wavelength', description: '入射光波长 (nm)', unit: 'nm', required: true, min: 380, max: 780 },
        { name: 'incidentAngle', description: '入射角 (度, 相对法线)', unit: '°', required: true, min: 0, max: 90 },
        { name: 'substrateIndex', description: '基片折射率 (薄膜下方介质)', unit: '', required: false, min: 1, max: 4 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.thinFilm;
        if (!c) throw new Error('thin-film 模型需要 thinFilm 约束配置');

        const d = c.thickness;
        const n = c.refIndex;
        const lambda = c.wavelength;
        const thetaDeg = c.incidentAngle;
        const nSub = c.substrateIndex ?? 1.5;

        const fresnel = computeThinFilmFresnel(d, n, nSub, lambda, thetaDeg);
        const {
            cosT,
            r1Normal: r1,
            r2Normal: r2,
            hasRelativeHalfWave,
            isSingleInterface,
            reflectance: Rnorm
        } = fresnel;
        const relativePhaseShiftRad = hasRelativeHalfWave ? Math.PI : 0;

        // 等效光程差 (仅当两界面存在相对半波损失时加 λ/2)
        const delta = 2 * n * d * cosT + (hasRelativeHalfWave ? lambda / 2 : 0);
        const m = delta / lambda;
        const frac = ((m % 1) + 1) % 1;
        const isConstructive = !isSingleInterface && Math.min(frac, 1 - frac) < 0.05;
        const isDestructive = !isSingleInterface && Math.abs(frac - 0.5) < 0.05;

        // 膜厚扫描 (改变 d 看真实 Airy 反射率变化)
        const thicknessScan: ChartSeries = {
            xLabel: '膜厚 d (nm)',
            yLabel: '反射率 R',
            xUnit: 'nm',
            yUnit: '',
            points: []
        };
        for (let di = 50; di <= 1500; di += 2) {
            const Ri = computeThinFilmFresnel(di, n, nSub, lambda, thetaDeg).reflectance;
            thicknessScan.points.push({ x: di, y: parseFloat(Ri.toFixed(4)) });
        }

        // 波长扫描 (改变 lambda 看真实 Airy 反射率变化)
        const wavelengthScan: ChartSeries = {
            xLabel: '波长 lambda (nm)',
            yLabel: '反射率 R',
            xUnit: 'nm',
            yUnit: '',
            points: []
        };
        for (let w = 380; w <= 780; w += 4) {
            const Rw = computeThinFilmFresnel(d, n, nSub, w, thetaDeg).reflectance;
            wavelengthScan.points.push({ x: w, y: parseFloat(Rw.toFixed(4)) });
        }

        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= 50; i++) {
            const t = (i / 50) * 10;
            trajectory.push({
                t,
                position: { x: d, y: i },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        const verdictText = isSingleInterface
            ? '退化为单界面反射 (无双光束薄膜干涉)'
            : isConstructive
              ? '相长干涉 (反射增强)'
              : isDestructive
                ? '相消干涉 (反射减弱)'
                : '介于相长与相消之间';
        const halfWaveText = isSingleInterface
            ? '单界面反射 (至少一界面折射率相等，r=0)'
            : hasRelativeHalfWave
              ? `存在相对半波损失 +λ/2 (r₁=${r1.toFixed(3)}, r₂=${r2.toFixed(3)}, r₁·r₂ < 0)`
              : `无相对半波损失 (r₁=${r1.toFixed(3)}, r₂=${r2.toFixed(3)}, r₁·r₂ > 0，两界面反射相变相同)`;

        const keyframes: Keyframe[] = [
            {
                label: '入射光',
                t: 0,
                position: { x: -10, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `λ=${lambda}nm, θ=${thetaDeg}°, n_air=1, n_film=${n}, n_sub=${nSub}`
            },
            {
                label: '反射光叠加',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `Δ=${delta.toFixed(1)}nm, m=${m.toFixed(3)}, ${halfWaveText} → ${verdictText}`
            },
            {
                label: '反射率 R',
                t: 0,
                position: { x: 10, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `Airy 反射率 R=${(Rnorm * 100).toFixed(2)}%, ${Rnorm < 0.05 ? '增透效果' : Rnorm > 0.5 ? '增反效果' : '普通反射'}`
            }
        ];

        const deltaFormula = hasRelativeHalfWave ? 'Δ = 2·n·d·cosθ_t + λ/2' : 'Δ = 2·n·d·cosθ_t (无相对半波损失)';

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '两界面 Fresnel 反射系数与相对半波损失判定',
                formula: 'r₁ = (1−n)/(1+n),  r₂ = (n−n_s)/(n+n_s),  相对半波损失 ⇔ r₁·r₂ < 0',
                calculation: `r₁=${r1.toFixed(4)}, r₂=${r2.toFixed(4)} → ${halfWaveText}`
            },
            {
                order: 2,
                description: '等效光程差',
                formula: deltaFormula,
                calculation: hasRelativeHalfWave
                    ? `Δ = 2×${n}×${d}×${cosT.toFixed(3)} + ${lambda}/2 = ${delta.toFixed(1)} nm`
                    : `Δ = 2×${n}×${d}×${cosT.toFixed(3)} = ${delta.toFixed(1)} nm`
            },
            {
                order: 3,
                description: '干涉判定',
                formula: 'Δ = mλ (相长明纹);  Δ = (m+½)λ (相消暗纹)',
                result: verdictText
            },
            {
                order: 4,
                description: 'Airy 复振幅反射率 (s/p 非偏振平均)',
                formula: 'R_pol = (r₁² + r₂² + 2r₁r₂cosφ) / (1 + r₁²r₂² + 2r₁r₂cosφ),  R = ½(R_s + R_p)',
                calculation: `R = ${(Rnorm * 100).toFixed(2)}%`,
                result: Rnorm < 0.05 ? '接近增透' : Rnorm > 0.5 ? '增反效果' : '普通薄膜反射'
            }
        ];

        const warnings: string[] = [];
        if (thetaDeg > 60) warnings.push('入射角较大, s/p 偏振反射率差异显著 (已取非偏振平均)');
        if (d > 4 * lambda) warnings.push('厚度较大, 实际非单色光相干长度可能不足');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                thickness_scan: thicknessScan,
                wavelength_scan: wavelengthScan
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    d,
                    n,
                    nSub,
                    lambda,
                    delta,
                    m,
                    Rnorm,
                    cosT,
                    r1,
                    r2,
                    relativePhaseShiftRad
                },
                flags: {
                    hasRelativeHalfWave,
                    isSingleInterface,
                    isConstructive,
                    isDestructive,
                    isAntiReflective: Rnorm < 0.05,
                    isHighReflective: Rnorm > 0.5
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `薄膜干涉 (1→${n}→${nSub}): d=${d}nm, λ=${lambda}nm; ${hasRelativeHalfWave ? '有' : '无'}相对半波损失, Δ=${delta.toFixed(1)}nm, m=${m.toFixed(2)}, R=${(Rnorm * 100).toFixed(2)}% (${verdictText})`,
                steps,
                formulas: [
                    {
                        name: '两界面 Fresnel 反射系数',
                        formula: 'r₁ = (1−n)/(1+n),  r₂ = (n−n_s)/(n+n_s)',
                        variables: {
                            n: { value: n, unit: '' },
                            n_s: { value: nSub, unit: '' },
                            r1: { value: parseFloat(r1.toFixed(4)), unit: '' },
                            r2: { value: parseFloat(r2.toFixed(4)), unit: '' }
                        }
                    },
                    {
                        name: '等效光程差',
                        formula: deltaFormula,
                        variables: {
                            d: { value: d, unit: 'nm' },
                            n: { value: n, unit: '' },
                            lambda: { value: lambda, unit: 'nm' },
                            delta: { value: parseFloat(delta.toFixed(2)), unit: 'nm' }
                        }
                    },
                    {
                        name: 'Airy 复振幅反射率',
                        formula: 'R = ½(R_s + R_p),  R_pol = (r₁² + r₂² + 2r₁r₂cosφ)/(1 + r₁²r₂² + 2r₁r₂cosφ)',
                        variables: {
                            R: { value: parseFloat(Rnorm.toFixed(4)), unit: '' },
                            phi_rel: { value: parseFloat(relativePhaseShiftRad.toFixed(4)), unit: 'rad' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
