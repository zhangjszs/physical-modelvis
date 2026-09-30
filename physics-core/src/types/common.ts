/** 二维向量 — 纯数据，不可变 */
export interface Vector2D {
    readonly x: number;
    readonly y: number;
}

/** 三维向量 — 纯数据，不可变 (3D 场源放置 / 空间轨迹用) */
export interface Vector3D {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/** 带单位的物理量 */
export interface Quantity<U extends string = string> {
    readonly value: number;
    readonly unit: U;
    readonly symbol?: string;
}

/** 参数规格描述 */
export interface ParameterSpec {
    readonly name: string;
    readonly description: string;
    readonly unit: string;
    readonly required: boolean;
    readonly min?: number;
    readonly max?: number;
    /**
     * 下界是否**开区间** (取值必须严格大于 min).
     *
     * 用于"物理上不可为 0、但 0 是自然直觉下界"的参数:
     *   摆长 L (`min: 0` 但 L=0 → √(L/g)=NaN)、重力 g (g=0 → 周期发散)、
     *   轨道半径 r (`min: 0` 但 r=0 → √(GM/r)=Inf)、库仑/洛伦兹分母等。
     *
     * 不设该标志时 min 为闭区间 (含端点)。
     */
    readonly exclusiveMin?: boolean;
    readonly defaultValue?: number;
}

/** 校验结果 */
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: ValidationError[];
    readonly warnings: ValidationWarning[];
}

export interface ValidationError {
    readonly code: string;
    readonly message: string;
    readonly param?: string;
    /** 越界参数的实际取值 (PARAMETER_OUT_OF_RANGE / NON_FINITE_PARAMETER 时提供) */
    readonly value?: number;
    /** 越界参数声明的取值下界 (PARAMETER_OUT_OF_RANGE 时提供) */
    readonly min?: number;
    /** 越界参数声明的取值上界 (PARAMETER_OUT_OF_RANGE 时提供) */
    readonly max?: number;
}

export interface ValidationWarning {
    readonly code: string;
    readonly message: string;
}

/** 物理对象 — 仅真实物理属性 */
export interface PhysicalBody {
    readonly id: string;
    readonly mass: Quantity<'kg'>;
    readonly charge?: Quantity<'C'>;
    readonly position: Vector2D;
    readonly velocity: Vector2D;
}

/** 渲染提示 — 与物理计算无关 */
export interface RenderHint {
    readonly bodyId: string;
    readonly renderRadius?: number;
    readonly renderColor?: string;
    readonly renderLabel?: string;
    readonly trailLength?: number;
    readonly showForceVectors?: boolean;
}
