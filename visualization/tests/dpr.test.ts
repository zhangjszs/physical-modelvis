import { describe, it, expect, afterEach } from 'vitest';
import { setupHiDPICanvas } from '../src/rendering/dpr';

/**
 * 验证高 DPI 缩放工具的核心不变量：
 *  - 后备缓冲区（canvas.width/height）= 逻辑 CSS 尺寸 × devicePixelRatio（四舍五入）
 *  - CSS 显示尺寸（canvas.style.width/height）= 逻辑 CSS 尺寸
 *  - 返回值 = 实际使用的 dpr，供调用方设置 ctx.setTransform(dpr,...)
 */
describe('setupHiDPICanvas (高 DPI 缩放)', () => {
    afterEach(() => {
        // 移除实例上的桩属性，恢复 jsdom 默认 devicePixelRatio getter
        delete (window as unknown as { devicePixelRatio?: number }).devicePixelRatio;
    });

    function stubDpr(value: number) {
        Object.defineProperty(window, 'devicePixelRatio', {
            get: () => value,
            configurable: true
        });
    }

    it('dpr=1 时后备缓冲区与 CSS 尺寸一致，返回 1', () => {
        stubDpr(1);
        const canvas = document.createElement('canvas');
        const dpr = setupHiDPICanvas(canvas, 600, 400);
        expect(dpr).toBe(1);
        expect(canvas.width).toBe(600);
        expect(canvas.height).toBe(400);
        expect(canvas.style.width).toBe('600px');
        expect(canvas.style.height).toBe('400px');
    });

    it('dpr=2 时后备缓冲区放大 2 倍，CSS 显示尺寸仍为逻辑像素', () => {
        stubDpr(2);
        const canvas = document.createElement('canvas');
        const dpr = setupHiDPICanvas(canvas, 600, 400);
        expect(dpr).toBe(2);
        expect(canvas.width).toBe(1200);
        expect(canvas.height).toBe(800);
        expect(canvas.style.width).toBe('600px');
        expect(canvas.style.height).toBe('400px');
    });

    it('dpr=3 时后备缓冲区放大 3 倍', () => {
        stubDpr(3);
        const canvas = document.createElement('canvas');
        const dpr = setupHiDPICanvas(canvas, 200, 100);
        expect(dpr).toBe(3);
        expect(canvas.width).toBe(600);
        expect(canvas.height).toBe(300);
    });

    it('分数 CSS 尺寸按 dpr 四舍五入为设备像素', () => {
        stubDpr(2);
        const canvas = document.createElement('canvas');
        setupHiDPICanvas(canvas, 300.4, 200.6);
        // round(300.4*2)=round(600.8)=601; round(200.6*2)=round(401.2)=401
        expect(canvas.width).toBe(601);
        expect(canvas.height).toBe(401);
    });

    it('无 window（SSR）时安全回退到 dpr=1', () => {
        // 模拟 typeof window === 'undefined'
        const originalWindow = globalThis.window;
        // @ts-expect-error 临时隐藏 window 以触发回退分支
        globalThis.window = undefined;
        try {
            const canvas = { width: 0, height: 0, style: {} } as unknown as HTMLCanvasElement;
            const dpr = setupHiDPICanvas(canvas, 100, 100);
            expect(dpr).toBe(1);
            expect(canvas.width).toBe(100);
            expect(canvas.height).toBe(100);
        } finally {
            globalThis.window = originalWindow;
        }
    });
});
