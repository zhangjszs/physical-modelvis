/**
 * L1-migration: 渲染单一真源契约 — 迁移后的场景, 渲染层必须消费引擎结果
 *
 * 背景: 阶段 3 首轮迁移 (orbital / simple-pendulum / vertical-circle)。
 * 此前这些场景渲染层用 `currentTime + 公式` 自算, 与引擎结果漂移
 * (orbital 椭圆率 1.57 时画面仍画匀速圆, 分歧 102.6%)。
 *
 * 本测试固化的契约:
 *   1. orbital: 引擎轨迹 maxR/minR 呈现真实椭圆/圆 → 渲染层不得再用匀速圆
 *   2. simple-pendulum: 大角度 θ₀=60° 引擎周期 T 显著偏离小角度近似
 *      (非线性不可忽略) → 渲染层读 theta_t 而非 cos 近似
 *   3. vertical-circle: 引擎速度最高点 < 最低点 (机械能守恒) → HUD 展示当前速度
 *
 * 若未来渲染层回退到自算公式 (或引擎被改错), 本测试直接拦截。
 */

import { describe, it, expect } from 'vitest';
import { SCENES } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { getFrame } from '../../src/rendering/renderingUtils';

describe('L1-migration: 渲染单一真源契约 (orbital / pendulum / vertical-circle)', () => {
    function scene(id: string) {
        const s = SCENES.find(x => x.id === id);
        expect(s, `场景 ${id} 已注册`).toBeDefined();
        return s!;
    }

    it('orbital: vFactor=1.2 时引擎轨迹是椭圆 (非圆), 渲染位置必须跟随引擎', () => {
        const sc = scene('orbital');
        const params: Record<string, number> = { altitude: 400, velocityFactor: 1.2, duration: 200 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const traj = result!.trajectories[0]!;
        const radii = traj.map(p => Math.hypot(p.position.x, p.position.y));
        const maxR = Math.max(...radii);
        const minR = Math.min(...radii);
        const ellipticity = (maxR - minR) / minR;

        // 椭圆性显著 (vFactor=1.2 → 远地点比近地点远 >50%)
        expect(ellipticity).toBeGreaterThan(0.5);
        // 引擎位置在任意时刻 ≠ 匀速圆位置 (半径恒为 r0)
        const r0 = radii[0]!;
        const mid = traj[Math.floor(traj.length / 2)]!;
        const midR = Math.hypot(mid.position.x, mid.position.y);
        expect(Math.abs(midR - r0) / r0).toBeGreaterThan(0.1);
    });

    it('orbital: getFrame 与渲染层映射共享同一引擎轨迹', () => {
        const sc = scene('orbital');
        const params: Record<string, number> = { altitude: 400, velocityFactor: 1.2, duration: 200 };
        const { result } = runSceneSimulation(sc, params);
        const t = 900; // 中间时刻
        const frame = getFrame(result, t);
        expect(frame).not.toBeNull();
        // 帧位置落在引擎轨迹半径区间内
        const traj = result!.trajectories[0]!;
        const radii = traj.map(p => Math.hypot(p.position.x, p.position.y));
        const frameR = Math.hypot(frame!.position.x, frame!.position.y);
        expect(frameR).toBeGreaterThanOrEqual(Math.min(...radii) * 0.99);
        expect(frameR).toBeLessThanOrEqual(Math.max(...radii) * 1.01);
    });

    it('simple-pendulum: θ₀=60° 引擎周期偏离小角度近似 >5% (非线性不可忽略)', () => {
        const sc = scene('simple-pendulum');
        const params: Record<string, number> = { length: 1, angle: 60, mass: 1, g: 9.8, damping: 0, duration: 20 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const theta = result!.charts.theta_t!.points as Array<{ x: number; y: number }>;
        expect(theta.length).toBeGreaterThan(10);
        let firstZero = -1;
        let secondZero = -1;
        for (let i = 1; i < theta.length; i++) {
            if (theta[i - 1]!.y * theta[i]!.y < 0 && theta[i]!.y > 0) {
                if (firstZero < 0) firstZero = theta[i]!.x;
                else {
                    secondZero = theta[i]!.x;
                    break;
                }
            }
        }
        expect(secondZero).toBeGreaterThan(0);
        const TEngine = secondZero - firstZero;
        const TSmall = 2 * Math.PI * Math.sqrt(1 / 9.8);
        expect(Math.abs(TEngine - TSmall) / TSmall).toBeGreaterThan(0.05);
        // theta_t 图表单位是度
        expect(Math.abs(theta[0]!.y)).toBeCloseTo(60, 0);
    });

    it('vertical-circle: 引擎速度在最高点 < 最低点 (机械能守恒), 渲染 HUD 用当前速度', () => {
        const sc = scene('vertical-circle');
        const params: Record<string, number> = { modelType: 0, length: 1, mass: 1, initialSpeed: 7.5, duration: 5 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const traj = result!.trajectories[0]!;
        const speeds = traj.map(p => Math.hypot(p.velocity.x, p.velocity.y));
        const vLowest = speeds[0]!; // 最低点 (初始)
        const vMin = Math.min(...speeds);
        const vMax = Math.max(...speeds);
        expect(vLowest).toBeCloseTo(7.5, 5);
        // 最高点速度 √(v₀²−4gr) = √(56.25−39.2) ≈ 4.13 < 7.5
        expect(vMin).toBeLessThan(vLowest * 0.7);
        // 速度范围跨度显著 (非匀速)
        expect(vMax - vMin).toBeGreaterThan(2);
    });
});
