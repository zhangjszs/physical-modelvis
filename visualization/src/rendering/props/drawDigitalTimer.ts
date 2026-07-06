import type { PropBase, ScreenRect } from './types';

export interface TimerChannel {
    /** 通道标签，如 "CH1" */
    label: string;
    /** 显示数值（秒），null 时显示 "----" */
    value: number | null;
    /** 单位，如 "s" / "ms" */
    unit: string;
    /** 数码管颜色，默认绿色 */
    color?: string;
    /** 该通道是否正在计时（高亮边框） */
    isActive?: boolean;
}

export interface DigitalTimerOptions extends PropBase {
    ctx: CanvasRenderingContext2D;
    /** 计时器面板矩形（屏幕坐标） */
    rect: ScreenRect;
    /** 标题，如 "数字毫秒计" */
    title?: string;
    /** 多通道数据 */
    channels: TimerChannel[];
}

/**
 * 在 Canvas 上绘制数字毫秒计仪表盘（黑底 + 7 段数码管风格数字 + 多通道）。
 *
 * 借鉴 PhET 仪器面板风格与真实 J0201-CC 型数字毫秒计的视觉：
 * 等宽字体 + 文字阴影发光 + 黑底 + 通道边框。
 *
 * 可复用：任何需要数字仪表显示的场景（毫秒计、电压表、电流表、计数器等）。
 */
export function drawDigitalTimer(opts: DigitalTimerOptions): void {
    const { ctx, rect, isDark, title, channels } = opts;
    const { x, y, width, height } = rect;

    ctx.save();

    // 1. 面板背景（深色圆角）
    const radius = 6;
    ctx.fillStyle = isDark ? '#0a0e1a' : '#0f172a';
    roundRect(ctx, x, y, width, height, radius);
    ctx.fill();

    // 外边框
    ctx.strokeStyle = isDark ? '#334155' : '#1e293b';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, width, height, radius);
    ctx.stroke();

    // 2. 标题栏
    if (title) {
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, x + 10, y + 6);

        // 模拟电源指示灯
        ctx.fillStyle = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#22c55e';
        ctx.beginPath();
        ctx.arc(x + width - 12, y + 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // 3. 通道数据
    const channelCount = channels.length;
    if (channelCount === 0) {
        ctx.restore();
        return;
    }

    const channelAreaY = title ? y + 24 : y + 8;
    const channelAreaH = height - (channelAreaY - y) - 8;
    const channelH = channelAreaH / channelCount;
    const channelPadding = 4;
    const channelW = width - 16;

    for (let i = 0; i < channelCount; i++) {
        const ch = channels[i]!;
        const cy = channelAreaY + i * channelH;
        const cx = x + 8;
        const color = ch.color ?? '#22c55e';
        const isActive = ch.isActive ?? false;

        // 通道卡片背景
        ctx.fillStyle = isActive ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.4)';
        roundRect(ctx, cx, cy + channelPadding / 2, channelW, channelH - channelPadding, 3);
        ctx.fill();

        // 通道边框（active 时高亮）
        if (isActive) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            roundRect(ctx, cx, cy + channelPadding / 2, channelW, channelH - channelPadding, 3);
            ctx.stroke();
        }

        // 通道标签
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(ch.label, cx + 6, cy + channelPadding / 2 + 4);

        // 数值（7 段数码管风格）
        const displayValue =
            ch.value === null
                ? '----'
                : Math.abs(ch.value) < 1
                  ? (ch.value * 1000).toFixed(1) // 显示 ms
                  : ch.value.toFixed(4);
        const displayUnit = ch.value === null ? ch.unit : Math.abs(ch.value) < 1 ? 'ms' : ch.unit;

        ctx.fillStyle = color;
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fillText(displayValue, cx + channelW - 30, cy + channelH / 2);
        ctx.shadowBlur = 0;

        // 单位
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(displayUnit, cx + channelW - 26, cy + channelH / 2 + 1);
    }

    ctx.restore();
}

/** 圆角矩形路径辅助 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}
