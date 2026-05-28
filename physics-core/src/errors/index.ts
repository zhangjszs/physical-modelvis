/** 物理引擎基础错误 */
export class PhysicsError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'PhysicsError';
    this.code = code;
    this.details = details;
  }
}

/** 模型不支持 */
export class UnsupportedModelError extends PhysicsError {
  constructor(modelType: string, reason: string) {
    super('UNSUPPORTED_MODEL', `模型 "${modelType}" 不支持: ${reason}`, { modelType, reason });
    this.name = 'UnsupportedModelError';
  }
}

/** 参数超出范围 */
export class ParameterOutOfRangeError extends PhysicsError {
  constructor(param: string, value: number, range: [number, number]) {
    super('PARAMETER_OUT_OF_RANGE', `参数 "${param}" = ${value} 超出范围 [${range[0]}, ${range[1]}]`, {
      param,
      value,
      min: range[0],
      max: range[1],
    });
    this.name = 'ParameterOutOfRangeError';
  }
}

/** 守恒律校验失败 */
export class ConsistencyViolationError extends PhysicsError {
  constructor(law: string, expected: number, actual: number, tolerance: number) {
    super(
      'CONSISTENCY_VIOLATION',
      `${law} 守恒校验失败: 期望=${expected}, 实际=${actual}, 误差=${Math.abs(actual - expected)} > 容差=${tolerance}`,
      { law, expected, actual, tolerance, deviation: Math.abs(actual - expected) },
    );
    this.name = 'ConsistencyViolationError';
  }
}
