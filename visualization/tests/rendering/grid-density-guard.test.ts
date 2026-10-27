/**
 * 2D 网格密度守卫契约 (#159 高中核心逐节复核 · electric-field 阻断项根因)
 *
 * 背景 (实测, 非推演):
 *   修复前的 `electric-field` 切到 2D 板书模式后**主线程被彻底占死** ——
 *   headless 探针连续三次 `page.evaluate(() => 1)` 均 15s 超时,
 *   2D 画布永远无法成像 (基线批次因此缺 2 张 before 截图)。
 *
 * 根因 (`visualization/src/rendering/CanvasRenderer.ts`):
 *   `calcGridSpacing(scale)` 在没有任何 `t * scale` 落进 [40, 120] 时兜底 `return 1`,
 *   于是屏幕间距 = `1 * scale`。该场景修复前默认参数下轨迹 y 跨度 1.916e10 m,
 *   `CoordinateTransformer.autoFit` 得 scale ≈ 2.05e-8 px/m,
 *   `draw2DGrid` 的双重循环 `for (x += screenSpacing)` 迭代次数
 *   ≈ (786 / 2.05e-8) × (393 / 2.05e-8) ≈ **1.5e13 次** ⇒ 页面完全无响应。
 *
 * 修复: 屏幕间距加下限 {@link MIN_GRID_SCREEN_SPACING_PX} (8 px)。
 *   正常场景实测屏幕间距在 44~84 px 之间 (见 scripts/audit-grid-density.mts),
 *   全部 ≥ 8 ⇒ 对既有场景**零视觉影响**, 只兜住病态缩放。
 *
 * 契约 (先红后绿):
 *   - 病态缩放下屏幕间距必须被钳到下限
 *   - 正常缩放下屏幕间距与旧实现**逐位相等** (零视觉回归)
 *   - `drawGrid` 的网格点调用数必须有界 (旧实现 ≈ 1e6 ~ 1e13 次)
 */
import { describe, expect, it } from 'vitest';
import {
    CanvasRenderer,
    MAX_3D_GRID_LINES,
    MIN_GRID_SCREEN_SPACING_PX,
    calcGridScreenSpacing
} from '../../src/rendering/CanvasRenderer';
import { CoordinateTransformer } from '../../src/rendering/CoordinateTransformer';
import { createRecordingCanvas } from '../utils/canvasMock';

const W = 900;
const H = 600;

/** 旧实现 (无下限) 的屏幕间距 —— 用于断言「正常场景零视觉变化」 */
function legacyScreenSpacing(scale: number): number {
    const targets = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    for (const t of targets) {
        if (t * scale >= 40 && t * scale <= 120) return t * scale;
    }
    return 1 * scale;
}

/** 《高中核心》24 节实测的 2D autoFit 缩放 (px/m), 取自 scripts/audit-grid-density.mts */
const REAL_SCALES = [
    91.0, 44.4, 273.0, 111.0, 273.0, 273.0, 273.0, 273.0, 10.66, 27.3, 108.1, 273.0, 137.0, 136.5, 666.0, 68.25, 1.347,
    15.59, 150.9, 166.5, 6.19, 6.362, 2.016e-5, 1.11e2
];

function makeRenderer(scale: number) {
    const rec = createRecordingCanvas({ width: W, height: H });
    const transformer = new CoordinateTransformer(W, H, scale);
    const layers = {
        axes: true,
        grid: true,
        trajectory: true,
        velocityVector: true,
        accelerationVector: true,
        forceVector: true,
        energyLabels: true,
        bodyLabels: true
    };
    const renderer = new CanvasRenderer(rec.ctx, transformer, layers, false);
    return { rec, renderer };
}

describe('2D 网格密度守卫 (#159 electric-field 2D 挂死根因)', () => {
    it('病态缩放下屏幕间距被钳到下限, 循环次数有界', () => {
        // electric-field 修复前的真实缩放: 轨迹 y 跨度 1.916e10 m ⇒ scale ≈ 2.05e-8 px/m
        expect(calcGridScreenSpacing(2.05e-8)).toBe(MIN_GRID_SCREEN_SPACING_PX);
        // 另一个走通用渲染路径的病态缩放 (场景坐标跨度极大时)
        expect(calcGridScreenSpacing(2.016e-5)).toBe(MIN_GRID_SCREEN_SPACING_PX);

        // 行为级: 网格点 (arc) 调用数必须有界。
        // 先用「病态但可存活」的缩放 0.735 px/m —— 旧实现会画 ≈ 1e6 个点 (远超上限),
        // 旧实现在这里直接失败 (先红); 新实现钳到 8px 后只有 ≈ 8.5k 个点 (绿)。
        const { rec, renderer } = makeRenderer(0.735);
        renderer.drawGrid(W, H);
        expect(rec.counts['arc'] ?? 0).toBeLessThan(60000);

        // 真实病态缩放 (2.05e-8) 在新实现下同样有界
        const rec2 = createRecordingCanvas({ width: W, height: H });
        const renderer2 = new CanvasRenderer(
            rec2.ctx,
            new CoordinateTransformer(W, H, 2.05e-8),
            {
                axes: true,
                grid: true,
                trajectory: true,
                velocityVector: true,
                accelerationVector: true,
                forceVector: true,
                energyLabels: true,
                bodyLabels: true
            },
            false
        );
        renderer2.drawGrid(W, H);
        expect(rec2.counts['arc'] ?? 0).toBeLessThan(60000);
    });

    it('正常缩放下屏幕间距与旧实现逐位相等 (零视觉回归)', () => {
        for (const scale of REAL_SCALES) {
            const legacy = legacyScreenSpacing(scale);
            // 仅病态缩放会被下限接管; 其余必须逐位相等
            if (legacy >= MIN_GRID_SCREEN_SPACING_PX) {
                expect(calcGridScreenSpacing(scale)).toBe(legacy);
            } else {
                expect(calcGridScreenSpacing(scale)).toBe(MIN_GRID_SCREEN_SPACING_PX);
            }
        }
    });

    it('坐标轴刻度循环同样有界 (draw2DAxes)', () => {
        // 旧实现: 刻度循环与网格同源 (screenSpacing = gridSpacing * scale),
        // 病态缩放下同样是 1e10+ 次 ⇒ 一起拖死主线程。
        // 先用「病态但可存活」的 0.735 px/m —— 旧实现画 ≈ 1e6 个刻度 (远超上限) ⇒ 红;
        // 新实现钳到 8px 后只有 ≈ 190 个刻度 ⇒ 绿。
        const { rec, renderer } = makeRenderer(0.735);
        renderer.drawAxes(W, H);
        expect(rec.counts['fillText'] ?? 0).toBeLessThan(1000);

        // 真实病态缩放 (2.05e-8, electric-field 修复前) 在新实现下同样有界
        const rec2 = createRecordingCanvas({ width: W, height: H });
        const renderer2 = new CanvasRenderer(
            rec2.ctx,
            new CoordinateTransformer(W, H, 2.05e-8),
            {
                axes: true,
                grid: true,
                trajectory: true,
                velocityVector: true,
                accelerationVector: true,
                forceVector: true,
                energyLabels: true,
                bodyLabels: true
            },
            false
        );
        renderer2.drawAxes(W, H);
        expect(rec2.counts['fillText'] ?? 0).toBeLessThan(1000);
    });

    it('3D 网格刻度数有上界 (MAX_3D_GRID_LINES)', () => {
        // 3D 网格的刻度循环步长是**世界单位**, 世界跨度 = canvasW / baseScale;
        // baseScale 退化时循环同样会爆炸 ⇒ 按 worldSpan / MAX_3D_GRID_LINES 给下限。
        const rec = createRecordingCanvas({ width: W, height: H });
        const renderer = new CanvasRenderer(
            rec.ctx,
            new CoordinateTransformer(W, H, 0.05),
            {
                axes: true,
                grid: true,
                trajectory: true,
                velocityVector: true,
                accelerationVector: true,
                forceVector: true,
                energyLabels: true,
                bodyLabels: true
            },
            false
        );
        renderer.set3DEnabled(true, W, H);
        renderer.drawGrid(W, H);
        // 每个 x 刻度创建一次渐变 ⇒ 渐变数 == 刻度数
        expect(rec.counts['createLinearGradient'] ?? 0).toBeLessThanOrEqual(MAX_3D_GRID_LINES + 10);
    });

    it('网格点调用数在正常缩放下与旧实现一致', () => {
        // 按旧实现的起点偏移逻辑复算网格点数量 (旧实现: xStart/yStart 由原点取模得到)
        const expectedGridDots = (spacing: number): number => {
            const originX = W / 2;
            const originY = H / 2;
            const xStart = ((originX % spacing) + spacing) % spacing;
            const yStart = ((originY % spacing) + spacing) % spacing;
            let count = 0;
            for (let x = xStart; x < W; x += spacing) {
                for (let y = yStart; y < H; y += spacing) count++;
            }
            return count;
        };
        for (const scale of [44.4, 91.0, 111.0, 273.0]) {
            const { rec, renderer } = makeRenderer(scale);
            renderer.drawGrid(W, H);
            expect(rec.counts['arc'] ?? 0).toBe(expectedGridDots(legacyScreenSpacing(scale)));
        }
    });
});
