import type { AirTrackLayout, AirflowParticle, PropBase, ScreenRect } from './types';

export interface AirTrackOptions extends PropBase {
    ctx: CanvasRenderingContext2D;
    /** 导轨整体矩形（屏幕坐标） */
    rect: ScreenRect;
    /** 是否显示气孔，默认 true */
    showAirholes?: boolean;
    /** 气孔数量（默认按宽度自动：每 30px 一个） */
    airholeCount?: number;
    /** 气流粒子状态（由调用方维护并每帧更新后传入） */
    airflowParticles?: AirflowParticle[];
    /** 整体标签 */
    label?: string;
}

/**
 * 绘制气垫导轨（含金属质感渐变、顶部气孔、气流粒子）。
 *
 * 借鉴 PhET "Masses and Springs" 的金属质感渐变与 "Gas Properties" 的粒子可视化风格。
 * 返回 AirTrackLayout，包含 topY 与 airholes，便于其他元件（滑块、光电门）定位。
 *
 * 可复用：水平 1D 实验通用导轨，未来传感器测速度、牛顿第二定律验证等场景可直接调用。
 */
export function drawAirTrack(opts: AirTrackOptions): AirTrackLayout {
    const { ctx, rect, isDark, showAirholes = true, airflowParticles = [], label } = opts;
    const { x, y, width, height } = rect;

    // 导轨顶面 y（滑块底面贴合位置）
    const topY = y;
    const airholes: Array<{ x: number; y: number }> = [];

    ctx.save();

    // 1. 导轨主体（金属渐变质感）
    const grad = ctx.createLinearGradient(0, topY, 0, topY + height);
    if (isDark) {
        grad.addColorStop(0, '#64748b');
        grad.addColorStop(0.4, '#475569');
        grad.addColorStop(0.6, '#334155');
        grad.addColorStop(1, '#1e293b');
    } else {
        grad.addColorStop(0, '#e2e8f0');
        grad.addColorStop(0.4, '#cbd5e1');
        grad.addColorStop(0.6, '#94a3b8');
        grad.addColorStop(1, '#64748b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, topY, width, height);

    // 顶面高光线
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)';
    ctx.fillRect(x, topY, width, 2);

    // 底面阴影
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, topY + height - 2, width, 2);

    // 2. 气孔
    if (showAirholes) {
        const count = opts.airholeCount ?? Math.max(5, Math.floor(width / 30));
        const spacing = width / count;
        const holeR = 1.6;
        for (let i = 0; i < count; i++) {
            const hx = x + spacing * (i + 0.5);
            const hy = topY + 4;
            airholes.push({ x: hx, y: hy });
            ctx.fillStyle = isDark ? '#0f172a' : '#1e293b';
            ctx.beginPath();
            ctx.arc(hx, hy, holeR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 3. 气流粒子（半透明蓝色雾状）
    if (airflowParticles.length > 0) {
        for (const p of airflowParticles) {
            const alpha = p.life * 0.5;
            ctx.fillStyle = isDark ? `rgba(56,189,248,${alpha})` : `rgba(59,130,246,${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 4. 标签
    if (label) {
        ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, x, y - 4);
    }

    ctx.restore();

    return {
        topY,
        leftX: x,
        rightX: x + width,
        rect,
        airholes
    };
}

/**
 * 更新气流粒子状态：每帧上升 + 衰减 + 重生。
 *
 * 调用方维护粒子数组，每帧调用本函数更新粒子，然后把数组传给 drawAirTrack 绘制。
 * 可复用：任何需要"上升粒子"效果的场景（如气垫、热气流等）都可复用。
 */
export function updateAirflowParticles(
    particles: AirflowParticle[],
    airholes: Array<{ x: number; y: number }>,
    maxY: number,
    /** 每帧新增概率（每个气孔），默认 0.3 */
    spawnRate = 0.3,
    /** 粒子最大上升速度，默认 0.8 */
    maxVy = 0.8
): AirflowParticle[] {
    // 更新现有粒子
    const next: AirflowParticle[] = [];
    for (const p of particles) {
        p.x += p.vx;
        p.y -= p.vy;
        p.life -= 0.012;
        if (p.life > 0 && p.y > maxY - 80) {
            next.push(p);
        }
    }

    // 新增粒子
    for (const hole of airholes) {
        if (Math.random() < spawnRate) {
            next.push({
                x: hole.x + (Math.random() - 0.5) * 4,
                y: hole.y,
                vx: (Math.random() - 0.5) * 0.2,
                vy: 0.4 + Math.random() * (maxVy - 0.4),
                life: 0.7 + Math.random() * 0.3,
                size: 0.8 + Math.random() * 1.2
            });
        }
    }

    return next;
}
