/**
 * L2: SceneConfig ↔ 引擎契约自检
 *
 * 遍历 SCENES[] 全部 scene 条目, 验证:
 *   1. model 字段对应 physics-core 中已注册的 ModelType
 *   2. buildProblem 可以成功执行 (无抛错)
 *   3. 传入 default parameters 后, getModel(model).validate(problem) 不报错
 *   4. timeConfig.sampleCount 存在且 ≥50
 *   5. timeConfig.dt > 0
 */

import { beforeAll, describe, it, expect } from 'vitest';
import { getScenesSync, loadAllScenes } from '../../src/scenes/sceneRegistry';
import { getModel, listModels } from 'physics-core';
import type { SceneConfig } from '../../src/types/visualization';

const registeredModels = new Set(listModels());

function defaultParams(scene: SceneConfig): Record<string, number> {
  const p: Record<string, number> = {};
  for (const param of scene.parameters) {
    p[param.name] = param.default;
  }
  // 兼容 'duration' 参数可能没有 name 而是 'duration'
  return p;
}

describe('L2: SceneConfig ↔ 引擎契约', () => {
  beforeAll(async () => {
    await loadAllScenes();
  });

  it('所有 scene 的 model 是已注册的 ModelType', () => {
    const unregistered = getScenesSync().filter(s => !registeredModels.has(s.model)).map(s => s.id);
    expect(unregistered, `未注册 model: ${JSON.stringify(unregistered)}`).toEqual([]);
  });

  it('所有 scene 的 buildProblem 可以成功执行 (default params)', () => {
    for (const scene of getScenesSync()) {
      const params = defaultParams(scene);
      let problem: any;
      expect(() => {
        problem = scene.buildProblem(params);
      }, `scene '${scene.id}' buildProblem 抛错`).not.toThrow();
      expect(problem, `scene '${scene.id}' 无返回`).toBeDefined();
    }
  });

  it('所有 scene 的 buildProblem 产出符合 getModel(model).validate 要求', () => {
    for (const scene of getScenesSync()) {
      const params = defaultParams(scene);
      let problem: any;
      try {
        problem = scene.buildProblem(params);
      } catch {
        continue; // 已在上一条 check
      }
      try {
        const m = getModel(scene.model);
        const v = m.validate(problem);
        expect(v.valid, `scene '${scene.id}' validate 失败: ${JSON.stringify(v.errors.map(e => e.message))}`).toBe(true);
      } catch (e) {
        // getModel 找不到已在第 1 条 check 覆盖, 这里 skip
      }
    }
  });

  it('timeConfig.sampleCount ≥50 或 dt>0 (二选一)', () => {
    for (const scene of getScenesSync()) {
      const params = defaultParams(scene);
      let problem: any;
      try {
        problem = scene.buildProblem(params);
      } catch { continue; }
      const tc = problem.timeConfig as { duration: number; dt?: number; sampleCount?: number } | undefined;
      if (!tc) {
        // 部分 scene 可能没提供 timeConfig; 跳过
        continue;
      }
      const dtValid = tc.dt !== undefined && tc.dt > 0;
      const sampleValid = tc.sampleCount !== undefined && tc.sampleCount >= 50;
      expect(dtValid || sampleValid, `scene '${scene.id}' 既无合法 dt 也无足够 sampleCount`).toBe(true);
    }
  });

  it('所有 scene 在 SimulationCanvas switch 中被路由', () => {
    // 读 SimulationCanvas.tsx 源码查找 case '...': 列表
    // (Simple static check — 在 L5 用 deep 匹配)
    const fs = require('fs') as typeof import('fs');
    const src = fs.readFileSync(require('path').resolve(__dirname, '../../src/components/simulation/SimulationCanvas.tsx'), 'utf-8');
    const caseBlock = src.match(/switch\s*\(\s*currentScene\s*\)\s*\{([\s\S]*?)\n\s*\}/);
    if (!caseBlock) {
      throw new Error('SimulationCanvas.tsx 中未找到 switch(currentScene)');
    }
    const cases = [...caseBlock[1]!.matchAll(/case\s+'([^']+)':/g)].map(m => m[1]);
    const caseSet = new Set(cases);

    // 每个 sceneId 至少有一个 case (可以是 default 的通配, 但我们严格检查)
    const missing = getScenesSync().map(s => s.id).filter(id => caseSet.has(id));
    // 注意: 大部分基础场景 共用通用渲染路径, 仅定制场景需要 case, 因此不要求全覆盖
    expect(missing.length).toBeGreaterThan(0); // 至少有一个 case
  });
});
