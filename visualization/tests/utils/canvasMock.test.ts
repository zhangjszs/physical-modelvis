/**
 * canvasMock 自身测试 — 验证录制型 ctx 的核心行为。
 *
 * 不测具体 draw 函数，只测：
 * 1. 方法调用被正确记录到 calls/counts
 * 2. set 属性赋值被记录为 'set xxx'
 * 3. fillText/strokeText 同时收集到 texts 数组
 * 4. fillStyle/strokeStyle/font 历史被收集
 * 5. createLinearGradient 返回 sentinel，序列化用 <gradient> 占位
 * 6. measureText 返回固定 width
 * 7. reset() 清空所有容器
 * 8. filter() 按方法名过滤
 * 9. serializeCalls 过滤噪声、前缀风格、占位 transform
 */

import { describe, it, expect } from 'vitest';
import { createRecordingCanvas, serializeCalls, type CanvasCall } from '../utils/canvasMock';

describe('createRecordingCanvas - 基础录制', () => {
    it('方法调用被记录到 calls 和 counts', () => {
        const { ctx, calls, counts } = createRecordingCanvas();
        ctx.fillRect(0, 0, 100, 50);
        ctx.fillRect(10, 20, 30, 40);
        ctx.stroke();
        expect(calls.length).toBe(3);
        expect(counts.fillRect).toBe(2);
        expect(counts.stroke).toBe(1);
    });

    it('方法调用时序保持', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.moveTo(0, 0);
        ctx.lineTo(100, 100);
        ctx.stroke();
        expect(calls.map(c => c.name)).toEqual(['moveTo', 'lineTo', 'stroke']);
    });

    it('参数被原样记录', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.fillRect(10, 20, 100, 50);
        expect(calls[0]).toEqual({ name: 'fillRect', args: [10, 20, 100, 50] });
    });

    it('canvas 属性返回指定尺寸', () => {
        const { ctx } = createRecordingCanvas({ width: 1200, height: 800 });
        expect((ctx as unknown as { canvas: { width: number; height: number } }).canvas).toEqual({
            width: 1200,
            height: 800
        });
    });

    it('默认尺寸为 900×600', () => {
        const { ctx } = createRecordingCanvas();
        expect((ctx as unknown as { canvas: { width: number; height: number } }).canvas).toEqual({
            width: 900,
            height: 600
        });
    });
});

describe('createRecordingCanvas - 属性赋值', () => {
    it('set fillStyle 被记录为 "set fillStyle"', () => {
        const { ctx, calls, fills } = createRecordingCanvas();
        ctx.fillStyle = '#ff0000';
        expect(calls[0]).toEqual({ name: 'set fillStyle', args: ['#ff0000'] });
        expect(fills).toEqual(['#ff0000']);
    });

    it('set strokeStyle 被记录并收集到 strokes', () => {
        const { ctx, strokes } = createRecordingCanvas();
        ctx.strokeStyle = '#00ff00';
        ctx.strokeStyle = '#0000ff';
        expect(strokes).toEqual(['#00ff00', '#0000ff']);
    });

    it('set font 被收集到 fonts', () => {
        const { ctx, fonts } = createRecordingCanvas();
        ctx.font = 'bold 15px sans-serif';
        ctx.font = '12px monospace';
        expect(fonts).toEqual(['bold 15px sans-serif', '12px monospace']);
    });

    it('set 属性不计入 counts（counts 只统计方法调用）', () => {
        const { ctx, counts } = createRecordingCanvas();
        ctx.fillStyle = '#f00';
        ctx.fillStyle = '#0f0';
        ctx.fillRect(0, 0, 10, 10);
        expect(counts.fillRect).toBe(1);
        expect(counts['set fillStyle']).toBeUndefined();
    });
});

describe('createRecordingCanvas - 文本方法', () => {
    it('fillText 同时记录到 calls 和 texts', () => {
        const { ctx, calls, texts } = createRecordingCanvas();
        ctx.fillText('hello', 10, 20);
        expect(calls[0]).toEqual({ name: 'fillText', args: ['hello', 10, 20] });
        expect(texts).toEqual(['hello']);
    });

    it('strokeText 同时记录到 calls 和 texts', () => {
        const { ctx, texts } = createRecordingCanvas();
        ctx.strokeText('world', 5, 10);
        expect(texts).toEqual(['world']);
    });

    it('非字符串参数不加入 texts', () => {
        const { ctx, texts } = createRecordingCanvas();
        // 模拟以 number 调用 fillText（不太可能但 defensive）
        ctx.fillText(123 as unknown as string, 0, 0);
        expect(texts).toEqual([]);
    });
});

describe('createRecordingCanvas - 渐变', () => {
    it('createLinearGradient 返回 sentinel，addColorStop 不抛错', () => {
        const { ctx, counts } = createRecordingCanvas();
        const grad = ctx.createLinearGradient(0, 0, 100, 0);
        expect(grad).toBeDefined();
        expect(() => grad.addColorStop(0, '#fff')).not.toThrow();
        expect(counts.createLinearGradient).toBe(1);
    });

    it('渐变赋给 fillStyle 时 fills 收集 <gradient>', () => {
        const { ctx, fills } = createRecordingCanvas();
        const grad = ctx.createLinearGradient(0, 0, 100, 0);
        ctx.fillStyle = grad;
        expect(fills).toEqual(['<gradient>']);
    });
});

describe('createRecordingCanvas - measureText', () => {
    it('返回固定 width（字符串长度 × 6）', () => {
        const { ctx } = createRecordingCanvas();
        const m1 = ctx.measureText('abc');
        const m2 = ctx.measureText('abcdefgh');
        expect(m1.width).toBe(18); // 3 × 6
        expect(m2.width).toBe(48); // 8 × 6
    });

    it('measureText 被记录但不进入 counts', () => {
        const { ctx, counts, calls } = createRecordingCanvas();
        ctx.measureText('hello');
        expect(calls[0]).toEqual({ name: 'measureText', args: ['hello'] });
        expect(counts.measureText).toBe(1);
    });
});

describe('createRecordingCanvas - reset / filter', () => {
    it('reset 清空所有容器', () => {
        const rec = createRecordingCanvas();
        rec.ctx.fillRect(0, 0, 10, 10);
        rec.ctx.fillStyle = '#f00';
        rec.ctx.fillText('hi', 0, 0);
        expect(rec.calls.length).toBe(3);
        expect(rec.fills.length).toBe(1);
        expect(rec.texts.length).toBe(1);

        rec.reset();

        expect(rec.calls).toEqual([]);
        expect(rec.fills).toEqual([]);
        expect(rec.texts).toEqual([]);
        expect(rec.counts.fillRect).toBeUndefined();
    });

    it('filter 按方法名过滤调用', () => {
        const { ctx, filter } = createRecordingCanvas();
        ctx.fillRect(0, 0, 10, 10);
        ctx.strokeRect(0, 0, 10, 10);
        ctx.fillRect(20, 20, 30, 30);
        const fillRects = filter('fillRect');
        expect(fillRects.length).toBe(2);
        expect(fillRects[0]?.args).toEqual([0, 0, 10, 10]);
        expect(fillRects[1]?.args).toEqual([20, 20, 30, 30]);
    });
});

describe('serializeCalls', () => {
    it('过滤 save/restore/beginPath/closePath 噪声', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(100, 100);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        const out = serializeCalls(calls);
        const lines = out.split('\n');
        expect(lines).not.toContain('save');
        expect(lines).not.toContain('restore');
        expect(lines).not.toContain('beginPath');
        expect(lines).not.toContain('closePath');
        expect(lines.some(l => l.includes('moveTo'))).toBe(true);
        expect(lines.some(l => l.includes('lineTo'))).toBe(true);
        expect(lines.some(l => l.includes('stroke'))).toBe(true);
    });

    it('在 fillRect 前缀 fillStyle', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 100, 50);
        const out = serializeCalls(calls);
        expect(out).toBe('fill=#ff0000 fillRect(0,0,100,50)');
    });

    it('在 stroke 前缀 strokeStyle + lineWidth', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, 10);
        ctx.stroke();
        const out = serializeCalls(calls);
        const lines = out.split('\n');
        expect(lines).toContain('stroke=#00ff00 lw=3 moveTo(0,0)');
        expect(lines).toContain('stroke=#00ff00 lw=3 lineTo(10,10)');
        expect(lines).toContain('stroke=#00ff00 lw=3 stroke()');
    });

    it('在 fillText 前缀 font + fillStyle', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('hello', 10, 20);
        const out = serializeCalls(calls);
        expect(out).toBe('fill=#000 font=bold 15px sans-serif fillText("hello",10,20)');
    });

    it('整数参数保持整数，浮点数保留 3 位小数', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.fillRect(10, 20, 100.123456, 50.789);
        const out = serializeCalls(calls);
        expect(out).toBe('fillRect(10,20,100.123,50.789)');
    });

    it('渐变 fillStyle 用 <gradient> 占位', () => {
        const { ctx, calls } = createRecordingCanvas();
        const grad = ctx.createLinearGradient(0, 0, 100, 0);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 10, 10);
        const out = serializeCalls(calls);
        expect(out).toBe('fill=<gradient> fillRect(0,0,10,10)');
    });

    it('transform 用占位 <transform>', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const out = serializeCalls(calls);
        expect(out).toBe('<transform>');
    });

    it('translate/rotate/scale 用占位', () => {
        const { ctx, calls } = createRecordingCanvas();
        ctx.translate(10, 20);
        ctx.rotate(0.5);
        ctx.scale(2, 2);
        const out = serializeCalls(calls);
        const lines = out.split('\n');
        expect(lines).toEqual(['<translate>', '<rotate>', '<scale>']);
    });

    it('空 calls 返回空字符串', () => {
        const calls: CanvasCall[] = [];
        expect(serializeCalls(calls)).toBe('');
    });
});
