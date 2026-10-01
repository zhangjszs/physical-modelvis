import { describe, it, expect } from 'vitest';
import {
    physicsToWorld,
    worldToPhysics,
    snapToStep,
    snapVector,
    LAB_SNAP_STEP
} from '../../src/utils/compositionCoords';

describe('compositionCoords 组合实验台坐标工具', () => {
    it('physicsToWorld: 物理 z-up → three.js y-up', () => {
        // 物理 (x=1, y=2, z=3) → 世界 (1, 3, −2)
        expect(physicsToWorld({ x: 1, y: 2, z: 3 })).toEqual({ x: 1, y: 3, z: -2 });
    });

    it('worldToPhysics 与 physicsToWorld 严格互逆', () => {
        for (const v of [
            { x: 0.3, y: -0.7, z: 1.2 },
            { x: 0, y: 0, z: 0 },
            { x: -2.5, y: 0.05, z: 0.15 }
        ]) {
            expect(worldToPhysics(physicsToWorld(v))).toEqual(v);
        }
    });

    it('snapToStep: 四舍五入到 0.05m 网格并清理浮点尾尘', () => {
        expect(LAB_SNAP_STEP).toBe(0.05);
        expect(snapToStep(0.037)).toBeCloseTo(0.05, 10);
        expect(snapToStep(-0.037)).toBeCloseTo(-0.05, 10);
        expect(snapToStep(0.15000000000000002)).toBe(0.15);
        expect(snapToStep(0.5)).toBe(0.5);
    });

    it('snapVector: 三分量独立吸附', () => {
        expect(snapVector({ x: 0.037, y: 0.111, z: 0.7 })).toEqual({ x: 0.05, y: 0.1, z: 0.7 });
    });

    it('snapToStep 防御: 非法步长/非有限值原样返回', () => {
        expect(snapToStep(0.037, 0)).toBe(0.037);
        expect(snapToStep(Number.NaN)).toBeNaN();
    });
});
