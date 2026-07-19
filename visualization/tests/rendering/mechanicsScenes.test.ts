/**
 * 13 个新力学场景渲染器测试 (P0-B.1)。
 *
 * 测试范围：
 *   1. drawCurveConditionScene        — 曲线运动条件
 *   2. drawMotionCompositionScene      — 运动合成与分解
 *   3. drawCurveVelocityDirectionScene — 曲线运动速度方向
 *   4. drawSimplePendulumScene         — 单摆
 *   5. drawEnergyConservationScene     — 机械能守恒
 *   6. drawOverweightScene             — 超重失重
 *   7. drawCentrifugalScene            — 离心现象
 *   8. drawOrbitalScene                — 卫星轨道
 *   9. drawMomentumScene               — 动量定理/反冲
 *   10. drawProjectileCollisionScene   — 平抛碰撞
 *   11. drawMechanicalWaveScene        — 机械波
 *   12. drawCavendishScene             — 卡文迪什扭秤
 *   13. drawMoonEarthTestScene         — 月地检验
 *
 * 每个场景 2 个测试：
 *   - positive: 合法参数 + mock trajectory → 不抛错 + 关键文本渲染 + ctx 调用数充足
 *   - edge:     simulationResult=null → 不抛错 + 标题仍渲染（drawEmptyState 兜底）
 *
 * 完整 snapshot 测试可后续基于 createRecordingCanvas + serializeCalls 扩展。
 */

import { describe, it, expect } from 'vitest';
import { createRecordingCanvas } from '../utils/canvasMock';
import type { SimulationResult, TrajectoryPoint } from 'physics-core';
import {
    drawCurveConditionScene,
    drawMotionCompositionScene,
    drawCurveVelocityDirectionScene,
    drawSimplePendulumScene,
    drawEnergyConservationScene,
    drawOverweightScene,
    drawCentrifugalScene,
    drawOrbitalScene,
    drawMomentumScene,
    drawProjectileCollisionScene,
    drawMechanicalWaveScene,
    drawCavendishScene,
    drawMoonEarthTestScene
} from '../../src/rendering/mechanicsScenes';

// ============================================================
// Mock SimulationResult 工厂
// ============================================================

/**
 * 构造一个最小合法的 SimulationResult，包含 5 点线性 trajectory。
 * 用于 positive 测试。各 draw 函数若需要 extra/charts 字段，
 * 测试中显式 spread 覆盖。
 */
function makeMockResult(overrides?: {
    trajectories?: TrajectoryPoint[][];
    extra?: unknown;
    charts?: unknown;
}): SimulationResult {
    const defaultTrajectory: TrajectoryPoint[] = [
        { t: 0, position: { x: 0, y: 0 }, velocity: { x: 5, y: 0 } },
        { t: 0.5, position: { x: 2.5, y: 0.5 }, velocity: { x: 5, y: 1 } },
        { t: 1.0, position: { x: 5, y: 2 }, velocity: { x: 5, y: 2 } },
        { t: 1.5, position: { x: 7.5, y: 4.5 }, velocity: { x: 5, y: 3 } },
        { t: 2.0, position: { x: 10, y: 8 }, velocity: { x: 5, y: 4 } }
    ];
    return {
        trajectories: overrides?.trajectories ?? [defaultTrajectory],
        extra: overrides?.extra,
        charts: overrides?.charts
    } as unknown as SimulationResult;
}

/** 抛体轨迹 mock（用于 projectile-collision） */
function makeProjectileTrajectory(): TrajectoryPoint[] {
    const traj: TrajectoryPoint[] = [];
    for (let i = 0; i <= 20; i++) {
        const t = i * 0.1;
        traj.push({
            t,
            position: { x: 5 * t, y: 5 * t - 0.5 * 9.8 * t * t },
            velocity: { x: 5, y: 5 - 9.8 * t }
        });
    }
    return traj;
}

// ============================================================
// 1. drawCurveConditionScene — 曲线运动条件
// ============================================================

describe('drawCurveConditionScene', () => {
    it('positive: 默认参数 + mock trajectory → 渲染曲线运动条件', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawCurveConditionScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { forceAngle: 30, initialSpeed: 5, mass: 1, duration: 3 },
                simulationResult: makeMockResult(),
                currentTime: 1.0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('曲线运动条件'))).toBe(true);
        expect(calls.length).toBeGreaterThan(20);
    });

    it('edge: simulationResult=null 不抛错且仍渲染标题', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawCurveConditionScene({
                ctx,
                width: 900,
                height: 600,
                isDark: true,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('曲线运动条件'))).toBe(true);
    });
});

// ============================================================
// 2. drawMotionCompositionScene — 运动合成与分解
// ============================================================

describe('drawMotionCompositionScene', () => {
    it('positive: 默认参数 → 渲染运动合成', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawMotionCompositionScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { vxConst: 2, vyAccel: 2, duration: 3 },
                simulationResult: makeMockResult(),
                currentTime: 1.0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('运动的合成与分解'))).toBe(true);
        expect(calls.length).toBeGreaterThan(20);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawMotionCompositionScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('运动的合成与分解'))).toBe(true);
    });
});

// ============================================================
// 3. drawCurveVelocityDirectionScene — 曲线运动速度方向
// ============================================================

describe('drawCurveVelocityDirectionScene', () => {
    it('positive: 默认参数 → 渲染速度方向', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawCurveVelocityDirectionScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { mode: 0, initialSpeed: 5 },
                simulationResult: makeMockResult(),
                currentTime: 1.0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('曲线运动速度方向'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawCurveVelocityDirectionScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('曲线运动速度方向'))).toBe(true);
    });
});

// ============================================================
// 4. drawSimplePendulumScene — 单摆
// ============================================================

describe('drawSimplePendulumScene', () => {
    it('positive: 默认参数 → 渲染单摆', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawSimplePendulumScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { length: 1, amplitude: 15, g: 9.8 },
                simulationResult: makeMockResult(),
                currentTime: 0.5
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('单摆'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawSimplePendulumScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('单摆'))).toBe(true);
    });
});

// ============================================================
// 5. drawEnergyConservationScene — 机械能守恒
// ============================================================

describe('drawEnergyConservationScene', () => {
    it('positive: 默认参数 → 渲染机械能守恒', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawEnergyConservationScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { height: 10, mass: 1, g: 9.8 },
                simulationResult: makeMockResult(),
                currentTime: 1.0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('机械能守恒定律'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawEnergyConservationScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('机械能守恒定律'))).toBe(true);
    });
});

// ============================================================
// 6. drawOverweightScene — 超重失重
// ============================================================

describe('drawOverweightScene', () => {
    it('positive: 默认参数 → 渲染超重失重', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawOverweightScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { mass: 60, acceleration: 2, g: 9.8 },
                simulationResult: makeMockResult(),
                currentTime: 1.0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('超重与失重') || t.includes('超重'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawOverweightScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('超重'))).toBe(true);
    });
});

// ============================================================
// 7. drawCentrifugalScene — 离心现象
// ============================================================

describe('drawCentrifugalScene', () => {
    it('positive: 默认参数 → 渲染离心现象', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawCentrifugalScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { mass: 1, omega: 5, radius: 0.3, friction: 0.3, g: 9.8 },
                simulationResult: makeMockResult(),
                currentTime: 0.5
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('离心现象'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawCentrifugalScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('离心现象'))).toBe(true);
    });
});

// ============================================================
// 8. drawOrbitalScene — 卫星轨道
// ============================================================

describe('drawOrbitalScene', () => {
    it('positive: 默认参数 → 渲染卫星轨道', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawOrbitalScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { altitude: 400, earthMass: 5.972e24 },
                simulationResult: makeMockResult(),
                currentTime: 1.0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('万有引力与航天') || t.includes('卫星'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawOrbitalScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('万有引力与航天'))).toBe(true);
    });
});

// ============================================================
// 9. drawMomentumScene — 动量定理/反冲
// ============================================================

describe('drawMomentumScene', () => {
    it('positive: 动量定理模式 → 渲染动量定理', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawMomentumScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { mode: 0, force: 10, duration: 0.5, mass: 2 },
                simulationResult: makeMockResult(),
                currentTime: 0.25
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('动量定理') || t.includes('反冲'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawMomentumScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        // 标题随 mode 变化，二选一
        expect(texts.some(t => t.includes('动量定理') || t.includes('反冲'))).toBe(true);
    });
});

// ============================================================
// 10. drawProjectileCollisionScene — 平抛碰撞
// ============================================================

describe('drawProjectileCollisionScene', () => {
    it('positive: 默认参数 → 渲染平抛碰撞', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawProjectileCollisionScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { v1: 5, v2: 0, h1: 1, h2: 2, m1: 0.1, m2: 0.1 },
                simulationResult: makeMockResult({
                    trajectories: [makeProjectileTrajectory(), makeProjectileTrajectory()]
                }),
                currentTime: 0.3
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('平抛碰撞') || t.includes('动量'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawProjectileCollisionScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('平抛碰撞'))).toBe(true);
    });
});

// ============================================================
// 11. drawMechanicalWaveScene — 机械波
// ============================================================

describe('drawMechanicalWaveScene', () => {
    it('positive: 默认参数 → 渲染机械波', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawMechanicalWaveScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { waveMode: 0, frequency: 1, amplitude: 20, wavelength: 100 },
                simulationResult: makeMockResult(),
                currentTime: 0.5
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('机械波'))).toBe(true);
        expect(calls.length).toBeGreaterThan(20);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawMechanicalWaveScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('机械波'))).toBe(true);
    });
});

// ============================================================
// 12. drawCavendishScene — 卡文迪什扭秤
// ============================================================

describe('drawCavendishScene', () => {
    it('positive: 默认参数 → 渲染卡文迪什扭秤', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawCavendishScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { bigMass: 158, smallMass: 0.73, distance: 0.05 },
                simulationResult: makeMockResult(),
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('卡文迪什') || t.includes('扭秤'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawCavendishScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('卡文迪什'))).toBe(true);
    });
});

// ============================================================
// 13. drawMoonEarthTestScene — 月地检验
// ============================================================

describe('drawMoonEarthTestScene', () => {
    it('positive: 默认参数 → 渲染月地检验', () => {
        const { ctx, texts, calls } = createRecordingCanvas();
        expect(() =>
            drawMoonEarthTestScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: { earthRadius: 6371, moonDistance: 3.84e5 },
                simulationResult: makeMockResult(),
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('月地检验') || t.includes('万有引力'))).toBe(true);
        expect(calls.length).toBeGreaterThan(15);
    });

    it('edge: simulationResult=null 不抛错', () => {
        const { ctx, texts } = createRecordingCanvas();
        expect(() =>
            drawMoonEarthTestScene({
                ctx,
                width: 900,
                height: 600,
                isDark: false,
                params: {},
                simulationResult: null,
                currentTime: 0
            })
        ).not.toThrow();
        expect(texts.some(t => t.includes('月地检验'))).toBe(true);
    });
});

// ============================================================
// 跨场景回归测试：dark/light 主题 + 极端参数
// ============================================================

describe('mechanicsScenes — 主题与边界回归', () => {
    const allRenderers: Array<{
        name: string;
        fn: (opts: import('../../src/rendering/mechanicsScenes').MechanicsSceneOptions) => void;
    }> = [
        { name: 'drawCurveConditionScene', fn: drawCurveConditionScene },
        { name: 'drawMotionCompositionScene', fn: drawMotionCompositionScene },
        { name: 'drawCurveVelocityDirectionScene', fn: drawCurveVelocityDirectionScene },
        { name: 'drawSimplePendulumScene', fn: drawSimplePendulumScene },
        { name: 'drawEnergyConservationScene', fn: drawEnergyConservationScene },
        { name: 'drawOverweightScene', fn: drawOverweightScene },
        { name: 'drawCentrifugalScene', fn: drawCentrifugalScene },
        { name: 'drawOrbitalScene', fn: drawOrbitalScene },
        { name: 'drawMomentumScene', fn: drawMomentumScene },
        { name: 'drawProjectileCollisionScene', fn: drawProjectileCollisionScene },
        { name: 'drawMechanicalWaveScene', fn: drawMechanicalWaveScene },
        { name: 'drawCavendishScene', fn: drawCavendishScene },
        { name: 'drawMoonEarthTestScene', fn: drawMoonEarthTestScene }
    ];

    for (const { name, fn } of allRenderers) {
        it(`${name}: dark 主题下不抛错`, () => {
            const { ctx } = createRecordingCanvas();
            expect(() =>
                fn({
                    ctx,
                    width: 900,
                    height: 600,
                    isDark: true,
                    params: {},
                    simulationResult: null,
                    currentTime: 0
                })
            ).not.toThrow();
        });

        it(`${name}: currentTime 远超 duration 不抛错`, () => {
            const { ctx } = createRecordingCanvas();
            expect(() =>
                fn({
                    ctx,
                    width: 900,
                    height: 600,
                    isDark: false,
                    params: {},
                    simulationResult: makeMockResult(),
                    currentTime: 99999
                })
            ).not.toThrow();
        });

        it(`${name}: 极小 canvas 尺寸不抛错`, () => {
            const { ctx } = createRecordingCanvas({ width: 100, height: 80 });
            expect(() =>
                fn({
                    ctx,
                    width: 100,
                    height: 80,
                    isDark: false,
                    params: {},
                    simulationResult: null,
                    currentTime: 0
                })
            ).not.toThrow();
        });
    }
});
