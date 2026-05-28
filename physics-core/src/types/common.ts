/** 二维向量 — 纯数据，不可变 */
export interface Vector2D {
  readonly x: number;
  readonly y: number;
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
