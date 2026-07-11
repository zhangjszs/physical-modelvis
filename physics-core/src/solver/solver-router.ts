import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult } from '../types/result.js';
import { getModel, registerModel } from '../models/base.js';
import { MODELS } from '../models/index.js';

// 注册全部模型 — 单一注册源位于 src/models/index.ts，此处仅遍历实例化注册。
for (const model of MODELS) {
    registerModel(model);
}

export function solveProblem(problem: PhysicsProblem): SimulationResult {
    const model = getModel(problem.model);
    return model.solveWithMeta(problem);
}
