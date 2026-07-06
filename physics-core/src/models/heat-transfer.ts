import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 三种热传递模式模型 — 热传导 / 热对流 / 热辐射
 *
 *   - 传导:  Q/t = k·A·ΔT/L   牛顿冷却法 Q=hA(T_env - T) 近似
 *   - 对流:  Q = h·A·ΔT,  h 取决于流体/几何
 *   - 辐射:  P = εσA (T^4 - T_env^4)    σ = 5.67e-8 W/(m²·K⁴)
 *
 * 本模型: 给定一个初始温度 T0 的物体, 在环境温度 Ten(Tenv>T0) 下通过三种
 * 方式吸热, 观察 T(t) 曲线以及三种传热流量对比。
 *
 *   - x_t = T vs t 三种模式 (三条曲线在一个图表内)
 *   - y_t = 传热流量 Qdot 随时间递减 (三种曲线的对比)
 */

export interface HeatTransferConstraint {
    /** 传热模式 (全部展示, 也可以单独选一个) */
    readonly mode: 'conduction' | 'convection' | 'radiation';
    /** 材料类型 (影响 k / h / ε) */
    readonly materialType?: 'copper' | 'glass' | 'steel' | 'polystyrene';
    /** 环境温度 (K) */
    readonly ambientTemp: number;
    /** 环境温度 (K) 初始物体温度 (K) */
    readonly initialTemp: number;
    /** 环境温度 (K) 时间 (s) */
    readonly time: number;
    /** 截面积 (m²), 默认 0.01 */
    readonly area?: number;
    /** 导热体厚度 L (m, 仅 conduction, 默认 0.05) */
    readonly thickness?: number;
    /** 采样点数 */
    readonly sampleCount?: number;
}

const SIGMA = 5.67e-8; // W/(m²·K⁴)

/* 典型材料热导率 k (W/(m·K)) */
const K_TABLE: Record<string, number> = {
    copper: 401,
    glass: 1.0,
    steel: 50,
    polystyrene: 0.033
};

/* 对流换热系数 h (W/(m²·K)) */
const H_TABLE: Record<string, number> = {
    copper: 80,
    glass: 50,
    steel: 65,
    polystyrene: 30
};

/* 辐射率 ε */
const EMISS_TABLE: Record<string, number> = {
    copper: 0.05,
    glass: 0.92,
    steel: 0.85,
    polystyrene: 0.9
};

/* 材料比热容 (J/(kg·K)) */
const SPEC_TABLE: Record<string, number> = {
    copper: 385,
    glass: 840,
    steel: 490,
    polystyrene: 1300
};

/* 密度 (kg/m³) */
const RHO_TABLE: Record<string, number> = {
    copper: 8960,
    glass: 2500,
    steel: 7850,
    polystyrene: 1050
};

/* 牛顿冷却统一模型: T' = -(kA/(mcL))·(T-T_env)  */
function solveCoolingK(kPerMc: number, T0: number, Tenv: number, t: number): number {
    const sign = Tenv >= T0 ? 1 : -1;
    const dT0 = Math.abs(Tenv - T0);
    return Tenv - sign * dT0 * Math.exp(-kPerMc * t);
}

/* 辐射冷却: dT/dt = - (εσA/mc)·(T^4 - T_env^4) — 分段线性化近似 */
function stepRadiation(T: number, Tenv: number, eps: number, A: number, mc: number, dt: number): number {
    const P = eps * SIGMA * A * (Math.pow(T, 4) - Math.pow(Tenv, 4));
    const dT = (-P * dt) / mc;
    return T + dT;
}

export class HeatTransferModel extends PhysicsModelBase {
    readonly name = '三种热传递模式';
    readonly version = '1.0.0';
    readonly description = '传导/对流/辐射三种基本传热模式下的 T-t 与 Qdot 曲线对比';
    readonly modelType = 'heat-transfer' as const;
    readonly assumptions = [
        '物体热容均匀, 温度分布均匀 (Bi << 0.1)',
        '材料热物理参数取常数 (不随 T 变化)',
        '传热系数 h 不随温差变化',
        '辐射率在频段内取均值'
    ];
    readonly applicableRange = '温差 < 500K, 物体尺寸 ~cm 级, 时间尺度 s~min';
    readonly errorSources = [
        '对流系数 h 受流场影响, 本模型取经验值',
        '实际辐射问题需考虑视角因子',
        '热导率 k 随 T 变化 (金属 k∝1/T, 玻璃 k∝T)'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'mode', description: '主导传热模式', unit: '', required: true },
        { name: 'ambientTemp', description: '环境温度 (K)', unit: 'K', required: true, min: 200, max: 1500 },
        { name: 'initialTemp', description: '初温 (K)', unit: 'K', required: true, min: 200, max: 1500 },
        { name: 'time', description: '模拟时间 (s)', unit: 's', required: true, min: 1, max: 6000 },
        { name: 'temperatureDiff', description: '环境-物体初始温差 (K)', unit: 'K', required: false }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.heatTransfer;
        if (!c) {
            throw new Error('heat-transfer 模型需要 constraints.heatTransfer 配置');
        }

        const mat = c.materialType ?? 'steel';
        const k = K_TABLE[mat] ?? 50;
        const h = H_TABLE[mat] ?? 50;
        const eps = EMISS_TABLE[mat] ?? 0.9;
        const cp = SPEC_TABLE[mat] ?? 490;
        const rho = RHO_TABLE[mat] ?? 7850;

        const A = c.area ?? 0.01;
        const L = c.thickness ?? 0.05;
        const T0 = c.initialTemp ?? 350;
        const Tenv = c.ambientTemp ?? 300;
        const tMax = c.time ?? 60;
        const N = Math.max(20, Math.min(150, c.sampleCount ?? 80));

        /* 物体体积 = A·L (简化为平板) */
        const V = A * L;
        const m = rho * V;
        const mc = m * cp;

        /* 热阻参数 */
        const kMcCond = (k * A) / (mc * L); // 1/s
        const kMcConv = (h * A) / mc; // 1/s

        /* ---------- x_t = T-t 三种曲线 ---------- */
        const pointsT: Array<{ x: number; y: number; y1: number; y2: number }> = []; // y: conduction, y1: convection, y2: radiation
        for (let i = 0; i <= N; i++) {
            const t = (tMax * i) / N;
            const Tc = solveCoolingK(kMcCond, T0, Tenv, t);
            const Tv = solveCoolingK(kMcConv, T0, Tenv, t);
            /* 辐射: 数值步进 */
            const dt = t / N; // 步进与总步相邻
            let Tr = T0;
            for (let j = 0; j < i; j++) {
                Tr = stepRadiation(Tr, Tenv, eps, A, mc, dt);
            }
            pointsT.push({
                x: parseFloat(t.toFixed(2)),
                y: parseFloat(Tc.toFixed(3)),
                y1: parseFloat(Tv.toFixed(3)),
                y2: parseFloat(Tr.toFixed(3))
            });
        }
        const chartT: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '物体温度 (K)',
            xUnit: 's',
            yUnit: 'K',
            points: pointsT.map(p => ({ x: p.x, y: p.y }))
        };

        /* ---------- y_t = 传热流量 (W) ---------- */
        const pointsQ: Array<{ x: number; y: number; y1: number; y2: number }> = [];
        for (const p of pointsT) {
            const TmidA = solveCoolingK(kMcCond, T0, Tenv, p.x);
            const TmidB = solveCoolingK(kMcConv, T0, Tenv, p.x);
            const TmidC = p.y2;
            const Qcond = (k * A * (Tenv - TmidA)) / L;
            const Qconv = h * A * (Tenv - TmidB);
            const Qrad = eps * SIGMA * A * (Math.pow(TmidC, 4) - Math.pow(Tenv, 4));
            pointsQ.push({
                x: parseFloat(p.x.toFixed(2)),
                y: parseFloat(Math.abs(Qcond).toFixed(3)),
                y1: parseFloat(Math.abs(Qconv).toFixed(3)),
                y2: parseFloat(Math.abs(Qrad).toFixed(3))
            });
        }
        const chartQ: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '传热流量 |Qdot| (W)',
            xUnit: 's',
            yUnit: 'W',
            points: pointsQ.map(p => ({ x: p.x, y: p.y }))
        };

        /* ---------- keyframes ---------- */
        const modeZh = c.mode === 'conduction' ? '热传导' : c.mode === 'convection' ? '热对流' : '热辐射';
        const keyframes: Keyframe[] = [
            {
                label: '初态',
                t: 0,
                position: { x: 0, y: T0 },
                velocity: { x: 0, y: 0 },
                description: `初态: T0=${T0.toFixed(1)}K, Tenv=${Tenv.toFixed(1)}K, 温差=${(Tenv - T0).toFixed(1)}K`
            },
            {
                label: '终态',
                t: 0,
                position: { x: tMax, y: Tenv },
                velocity: { x: 0, y: 0 },
                description: `终态: t=${T0.toFixed(0)}s 后物体近似达到环境温度 (趋于 ${Tenv.toFixed(1)}K)`
            }
        ];

        /* ---------- 示意轨迹 ---------- */
        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: T0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 },
            { t: 0, position: { x: tMax, y: Tenv }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '傅里叶热传导定律',
                formula: 'Qdot = k·A·ΔT / L',
                calculation: `k=${k}, A=${A}, L=${L}, 初始 Qdot=${((k * A * Math.abs(Tenv - T0)) / L).toFixed(2)} W`
            },
            {
                order: 2,
                description: '牛顿冷却 (对流)',
                formula: 'Qdot = h·A·ΔT',
                calculation: `h=${h}, A=${A}, 初始 Qdot=${(h * A * Math.abs(Tenv - T0)).toFixed(2)} W`
            },
            {
                order: 3,
                description: 'Stefan-Boltzmann 辐射',
                formula: 'Qdot = ε·σ·A·(T⁴ − T_env⁴)',
                calculation: `ε=${eps}, σ=${SIGMA}, A=${A}, 初始 Qdot≈${(eps * SIGMA * A * Math.abs(Math.pow(T0, 4) - Math.pow(Tenv, 4))).toFixed(2)} W`
            },
            {
                order: 4,
                description: '模式比较',
                result: `${modeZh} 作为主要传热模式展示 T-t 渐近曲线`
            }
        ];

        const warnings: string[] = [];
        if (Math.abs(Tenv - T0) > 500) warnings.push('温差较大, 材料物性参数的温度依赖性明显');
        if (tMax > 3600) warnings.push('时间较长, 对环境散热条件的假设可能不成立');

        /* 热力常数记录 */
        const kSI = k;
        void kSI;
        void pointsQ;

        return {
            meta: {
                model: 'heat-transfer',
                solver: 'numerical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: chartT,
                y_t: chartQ
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    k_W_per_mK: k,
                    h_W_per_m2K: h,
                    emissivity: eps,
                    mc_J_per_K: parseFloat(mc.toFixed(2)),
                    kMcCond_per_s: parseFloat(kMcCond.toFixed(6)),
                    kMcConv_per_s: parseFloat(kMcConv.toFixed(6)),
                    modeCode: c.mode === 'conduction' ? 0 : c.mode === 'convection' ? 1 : 2
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `三种传热模式 T-t 与 Qdot-t 对比: k=${k}W/m·K, h=${h}W/m²·K, ε=${eps}, t=${tMax}s`,
                steps,
                formulas: [
                    {
                        name: '傅里叶传导',
                        formula: 'Qdot = k·A·ΔT / L',
                        variables: {
                            k: { value: k, unit: 'W/(m·K)' },
                            A: { value: A, unit: 'm²' },
                            L: { value: L, unit: 'm' },
                            deltaT: { value: Tenv - T0, unit: 'K' }
                        }
                    },
                    {
                        name: 'Stefan-Boltzmann',
                        formula: 'Qdot = ε·σ·A·(T⁴ − T_env⁴)',
                        variables: {
                            epsilon: { value: eps, unit: '' },
                            sigma: { value: SIGMA, unit: 'W/(m²·K⁴)' },
                            A: { value: A, unit: 'm²' },
                            T: { value: T0, unit: 'K' },
                            Tenv: { value: Tenv, unit: 'K' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
