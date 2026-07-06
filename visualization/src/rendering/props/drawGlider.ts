import type { PropBase } from './types';

export interface GliderOptions extends PropBase {
    ctx: CanvasRenderingContext2D;
    /** 滑块中心 x（屏幕像素，随当前时间变化） */
    centerX: number;
    /** 滑块底面 y（贴合导轨顶面，屏幕像素） */
    bottomY: number;
    /** 滑块宽度（屏幕像素） */
    width: number;
    /** 滑块高度（屏幕像素） */
    height: number;
    /** 挡光片宽度（屏幕像素） */
    flagWidth: number;
    /** 挡光片高度（屏幕像素），默认为滑块高度的 0.6 */
    flagHeight?: number;
    /** 挡光片颜色，默认红色 */
    flagColor?: string;
    /** 整体标签，如 "滑块 m=0.2kg" */
    label?: string;
    /** 是否显示速度向量 */
    showVelocityVector?: boolean;
    /** 速度大小（m/s），用于箭头长度 */
    velocity?: number;
    /** 速度→像素缩放，默认 60 */
    velocityScale?: number;
    /** 速度向量颜色，默认绿色 */
    velocityColor?: string;
}

/**
 * 绘制滑块（铝合金质感矩形 + 顶部红色挡光片 + 可选速度向量）。
 *
 * 借鉴 PhET "Masses and Springs" 的金属质感渐变。
 * 挡光片宽度独立配置，便于后续其他实验（如改变挡光片宽度对比）。
 *
 * 可复用：水平直线运动场景（气垫导轨、斜面小车、电磁感应滑块等）均可使用。
 */
export function drawGlider(opts: GliderOptions): void {
    const {
        ctx,
        centerX,
        bottomY,
        width,
        height,
        flagWidth,
        isDark,
        flagHeight = height * 0.6,
        flagColor = '#ef4444',
        label,
        showVelocityVector = false,
        velocity = 0,
        velocityScale = 60,
        velocityColor = '#22c55e'
    } = opts;

    const leftX = centerX - width / 2;
    const topY = bottomY - height;
    const safeFlagWidth = Math.max(flagWidth, 3);

    ctx.save();

    // 1. 速度向量（先画，被滑块遮挡一部分）
    if (showVelocityVector && Math.abs(velocity) > 1e-6) {
        const arrowLen = velocity * velocityScale;
        const arrowY = bottomY - height / 2;
        const startX = centerX + (arrowLen > 0 ? width / 2 : -width / 2);
        const endX = startX + arrowLen;
        ctx.strokeStyle = velocityColor;
        ctx.fillStyle = velocityColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, arrowY);
        ctx.lineTo(endX, arrowY);
        ctx.stroke();
        // 箭头头
        const dir = arrowLen > 0 ? 1 : -1;
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(endX, arrowY);
        ctx.lineTo(endX - dir * headLen, arrowY - 4);
        ctx.lineTo(endX - dir * headLen, arrowY + 4);
        ctx.closePath();
        ctx.fill();
        // 标签
        ctx.fillStyle = velocityColor;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`v=${velocity.toFixed(2)} m/s`, (startX + endX) / 2, arrowY - 6);
    }

    // 2. 挡光片（从滑块顶部向上突出）
    const flagLeftX = centerX - safeFlagWidth / 2;
    const flagBottomY = topY;
    const flagTopY = flagBottomY - flagHeight;
    ctx.fillStyle = flagColor;
    ctx.fillRect(flagLeftX, flagTopY, safeFlagWidth, flagHeight);
    // 挡光片高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(flagLeftX, flagTopY, 1.5, flagHeight);

    // 3. 滑块主体（铝合金质感渐变）
    const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
    if (isDark) {
        grad.addColorStop(0, '#cbd5e1');
        grad.addColorStop(0.5, '#94a3b8');
        grad.addColorStop(1, '#475569');
    } else {
        grad.addColorStop(0, '#f1f5f9');
        grad.addColorStop(0.5, '#cbd5e1');
        grad.addColorStop(1, '#64748b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(leftX, topY, width, height);

    // 顶部高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(leftX, topY, width, 1.5);
    // 底部阴影
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(leftX, bottomY - 1.5, width, 1.5);

    // 4. 边框
    ctx.strokeStyle = isDark ? '#1e293b' : '#475569';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(leftX, topY, width, height);

    // 5. 标签
    if (label) {
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, centerX, bottomY + 4);
    }

    ctx.restore();
}
