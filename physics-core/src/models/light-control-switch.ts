import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 光控开关约束 — 选必二 传感器 (光敏电阻 + 三极管 + 继电器)
 *
 * 物理原理:
 *   光敏电阻 (LDR / CdS 光导管):
 *     - 光照强度 L ↑ → 光敏电阻 R_LDR ↓ (半导体光电导效应)
 *     - 典型: 白天 R_LDR ≈ 1~10 kΩ, 夜晚 R_LDR ≈ 1~10 MΩ
 *
 *   分压电路:
 *     V_B = E · R_LDR / (R_LDR + R_fix)
 *     - 白天: R_LDR 小 → V_B 低 → 三极管截止 → 继电器释放 → 灯灭
 *     - 夜晚: R_LDR 大 → V_B 高 → 三极管导通 → 继电器吸合 → 灯亮
 *
 *   注: 实际路灯控制逻辑是 "天黑 → 灯亮", 与上述一致
 *
 * 参数:
 *   - lightIntensity: 光照强度 (lux), 白天 10000~100000 lux, 夜晚 0.001~1 lux
 *   - threshold: 触发阈值 (lux), 默认 10 lux
 *   - Rfix: 分压电阻 (Ω), 默认 10 kΩ
 *   - Esupply: 电源电压 (V), 默认 12 V
 *   - Vbe_on: 三极管导通阈值 (V), 默认 0.7 V
 */
/**
 * 光控开关模型 — 选必二 传感器 (光敏电阻 + 三极管驱动 + 继电器)
 *
 * 教学要点:
 *   1. 光敏电阻: 光照强度 → 电阻值 (非线性, 近似 R ∝ L^(-gamma))
 *   2. 分压电路: 将 R 变化 → V_B 变化
 *   3. 三极管开关: V_B > Vbe_on → 导通 → 继电器线圈得电
 *   4. 继电器: 小电流控制大电流负载 (路灯)
 *
 * 应用场景:
 *   - 路灯自动开关
 *   - 楼道声光控延时灯
 *   - 光控窗帘
 */
/** 光敏电阻幂律指数 γ */
const LDR_GAMMA = 0.7;
/** 默认暗阻 R_dark (Ω) */
const DEFAULT_RDARK = 1e6;
/** 默认分压固定电阻 R_fix (Ω) */
const DEFAULT_RFIX = 10000;
/** 默认电源电压 E (V) */
const DEFAULT_ESUPPLY = 12;
/** 默认硅三极管导通门限 V_be,on (V) */
const DEFAULT_VBE_ON = 0.7;
/** 默认校准临界照度 L_crit (lux): 默认 E=12V, VbeOn=0.7V, Rfix=10kΩ, Rdark=1MΩ 时在 10 lx 翻转 */
const DEFAULT_CALIB_L_CRIT = 10;
const DEFAULT_CALIB_R_CRIT = (DEFAULT_RFIX * DEFAULT_VBE_ON) / (DEFAULT_ESUPPLY - DEFAULT_VBE_ON);
/** 饱和幂律拐点照度 L_knee (lux): R_LDR(L) = R_dark / (1 + (L / L_knee)^γ) */
const LDR_L_KNEE = DEFAULT_CALIB_L_CRIT / Math.pow(DEFAULT_RDARK / DEFAULT_CALIB_R_CRIT - 1, 1 / LDR_GAMMA);

/**
 * 计算有界饱和幂律光敏电阻阻值 R_LDR (Ω)
 *
 * R_LDR(L) = R_dark / (1 + (L / L_knee)^γ)
 * - L = 0 时安全返回有限暗阻 R_dark，避免 0^(-γ) 产生 Infinity / NaN
 * - L >> L_knee 时近似服从 R ∝ L^(-γ) (γ = 0.7)
 */
export function computeRldr(L: number, Rdark = DEFAULT_RDARK): number {
    const safeL = Math.max(0, L);
    return Rdark / (1 + Math.pow(safeL / LDR_L_KNEE, LDR_GAMMA));
}

/**
 * 解析反解分压电路等效临界照度 L_crit (lux)
 *
 * 当且仅当 V_B(L) = E · R_LDR(L) / (R_LDR(L) + R_fix) >= VbeOn 时导通亮灯，
 * 等价于 R_LDR(L) >= R_crit = R_fix · VbeOn / (E - VbeOn)，即 L <= L_crit。
 * 当 E <= VbeOn 或 R_crit >= R_dark 时电路永不导通，安全返回 0。
 */
export function computeCriticalLux(E: number, VbeOn: number, Rfix: number, Rdark = DEFAULT_RDARK): number {
    if (E <= VbeOn || Rfix <= 0 || VbeOn <= 0 || Rdark <= 0) return 0;
    const rCrit = (Rfix * VbeOn) / (E - VbeOn);
    if (rCrit >= Rdark) return 0;
    return LDR_L_KNEE * Math.pow(Rdark / rCrit - 1, 1 / LDR_GAMMA);
}

export class LightControlSwitchModel extends PhysicsModelBase {
    readonly name = '光控开关';
    readonly version = '1.1.0';
    readonly description = '光敏电阻 + 分压 + 三极管驱动 + 继电器 光控开关原理';
    readonly modelType = 'light-control-switch' as const;
    readonly assumptions = [
        '光敏电阻采用有界饱和幂律模型: R_LDR(L) = R_dark / (1 + (L / L_knee)^γ), γ=0.7, L=0 时 R_LDR = R_dark',
        '以分压电路 V_B = E · R_LDR / (R_LDR + R_fix) ≥ Vbe_on 作为唯一开关判定真源',
        '三极管为理想开关: V_B ≥ Vbe_on → 饱和导通; V_B < Vbe_on → 截止，继电器无回差',
        '24h 光照强度按昼间半正弦、夜间 0.5 lx 分段变化模拟日夜交替'
    ];
    readonly applicableRange = '光照: 0~200000 lux; 分压电阻: 1k~1MΩ; 电源: 5~24 V';
    readonly errorSources = [
        '光敏电阻响应延迟 (CdS 约 100 ms)',
        '温度对暗电阻影响大',
        '灰尘/老化导致灵敏度下降',
        '三极管漏电流导致弱光下误触发'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        {
            name: 'lightIntensity',
            description: '光照强度 (lux)',
            unit: 'lux',
            required: true,
            min: 0,
            max: 200000
        }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ic = problem.constraints?.lightControlSwitch;
        if (!ic) throw new Error('light-control-switch 模型需要 lightControlSwitch 约束配置');

        const L = ic.lightIntensity;
        const Rfix = ic.Rfix ?? DEFAULT_RFIX;
        const E = ic.Esupply ?? DEFAULT_ESUPPLY;
        const VbeOn = ic.VbeOn ?? DEFAULT_VBE_ON;
        const Rdark = ic.Rdark ?? DEFAULT_RDARK;
        const Rbright = ic.Rbright ?? 5000;
        const timeSpanH = ic.timeSpanH ?? 24;
        const sampleCount = ic.sampleCount ?? 240;

        // — 光敏电阻 R_LDR 计算 (有界饱和幂律模型, L=0 安全返回 R_dark) —
        const rLdr = computeRldr(L, Rdark);
        // — 分压 V_B (唯一开关判定真源) —
        const vB = rLdr + Rfix > 0 ? (E * rLdr) / (rLdr + Rfix) : 0;
        // — 电路等效临界阻值与临界照度 L_crit —
        const rCrit = E > VbeOn ? (Rfix * VbeOn) / (E - VbeOn) : Infinity;
        const criticalLux = computeCriticalLux(E, VbeOn, Rfix, Rdark);
        // — 三极管状态 —
        const transistorOn = vB >= VbeOn;
        // — 继电器吸合 —
        const relayEngaged = transistorOn;
        // — 灯亮 —
        const lightOn = relayEngaged;

        // — 图1: 光照强度 vs 时间 (模拟 24h 变化) —
        const lightVsTime: ChartSeries = {
            xLabel: '时间 t (h)',
            yLabel: '光照强度 L (lux)',
            xUnit: 'h',
            yUnit: 'lux',
            points: []
        };
        // 光照模型: 白天 6~18h 正弦, 夜晚 0.5 lux
        for (let i = 0; i <= sampleCount; i++) {
            const t = (timeSpanH * i) / sampleCount;
            const tMod = t % 24;
            let Lval: number;
            if (tMod >= 6 && tMod <= 18) {
                const phase = ((tMod - 6) / 12) * Math.PI;
                Lval = 50000 * Math.sin(phase) + 100;
            } else {
                Lval = 0.5;
            }
            lightVsTime.points.push({
                x: parseFloat(t.toFixed(2)),
                y: parseFloat(Lval.toFixed(2))
            });
        }

        // — 图2: 开关状态 vs 时间 (复用 computeRldr + 分压真源) —
        const switchStateVsTime: ChartSeries = {
            xLabel: '时间 t (h)',
            yLabel: '开关状态 (1=灯亮, 0=灯灭)',
            xUnit: 'h',
            yUnit: '',
            points: []
        };
        for (let i = 0; i <= sampleCount; i++) {
            const t = (timeSpanH * i) / sampleCount;
            const tMod = t % 24;
            let Lval: number;
            if (tMod >= 6 && tMod <= 18) {
                const phase = ((tMod - 6) / 12) * Math.PI;
                Lval = 50000 * Math.sin(phase) + 100;
            } else {
                Lval = 0.5;
            }
            const r = computeRldr(Lval, Rdark);
            const v = r + Rfix > 0 ? (E * r) / (r + Rfix) : 0;
            const on = v >= VbeOn ? 1 : 0;
            switchStateVsTime.points.push({
                x: parseFloat(t.toFixed(2)),
                y: on
            });
        }

        // — 图3: 三极管基极电流 vs 光照 (复用 computeRldr) —
        const transistorCurrentVsLight: ChartSeries = {
            xLabel: '光照强度 L (lux)',
            yLabel: '基极电流 I_B (μA)',
            xUnit: 'lux',
            yUnit: 'μA',
            points: []
        };
        const lMin = 0.01;
        const lMax = 100000;
        for (let i = 0; i <= 100; i++) {
            const Lval = lMin * Math.pow(lMax / lMin, i / 100);
            const r = computeRldr(Lval, Rdark);
            const v = r + Rfix > 0 ? (E * r) / (r + Rfix) : 0;
            const iB = v >= VbeOn ? ((v - VbeOn) / 1000) * 1e6 : 0; // μA (假设基极电阻 1k)
            transistorCurrentVsLight.points.push({
                x: parseFloat(Lval.toFixed(4)),
                y: parseFloat(iB.toFixed(4))
            });
        }

        const nightR = computeRldr(0.5, Rdark);
        const nightOn = (E * nightR) / (nightR + Rfix) >= VbeOn ? 1 : 0;
        const dayR = computeRldr(50000, Rdark);
        const dayOn = (E * dayR) / (dayR + Rfix) >= VbeOn ? 1 : 0;

        // — 关键点 —
        const keyframes: Keyframe[] = [
            {
                label: '当前状态',
                t: 0,
                position: { x: L, y: lightOn ? 1 : 0 },
                velocity: { x: 0, y: 0 },
                description: `光照=${L}lux, R_LDR=${rLdr.toFixed(1)}Ω, V_B=${vB.toFixed(3)}V, 三极管=${transistorOn ? '导通' : '截止'}, 灯=${lightOn ? '亮' : '灭'}`
            },
            {
                label: '阈值点',
                t: 0,
                position: { x: criticalLux, y: 0.5 },
                velocity: { x: 0, y: 0 },
                description:
                    criticalLux > 0
                        ? `电路等效临界照度 L_crit=${criticalLux.toFixed(2)}lux (R_crit=${rCrit.toFixed(1)}Ω, V_B=Vbe_on=${VbeOn}V), L≤L_crit 导通亮灯, L>L_crit 截止灭灯`
                        : `当前电源/分压参数下 V_B 最高 ${(E * Rdark) / (Rdark + Rfix)}V < Vbe_on=${VbeOn}V, 等效临界照度 L_crit=0lux (永不导通)`
            },
            {
                label: '白天典型',
                t: 0,
                position: { x: 50000, y: dayOn },
                velocity: { x: 0, y: 0 },
                description: `白天光照强 (50000lx) → R_LDR=${dayR.toFixed(1)}Ω → 三极管${dayOn ? '导通' : '截止'} → 灯${dayOn ? '亮' : '灭'}`
            },
            {
                label: '夜晚典型',
                t: 0,
                position: { x: 0.5, y: nightOn },
                velocity: { x: 0, y: 0 },
                description: `夜晚光照弱 (0.5lx) → R_LDR=${nightR.toFixed(0)}Ω → 三极管${nightOn ? '导通' : '截止'} → 灯${nightOn ? '亮' : '灭'}`
            }
        ];

        // — 轨迹 (L 为 x, 灯状态为 y, 复用 computeRldr) —
        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= 100; i++) {
            const Lval = lMin * Math.pow(lMax / lMin, i / 100);
            const r = computeRldr(Lval, Rdark);
            const v = r + Rfix > 0 ? (E * r) / (r + Rfix) : 0;
            const on = v >= VbeOn ? 1 : 0;
            trajectory.push({
                t: 0,
                position: { x: Lval, y: on },
                velocity: { x: 0, y: 0 }
            });
        }

        const warnings: string[] = [];
        if (L > 150000) warnings.push('光照强度极高, 可能超出传感器量程');
        if (E <= VbeOn || rCrit >= Rdark) {
            warnings.push('电源电压过低或分压电阻过大, 即使完全黑暗也无法达到三极管导通门限');
        }

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '光敏电阻特性 (有界饱和幂律)',
                formula: 'R_LDR(L) = R_dark / (1 + (L / L_knee)^γ), γ = 0.7',
                calculation: `R_LDR(${L}) = ${Rdark} / (1 + (${L} / ${LDR_L_KNEE.toExponential(3)})^0.7) = ${rLdr.toFixed(1)}Ω`,
                result: 'L = 0 时 R_LDR 趋于有限暗阻 R_dark；光照越强 → R_LDR 越小'
            },
            {
                order: 2,
                description: '分压电路求基极电压 (唯一开关真源)',
                formula: 'V_B = E · R_LDR / (R_LDR + R_fix)',
                calculation: `V_B = ${E} × ${rLdr.toFixed(1)} / (${rLdr.toFixed(1)} + ${Rfix}) = ${vB.toFixed(3)}V`,
                result: `V_B=${vB.toFixed(3)}V ${vB >= VbeOn ? '≥' : '<'} Vbe_on=${VbeOn}V`
            },
            {
                order: 3,
                description: '反解电路等效临界照度与三极管开关判定',
                formula: 'R_crit = R_fix · Vbe_on / (E − Vbe_on),  L_crit = L_knee · (R_dark / R_crit − 1)^(1/γ)',
                calculation: `R_crit=${Number.isFinite(rCrit) ? rCrit.toFixed(1) : '∞'}Ω, L_crit=${criticalLux.toFixed(2)}lux; 当前 L=${L}lux → 三极管${transistorOn ? '导通' : '截止'} → 灯${lightOn ? '亮' : '灭'}`
            },
            {
                order: 4,
                description: '应用说明',
                formula: '调节 R_fix 或电源电压 E 可改变电路等效临界照度 L_crit',
                result: '光控开关 = 光敏传感器 + 分压驱动电路 + 继电器与路灯负载'
            }
        ];

        const formulas: FormulaUsage[] = [
            {
                name: '有界光敏电阻',
                formula: 'R_LDR(L) = R_dark / (1 + (L / L_knee)^gamma)',
                variables: {
                    R_dark: { value: Rdark, unit: 'Ω' },
                    L: { value: L, unit: 'lux' },
                    L_knee: { value: parseFloat(LDR_L_KNEE.toExponential(4)), unit: 'lux' },
                    gamma: { value: LDR_GAMMA, unit: '' },
                    R_LDR: { value: parseFloat(rLdr.toFixed(2)), unit: 'Ω' }
                }
            },
            {
                name: '分压电路',
                formula: 'V_B = E * R_LDR / (R_LDR + R_fix)',
                variables: {
                    E: { value: E, unit: 'V' },
                    R_LDR: { value: parseFloat(rLdr.toFixed(2)), unit: 'Ω' },
                    R_fix: { value: Rfix, unit: 'Ω' },
                    V_B: { value: parseFloat(vB.toFixed(3)), unit: 'V' }
                }
            },
            {
                name: '三极管开关与等效临界照度',
                formula: 'BJT_ON = (V_B >= Vbe_on),  L_crit = L_knee * (R_dark / R_crit - 1)^(1/gamma)',
                variables: {
                    V_B: { value: parseFloat(vB.toFixed(3)), unit: 'V' },
                    Vbe_on: { value: VbeOn, unit: 'V' },
                    L_crit: { value: parseFloat(criticalLux.toFixed(2)), unit: 'lux' },
                    BJT_ON: { value: transistorOn ? 1 : 0, unit: '1=导通' },
                    light: { value: lightOn ? 1 : 0, unit: '1=灯亮' }
                }
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: lightVsTime,
                y_t: switchStateVsTime,
                v_t: transistorCurrentVsLight
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    lightIntensity: L,
                    criticalLux,
                    threshold: criticalLux,
                    rCrit: Number.isFinite(rCrit) ? rCrit : 0,
                    rLdr,
                    vB,
                    transistorOnFlag: transistorOn ? 1 : 0,
                    relayEngagedFlag: relayEngaged ? 1 : 0,
                    lightOnFlag: lightOn ? 1 : 0,
                    Rdark,
                    Rbright,
                    Rfix,
                    Esupply: E,
                    VbeOn
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `光控开关: L=${L}lux (等效临界 L_crit=${criticalLux.toFixed(2)}lux), R_LDR=${rLdr.toFixed(1)}Ω, V_B=${vB.toFixed(3)}V, 三极管=${transistorOn ? '导通' : '截止'}, 灯=${lightOn ? '亮' : '灭'}`,
                steps,
                formulas
            },
            errors: [],
            warnings
        };
    }

    /**
     * 纯传感器建模: 本文件不读 `problem.bodies`, 结果只由 constraints 与参数决定,
     * 故取消基类「至少需要一个物理物体」这一项要求 (保留参数范围与 NaN/Inf 守卫, #85)。
     * 若将来改成用 bodies 建模, 必须同时删掉本 override 让校验重新生效。
     */
    protected requiresBodies(): boolean {
        return false;
    }
}
