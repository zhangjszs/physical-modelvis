import type { PhysicsProblem, ModelType } from '../types/problem.js';
import type { SimulationResult } from '../types/result.js';
import type { ParameterSpec, ValidationResult } from '../types/common.js';
import { UnsupportedModelError, ParameterOutOfRangeError } from '../errors/index.js';

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

  /** 参数校验 */
  validate(problem: PhysicsProblem): ValidationResult {
    const errors: Array<{ code: string; message: string; param?: string }> = [];
    const warnings: Array<{ code: string; message: string }> = [];

    // 检查模型类型匹配
    if (problem.model !== this.modelType) {
      errors.push({
        code: 'MODEL_MISMATCH',
        message: `期望模型 ${this.modelType}，收到 ${problem.model}`,
        param: 'model',
      });
    }

    // 检查必须有物体
    if (!problem.bodies || problem.bodies.length === 0) {
      errors.push({
        code: 'NO_BODIES',
        message: '至少需要一个物理物体',
        param: 'bodies',
      });
    }

    // 检查质量为正
    for (const body of problem.bodies ?? []) {
      if (body.mass.value <= 0) {
        errors.push({
          code: 'INVALID_MASS',
          message: `物体 "${body.id}" 的质量必须为正数，当前值: ${body.mass.value}`,
          param: `bodies.${body.id}.mass`,
        });
      }
    }

    // 检查时间配置
    if (problem.timeConfig.duration <= 0) {
      errors.push({
        code: 'INVALID_DURATION',
        message: `模拟时长必须为正数，当前值: ${problem.timeConfig.duration}`,
        param: 'timeConfig.duration',
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  protected throwIfInvalid(problem: PhysicsProblem): void {
    const result = this.validate(problem);
    if (!result.valid) {
      const first = result.errors[0];
      throw new ParameterOutOfRangeError(first.param ?? 'unknown', 0, [0, 0]);
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
