/**
 * 缺口补建 8 场景 — 端到端集成测试
 *
 * 与 gapScenes.test.ts (手写假数据冒烟) 的本质区别: 本文件走**真实链路**
 *   sceneRegistry.buildProblem(defaultParams) → physics-core.solveProblem → 真实 SimulationResult
 * 再喂给每个渲染器, 验证:
 *   1. 求解器确实产出了渲染器所消费的通道 (extra / trajectories / charts);
 *   2. 渲染器在真实数据下不抛错、不落占位符、真的画了内容;
 *   3. 关键物理量端到端自洽 (W=ΔEk、牛顿管归一化、盖革 N(0)=N0、平行板标注…)。
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- 集成测试需结构访问 physics-core 松散类型的 extra/charts 通道; tests/ 不在 CI lint 覆盖范围内 */
import { describe, it, expect } from 'vitest';
import { solveProblem } from 'physics-core';
import type { SimulationResult } from 'physics-core';
import { SCENES, getDefaultParams } from '../src/scenes/sceneRegistry';
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

const GAP_IDS = [
    'total-internal-reflection',
    'current-magnetic',
    'efield-lines',
    'newton-tube',
    'bulb-vi',
    'work-energy',
    'ball-xt',
    'geiger-counter'
] as const;

type GapId = (typeof GAP_IDS)[number];

const RENDERERS: Record<GapId, (o: any) => void> = {
    'total-internal-reflection': drawTotalInternalReflectionScene,
    'current-magnetic': drawCurrentMagneticFieldScene,
    'efield-lines': drawElectricFieldLinesScene,
    'newton-tube': drawNewtonTubeScene,
    'bulb-vi': drawBulbVIScene,
    'work-energy': drawWorkEnergyScene,
    'ball-xt': drawBallXTimeScene,
    'geiger-counter': drawGeigerCounterScene
};

// 每个渲染器所依赖的求解器输出通道 (缺一个都说明 buildProblem↔渲染器契约漂移)
const CHANNEL_CHECKS: Partial<Record<GapId, (r: SimulationResult) => boolean>> = {
    'current-magnetic': r => {
        const ex = r.extra as any;
        // straight-wire 模式发 wire, coil/solenoid 模式发 poles — 二者互斥, 至少有其一
        const hasWireOrPoles = !!(ex?.wire) || !!(ex?.poles);
        return (
            !!ex &&
            Array.isArray(ex.fieldLines) &&
            ex.fieldLines.length > 0 &&
            Array.isArray(ex.samples) &&
            ex.samples.length > 0 &&
            hasWireOrPoles
        );
    },
    'efield-lines': r =>
        !!r.extra &&
        Array.isArray((r.extra as any).fieldLines) &&
        (r.extra as any).fieldLines.length > 0 &&
        Array.isArray((r.extra as any).samples) &&
        (r.extra as any).samples.length > 0,
    'newton-tube': r => Array.isArray(r.trajectories) && r.trajectories.length > 0 && (r.trajectories[0]?.length ?? 0) > 0,
    'bulb-vi': r => !!(r.charts as any)?.vx_t?.points?.length,
    'work-energy': r => !!(r.charts as any)?.ke_t?.points?.length,
    'ball-xt': r => Array.isArray(r.trajectories) && r.trajectories.length > 0 && (r.trajectories[0]?.length ?? 0) > 0,
    'geiger-counter': r => !!(r.charts as any)?.x_t?.points?.length && !!(r.charts as any)?.y_t?.points?.length
};

/** 记录型假 ctx: 统计画布调用次数并捕获 fillText 文本, 用于断言"真的画了内容"。 */
function makeRecordingCtx(): { ctx: any; calls: Record<string, number>; texts: string[] } {
    const calls: Record<string, number> = {};
    const texts: string[] = [];
    const record = (name: string) => {
        calls[name] = (calls[name] ?? 0) + 1;
    };
    const canvasObj = { width: 900, height: 600 };
    const handler: ProxyHandler<object> = {
        get(_t: object, prop: string | symbol) {
            if (prop === 'canvas') return canvasObj;
            if (prop === 'measureText') return (s: unknown) => ({ width: String(s).length * 6 });
            if (prop === 'fillText' || prop === 'strokeText') {
                return (s: unknown) => {
                    record(String(prop));
                    if (typeof s === 'string') texts.push(s);
                };
            }
            if (typeof prop === 'symbol') return undefined;
            return (..._args: unknown[]) => {
                record(String(prop));
            };
        },
        set() {
            return true;
        }
    };
    return { ctx: new Proxy({} as object, handler), calls, texts };
}

function solveScene(id: GapId): { result: SimulationResult; params: Record<string, number> } {
    const scene = SCENES.find(s => s.id === id);
    if (!scene) throw new Error(`scene ${id} not found in SCENES`);
    const params = getDefaultParams(id);
    const problem = scene.buildProblem(params);
    const result = solveProblem(problem);
    return { result, params };
}

describe('缺口 8 场景 — 端到端链路 (buildProblem → solveProblem → 渲染)', () => {
    for (const id of GAP_IDS) {
        it(`${id}: 求解器产出渲染器所需数据通道`, () => {
            const { result } = solveScene(id);
            const check = CHANNEL_CHECKS[id];
            if (check) expect(check(result), `求解器输出缺少 ${id} 渲染器所需通道`).toBe(true);
            else expect(result).toBeTruthy();
        });

        it(`${id}: 真实结果驱动渲染且不落占位符、真的画了内容`, () => {
            const { result, params } = solveScene(id);
            const dur = params['duration'] ?? params['tEnd'] ?? 3;
            const { ctx, calls, texts } = makeRecordingCtx();
            const fn = RENDERERS[id];
            expect(() =>
                fn({ ctx, width: 900, height: 600, isDark: false, params, simulationResult: result, currentTime: dur * 0.5 })
            ).not.toThrow();
            expect(texts, `${id} 不应落占位符`).not.toContain('点击「运行仿真」开始');
            expect(calls.fillText, `${id} 应绘制 ≥3 处文字`).toBeGreaterThanOrEqual(3);
            expect(calls.beginPath, `${id} 应发出路径构建`).toBeGreaterThanOrEqual(1);
            expect((calls.stroke ?? 0) + (calls.fill ?? 0), `${id} 应发出绘制调用`).toBeGreaterThanOrEqual(1);
        });
    }
});

describe('场景行为正确性 (端到端物理自洽)', () => {
    it('动能定理: 默认 v0=0, 真实 ke_t 与手算 W 自洽 → HUD 显示 W=ΔEk ✓', () => {
        const { result, params } = solveScene('work-energy');
        const { ctx, texts } = makeRecordingCtx();
        drawWorkEnergyScene({
            ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: result,
            currentTime: params['duration'] ?? 3
        });
        expect(texts.some(t => t.includes('W=ΔEk') && t.includes('✓'))).toBe(true);
    });

    it('动能定理: v0=2 时仍自洽 (复测初速度修复, 否则 W≠ΔEk 会显示 …)', () => {
        const scene = SCENES.find(s => s.id === 'work-energy')!;
        const params: Record<string, number> = { ...getDefaultParams('work-energy'), v0: 2 };
        const result = solveProblem(scene.buildProblem(params));
        const { ctx, texts } = makeRecordingCtx();
        drawWorkEnergyScene({
            ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: result,
            currentTime: params['duration'] ?? 3
        });
        expect(texts.some(t => t.includes('W=ΔEk') && t.includes('✓'))).toBe(true);
    });

    it('牛顿管: 真实轨迹归一化 — t=0 硬币在顶(0.00 m), t=duration 到底(height m)', () => {
        const scene = SCENES.find(s => s.id === 'newton-tube')!;
        const params = getDefaultParams('newton-tube');
        const height = params['height'] ?? 5;
        const duration = params['duration'] ?? 2;
        const result = solveProblem(scene.buildProblem(params));

        const at0 = makeRecordingCtx();
        drawNewtonTubeScene({
            ctx: at0.ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: result,
            currentTime: 0
        });
        expect(at0.texts.some(t => t.includes('硬币 = 0.00 m'))).toBe(true);

        const atEnd = makeRecordingCtx();
        drawNewtonTubeScene({
            ctx: atEnd.ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: result,
            currentTime: duration
        });
        expect(atEnd.texts.some(t => t.includes(`硬币 = ${height.toFixed(2)} m`))).toBe(true);
    });

    it('盖革计数器: t=0 时 N(t)=N0 (初始原子数)', () => {
        const { result, params } = solveScene('geiger-counter');
        const N0 = params['N0'];
        const { ctx, texts } = makeRecordingCtx();
        drawGeigerCounterScene({
            ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: result,
            currentTime: 0
        });
        expect(texts.some(t => t.includes(`N(t) = ${N0}`))).toBe(true);
    });

    it('电场线: 平行板模式 (mode=2) 渲染板间匀强场标注', () => {
        const scene = SCENES.find(s => s.id === 'efield-lines')!;
        const params = { ...getDefaultParams('efield-lines'), mode: 2 };
        const result = solveProblem(scene.buildProblem(params));
        const { ctx, texts } = makeRecordingCtx();
        drawElectricFieldLinesScene({
            ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: result,
            currentTime: 0
        });
        expect(texts.some(t => t.includes('板间匀强场'))).toBe(true);
    });

    it('全反射: n1>n2 且入射角>临界角 → 画面标注「全反射」', () => {
        const params = { ...getDefaultParams('total-internal-reflection'), n1: 1.5, n2: 1.0, angle: 50, mode: 1 };
        const { ctx, texts } = makeRecordingCtx();
        drawTotalInternalReflectionScene({
            ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: null,
            currentTime: 0
        });
        expect(texts.some(t => t.includes('全反射'))).toBe(true);
    });

    it('小球 x-t: 小摆角(θ₀=15°)下实测周期 ≈ 小角度公式 (误差 < 5%)', () => {
        const { result, params } = solveScene('ball-xt');
        const { ctx, texts } = makeRecordingCtx();
        drawBallXTimeScene({
            ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: result,
            currentTime: params['duration'] ?? 10
        });
        const L = params['length'] ?? 1;
        const g = params['g'] ?? 9.8;
        const Tsmall = 2 * Math.PI * Math.sqrt(L / g);
        const tRow = texts.find(t => t.startsWith('T = '));
        expect(tRow, 'HUD 应包含 T 行').toBeDefined();
        const Tshown = parseFloat(tRow!.replace('T = ', ''));
        expect(Math.abs(Tshown - Tsmall)).toBeLessThan(Tsmall * 0.05);
    });

    it('小球 x-t: 大摆角(θ₀=80°)下 HUD 的 T 反映真实(非线性)周期, 而非小角度公式', () => {
        const scene = SCENES.find(s => s.id === 'ball-xt')!;
        const params: Record<string, number> = { ...getDefaultParams('ball-xt'), angle: 80 };
        const result = solveProblem(scene.buildProblem(params));
        const { ctx, texts } = makeRecordingCtx();
        drawBallXTimeScene({
            ctx,
            width: 900,
            height: 600,
            isDark: false,
            params,
            simulationResult: result,
            currentTime: params['duration'] ?? 10
        });
        const L = params['length'] ?? 1;
        const g = params['g'] ?? 9.8;
        const Tsmall = 2 * Math.PI * Math.sqrt(L / g);
        const tRow = texts.find(t => t.startsWith('T = '));
        expect(tRow, 'HUD 应包含 T 行').toBeDefined();
        const Tshown = parseFloat(tRow!.replace('T = ', ''));
        // 80° 单摆真实(非线性)周期约为小角度值的 1.15 倍 (椭圆积分), 远大于小角度公式本身
        // 阈值 1.1 证明 HUD 报的是实测周期而非写死的小角度值; 1.25 上限排除异常偏差
        expect(Tshown).toBeGreaterThan(Tsmall * 1.1);
        expect(Tshown).toBeLessThan(Tsmall * 1.25);
        expect(tRow).not.toContain('小角度估算'); // 时长足够应能实测, 不回退
    });
});
