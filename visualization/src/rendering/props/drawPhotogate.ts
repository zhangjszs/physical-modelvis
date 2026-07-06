import type { PropBase } from './types';

export interface PhotogateOptions extends PropBase {
    ctx: CanvasRenderingContext2D;
    /** 光电门 U 形开口的中心 x（屏幕像素） */
    x: number;
    /** 导轨顶面 y（U 形支架底端贴合位置） */
    trackTopY: number;
    /** 支架臂高（屏幕像素），默认 80 */
    armHeight?: number;
    /** 支架臂宽（屏幕像素），默认 6 */
    armWidth?: number;
    /** U 形开口宽度（屏幕像素），默认 36 */
    gapWidth?: number;
    /** 是否正在挡光 */
    isBlocked?: boolean;
    /** LED 是否亮（与 isBlocked 一致，挡光时亮） */
    ledOn?: boolean;
    /** 标签，如 "G1" / "G2" */
    label?: string;
    /** 标签颜色，默认红色 */
    labelColor?: string;
}

/**
 * 绘制光电门（U 形金属支架 + 红外发射/接收 LED + 挡光状态指示）。
 *
 * 借鉴 PhET "Circuit Construction Kit" 的 LED 发光效果：
 * 挡光时 LED 用 shadowBlur + shadowColor 制造光晕。
 *
 * 可复用：任何挡光测量场景（气垫导轨测速度、单摆周期测量、自由落体测重力加速度等）。
 */
export function drawPhotogate(opts: PhotogateOptions): void {
    const {
        ctx,
        x,
        trackTopY,
        isDark,
        armHeight = 80,
        armWidth = 6,
        gapWidth = 36,
        isBlocked = false,
        ledOn = isBlocked,
        label,
        labelColor = '#ef4444'
    } = opts;

    const halfGap = gapWidth / 2;
    const topY = trackTopY - armHeight;
    const ledR = 4;

    // U 形：左臂 + 右臂 + 顶部横梁
    const armGrad = ctx.createLinearGradient(0, topY, 0, trackTopY);
    if (isDark) {
        armGrad.addColorStop(0, '#475569');
        armGrad.addColorStop(1, '#1e293b');
    } else {
        armGrad.addColorStop(0, '#94a3b8');
        armGrad.addColorStop(1, '#475569');
    }
    ctx.fillStyle = armGrad;

    // 左臂
    ctx.fillRect(x - halfGap - armWidth, topY, armWidth, armHeight);
    // 右臂
    ctx.fillRect(x + halfGap, topY, armWidth, armHeight);
    // 顶部横梁
    ctx.fillRect(x - halfGap - armWidth, topY, gapWidth + armWidth * 2, armWidth);

    // 支架高光
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)';
    ctx.fillRect(x - halfGap - armWidth, topY, 1.5, armHeight);

    // 红外光束（淡红色虚线，从左臂内侧到右臂内侧）
    const beamY = topY + armHeight * 0.7;
    ctx.save();
    ctx.strokeStyle = ledOn
        ? isDark
            ? 'rgba(248,113,113,0.9)'
            : 'rgba(239,68,68,0.9)'
        : isDark
          ? 'rgba(248,113,113,0.3)'
          : 'rgba(239,68,68,0.3)';
    ctx.lineWidth = ledOn ? 1.5 : 0.8;
    if (!ledOn) ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x - halfGap, beamY);
    ctx.lineTo(x + halfGap, beamY);
    ctx.stroke();
    ctx.restore();

    // LED 灯（左臂内侧发射器、右臂内侧接收器）
    const drawLed = (lx: number) => {
        if (ledOn) {
            // 发光效果（shadowBlur 模拟光晕）
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#fca5a5';
            ctx.beginPath();
            ctx.arc(lx, beamY, ledR, 0, Math.PI * 2);
            ctx.fill();
            // 内部高亮
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fee2e2';
            ctx.beginPath();
            ctx.arc(lx, beamY, ledR * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = isDark ? '#7f1d1d' : '#dc2626';
            ctx.beginPath();
            ctx.arc(lx, beamY, ledR, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    drawLed(x - halfGap + ledR / 2);
    drawLed(x + halfGap - ledR / 2);

    // 标签（在 U 形顶端外侧）
    if (label) {
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, x, topY - 4);
    }
}
