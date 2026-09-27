import type { PhysicsProblem, ModelType } from '../types/problem.js';
import type { SimulationResult } from '../types/result.js';
import type { ParameterSpec, ValidationResult, PhysicalBody } from '../types/common.js';
import { UnsupportedModelError, ParameterOutOfRangeError, PhysicsError } from '../errors/index.js';

/**
 * performance.now() 在 Node 16+ 与所有浏览器均为全局可用；
 * 此处提供零依赖的最小类型声明，避免引入 DOM lib 污染。
 */
declare const performance: { now(): number };

/**
 * 从 problem 中解析某个声明式参数名对应的数值。
 *
 * `requiredParameters` 是**声明式**元数据 (name/description/min/max)，
 * 而 `PhysicsProblem` 把实际数值分散在三处，二者靠**同名约定**关联。
 * 查找顺序按"最具体优先"，避免模型自身的参数字段被 timeConfig 抢占：
 *   1. constraints.* 的一层扁平字段 (绝大多数模型)
 *   2. problem 顶层 (少数模型自带顶层字段)
 *   3. timeConfig (如 `duration`)
 *
 * 约定不成立时返回 undefined，调用方**跳过**该参数 ——
 * 宁可漏检，也不可因解析不出值而误报非法。
 */
function resolveParameterValue(problem: PhysicsProblem, name: string): number | undefined {
    // 1. constraints 的一层扁平字段 (模型自身参数, 最具体)
    for (const value of Object.values(problem.constraints ?? {})) {
        if (value === null || typeof value !== 'object') continue;
        const field = (value as Record<string, unknown>)[name];
        if (typeof field === 'number') return field;
    }

    // 2. problem 顶层
    const top = (problem as unknown as Record<string, unknown>)[name];
    if (typeof top === 'number') return top;

    // 3. timeConfig (如 duration)
    const tc = (problem.timeConfig as unknown as Record<string, unknown>)[name];
    if (typeof tc === 'number') return tc;

    // 4. body 派生量 (无歧义的物理命名约定, 见 BODY_DERIVED)
    const derived = BODY_DERIVED[name];
    if (derived) {
        const body = problem.bodies?.[0];
        if (body) return derived(body);
    }

    return undefined;
}

/**
 * 由 bodies[0] 派生的参数名约定。
 *
 * 少数模型 (如 orbital) 的 `requiredParameters` 声明了 `radius` / `v0`,
 * 但实际取值不在 constraints 中 — 而是由初始 body 的位置/速度模长决定
 * (见 scenes/mechanics/orbital.ts: `position: {x: r, y: 0}`, `velocity: {x: 0, y: v}`)。
 * 这些命名在物理语境下无歧义, 故在此显式登记, 使其 min/max 声明真正可执行。
 */
const BODY_DERIVED: Record<string, ((body: PhysicalBody) => number) | undefined> = {
    /** 初始位置到原点的距离 (m) */
    radius: body => Math.hypot(body.position.x, body.position.y),
    /** 初始速率 (m/s) */
    v0: body => Math.hypot(body.velocity.x, body.velocity.y)
};

/** 物理模型抽象基类 */
export abstract class PhysicsModelBase {
    abstract readonly name: string;
    abstract readonly version: string;
    abstract readonly description: string;
    abstract readonly modelType: ModelType;
    abstract readonly assumptions: string[];
    abstract readonly applicableRange: string;
    abstract readonly errorSources: string[];
    abstract readonly requiredParameters: ParameterSpec[];

    /** 求解 */
    abstract solve(problem: PhysicsProblem): SimulationResult;

    /**
     * 该模型是否需要参数校验.
     * 纯传感器 / 场模型 (无 bodies, 仅依赖 constraints) 可 override 返回 false,
     * 跳过基类中 bodies / mass 等与其无关的校验项. 默认 true — 执行完整校验.
     */
    protected requiresValidation(): boolean {
        return true;
    }

    /**
     * 是否对 `requiredParameters` 声明的 min/max 做**硬拦截** (默认 true).
     *
     * 绝大多数模型的声明范围即物理有效域, 越界应直接拒绝 (防 Inf/NaN 下游污染)。
     * 但少数模型刻意支持"越界仍有意义"的软限程语义, 由 solve() 内部
     * 产出 `warnings` / `rangeCheck` 表达, 硬拦截会抹掉这些教学语义:
     *   - micrometer      厚度超 25mm 需产出"量程"告警而非抛错
     *   - multimeter      Rx→∞ (1e9 Ohm) 需产出近零偏转
     *   - moon-earth-test 异常 R/T 需产出 rangeCheck.withinRange=false
     *   - reaction-time   h 趋 0 需产出 t→0 的极限行为
     *   - sound-waveform  频率超 20kHz 需产出"超出人耳听阈"告警
     *   - radioactive-decay 初始原子数可达 1e8 量级 (差分测试按此取样)
     *
     * override 返回 false 即跳过范围拦截; 非有限值守卫始终生效。
     */
    protected enforcesParameterRanges(): boolean {
        return true;
    }

    /**
     * 按 `requiredParameters` 声明的 min/max 校验参数取值.
     *
     * 这是所有除零 / NaN / Inf 类缺陷的统一拦截点: 模型只需在
     * `requiredParameters` 里如实声明取值范围, 无需在 `solve()` 内重复写守卫.
     * 解析不出数值的参数名 (约定未覆盖) 一律跳过, 不误报.
     *
     * 供基类 validate() 与自定义 validate() 复用.
     */
    protected validateParameterRanges(problem: PhysicsProblem): Array<{
        code: string;
        message: string;
        param: string;
        value?: number;
        min?: number;
        max?: number;
    }> {
        const errors: Array<{
            code: string;
            message: string;
            param: string;
            value?: number;
            min?: number;
            max?: number;
        }> = [];
        const enforce = this.enforcesParameterRanges();
        for (const spec of this.requiredParameters) {
            const value = resolveParameterValue(problem, spec.name);
            if (value === undefined) continue;

            // 非有限值守卫: 即使 min/max 声明遗漏, NaN/Inf 一律拒绝 (防静默污染下游公式)
            if (!Number.isFinite(value)) {
                errors.push({
                    code: 'NON_FINITE_PARAMETER',
                    message: `参数 "${spec.name}" (${spec.description}) 必须是有限数，当前值: ${value}`,
                    param: spec.name,
                    value
                });
                continue;
            }

            // 软限程模型: 只告警不拦截, 保留 solve() 内部的 warnings / rangeCheck 语义
            if (!enforce) continue;

            const min = spec.min;
            if (min !== undefined && (spec.exclusiveMin ? value <= min : value < min)) {
                const bound = spec.exclusiveMin ? '不能小于等于' : '不能小于';
                errors.push({
                    code: 'PARAMETER_OUT_OF_RANGE',
                    message: `参数 "${spec.name}" (${spec.description}) ${bound} ${min}，当前值: ${value}`,
                    param: spec.name,
                    value,
                    min,
                    max: spec.max
                });
            } else if (spec.max !== undefined && value > spec.max) {
                errors.push({
                    code: 'PARAMETER_OUT_OF_RANGE',
                    message: `参数 "${spec.name}" (${spec.description}) 不能大于 ${spec.max}，当前值: ${value}`,
                    param: spec.name,
                    value,
                    min: spec.min,
                    max: spec.max
                });
            }
        }
        return errors;
    }

    /** 参数校验 */
    validate(problem: PhysicsProblem): ValidationResult {
        if (!this.requiresValidation()) {
            return { valid: true, errors: [], warnings: [] };
        }
        const errors: Array<{ code: string; message: string; param?: string }> = [];
        const warnings: Array<{ code: string; message: string }> = [];

        // 检查模型类型匹配
        if (problem.model !== this.modelType) {
            errors.push({
                code: 'MODEL_MISMATCH',
                message: `期望模型 ${this.modelType}，收到 ${problem.model}`,
                param: 'model'
            });
        }

        // 检查必须有物体
        if (!problem.bodies || problem.bodies.length === 0) {
            errors.push({
                code: 'NO_BODIES',
                message: '至少需要一个物理物体',
                param: 'bodies'
            });
        }

        // 检查质量为正
        for (const body of problem.bodies ?? []) {
            if (body.mass.value <= 0) {
                errors.push({
                    code: 'INVALID_MASS',
                    message: `物体 "${body.id}" 的质量必须为正数，当前值: ${body.mass.value}`,
                    param: `bodies.${body.id}.mass`
                });
            }
        }

        // 检查时间配置
        if (problem.timeConfig.duration <= 0) {
            errors.push({
                code: 'INVALID_DURATION',
                message: `模拟时长必须为正数，当前值: ${problem.timeConfig.duration}`,
                param: 'timeConfig.duration'
            });
        }

        // 采样点数若显式给出必须为正整数, 否则 dt = duration / 0 = Inf 污染整条轨迹。
        // 省略 (undefined) 合法 —— 类型上 sampleCount 可选, 各模型自行 `?? 默认值` 兜底。
        // 软限程模型 (enforcesParameterRanges() === false) 不受此拦截。
        if (
            this.enforcesParameterRanges() &&
            problem.timeConfig.sampleCount !== undefined &&
            problem.timeConfig.sampleCount <= 0
        ) {
            errors.push({
                code: 'INVALID_SAMPLE_COUNT',
                message: `采样点数必须为正整数，当前值: ${problem.timeConfig.sampleCount}`,
                param: 'timeConfig.sampleCount'
            });
        }

        // 按各模型声明的 min/max 拦截越界参数 (除零 / NaN / Inf 的统一入口)
        errors.push(...this.validateParameterRanges(problem));

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * 构造 SimulationResult.meta — 保证所有模型的 meta 结构一致。
     * computationTime 由调用方传入（router 测量），模型自身调用时传 0。
     */
    protected makeMeta(solver: 'analytical' | 'numerical', computationTime = 0): SimulationResult['meta'] {
        return {
            model: this.modelType,
            solver,
            computationTime,
            timestamp: new Date().toISOString(),
            version: this.version
        };
    }

    /**
     * 带计时的求解入口 — 用 performance.now() 包裹 solve()，
     * 将真实 computationTime 回填到 meta，保证度量口径统一。
     */
    solveWithMeta(problem: PhysicsProblem): SimulationResult {
        const t0 = performance.now();
        const result = this.solve(problem);
        const computationTime = performance.now() - t0;
        return { ...result, meta: this.makeMeta(result.meta.solver, computationTime) };
    }

    protected throwIfInvalid(problem: PhysicsProblem): void {
        const result = this.validate(problem);
        if (!result.valid) {
            const first = result.errors[0];
            switch (first.code) {
                case 'MODEL_MISMATCH':
                    throw new UnsupportedModelError(problem.model, first.message);
                case 'NO_BODIES':
                    throw new PhysicsError('NO_BODIES', first.message, { param: first.param });
                case 'INVALID_MASS':
                    throw new ParameterOutOfRangeError(first.param ?? 'mass', 0, [0, Infinity]);
                case 'INVALID_DURATION':
                    throw new ParameterOutOfRangeError(first.param ?? 'duration', 0, [0, Infinity]);
                case 'INVALID_SAMPLE_COUNT':
                    throw new ParameterOutOfRangeError(first.param ?? 'sampleCount', 1, [1, Infinity]);
                case 'PARAMETER_OUT_OF_RANGE': {
                    // min/max 未声明的一侧用 ±Infinity 表达, 避免错误信息里出现 NaN
                    const lo = first.min ?? -Infinity;
                    const hi = first.max ?? Infinity;
                    throw new ParameterOutOfRangeError(first.param ?? 'parameter', first.value ?? Number.NaN, [lo, hi]);
                }
                case 'NON_FINITE_PARAMETER':
                    throw new PhysicsError(first.code, first.message, { param: first.param, value: first.value });
                default:
                    throw new PhysicsError(first.code, first.message, { param: first.param });
            }
        }
    }
}

/** 模型注册表 */
const registry = new Map<ModelType, PhysicsModelBase>();

export function registerModel(model: PhysicsModelBase): void {
    registry.set(model.modelType, model);
}

export function getModel(type: ModelType): PhysicsModelBase {
    const model = registry.get(type);
    if (!model) {
        throw new UnsupportedModelError(type, '该模型尚未注册');
    }
    return model;
}

export function listModels(): ModelType[] {
    return Array.from(registry.keys());
}
