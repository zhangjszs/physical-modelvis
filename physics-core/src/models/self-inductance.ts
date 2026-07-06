import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ConservedQuantity,
    ExplanationStep
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 自感现象模型 (选必二第三章 §3)
 *
 * RL 电路暂态过程：
 *
 * 通电 (turnOn):
 *   开关闭合后电流按指数上升：
 *   i(t) = E/R * (1 - exp(-R*t/L))
 *   电感两端电压: uL = E * exp(-R*t/L)
 *   时间常数 tau = L/R
 *
 * 断电 (turnOff):
 *   开关断开后电流按指数衰减 (经续流回路)：
 *   i(t) = I0 * exp(-R*t/L)
 *   电感两端电压 (开关处): uL = -I0*R * exp(-R*t/L)
 *   时间常数 tau = L/R
 *
 * 物理意义：
 *   - 电感阻碍电流变化 (楞次定律)
 *   - 时间常数 tau = L/R 表征暂态过程快慢
 *   - 5*tau 后认为暂态结束
 */
export class SelfInductanceModel extends PhysicsModelBase {
    readonly name = '自感现象';
    readonly version = '1.0.0';
    readonly description = 'RL 电路暂态过程：通电指数上升、断电指数衰减';
    readonly modelType = 'self-inductance';
    readonly assumptions = [
        '电感 L 为线性 (无磁饱和)',
        '电阻 R 恒定 (不计温度效应)',
        '电源内阻不计',
        '开关为理想开关 (无电弧、无分布参数)'
    ];
    readonly applicableRange = 'L = 1e-6-100 H; R = 1e-3-1e6 Ohm; E = 0-1000 V';
    readonly errorSources = [
        '磁芯饱和导致 L 随电流变化',
        '线圈电阻未完全分离',
        '开关电弧导致实际断路时间延长',
        '高频时分布电容效应'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'inductance', description: '自感 L (H)', unit: 'H', required: true, min: 0, max: 1000 },
        { name: 'resistance', description: '电阻 R (Ohm)', unit: 'Ohm', required: true, min: 0, max: 1e9 },
        { name: 'emf', description: '电源电动势 E (V)', unit: 'V', required: true, min: 0, max: 1e6 },
        { name: 'mode', description: '模式: turnOn 或 turnOff', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const sl = problem.constraints?.selfInductance;
        if (!sl) throw new Error('selfInductance 模型需要 selfInductance 约束配置');

        const L = sl.inductance; // H
        if (L <= 0) throw new Error('自感 inductance 必须为正');

        const R = sl.resistance; // Ohm
        if (R <= 0) throw new Error('电阻 resistance 必须为正');

        const E = sl.emf; // V
        if (E < 0) throw new Error('电动势 emf 不能为负');

        const mode = sl.mode;
        if (mode !== 'turnOn' && mode !== 'turnOff') {
            throw new Error(`selfInductance 模式必须是 'turnOn' 或 'turnOff'，收到: ${mode}`);
        }

        // 时间常数 tau = L/R
        const tau = L / R; // s

        // 稳态电流 I_ss = E/R
        const Iss = E / R; // A

        // 初始电流 (turnOff 时电流从 Iss 开始衰减)
        const I0 = mode === 'turnOff' ? Iss : 0;

        const sampleCount = problem.timeConfig.sampleCount ?? 500;
        const duration = problem.timeConfig.duration;
        const dt = duration / sampleCount;

        // 时间轨迹
        const trajectory: TrajectoryPoint[] = [];
        let maxI = 0;
        let maxU = 0;
        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            let i_t: number;
            let uL: number;
            if (mode === 'turnOn') {
                // i(t) = Iss * (1 - exp(-t/tau))
                i_t = Iss * (1 - Math.exp(-t / tau));
                // uL = E * exp(-t/tau)
                uL = E * Math.exp(-t / tau);
            } else {
                // i(t) = I0 * exp(-t/tau)
                i_t = I0 * Math.exp(-t / tau);
                // uL = -I0 * R * exp(-t/tau) = -E * exp(-t/tau)
                uL = -E * Math.exp(-t / tau);
            }
            maxI = Math.max(maxI, Math.abs(i_t));
            maxU = Math.max(maxU, Math.abs(uL));
            trajectory.push({
                t,
                position: { x: t, y: i_t }, // x: time (s), y: current (A)
                velocity: { x: 1, y: uL }, // y: inductor voltage (V)
                acceleration: { x: 0, y: 0 },
                kineticEnergy: 0.5 * L * i_t * i_t,
                potentialEnergy: 0
            });
        }

        // 图表 1: 电流 vs 时间
        const currentVsTime: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '电流 i (A)',
            xUnit: 's',
            yUnit: 'A',
            points: trajectory.map(p => ({
                x: parseFloat(p.t.toFixed(6)),
                y: parseFloat(p.position.y.toFixed(6))
            }))
        };

        // 图表 2: 电感电压 vs 时间
        const voltageVsTime: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '电感电压 uL (V)',
            xUnit: 's',
            yUnit: 'V',
            points: trajectory.map(p => ({
                x: parseFloat(p.t.toFixed(6)),
                y: parseFloat(p.velocity.y.toFixed(6))
            }))
        };

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '开关动作时刻',
                t: 0,
                position: { x: 0, y: mode === 'turnOn' ? 0 : I0 },
                velocity: { x: 0, y: mode === 'turnOn' ? E : -E },
                description:
                    mode === 'turnOn'
                        ? `通电瞬间: i=0, uL=${E}V (电感阻碍电流突变)`
                        : `断电瞬间: i=${I0.toFixed(4)}A, uL=${(-E).toFixed(3)}V (电感维持电流)`
            },
            {
                label: '1倍时间常数',
                t: tau,
                position: { x: tau, y: mode === 'turnOn' ? Iss * (1 - 1 / Math.E) : I0 / Math.E },
                velocity: { x: 0, y: mode === 'turnOn' ? E / Math.E : -E / Math.E },
                description:
                    mode === 'turnOn'
                        ? `i=${(Iss * (1 - 1 / Math.E)).toFixed(4)}A (达到 63.2% 稳态)`
                        : `i=${(I0 / Math.E).toFixed(4)}A (衰减到 36.8%)`
            },
            {
                label: '5倍时间常数 (稳态)',
                t: 5 * tau,
                position: { x: 5 * tau, y: mode === 'turnOn' ? Iss * (1 - Math.exp(-5)) : I0 * Math.exp(-5) },
                velocity: { x: 0, y: mode === 'turnOn' ? E * Math.exp(-5) : -E * Math.exp(-5) },
                description:
                    mode === 'turnOn'
                        ? `i=${(Iss * (1 - Math.exp(-5))).toFixed(4)}A (达到 99.3% 稳态)`
                        : `i=${(I0 * Math.exp(-5)).toFixed(6)}A (衰减到 0.7%)`
            }
        ];

        const warnings: string[] = [];
        if (tau > duration) {
            warnings.push(`时间常数 tau=${tau.toFixed(4)}s 大于模拟时长 ${duration}s，暂态过程未结束`);
        }
        if (tau < 1e-6) {
            warnings.push(`时间常数 tau=${tau.toExponential(2)}s 极小，暂态过程极快`);
        }
        if (mode === 'turnOff' && E > 100) {
            warnings.push(`断电时电感电压可达 ${E}V，开关电弧风险`);
        }
        if (Iss > 100) {
            warnings.push(`稳态电流 ${Iss.toFixed(2)}A 较大，注意线圈散热`);
        }

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '时间常数',
                formula: 'tau = L / R',
                calculation: `tau = ${L} / ${R} = ${tau.toFixed(6)} s`
            },
            {
                order: 2,
                description: '稳态电流',
                formula: 'I_ss = E / R',
                calculation: `I_ss = ${E} / ${R} = ${Iss.toFixed(4)} A`
            },
            {
                order: 3,
                description: mode === 'turnOn' ? '通电暂态' : '断电暂态',
                formula: mode === 'turnOn' ? 'i(t) = I_ss * (1 - exp(-t/tau))' : 'i(t) = I0 * exp(-t/tau)',
                calculation:
                    mode === 'turnOn'
                        ? `i(t) = ${Iss.toFixed(4)} * (1 - exp(-t/${tau.toFixed(6)}))`
                        : `i(t) = ${I0.toFixed(4)} * exp(-t/${tau.toFixed(6)})`
            },
            {
                order: 4,
                description: '电感电压',
                formula: mode === 'turnOn' ? 'uL = E * exp(-t/tau)' : 'uL = -E * exp(-t/tau)',
                result: mode === 'turnOn' ? `uL 从 ${E}V 指数衰减到 0` : `uL 从 ${-E}V 指数衰减到 0`
            }
        ];

        const conservedQuantities: ConservedQuantity[] = [];

        return {
            meta: {
                model: 'self-inductance',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                current_vs_time: currentVsTime,
                voltage_vs_time: voltageVsTime
            },
            diagnostics: {
                conservedQuantities,
                maxValues: {
                    L_H: L,
                    R_Ohm: R,
                    E_V: E,
                    tau_s: tau,
                    Iss_A: Iss,
                    I0_A: I0,
                    maxCurrent_A: maxI,
                    maxVoltage_V: maxU
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `自感 ${mode === 'turnOn' ? '通电' : '断电'}: L=${L}H, R=${R}Ohm, E=${E}V, tau=${tau.toFixed(6)}s, I_ss=${Iss.toFixed(4)}A`,
                steps,
                formulas: [
                    {
                        name: '时间常数',
                        formula: 'tau = L/R',
                        variables: {
                            L: { value: L, unit: 'H' },
                            R: { value: R, unit: 'Ohm' },
                            tau: { value: tau, unit: 's' }
                        }
                    },
                    {
                        name: mode === 'turnOn' ? '通电电流' : '断电电流',
                        formula: mode === 'turnOn' ? 'i=E/R*(1-e^{-t/tau})' : 'i=I0*e^{-t/tau}',
                        variables: {
                            E: { value: E, unit: 'V' },
                            R: { value: R, unit: 'Ohm' },
                            tau: { value: tau, unit: 's' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
