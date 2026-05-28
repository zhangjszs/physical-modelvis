import { solveProblem, UnsupportedModelError, ParameterOutOfRangeError } from 'physics-core';
import type { PhysicsProblem, SimulationResult } from 'physics-core';
import type { SceneConfig } from '../types/visualization';

/** 调用 physics-core 并统一处理错误 */
export function runPhysicsCore(problem: PhysicsProblem): {
  result: SimulationResult | null;
  error: string | null;
} {
  try {
    const result = solveProblem(problem);
    return { result, error: null };
  } catch (e) {
    if (e instanceof UnsupportedModelError) {
      return { result: null, error: `不支持该模型: ${e.message}` };
    }
    if (e instanceof ParameterOutOfRangeError) {
      return { result: null, error: `参数错误: ${e.message}` };
    }
    if (e instanceof Error) {
      return { result: null, error: `求解失败: ${e.message}` };
    }
    return { result: null, error: '未知错误' };
  }
}

/** 根据场景配置和参数运行仿真 */
export function runSceneSimulation(
  scene: SceneConfig,
  params: Record<string, number>,
): { result: SimulationResult | null; error: string | null } {
  const problem = scene.buildProblem(params);
  return runPhysicsCore(problem);
}
