/**
 * L9 / L9b 跨场景数值鲁棒性 — 共享逻辑
 *
 * L9 : 默认参数 solveProblem 无 NaN/Inf (遍历场景)
 * L9b: 极端参数 (滑块 min/max) 求解无 NaN/Inf (按参数拆分 it)
 *
 * 本文件被 physics-correctness.<domain>.test.ts 按领域复用, 避免单一巨型测试文件
 * 连续占用一个 worker 过久触发 vitest 硬编码的 worker RPC 心跳超时
 * (onTaskUpdate rpcTimeout 不可配置)。拆分到多文件后, 每个文件负载更小、
 * 文件间 worker 重置心跳。
 *
 * 遍历 scene.buildProblem(defaults) → solveProblem (via physicsCoreAdapter), 验证:
 *   1. runSceneSimulation 无 error (默认参数可解; 极端值若被模型拒绝则视为已防御)
 *   2. result 非空, 至少 1 条 trajectory, 每条 ≥1 点
 *   3. 轨迹: 每点 t / position / velocity 全部有限 (Number.isFinite)
 *   4. 时间单调非降: t[i+1] >= t[i]
 *   5. 速率有限且 ≥0
 *   6. charts 每个点 x / y 有限 (折线断开标记 {NaN,NaN} 允许)
 */
import { describe, it, expect } from 'vitest';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import type { SceneConfig, SceneParameter } from '../../src/types/visualization';
import type { SimulationResult } from 'physics-core';

export function defaultParams(scene: SceneConfig): Record<string, number> {
    const p: Record<string, number> = {};
    for (const param of scene.parameters as SceneParameter[]) {
        p[param.name] = param.default;
    }
    return p;
}

export function assertFiniteResult(result: SimulationResult, sceneId: string): void {
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

    // charts 有限性 (折线断开标记 {NaN,NaN} 允许; 仅当 x/y 之一为 NaN 才视为真实 bug)
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

/**
 * 为给定领域场景集合注册 L9 + L9b 两个 describe 块。
 * 必须在领域测试文件顶层调用 (模块求值期), 以便 vitest 收集。
 */
export function describeSceneRobustness(scenes: SceneConfig[], label: string): void {
    describe(`L9 [${label}]: 跨场景数值鲁棒性 — 默认参数求解有限且无 NaN`, () => {
        for (const scene of scenes) {
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

    describe(`L9b [${label}]: 极端参数数值鲁棒性 — 滑块边界 min/max 求解有限`, () => {
        for (const scene of scenes) {
            const numericParams = scene.parameters as SceneParameter[];
            if (numericParams.length === 0) continue;
            // 按参数拆分 it: 单个 it 仅解算一个参数的 min/max, 避免在数值积分密集场景
            // (orbital / brownian-motion) 中单个 it 同步阻塞事件循环过久, 触发 vitest 硬编码的
            // worker RPC 心跳超时。it 之间事件循环让出, 心跳恢复。
            // 30s testTimeout 仅作冗余保险, 正常每个 it 远低于 5s。
            for (const param of numericParams) {
                it(`scene "${scene.id}" (${scene.model}) param "${param.name}": min/max 求解仍有限`, () => {
                    const base = defaultParams(scene);
                    for (const extreme of [param.min, param.max]) {
                        const params: Record<string, number> = { ...base, [param.name]: extreme };

                        // 静态/仪器场景: buildProblem 不产出 body → 由定制 canvas 渲染, 跳过有限性检查
                        const probe = scene.buildProblem(params);
                        if (!probe.bodies || probe.bodies.length === 0) continue;

                        const { result, error } = runSceneSimulation(scene, params);

                        // 模型拒绝极端输入 → 已防御, 跳过
                        if (error) continue;
                        expect(
                            result,
                            `scene ${scene.id} param ${param.name}=${extreme}: 返回 null result`
                        ).not.toBeNull();
                        if (result!.trajectories.length === 0) continue; // 场模型跳过轨迹检查

                        assertFiniteResult(result!, `${scene.id}#${param.name}=${extreme}`);
                    }
                }, 30000);
            }
        }
    });
}
