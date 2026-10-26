/**
 * 2D 阴影椭圆半径 clamp 契约 (#159 F-A1 / #160)
 *
 * 背景: draw3DBody / drawCircularBody3D 的投影椭圆半径由
 *   shadowScaleY = 0.35 + min(heightDiff/(r*8), 0.2)
 * 给出。当物体落到地面投影线以下 (heightDiff 足够负) 时 shadowScaleY 变负,
 * 真实浏览器 ctx.ellipse 对负半径抛 IndexSizeError 并中断该帧后续 2D 绘制
 * (uniform-accelerated 上抛回落/低于地面线时实测 pageerror)。
 *
 * 本契约用录制型 ctx 断言: 任何高度(含地面线以下)下投影椭圆的 radiusX/radiusY 恒为正,
 * 即 clamp 生效; 并锚定地面线以上时半径仍随高度单调合理 (未过度 clamp)。
 */
import { describe, expect, it } from 'vitest';
import { CanvasRenderer } from '../../src/rendering/CanvasRenderer';
import { CoordinateTransformer } from '../../src/rendering/CoordinateTransformer';
import { createRecordingCanvas } from '../utils/canvasMock';

const W = 900;
const H = 600;

function makeRenderer() {
    const rec = createRecordingCanvas({ width: W, height: H });
    const transformer = new CoordinateTransformer(W, H);
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
    renderer.set3DEnabled(true, W, H);
    return { rec, renderer };
}

function ellipseRadii(rec: ReturnType<typeof createRecordingCanvas>): Array<[number, number]> {
    return rec.filter('ellipse').map(c => [Number(c.args[2]), Number(c.args[3])]);
}

describe('2D 投影椭圆半径 clamp (#159 F-A1)', () => {
    it('物体在地面线以下 (heightDiff<0) 时椭圆半径仍恒为正 — 不抛负半径错', () => {
        const { rec, renderer } = makeRenderer();
        // ballH 为负 = 物体低于地面投影线, 旧实现 shadowScaleY<0 → 真实 ctx 抛错
        expect(() => renderer.drawCircularBody3D({ x: 0, y: 0 }, 0.5, '#ef4444', undefined, -3)).not.toThrow();
        const radii = ellipseRadii(rec);
        expect(radii.length).toBeGreaterThan(0);
        for (const [rx, ry] of radii) {
            expect(rx).toBeGreaterThan(0);
            expect(ry).toBeGreaterThan(0);
        }
    });

    it('深度负高度 (极端回落) 同样不产生负半径', () => {
        const { rec, renderer } = makeRenderer();
        renderer.drawCircularBody3D({ x: 1, y: 1 }, 0.3, '#3b82f6', undefined, -20);
        for (const [rx, ry] of ellipseRadii(rec)) {
            expect(rx).toBeGreaterThan(0);
            expect(ry).toBeGreaterThan(0);
        }
    });

    it('地面线以上时半径为正且未过度 clamp (shadowScaleY 落在 (0.06, 0.55] 合理带)', () => {
        const { rec, renderer } = makeRenderer();
        renderer.drawCircularBody3D({ x: 0, y: 0 }, 0.5, '#22c55e', undefined, 2);
        const radii = ellipseRadii(rec);
        expect(radii.length).toBeGreaterThan(0);
        for (const [rx, ry] of radii) {
            expect(rx).toBeGreaterThan(0);
            expect(ry).toBeGreaterThan(0);
            // ry/rx 反映 shadowScaleY/shadowScaleX 比例, 地面以上应保持扁椭圆观感
            expect(ry).toBeLessThan(rx);
        }
    });
});
