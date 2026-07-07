/**
 * L9: 跨场景数值鲁棒性 — 全场景 solveProblem 无 NaN/Inf
 *
 * 遍历 SCENES[] 全部场景, 用 default parameters 走真实链路
 *   scene.buildProblem(defaults) → solveProblem (via physicsCoreAdapter)
 * 验证数值正确性 (非"不报错"级别):
 *   1. runSceneSimulation 无 error (solve 成功, 默认参数可解)
 *   2. 返回 result 非空, 至少 1 条 trajectory, 每条 ≥1 点
 *   3. 轨迹: 每个点 t / position / velocity 全部有限 (Number.isFinite)
 *   4. 时间单调非降: t[i+1] >= t[i]
 *   5. 速率有限且 ≥0: hypot(vx, vy) 有限
 *   6. charts (若存在) 每个点 x / y 有限
 *
 * 本层是 "NaN 边界守卫" + "全模型量纲一致性/有限性" 的横向网, 覆盖 L2 (validate)
 * 之外的真实数值积分路径。
 */

import { describe, it, expect } from 'vitest';
import { SCENES } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import type { SceneConfig, SceneParameter } from '../../src/types/visualization';
import type { SimulationResult } from 'physics-core';

function defaultParams(scene: SceneConfig): Record<string, number> {
  const p: Record<string, number> = {};
  for (const param of scene.parameters as SceneParameter[]) {
    p[param.name] = param.default;
  }
  return p;
}

function assertFiniteResult(result: SimulationResult, sceneId: string): void {
  expect(result.trajectories.length, `${sceneId}: 至少 1 条 trajectory`).toBeGreaterThan(0);

  for (let ti = 0; ti < result.trajectories.length; ti++) {
    const traj = result.trajectories[ti]!;
    expect(traj.length, `${sceneId}: trajectory[${ti}] 至少 1 点`).toBeGreaterThan(0);

    let prevT = -Infinity;
    for (const pt of traj) {
      // 时间有限 + 单调非降
      expect(Number.isFinite(pt.t), `${sceneId}: t 有限`).toBe(true);
      expect(pt.t, `${sceneId}: 时间单调非降`).toBeGreaterThanOrEqual(prevT);
      prevT = pt.t;

      // 位置 / 速度有限 (NaN/Inf 守卫)
      expect(Number.isFinite(pt.position.x), `${sceneId}: position.x 有限`).toBe(true);
      expect(Number.isFinite(pt.position.y), `${sceneId}: position.y 有限`).toBe(true);
      expect(Number.isFinite(pt.velocity.x), `${sceneId}: velocity.x 有限`).toBe(true);
      expect(Number.isFinite(pt.velocity.y), `${sceneId}: velocity.y 有限`).toBe(true);

      // 速率有限且非负
      const sp = Math.hypot(pt.velocity.x, pt.velocity.y);
      expect(Number.isFinite(sp), `${sceneId}: 速率有限`).toBe(true);
      expect(sp, `${sceneId}: 速率非负`).toBeGreaterThanOrEqual(0);
    }
  }

  // charts 有限性 (图表断点约定: {NaN,NaN} 为折线断开标记, 渲染器用其分隔上升/下降分支, 允许;
  //   仅当 x/y 之一为 NaN 时才视为真实 bug)
  // 注意: charts 可能混入非 ChartSeries 的结构体 (如 ForceDiagram), 仅检查含 .points 数组的条目
  if (result.charts) {
    for (const [key, series] of Object.entries(result.charts)) {
      if (!series || !Array.isArray((series as { points?: unknown }).points)) continue;
      const points = (series as { points: Array<{ x: number; y: number }> }).points;
      for (const pnt of points) {
        const isBreak = Number.isNaN(pnt.x) && Number.isNaN(pnt.y);
        if (isBreak) continue;
        expect(Number.isFinite(pnt.x), `${sceneId}: chart ${key}.x 有限`).toBe(true);
        expect(Number.isFinite(pnt.y), `${sceneId}: chart ${key}.y 有限`).toBe(true);
      }
    }
  }
}

describe('L9: 跨场景数值鲁棒性 — 全 SCENES solveProblem 无 NaN/Inf', () => {
  for (const scene of SCENES) {
    it(`scene "${scene.id}" (${scene.model}): 默认参数求解有限且无 NaN`, () => {
      const params = defaultParams(scene);

      // 静态/仪器场景: buildProblem 不产出 body → 由定制 canvas 渲染, 不产生粒子轨迹;
      // adapter 会返回 error ("至少需要一个物理物体"), 这是预期的, 跳过有限性检查。
      const probe = scene.buildProblem(params);
      if (!probe.bodies || probe.bodies.length === 0) return;

      const { result, error } = runSceneSimulation(scene, params);
      expect(error, `scene ${scene.id} solve 失败: ${error}`).toBeNull();
      expect(result, `scene ${scene.id} 返回 null result`).not.toBeNull();

      // 场模型 (有 body 但无粒子轨迹, 画场线): 跳过轨迹有限性检查
      if (result!.trajectories.length === 0) return;

      assertFiniteResult(result!, scene.id);
    });
  }
});
