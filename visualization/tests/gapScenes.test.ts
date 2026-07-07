/**
 * 缺口补建 8 渲染器冒烟测试 (Stage K)
 *
 * 用 fake CanvasRenderingContext2D 调用 8 个渲染函数, 覆盖两种分支:
 *   1. simulationResult = null (占位提示分支, 不应抛错)
 *   2. 带 extra / trajectories / charts 的 rich result (真实绘制分支, 不应抛错)
 *
 * 目的: 保障渲染函数在缺失/异常数据下不崩溃, 且满足 AGENTS.md「每个导出函数有测试」要求。
 */

import { describe, it, expect } from 'vitest';
import type { SimulationResult } from 'physics-core';
import {
    drawTotalInternalReflectionScene,
    drawCurrentMagneticFieldScene,
    drawElectricFieldLinesScene,
    drawNewtonTubeScene,
    drawBulbVIScene,
    drawWorkEnergyScene,
    drawBallXTimeScene,
    drawGeigerCounterScene
} from '../src/rendering/gapScenes';

function makeFakeCtx(): CanvasRenderingContext2D {
    const handler: ProxyHandler<object> = {
        get(_t: object, prop: string | symbol) {
            if (prop === 'measureText') return () => ({ width: 10 });
            if (prop === 'canvas') return { width: 800, height: 600 };
            return () => undefined;
        },
        set() {
            return true;
        }
    };
    return new Proxy({} as object, handler) as unknown as CanvasRenderingContext2D;
}

// 覆盖各渲染器读取字段的富结果
const rich = {
    extra: {
        fieldLines: [
            { points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0 }] },
            { points: [{ x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }] }
        ],
        samples: [
            { x: 0, y: 0, bx: 0, by: 1, magnitude: 1 },
            { x: 0.5, y: 0, ex: 1, ey: 0, magnitude: 1 },
            { x: -0.5, y: 0, ex: -1, ey: 0, magnitude: 1 }
        ],
        wire: { x: 0, y: 0 },
        poles: { north: { x: 0, y: 1 }, south: { x: 0, y: -1 } },
        plates: { top: 0.5, bottom: -0.5, left: -1, right: 1 },
        plateField: 100
    },
    trajectories: [
        [
            { t: 0, position: { x: 0.5, y: 1 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 },
            { t: 1, position: { x: 0, y: 0.5 }, velocity: { x: 0.5, y: 0 }, kineticEnergy: 1, potentialEnergy: 0 },
            { t: 2, position: { x: -0.5, y: 0 }, velocity: { x: -0.5, y: 0 }, kineticEnergy: 1, potentialEnergy: 0 }
        ]
    ],
    charts: {
        vx_t: { xLabel: 'U', yLabel: 'I', xUnit: 'V', yUnit: 'A', points: [{ x: 0, y: 0 }, { x: 6, y: 0.5 }, { x: 12, y: 0.8 }] },
        ke_t: { xLabel: 't', yLabel: 'Ek', xUnit: 's', yUnit: 'J', points: [{ x: 0, y: 0 }, { x: 3, y: 20 }] },
        x_t: { xLabel: 't', yLabel: 'N', xUnit: 's', yUnit: '个', points: [{ x: 0, y: 1000 }, { x: 25, y: 700 }, { x: 50, y: 500 }] },
        y_t: { xLabel: 't', yLabel: 'A', xUnit: 's', yUnit: 'Bq', points: [{ x: 0, y: 70 }, { x: 25, y: 49 }, { x: 50, y: 35 }] }
    },
    keyframes: [{ label: '正电荷 1', t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, description: '' }]
} as unknown as SimulationResult;

// 无极板的电场结果 (触发电荷符号绘制分支)
const electricNoPlates = {
    extra: {
        fieldLines: [{ points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }] }],
        samples: [{ x: 0, y: 0, ex: 1, ey: 0, magnitude: 1 }]
    },
    keyframes: [
        { label: '正电荷 1', t: 0, position: { x: 0.3, y: 0 }, velocity: { x: 0, y: 0 }, description: '' },
        { label: '负电荷 1', t: 0, position: { x: -0.3, y: 0 }, velocity: { x: 0, y: 0 }, description: '' }
    ]
} as unknown as SimulationResult;

const baseOpts = (result: SimulationResult | null) => ({
    ctx: makeFakeCtx(),
    width: 900,
    height: 600,
    isDark: false,
    params: { n1: 1.5, n2: 1.0, angle: 50, mode: 1, current: 5, turns: 10, radius: 0.6, q: 5, dipoleCharge: 5, dipoleSeparation: 1, plateVoltage: 12, plateGap: 1.2, withAir: 1, height: 5, g: 9.8, emf: 12, r: 1, R_bulb: 10, mass: 1, force: 5, v0: 0, length: 1, damping: 0, N0: 1000, halfLife: 10, tEnd: 50, rayType: 0, duration: 3 } as Record<string, number>,
    simulationResult: result,
    currentTime: 1
});

const renderers = [
    drawTotalInternalReflectionScene,
    drawCurrentMagneticFieldScene,
    drawElectricFieldLinesScene,
    drawNewtonTubeScene,
    drawBulbVIScene,
    drawWorkEnergyScene,
    drawBallXTimeScene,
    drawGeigerCounterScene
];

describe('Stage K: 缺口补建渲染器冒烟测试', () => {
    for (const fn of renderers) {
        it(`${fn.name} 在 result=null 时不抛错`, () => {
            expect(() => fn(baseOpts(null))).not.toThrow();
        });
        it(`${fn.name} 在 rich result 时不抛错`, () => {
            expect(() => fn(baseOpts(rich))).not.toThrow();
        });
    }

    it('drawElectricFieldLinesScene 无极板时绘制电荷符号不抛错', () => {
        expect(() => drawElectricFieldLinesScene(baseOpts(electricNoPlates))).not.toThrow();
    });
});
