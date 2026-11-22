import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { HeatTransferModel } from '../../src/models/heat-transfer.js';

function makeBody(id = 'b1', mass = 1) {
    return { id, mass: { value: mass, unit: 'kg' as const }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
}
function makeProblem(
    modelType: string,
    constraints: Record<string, unknown>,
    bodies: ReturnType<typeof makeBody>[] = [makeBody()]
): PhysicsProblem {
    return {
        id: 'test-' + modelType,
        model: modelType as PhysicsProblem['model'],
        bodies,
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        timeConfig: { duration: 5, sampleCount: 100 },
        environment: {}
    };
}

describe('G14: HeatTransfer', () => {
    const m = new HeatTransferModel();
    it('meta', () => {
        expect(m.modelType).toBe('heat-transfer');
    });
    it('chart', () => {
        expect(
            m.solve(makeProblem('heat-transfer', { heatTransfer: { mode: 'conduction', temperatureDiff: 100 } })).charts
                .x_t
        ).toBeDefined();
    });

    describe('终态关键帧时间单调性与 T(tMax) 曲线末端一致 (#184)', () => {
        it('默认参数 (T0=300K, Tenv=350K, tMax=60s): 三种模式终态 t=60s 且与图表末端读数一致', () => {
            for (const mode of ['conduction', 'convection', 'radiation'] as const) {
                const res = m.solve(
                    makeProblem('heat-transfer', {
                        heatTransfer: { mode, materialType: 'copper', initialTemp: 300, ambientTemp: 350, time: 60 }
                    })
                );
                const kf0 = res.keyframes[0]!;
                const kf1 = res.keyframes[1]!;
                const pts = res.charts.x_t!.points;
                const lastPt = pts[pts.length - 1]!;
                const traj = res.trajectories[0]!;
                const lastTraj = traj[traj.length - 1]!;

                // 关键帧与轨迹时间单调递增
                expect(kf0.t).toBe(0);
                expect(kf1.t).toBe(60);
                expect(kf1.t).toBeGreaterThan(kf0.t);
                expect(lastTraj.t).toBeCloseTo(60, 4);

                // 终态温度与图表末端及 maxValues.finalTemp 严格一致
                expect(kf1.position.x).toBe(60);
                expect(kf1.position.y).toBeCloseTo(lastPt.y, 6);
                expect(lastTraj.position.y).toBeCloseTo(lastPt.y, 6);
                expect(res.diagnostics.maxValues.finalTemp).toBeCloseTo(lastPt.y, 6);
                expect(res.diagnostics.maxValues.finalTime).toBe(60);

                // 说明使用 t=60.0s 与实际 T(60s), 不把初温 300K 误写为 t=300s, 且明确渐近环境温度
                expect(kf1.description).toContain('t=60.0s');
                expect(kf1.description).not.toContain('t=300s');
                expect(kf1.description).toContain(`T=${lastPt.y.toFixed(2)}K`);
                expect(kf1.description).toContain('渐近');
            }
        });

        it('降温 (T0=500K, Tenv=300K) 与极短/较长时间窗 (5s vs 600s): 短时间未达热平衡、长时间更接近 Tenv', () => {
            const shortRes = m.solve(
                makeProblem('heat-transfer', {
                    heatTransfer: {
                        mode: 'convection',
                        materialType: 'steel',
                        initialTemp: 500,
                        ambientTemp: 300,
                        time: 5
                    }
                })
            );
            const longRes = m.solve(
                makeProblem('heat-transfer', {
                    heatTransfer: {
                        mode: 'convection',
                        materialType: 'steel',
                        initialTemp: 500,
                        ambientTemp: 300,
                        time: 600
                    }
                })
            );

            const tShort = shortRes.keyframes[1]!.position.y;
            const tLong = longRes.keyframes[1]!.position.y;
            expect(shortRes.keyframes[1]!.t).toBe(5);
            expect(longRes.keyframes[1]!.t).toBe(600);
            expect(tShort).toBeLessThan(500);
            expect(tShort).toBeGreaterThan(300);
            expect(tLong).toBeLessThan(tShort);
            expect(tLong).toBeGreaterThanOrEqual(300);
        });

        it('不同模式下主曲线与终态温度随模式真实区分 (铜传导远快于铜辐射)', () => {
            const cond = m.solve(
                makeProblem('heat-transfer', {
                    heatTransfer: {
                        mode: 'conduction',
                        materialType: 'copper',
                        initialTemp: 300,
                        ambientTemp: 350,
                        time: 60
                    }
                })
            );
            const rad = m.solve(
                makeProblem('heat-transfer', {
                    heatTransfer: {
                        mode: 'radiation',
                        materialType: 'copper',
                        initialTemp: 300,
                        ambientTemp: 350,
                        time: 60
                    }
                })
            );
            expect(cond.diagnostics.maxValues.finalTemp).toBeGreaterThan(rad.diagnostics.maxValues.finalTemp);
            // 60s 内铜辐射 (ε=0.05) 几乎未升温, 绝不可伪造为 350K
            expect(rad.keyframes[1]!.position.y).toBeLessThan(310);
        });
    });
});
