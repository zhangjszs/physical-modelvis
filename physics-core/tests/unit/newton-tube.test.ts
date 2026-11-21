import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import type { TrajectoryPoint } from '../../src/types/result.js';
import { NewtonTubeModel } from '../../src/models/newton-tube.js';

interface NewtonTubeOpts {
    height: number;
    withAir: boolean;
    g?: number;
    duration?: number;
    sampleCount?: number;
    featherTerminalSpeed?: number;
}

function makeProblem(opts: NewtonTubeOpts): PhysicsProblem {
    return {
        id: 'test-newton-tube',
        model: 'newton-tube',
        bodies: [
            {
                id: 'coin',
                mass: { value: 1, unit: 'kg' },
                position: { x: 0, y: opts.height },
                velocity: { x: 0, y: 0 }
            },
            {
                id: 'feather',
                mass: { value: 0.01, unit: 'kg' },
                position: { x: 0, y: opts.height },
                velocity: { x: 0, y: 0 }
            }
        ],
        environment: { gravity: { enabled: true, value: opts.g ?? 9.8 } },
        constraints: {
            newtonTube: {
                height: opts.height,
                withAir: opts.withAir,
                featherTerminalSpeed: opts.featherTerminalSpeed
            }
        },
        timeConfig: { duration: opts.duration ?? 2, sampleCount: opts.sampleCount ?? 1000 }
    };
}

/** 下落距离 = H − y (触地后钳制为 0) */
function dropOf(traj: TrajectoryPoint[], i: number, H: number): number {
    return H - traj[i]!.position.y;
}

const model = new NewtonTubeModel();

describe('NewtonTubeModel: 牛顿管双体自由落体 (真空 vs 空气)', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('newton-tube');
        expect(model.name).toContain('牛顿管');
        expect(model.version).toBe('1.0.0');
    });

    it('真空: 两体同落, 每个采样时刻位置一致且同时触地', () => {
        const H = 5;
        const r = model.solve(makeProblem({ height: H, withAir: false, duration: 3 }));
        const [coin, feather] = r.trajectories;
        expect(coin!.length).toBeGreaterThan(2);
        expect(feather!.length).toBe(coin!.length);
        for (let i = 0; i < coin!.length; i++) {
            expect(feather![i]!.position.y).toBeCloseTo(coin![i]!.position.y, 9);
        }
        const tCoin = Math.sqrt((2 * H) / 9.8);
        expect(r.diagnostics.maxValues.coinLandTime).toBeCloseTo(tCoin, 6);
        expect(r.diagnostics.maxValues.featherLandTime).toBeCloseTo(tCoin, 6);
        expect(r.keyframes.map(k => k.label)).toContain('同时落地');
    });

    it('空气 (H=5, g=9.8, duration=2): 任意采样时刻羽毛下落距离 ≤ 硬币, t=1s 严格更小', () => {
        const H = 5;
        const r = model.solve(makeProblem({ height: H, withAir: true, duration: 2 }));
        const [coin, feather] = r.trajectories;
        for (let i = 0; i < coin!.length; i++) {
            const dCoin = dropOf(coin!, i, H);
            const dFeather = dropOf(feather!, i, H);
            expect(dFeather, `t=${coin![i]!.t}s 羽毛不得领先硬币`).toBeLessThanOrEqual(dCoin + 1e-12);
        }
        // t=1s: 硬币自由落体 4.9m, 羽毛受线性阻力明显滞后
        const idx1s = coin!.findIndex(p => Math.abs(p.t - 1) < 1e-9);
        expect(idx1s).toBeGreaterThanOrEqual(0);
        expect(dropOf(coin!, idx1s, H)).toBeCloseTo(4.9, 6);
        expect(dropOf(feather!, idx1s, H)).toBeLessThan(4.9);
        expect(dropOf(feather!, idx1s, H)).toBeGreaterThan(0);
    });

    it('duration 不变形: 0.5s 与 5s 时长在同一物理时刻 t=0.5s 两体位置一致', () => {
        const H = 5;
        for (const withAir of [false, true]) {
            const short = model.solve(makeProblem({ height: H, withAir, duration: 0.5 }));
            const long = model.solve(makeProblem({ height: H, withAir, duration: 5 }));
            const iShort = short.trajectories[0]!.findIndex(p => Math.abs(p.t - 0.5) < 1e-9);
            const iLong = long.trajectories[0]!.findIndex(p => Math.abs(p.t - 0.5) < 1e-9);
            expect(iShort).toBeGreaterThanOrEqual(0);
            expect(iLong).toBeGreaterThanOrEqual(0);
            for (const trajIdx of [0, 1]) {
                const yShort = short.trajectories[trajIdx]![iShort]!.position.y;
                const yLong = long.trajectories[trajIdx]![iLong]!.position.y;
                expect(yLong, `withAir=${withAir} traj=${trajIdx}`).toBeCloseTo(yShort, 9);
            }
            // 与解析值一致: 硬币 y(0.5) = H − ½·g·0.25
            expect(short.trajectories[0]![iShort]!.position.y).toBeCloseTo(H - 0.5 * 9.8 * 0.25, 6);
        }
    });

    it('落地后位置钳制于 y=0、速度与加速度归零 (硬币与空气羽毛)', () => {
        const H = 1;
        const r = model.solve(makeProblem({ height: H, withAir: true, duration: 5 }));
        const tCoin = r.diagnostics.maxValues.coinLandTime as number;
        const tFeather = r.diagnostics.maxValues.featherLandTime as number;
        expect(tFeather).toBeGreaterThan(tCoin);
        for (const [trajIdx, tLand] of [
            [0, tCoin],
            [1, tFeather]
        ] as const) {
            const traj = r.trajectories[trajIdx]!;
            const after = traj.filter(p => p.t > tLand + 1e-9);
            expect(after.length, `traj ${trajIdx} 应有落地后采样点`).toBeGreaterThan(0);
            for (const p of after) {
                expect(p.position.y).toBe(0);
                expect(p.velocity.y).toBe(0);
                expect(p.acceleration?.y ?? 0).toBe(0);
            }
        }
        // 空气羽毛落地关键帧存在
        expect(r.keyframes.map(k => k.label)).toContain('硬币落地');
        expect(r.keyframes.map(k => k.label)).toContain('羽毛落地');
        expect(r.keyframes.map(k => k.label)).toContain('终点');
        expect(r.keyframes.map(k => k.label)).toContain('释放');
    });

    it('不同 g / height 单调性: g 越大落地越早, H 越高落地越晚', () => {
        const tLand = (opts: NewtonTubeOpts) =>
            model.solve(makeProblem(opts)).diagnostics.maxValues.coinLandTime as number;
        expect(tLand({ height: 5, withAir: true, g: 25 })).toBeLessThan(tLand({ height: 5, withAir: true, g: 9.8 }));
        expect(tLand({ height: 8, withAir: true, g: 9.8 })).toBeGreaterThan(
            tLand({ height: 3, withAir: true, g: 9.8 })
        );
        // 空气: 羽毛落地时刻随 v_t 增大而提前, 且恒晚于硬币
        const featherLand = (vT: number) =>
            model.solve(makeProblem({ height: 1, withAir: true, duration: 10, featherTerminalSpeed: vT })).diagnostics
                .maxValues.featherLandTime as number;
        expect(featherLand(3.2)).toBeLessThan(featherLand(1.6));
        expect(featherLand(1.6)).toBeGreaterThan(
            model.solve(makeProblem({ height: 1, withAir: true, duration: 10 })).diagnostics.maxValues
                .coinLandTime as number
        );
    });

    it('诊断与图表通道: maxValues 五键齐全, 产出 x_t/y_t/v1_t/v2_t', () => {
        const H = 5;
        const r = model.solve(makeProblem({ height: H, withAir: true, duration: 2 }));
        expect(r.diagnostics.maxValues.height).toBe(H);
        expect(r.diagnostics.maxValues.g).toBe(9.8);
        expect(typeof r.diagnostics.maxValues.coinLandTime).toBe('number');
        expect(typeof r.diagnostics.maxValues.featherLandTime).toBe('number');
        expect(r.diagnostics.maxValues.featherTerminalSpeed).toBe(1.6);
        expect(r.trajectories.length).toBe(2);
        for (const key of ['x_t', 'y_t', 'v1_t', 'v2_t'] as const) {
            const series = r.charts[key];
            expect(series, `charts.${key} 应产出`).toBeDefined();
            expect(series!.points.length).toBeGreaterThan(2);
            expect(series!.points[0]!.y).toBeCloseTo(0, 6);
        }
        // 图表下落距离与轨迹一致 (t=0 → 0)
        expect(r.charts.x_t!.points.length).toBe(r.trajectories[0]!.length);
    });
});
