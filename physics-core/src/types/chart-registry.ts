/**
 * charts 键登记表 + 类型化访问层 (M3 前置 B1 最小切片, #82 · D15 用户拍板)
 *
 * 背景: SimulationResult.charts 是「字符串协议」——渲染层靠字符串键读引擎输出,
 * 键名写错只能靠运行时 undefined 暴露 (AGENTS.md 陷阱警告即为此而生:
 * lc-oscillator 返回 x_t/y_t/ke_t/pe_t 语义是 q_t/i_t/Ee_t/Em_t)。
 * 本文件把「哪个模型产出哪些 charts 键」提升到类型层:
 *   - chartsOf(result, model)  → 按模型收窄的 charts 视图, 逐键编译期检查 + IDE 提示;
 *   - getChart(result, model, key) → 单键取值, 键名拼错 tsc 直接报错;
 *   - MODEL_CHART_KEYS → 事实登记表 (哪个模型可产出哪些键, 含单位/语义就地注释)。
 *
 * 切片范围 (硬性要求 = #61 差集守卫豁免表 22 场景的迁移消费面):
 *   - M3 五批 (#62–#66) 22 场景对应的 22 个模型;
 *   - 渲染层存量 `as unknown as`/`as Record` 强转的 9 个场景模型 (顺带迁移面, #82 鼓励项):
 *     em-induction / ac-current / em-damping / mutual-inductance / lc-oscillator /
 *     light-control-switch / liquid-crystal / bohr-model / sound-waveform。
 * 共 31 个模型。其余模型不受影响: ModelCharts 对未登记模型回退为全量 charts,
 * 与既有直读口径等价; 后续按需增登记即可, 无需一次性全量 schema 化 (远景 B 其余部分)。
 *
 * 登记事实来源: 123 场景 default 参数 solveProblem 运行时探针 + 模型源码复核
 * (2026-10-07 @ main 8d7293e, 探针覆盖全部 123 场景零失败)。
 * 条件产出的键 (如 thermistor.y_t 仅 NTC 分支) 一并登记 ——
 * 真实性守卫 (visualization/tests/accuracy/typed-charts.test.ts) 只查「产出 ⊆ 登记」单向。
 */

import type { ModelType } from './problem.js';
import type { ChartSeries, SimulationResult } from './result.js';

/** SimulationResult.charts 的全部键 (引擎输出协议键名联合, 含带连字符的示意键) */
export type ChartKey = keyof SimulationResult['charts'];

/**
 * 每模型可产出的 charts 键登记表。键序无关; 单位/语义注释写在各键行内,
 * 供迁移消费者就地取用 (与 ChartSeries 自带的 xLabel/yLabel/xUnit/yUnit 互补)。
 */
export const MODEL_CHART_KEYS = {
    // —— M3 批次 1: 光学波动 + 波粒二象 (#62) ——
    'diffraction-grating': [
        'grating_intensity', // 衍射光强图样 (x: 级次/角度, y: 相对强度)
        'spectrum_curve' // 光谱波段分布
    ],
    polarization: [
        'malus_curve', // 马吕斯曲线 I-I₀cos²θ (x: 夹角, y: 透射光强)
        'polar_curve', // 极坐标透射光强
        'multi_scan' // 多片组合扫描
    ],
    interference: [
        'x_t', // 干涉强度分布曲线 I(x)
        'y_t' // 干涉级次曲线
    ],
    doppler: [
        'fprime_vs_speed', // 观测频率 f'-v_s 关系
        'fprime_vs_theta' // 观测频率 f'-θ 关系
    ],
    photoelectric: [
        'x_t', // 遏止电压-频率 Uc-ν 直线 (斜率 h/e)
        'y_t' // 最大初动能-频率 Ek-ν 直线
    ],
    // —— M3 批次 2: 传感器元件 (#63) ——
    'hall-effect': [
        'x_t', // 霍尔电压 UH 随扫描量变化
        'y_t', // 霍尔电压 (绝对值/副通道)
        'v_t' // 辅助扫描通道
    ],
    thermistor: [
        'x_t', // R-T 电阻-温度曲线 (NTC: Ω-℃)
        'y_t' // lnR-1/T 直线 (仅 NTC 分支, 验证指数律)
    ],
    photoresistor: [
        'x_t', // 电阻-光照曲线 R-E (Ω-lx)
        'y_t', // 工作点副通道
        'v_t' // 辅助扫描通道
    ],
    'strain-gauge': [
        'x_t', // ΔR/R-ε (应变-电阻相对变化)
        'y_t' // 电桥输出电压-应变
    ],
    // —— M3 批次 3: 热学定律 (#64) ——
    'joule-electrical': [
        'x_t', // 焦耳热 Q-t 累积曲线
        'y_t', // 温升 ΔT-t
        'v_t' // 功率/辅助通道
    ],
    'perpetuum-mobile': [
        'x_t', // 热机循环 p-V/能量曲线
        'theta_t', // 循环相位角
        'p_t' // 循环压强
    ],
    'heat-direction': [
        'x_t', // 热流量-时间/温差
        'y_t' // 温差-时间
    ],
    'adiabatic-compression': [
        'x_t', // 绝热过程 p-V 曲线
        'y_t', // 温度-体积
        'v_t' // 压强-时间/辅助通道
    ],
    'energy-transformation': [
        'x_t', // 输入能量-时间
        'y_t', // 输出能量-时间
        'energy_t', // 能量对比曲线
        'v_t' // 效率/辅助通道
    ],
    // —— M3 批次 4: 气体分子 / 静能 / 核 (#65) ——
    'gas-law': [
        'x_t' // 过程曲线 (等温/等压/等容 p-V 等)
    ],
    'liquid-mixing': [
        'x_t', // 混合温度-时间
        'y_t' // 温度对比/辅助通道
    ],
    'capacitor-charge': [
        'x_t', // Uc-t 充放电曲线 (语义主通道)
        'y_t', // I-t 电流曲线 (语义主通道)
        'vx_t', // Q-t 电荷曲线 (语义主通道)
        'v_t', // lnUc-t 放电直线 (语义主通道)
        'Uc_t', // 电容电压-时间 (指数曲线)
        'I_t', // 电流-时间 (指数衰减)
        'Q_t', // 电荷-时间 (充电累积)
        'lnUc_t' // ln(Uc)-t (放电直线, 斜率=−1/τ)
    ],
    'radioactive-decay': [
        'x_t', // N-t 未衰变核数曲线
        'y_t' // A-t 活度曲线
    ],
    // —— M3 批次 5 (收口批): 电路 + 测量仪器 (#66) ——
    'load-voltage': [
        'x_t', // U-R 路端电压曲线 (语义主通道)
        'y_t', // U-I 直线 (截距=E, 斜率=−r)
        'vx_t', // I-R 曲线 (语义主通道)
        'U_R', // U-R 曲线 (E·R/(R+r))
        'U_I', // U-I 直线
        'I_R' // I-R 曲线 (E/(R+r))
    ],
    'resistance-law': [
        'x_t', // R-L 电阻-长度直线 (语义主通道)
        'y_t', // R-1/S 直线 (语义主通道)
        'vx_t', // 材料对比 (语义主通道)
        'R_L', // R-L 直线
        'R_invS', // R-1/S 直线
        'R_material' // 材料比较 (Cu/Fe/Nichrome)
    ],
    'vernier-caliper': [
        'x_t', // 读数演示辅助曲线
        'y_t', // 读数演示辅助曲线
        'static-diagram' // 游标卡尺静态示意图
    ],
    micrometer: [
        'x_t', // 读数演示辅助曲线
        'y_t', // 读数演示辅助曲线
        'static-diagram' // 螺旋测微器静态示意图
    ],
    // —— 渲染层存量强转场景 (顺带迁移面) ——
    'em-induction': [
        'x_t', // 单匝磁通 Φ(t) (mWb; HUD 总磁通需乘匝数 N)
        'y_t' // 感生电动势 ε(t) (mV)
    ],
    'ac-current': [
        'x_t', // 原边电动势 e(t) (ms/V, 2 周期)
        'y_t' // 副边电压 u2(t)
    ],
    'em-damping': [
        'angular_velocity_vs_time' // 角速度-时间 (电磁阻尼衰减振荡)
    ],
    'mutual-inductance': [
        'primary_current_vs_time', // 原边电流 I1(t) (A)
        'secondary_emf_vs_time' // 副边电动势 E2(t) (V)
    ],
    'lc-oscillator': [
        'x_t', // ⚠️ 键名≠语义: 电容电荷 q(t) (μC) —— AGENTS.md「迁移前先读模型源码」陷阱的原型
        'y_t', // ⚠️ 键名≠语义: 电流 i(t) (mA)
        'ke_t', // ⚠️ 键名≠语义: 电场能 Ee(t) (μJ)
        'pe_t' // ⚠️ 键名≠语义: 磁场能 Em(t) (μJ)
    ],
    'light-control-switch': [
        'x_t', // 24h 照度曲线 (h/lux)
        'y_t', // 开关状态 (h/0·1)
        'v_t' // 辅助通道
    ],
    'liquid-crystal': [
        'x_t', // 温度/电压扫描主通道
        'y_t', // 副通道
        'v_t' // 辅助通道
    ],
    'bohr-model': [
        'x_t', // 能级图 (n, Eₙ = E₁/n²)
        'y_t' // 谱线波长 (按 n₂ 升序, nm)
    ],
    'sound-waveform': [
        'waveform_t', // 时域波形快照 y-x (ms 轴)
        'envelope_t' // 包络
    ]
} as const satisfies { [M in ModelType]?: readonly ChartKey[] };

/** 已登记 charts 键的模型集合 */
export type RegisteredModel = keyof typeof MODEL_CHART_KEYS & ModelType;

/**
 * 模型 M 的 charts 视图类型: 已登记 → 仅登记键的 Pick 子集 (编译期键名约束);
 * 未登记 → 全量 charts (与既有直读口径等价, 不强迫一次性登记全部模型)。
 */
export type ModelCharts<M extends ModelType> = M extends RegisteredModel
    ? Pick<SimulationResult['charts'], (typeof MODEL_CHART_KEYS)[M][number]>
    : SimulationResult['charts'];

/**
 * 按模型收窄 charts: 返回仅含该模型登记键的 charts 视图, 逐键获得编译期检查与 IDE 提示。
 * 模型不匹配 (result 来自其他模型) 返回 undefined —— 与渲染层「无引擎结果回退自算」的防御惯例一致。
 *
 * @example
 * const charts = chartsOf(result, 'polarization'); // 仅 malus_curve/polar_curve/multi_scan
 * const malus = charts?.malus_curve;               // ✅ 编译期检查
 * const typo = charts?.malus_curv;                 // ❌ tsc 报错
 */
export function chartsOf<M extends ModelType>(result: SimulationResult, model: M): ModelCharts<M> | undefined {
    // 对不完整/损坏的 result 容错 (缺 meta → undefined): 渲染消费端契约要求
    // 「空/畸形引擎结果回退自算不崩」(single-source-contract 空结果用例), 访问层延续该语义。
    if (!result?.meta || result.meta.model !== model) return undefined;
    return result.charts as ModelCharts<M>;
}

/**
 * 单键类型化取值: getChart(result, 'polarization', 'malus_curve')。
 * 键名约束 = 该模型登记键; 拼错键名 / 模型名拼错 (非 ModelType) 均为编译期错误。
 * 模型不匹配返回 undefined (同 chartsOf)。
 */
export function getChart<M extends ModelType>(
    result: SimulationResult,
    model: M,
    key: keyof ModelCharts<M>
): ChartSeries | undefined {
    // 泛型条件类型索引展开含 string 签名, 显式收窄到 ChartSeries | undefined
    return chartsOf(result, model)?.[key] as ChartSeries | undefined;
}
