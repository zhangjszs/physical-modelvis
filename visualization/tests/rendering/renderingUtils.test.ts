/**
 * renderingUtils 单元测试。
 *
 * P0-A.1 阶段只做：
 * 1. 纯函数（shadeColor / clamp / textColor / mutedColor / panelFill）的边界值测试
 * 2. 绘制函数（drawTitle / drawHud / drawArrow / drawBlock 等）的烟雾测试（不抛错）
 * 3. getFrame 的边界条件测试
 *
 * 绘制函数的完整 snapshot 测试在 P0-B.1 用 canvasMock 完成。
 */

import { describe, it, expect } from 'vitest';
import {
    COLORS,
    shadeColor,
    textColor,
    mutedColor,
    panelFill,
    clamp,
    roundRectPath,
    clearScene,
    drawTitle,
    drawSubtitle,
    drawHud,
    drawInfoBar,
    drawEmptyState,
    drawArrow,
    drawBlock,
    draw3DBlock,
    drawGround,
    getFrame
} from '../../src/rendering/renderingUtils';
import type { SimulationResult } from 'physics-core';

/**
 * 简易 no-op ctx，仅做烟雾测试。
 * 完整带记录的 canvasMock 在 P0-B.1 的 tests/utils/canvasMock.ts。
 */
function createNoopCtx(): CanvasRenderingContext2D {
    const handler: ProxyHandler<object> = {
        get(_t, prop) {
            if (prop === 'measureText') return () => ({ width: 100 });
            if (prop === 'canvas') return { width: 900, height: 600 };
            if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
                return () => ({ addColorStop: () => undefined });
            }
            if (typeof prop === 'symbol') return undefined;
            return () => undefined;
        },
        set() {
            return true;
        }
    };
    return new Proxy({} as object, handler) as unknown as CanvasRenderingContext2D;
}

// ============================================================
// Group 1: 颜色常量
// ============================================================

describe('COLORS', () => {
    it('全部颜色值为合法 6 位 hex', () => {
        for (const [name, value] of Object.entries(COLORS)) {
            expect(value, `${name} 应为 #rrggbb 格式`).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });

    it('包含 mechanics 基线的 5 种颜色', () => {
        expect(COLORS.BLUE).toBe('#3b82f6');
        expect(COLORS.GREEN).toBe('#22c55e');
        expect(COLORS.ORANGE).toBe('#f59e0b');
        expect(COLORS.RED).toBe('#ef4444');
        expect(COLORS.PURPLE).toBe('#a855f7');
    });

    it('包含 electromagnetismScenes 用到的 CYAN', () => {
        expect(COLORS.CYAN).toBe('#06b6d4');
    });
});

// ============================================================
// Group 2: 颜色辅助函数
// ============================================================

describe('shadeColor', () => {
    it('6 位 hex 加深 10', () => {
        // r=0x3b=59-10=49=0x31, g=0x82=130-10=120=0x78, b=0xf6=246-10=236=0xEC
        expect(shadeColor('#3b82f6', -10)).toBe('#3178ec');
    });

    it('6 位 hex 变亮 10', () => {
        // r=59+10=69=0x45, g=130+10=140=0x8C, b=246+10=256→255=0xFF
        expect(shadeColor('#3b82f6', 10)).toBe('#458cff');
    });

    it('3 位 hex 自动展开为 6 位', () => {
        expect(shadeColor('#fff', -10)).toBe('#f5f5f5');
        expect(shadeColor('#000', 10)).toBe('#0a0a0a');
    });

    it('amount 正向超出 255 时钳到 0xFF', () => {
        // 59+300=359→255, 130+300=430→255, 246+300=546→255
        expect(shadeColor('#3b82f6', 300)).toBe('#ffffff');
    });

    it('amount 负向超出 0 时钳到 0x00', () => {
        // 59-300=-241→0, 130-300=-170→0, 246-300=-54→0
        expect(shadeColor('#3b82f6', -300)).toBe('#000000');
    });

    it('amount=0 时颜色不变', () => {
        expect(shadeColor('#3b82f6', 0)).toBe('#3b82f6');
        expect(shadeColor('#abcdef', 0)).toBe('#abcdef');
    });
});

describe('textColor / mutedColor / panelFill', () => {
    it('textColor 返回主题主文字色', () => {
        expect(textColor(true)).toBe('#e2e8f0');
        expect(textColor(false)).toBe('#1e293b');
    });

    it('mutedColor 返回主题次要文字色', () => {
        expect(mutedColor(true)).toBe('#94a3b8');
        expect(mutedColor(false)).toBe('#64748b');
    });

    it('panelFill 返回 rgba 字符串', () => {
        expect(panelFill(true)).toBe('rgba(15,23,42,0.75)');
        expect(panelFill(false)).toBe('rgba(255,255,255,0.86)');
    });
});

// ============================================================
// Group 3: 几何辅助函数
// ============================================================

describe('clamp', () => {
    it('正常区间内值不变', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(0, 0, 10)).toBe(0);
        expect(clamp(10, 0, 10)).toBe(10);
    });

    it('小于 min 时返回 min', () => {
        expect(clamp(-1, 0, 10)).toBe(0);
        expect(clamp(-100, 0, 10)).toBe(0);
    });

    it('大于 max 时返回 max', () => {
        expect(clamp(11, 0, 10)).toBe(10);
        expect(clamp(1000, 0, 10)).toBe(10);
    });

    it('min > max 时返回 max（Math.min 优先于 Math.max）', () => {
        // clamp(5, 10, 0) = Math.max(10, Math.min(0, 5)) = Math.max(10, 0) = 10
        expect(clamp(5, 10, 0)).toBe(10);
    });
});

describe('roundRectPath', () => {
    it('r 过大时被钳到 min(r, w/2, h/2) 不抛错', () => {
        const ctx = createNoopCtx();
        expect(() => roundRectPath(ctx, 0, 0, 100, 50, 999)).not.toThrow();
    });

    it('r=0 时退化为矩形不抛错', () => {
        const ctx = createNoopCtx();
        expect(() => roundRectPath(ctx, 0, 0, 100, 50, 0)).not.toThrow();
    });

    it('负 w/h 不抛错（防 NaN）', () => {
        const ctx = createNoopCtx();
        // r=min(r, w/2, h/2) 当 w=-10 时 w/2=-5，r 取负值；arcTo 接受负数但不抛错
        expect(() => roundRectPath(ctx, 0, 0, -10, -10, 5)).not.toThrow();
    });

    it('记录型 ctx 应能捕获 beginPath/moveTo/arcTo/closePath 调用', () => {
        const calls: string[] = [];
        const ctx = new Proxy({} as object, {
            get(_t, prop) {
                if (typeof prop === 'symbol') return undefined;
                if (prop === 'measureText') return () => ({ width: 100 });
                return () => {
                    calls.push(String(prop));
                };
            },
            set() {
                return true;
            }
        }) as unknown as CanvasRenderingContext2D;
        roundRectPath(ctx, 10, 20, 100, 50, 8);
        // 应至少调用 beginPath / moveTo / arcTo*4 / closePath
        expect(calls).toContain('beginPath');
        expect(calls.filter(c => c === 'arcTo').length).toBe(4);
        expect(calls).toContain('closePath');
    });
});

// ============================================================
// Group 4: 通用绘制组件（烟雾测试）
// ============================================================

describe('drawing functions — 烟雾测试（P0-A.1）', () => {
    // 完整 snapshot 测试在 P0-B.1 用 canvasMock 完成
    const ctx = createNoopCtx();

    it('clearScene 不抛错', () => {
        expect(() => clearScene(ctx, 900, 600, false)).not.toThrow();
        expect(() => clearScene(ctx, 900, 600, true)).not.toThrow();
    });

    describe('drawTitle', () => {
        it('默认参数（mechanics 风格 15px / y=24）', () => {
            expect(() => drawTitle(ctx, '标题', 900, false)).not.toThrow();
        });
        it('opts 覆盖（waveOpt 风格 20px / y=32）', () => {
            expect(() => drawTitle(ctx, '标题', 900, true, { size: 20, y: 32 })).not.toThrow();
        });
        it('gap 风格 18px', () => {
            expect(() => drawTitle(ctx, '标题', 900, false, { size: 18 })).not.toThrow();
        });
    });

    it('drawSubtitle 不抛错', () => {
        expect(() => drawSubtitle(ctx, '副标题', 10, 50, false)).not.toThrow();
    });

    describe('drawHud', () => {
        it('默认参数（mechanics 风格 boxW=190）', () => {
            expect(() => drawHud(ctx, false, [{ label: 'v', value: '10m/s' }])).not.toThrow();
        });
        it('opts 覆盖（boxW=210, lineH=16, padding=10）', () => {
            expect(() =>
                drawHud(
                    ctx,
                    true,
                    [
                        { label: 'v', value: '10m/s' },
                        { label: 'a', value: '2m/s²' }
                    ],
                    { boxW: 210, lineH: 16, padding: 10 }
                )
            ).not.toThrow();
        });
        it('空 rows 数组不抛错', () => {
            expect(() => drawHud(ctx, false, [])).not.toThrow();
        });
    });

    describe('drawInfoBar', () => {
        it('默认参数（height=24, yOffset=36）', () => {
            expect(() => drawInfoBar(ctx, 900, 600, '提示文字', false)).not.toThrow();
        });
        it('opts 覆盖（height=22, yOffset=34）', () => {
            expect(() => drawInfoBar(ctx, 900, 600, '提示文字', true, { height: 22, yOffset: 34 })).not.toThrow();
        });
    });

    describe('drawEmptyState', () => {
        it('默认文案', () => {
            expect(() => drawEmptyState(ctx, 900, 600, false)).not.toThrow();
        });
        it('自定义文案', () => {
            expect(() => drawEmptyState(ctx, 900, 600, true, '请选择场景')).not.toThrow();
        });
    });

    describe('drawArrow', () => {
        it('长度>3 时正常画', () => {
            expect(() => drawArrow(ctx, 0, 0, 100, 100, '#ef4444')).not.toThrow();
        });
        it('长度<3 时跳过不画', () => {
            expect(() => drawArrow(ctx, 0, 0, 1, 1, '#ef4444')).not.toThrow();
        });
        it('带 label 文字', () => {
            expect(() => drawArrow(ctx, 0, 0, 100, 100, '#ef4444', 'F')).not.toThrow();
        });
        it('opts.headScale 覆盖', () => {
            expect(() => drawArrow(ctx, 0, 0, 100, 100, '#ef4444', undefined, { headScale: 0.5 })).not.toThrow();
        });
    });

    it('drawBlock 带 label', () => {
        expect(() => drawBlock(ctx, 100, 100, 50, 50, '#3b82f6', false, 'm=1kg')).not.toThrow();
    });

    it('drawBlock 不带 label', () => {
        expect(() => drawBlock(ctx, 100, 100, 50, 50, '#3b82f6', true)).not.toThrow();
    });

    it('draw3DBlock 带 label', () => {
        expect(() => draw3DBlock(ctx, 100, 100, 50, 50, '#22c55e', false, 'block')).not.toThrow();
    });

    it('drawGround 不抛错', () => {
        expect(() => drawGround(ctx, 500, 900, false)).not.toThrow();
        expect(() => drawGround(ctx, 500, 900, true)).not.toThrow();
    });
});

// ============================================================
// Group 5: getFrame 取帧辅助
// ============================================================

describe('getFrame', () => {
    it('simulationResult=null 返回 null', () => {
        expect(getFrame(null, 1.0)).toBeNull();
    });

    it('空 trajectories 数组返回 null', () => {
        const result = { trajectories: [] } as unknown as SimulationResult;
        expect(getFrame(result, 1.0)).toBeNull();
    });

    it('trajectories[0] 为空数组返回 null', () => {
        const result = { trajectories: [[]] } as unknown as SimulationResult;
        expect(getFrame(result, 1.0)).toBeNull();
    });

    it('trajectories[1] 为空但 trajectoryIndex=0 也返回 null（index 越界）', () => {
        const result = {
            trajectories: [[{ t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }]]
        } as unknown as SimulationResult;
        expect(getFrame(result, 0, 999)).toBeNull();
    });

    it('单点 trajectory 返回插值后的点', () => {
        const point = {
            t: 0,
            position: { x: 5, y: 10 },
            velocity: { x: 1, y: 0 }
        };
        const result = { trajectories: [[point]] } as unknown as SimulationResult;
        const frame = getFrame(result, 0);
        expect(frame).not.toBeNull();
        expect(frame?.position.x).toBeCloseTo(5);
        expect(frame?.position.y).toBeCloseTo(10);
    });

    it('多点 trajectory 在中间时刻返回插值点（线性 trajectory）', () => {
        // 构造 3 点线性 trajectory：t=0 x=0, t=2 x=10, t=4 x=20
        // currentTime=1.0 时，findFrameIndex 返回 1（第一个 t>=1.0 的帧）
        // p0=traj[1]={t:2,x:10}, p1=traj[2]={t:4,x:20}
        // alpha = (1.0-2)/(4-2) = -0.5, x = 10 + (-0.5)*10 = 5
        // 对线性 trajectory，外推与插值结果一致
        const points = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
            { t: 2, position: { x: 10, y: 0 }, velocity: { x: 5, y: 0 } },
            { t: 4, position: { x: 20, y: 0 }, velocity: { x: 5, y: 0 } }
        ];
        const result = { trajectories: [points] } as unknown as SimulationResult;
        const frame = getFrame(result, 1.0);
        expect(frame).not.toBeNull();
        // 期望 x=5（介于 t=0 x=0 与 t=2 x=10 之间的线性插值）
        expect(frame?.position.x).toBeCloseTo(5, 5);
    });
});
