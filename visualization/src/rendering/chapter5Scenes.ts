/**
 * 力学场景渲染模块 — 第五章 曲线运动
 *
 * 场景列表：
 *   - drawCurveConditionScene
 *   - drawMotionCompositionScene
 *   - drawCurveVelocityDirectionScene
 *   - drawProjectileCollisionScene
 *   - drawVerticalCircleScene
 *   - drawCentrifugalScene
 *   - drawTransmissionBeltScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    roundRectPath,
    shadeColor,
    textColor,
    mutedColor,
    panelFill,
    clamp,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawEmptyState,
    drawArrow,
    drawBlock,
    drawGround,
    getFrame
} from './renderingUtils';

export interface MechanicsSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const BLUE = '#3b82f6';
const GREEN = '#22c55e';
const ORANGE = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#a855f7';

export function drawCurveConditionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const forceAngle = params['forceAngle'] ?? 45;
    const v0 = params['initialSpeed'] ?? 5;
    const m = params['mass'] ?? 1;
    const F = m * 2;
    const thetaRad = (forceAngle * Math.PI) / 180;
    const ax = (F * Math.cos(thetaRad)) / m;
    const ay = (F * Math.sin(thetaRad)) / m;

    const frame = getFrame(simulationResult, currentTime);
    const t = frame ? frame.t : currentTime;
    const px = v0 * t + 0.5 * ax * t * t;
    const py = 0.5 * ay * t * t;
    const vxNow = v0 + ax * t;
    const vyNow = ay * t;

    // 坐标系布局
    const originX = width * 0.15;
    const originY = height * 0.65;
    const maxExtent = Math.max(Math.abs(px), Math.abs(py), v0 * (params['duration'] ?? 3), 1);
    const scale = Math.min((width * 0.7) / maxExtent, (height * 0.5) / maxExtent, 40);

    const screenX = originX + px * scale;
    const screenY = originY - py * scale;

    drawTitle(ctx, '曲线运动条件: F 与 v₀ 不共线 → 曲线', width, isDark);

    // 坐标轴
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(width - 30, originY);
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, 50);
    ctx.stroke();
    drawArrow(ctx, width - 50, originY, width - 30, originY, mutedColor(isDark), 'x');
    drawArrow(ctx, originX, 70, originX, 50, mutedColor(isDark), 'y');

    // 轨迹（从 simulationResult 或解析计算）
    if (simulationResult) {
        const traj = simulationResult.trajectories[0];
        if (traj && traj.length > 1) {
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 2;
            ctx.beginPath();
            let started = false;
            for (const p of traj) {
                const sx = originX + p.position.x * scale;
                const sy = originY - p.position.y * scale;
                if (sx < 10 || sx > width - 10 || sy < 40 || sy > height - 40) continue;
                if (!started) {
                    ctx.moveTo(sx, sy);
                    started = true;
                } else ctx.lineTo(sx, sy);
                if (p.t > currentTime) break;
            }
            ctx.stroke();
        }
    }

    // 物体
    const grad = ctx.createRadialGradient(screenX - 4, screenY - 5, 2, screenX, screenY, 14);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.5, ORANGE);
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
    ctx.fill();

    // v₀ 箭头（初始速度，水平向右）
    const v0ArrowLen = Math.min(v0 * 12, width * 0.25);
    drawArrow(ctx, originX, originY - 30, originX + v0ArrowLen, originY - 30, GREEN, 'v₀');

    // F 箭头
    const fArrowLen = Math.min(F * 18, width * 0.2);
    drawArrow(
        ctx,
        originX + 20,
        originY + 20,
        originX + 20 + fArrowLen * Math.cos(-thetaRad),
        originY + 20 + fArrowLen * Math.sin(-thetaRad),
        RED,
        'F'
    );

    // 速度箭头（当前）
    const vScale = 10;
    drawArrow(ctx, screenX, screenY, screenX + vxNow * vScale, screenY - vyNow * vScale, GREEN, 'v');

    // 角度标注
    const isLinear = forceAngle === 0 || forceAngle === 180;
    ctx.fillStyle = isLinear ? GREEN : RED;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isLinear ? 'F ∥ v₀ → 直线运动' : `F 与 v₀ 成 ${forceAngle}° → 曲线运动`, width / 2, height * 0.16);

    drawHud(ctx, isDark, [
        { label: 't', value: `${t.toFixed(3)} s` },
        { label: 'x', value: `${px.toFixed(2)} m` },
        { label: 'y', value: `${py.toFixed(2)} m` },
        { label: 'v', value: `${Math.hypot(vxNow, vyNow).toFixed(2)} m/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `v₀=${v0}m/s  F=${F.toFixed(1)}N  θ=${forceAngle}°  ${isLinear ? '直线' : '抛物线'}`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawMotionCompositionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const vxConst = params['vxConst'] ?? 2;
    const vyAccel = params['vyAccel'] ?? 2;
    const duration = params['duration'] ?? 3;

    const frame = getFrame(simulationResult, currentTime);
    const t = frame ? frame.t : currentTime;
    const px = vxConst * t;
    const py = 0.5 * vyAccel * t * t;
    const vyNow = vyAccel * t;

    // 坐标系布局
    const originX = width * 0.12;
    const originY = height * 0.78;
    const maxX = vxConst * duration;
    const maxY = 0.5 * vyAccel * duration * duration;
    const maxExtent = Math.max(maxX, maxY, 1);
    const scaleX = (width * 0.75) / maxExtent;
    const scaleY = (height * 0.6) / maxExtent;
    const sc = Math.min(scaleX, scaleY, 60);

    const screenX = originX + px * sc;
    const screenY = originY - py * sc;

    drawTitle(ctx, '运动的合成与分解: x=vₓt, y=½aᵧt²', width, isDark);

    // 坐标轴
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(width - 20, originY);
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, 50);
    ctx.stroke();
    drawArrow(ctx, width - 40, originY, width - 20, originY, mutedColor(isDark), 'x');
    drawArrow(ctx, originX, 70, originX, 50, mutedColor(isDark), 'y');

    // 水平分运动虚线
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + maxX * sc, originY);
    ctx.stroke();

    // 竖直分运动虚线
    ctx.strokeStyle = RED;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, originY - maxY * sc);
    ctx.stroke();
    ctx.setLineDash([]);

    // 当前位置到轴的投影虚线
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX, originY);
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(originX, screenY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 合运动轨迹
    if (simulationResult) {
        const traj = simulationResult.trajectories[0];
        if (traj && traj.length > 1) {
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            let started = false;
            for (const p of traj) {
                const sx = originX + p.position.x * sc;
                const sy = originY - p.position.y * sc;
                if (!started) {
                    ctx.moveTo(sx, sy);
                    started = true;
                } else ctx.lineTo(sx, sy);
                if (p.t > currentTime) break;
            }
            ctx.stroke();
        }
    }

    // 物体
    const grad = ctx.createRadialGradient(screenX - 4, screenY - 5, 2, screenX, screenY, 14);
    grad.addColorStop(0, '#bbf7d0');
    grad.addColorStop(0.5, GREEN);
    grad.addColorStop(1, '#166534');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
    ctx.fill();

    // 分速度箭头
    const vxArrowLen = vxConst * 15;
    drawArrow(ctx, screenX, screenY + 22, screenX + vxArrowLen, screenY + 22, GREEN, 'vₓ');
    const vyArrowLen = vyNow * 10;
    drawArrow(ctx, screenX - 22, screenY, screenX - 22, screenY - vyArrowLen, RED, 'vᵧ');

    // 合速度箭头
    const vTotal = Math.hypot(vxConst, vyNow);
    const vAngle = Math.atan2(vyNow, vxConst);
    const vArrowLen = vTotal * 10;
    drawArrow(
        ctx,
        screenX,
        screenY,
        screenX + vArrowLen * Math.cos(-vAngle),
        screenY + vArrowLen * Math.sin(-vAngle),
        PURPLE,
        'v'
    );

    // 分运动标注
    ctx.fillStyle = GREEN;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('匀速分运动 x=vₓt', originX + maxX * sc * 0.5, originY + 22);
    ctx.fillStyle = RED;
    ctx.fillText('匀加速分运动 y=½aᵧt²', originX - 60, originY - maxY * sc * 0.5);

    drawHud(ctx, isDark, [
        { label: 't', value: `${t.toFixed(3)} s` },
        { label: 'x', value: `${px.toFixed(2)} m` },
        { label: 'y', value: `${py.toFixed(2)} m` },
        { label: 'v', value: `${Math.hypot(vxConst, vyNow).toFixed(2)} m/s` }
    ]);
    drawInfoBar(ctx, width, height, `vₓ=${vxConst}m/s  aᵧ=${vyAccel}m/s²  合运动: y=(aᵧ/2vₓ²)x²`, isDark);
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawCurveVelocityDirectionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const trackShape = Math.round(params['trackShape'] ?? 0);
    const angularSpeed = params['angularSpeed'] ?? 1;
    const releaseIndex = Math.round(params['releaseIndex'] ?? 1);

    const shapeNames = ['圆形', '抛物线', '螺旋'];
    const cx = width * 0.45;
    const cy = height * 0.5;
    const R = Math.min(width, height) * 0.22;

    drawTitle(ctx, '曲线运动速度方向: 脱离后沿切线飞出', width, isDark);

    // 画曲线轨道
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (trackShape === 0) {
        // 圆形轨道
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
    } else if (trackShape === 1) {
        // 抛物线 y = 0.005 * x^2
        for (let i = 0; i <= 200; i++) {
            const xp = (i / 200) * width * 0.7;
            const xm = xp - width * 0.35;
            const yp = 0.003 * xm * xm;
            if (i === 0)
                ctx.moveTo(width * 0.15 + xp * 0, cy - R + yp); // simplified
            else
                ctx.lineTo(
                    width * 0.15 + (i / 200) * width * 0.7,
                    cy - R + 0.003 * Math.pow((i / 200 - 0.5) * width * 0.7, 2)
                );
        }
    } else {
        // 螺旋
        for (let i = 0; i <= 300; i++) {
            const angle = (i / 300) * Math.PI * 4;
            const r = R * 0.3 + (R * 0.7 * i) / 300;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // 脱离点计算
    const releaseAngle = (releaseIndex / 4) * Math.PI * 2;
    let relX: number, relY: number, tanDx: number, tanDy: number;
    if (trackShape === 0) {
        relX = cx + R * Math.cos(releaseAngle);
        relY = cy + R * Math.sin(releaseAngle);
        tanDx = -Math.sin(releaseAngle);
        tanDy = Math.cos(releaseAngle);
    } else if (trackShape === 1) {
        const xp = width * 0.15 + (releaseIndex / 3) * width * 0.7;
        const xm = xp - width * 0.35;
        relX = xp;
        relY = cy - R + 0.003 * xm * xm;
        const slope = 0.006 * xm;
        const norm = Math.hypot(1, slope);
        tanDx = 1 / norm;
        tanDy = slope / norm;
    } else {
        const angle = (releaseIndex / 3) * Math.PI * 4;
        const r = R * 0.3 + (R * 0.7 * releaseIndex) / 3;
        relX = cx + r * Math.cos(angle);
        relY = cy + r * Math.sin(angle);
        tanDx = -Math.sin(angle);
        tanDy = Math.cos(angle);
    }

    // 脱离点标注
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(relX, relY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`脱离点${releaseIndex + 1}`, relX, relY - 14);

    // 切线方向箭头
    const tanLen = 100;
    drawArrow(ctx, relX, relY, relX + tanDx * tanLen, relY + tanDy * tanLen, GREEN, '切线方向 v');

    // 动画中的运动物体
    if (simulationResult) {
        const traj = simulationResult.trajectories[0];
        if (traj && traj.length > 0) {
            const f = getFrame(simulationResult, currentTime);
            if (f) {
                // 从物理坐标映射到屏幕坐标（此场景物理坐标在曲线附近）
                const progress = clamp(currentTime / (params['duration'] ?? 1), 0, 1);
                const angle = releaseAngle * progress * 2; // 沿轨道运动
                let bx: number, by: number;
                if (trackShape === 0) {
                    bx = cx + R * Math.cos(angle);
                    by = cy + R * Math.sin(angle);
                } else {
                    bx = relX + (f.position.x - relX) * 0.5;
                    by = relY + (f.position.y - relY) * 0.5;
                }

                const bGrad = ctx.createRadialGradient(bx - 3, by - 4, 2, bx, by, 12);
                bGrad.addColorStop(0, '#fef3c7');
                bGrad.addColorStop(0.5, ORANGE);
                bGrad.addColorStop(1, '#b45309');
                ctx.fillStyle = bGrad;
                ctx.beginPath();
                ctx.arc(bx, by, 12, 0, Math.PI * 2);
                ctx.fill();

                // 速度方向箭头
                const vMag = Math.hypot(f.velocity.x, f.velocity.y);
                if (vMag > 0.01) {
                    const vNorm = { x: f.velocity.x / vMag, y: f.velocity.y / vMag };
                    drawArrow(ctx, bx, by, bx + vNorm.x * 60, by - vNorm.y * 60, GREEN, 'v');
                }
            }
        }
    }

    // 额外标注几条切线（教学演示）
    for (let i = 0; i < 4; i++) {
        if (i === releaseIndex) continue;
        const a = (i / 4) * Math.PI * 2;
        let px2: number, py2: number, tdx: number, tdy: number;
        if (trackShape === 0) {
            px2 = cx + R * Math.cos(a);
            py2 = cy + R * Math.sin(a);
            tdx = -Math.sin(a);
            tdy = Math.cos(a);
        } else {
            continue;
        }
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? 'rgba(34,197,94,0.3)' : 'rgba(22,163,74,0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px2, py2);
        ctx.lineTo(px2 + tdx * 60, py2 + tdy * 60);
        ctx.stroke();
        ctx.setLineDash([]);
        // 小圆点
        ctx.fillStyle = isDark ? 'rgba(34,197,94,0.5)' : 'rgba(22,163,74,0.4)';
        ctx.beginPath();
        ctx.arc(px2, py2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHud(ctx, isDark, [
        { label: 'shape', value: shapeNames[trackShape] ?? '圆形' },
        { label: 'ω', value: `${angularSpeed.toFixed(1)} rad/s` },
        { label: 't', value: `${currentTime.toFixed(3)} s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `轨道: ${shapeNames[trackShape]}  脱离点: 第${releaseIndex + 1}个  切线方向 = 瞬时速度方向`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawProjectileCollisionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const m1 = params['m1'] ?? 0.1;
    const m2 = params['m2'] ?? 0.1;
    const v1 = params['v1Initial'] ?? 2;
    const tableH = params['tableHeight'] ?? 0.8;
    const e = params['restitution'] ?? 1;
    const g = params['gravity'] ?? 9.8;
    const tFall = Math.sqrt((2 * tableH) / g);

    const groundY = height - 50;
    const tableTop = groundY - tableH * 150;
    const tableLeft = width * 0.15;
    const tableRight = width * 0.5;

    drawTitle(ctx, '平抛碰撞 (验证动量守恒)', width, isDark);
    drawGround(ctx, groundY, width, isDark);

    // 实验台
    ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.fillRect(tableLeft, tableTop, tableRight - tableLeft, 8);
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tableLeft + 20, tableTop + 8);
    ctx.lineTo(tableLeft + 20, groundY);
    ctx.moveTo(tableRight - 20, tableTop + 8);
    ctx.lineTo(tableRight - 20, groundY);
    ctx.stroke();

    // 斜轨
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tableLeft, tableTop - 60);
    ctx.quadraticCurveTo(tableLeft + 40, tableTop, tableLeft + 80, tableTop);
    ctx.stroke();

    const collisionX = tableRight;
    const collisionY = tableTop;
    const v1After = ((m1 - e * m2) * v1) / (m1 + m2);
    const v2After = ((1 + e) * m1 * v1) / (m1 + m2);
    const isPreCollision = currentTime < 0.3;

    if (isPreCollision) {
        const preX = tableLeft + 80 + (collisionX - tableLeft - 80) * (currentTime / 0.3);
        const grad1 = ctx.createRadialGradient(preX - 3, collisionY - 13, 2, preX, collisionY - 10, 10);
        grad1.addColorStop(0, '#93c5fd');
        grad1.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.arc(preX, collisionY - 10, 10, 0, Math.PI * 2);
        ctx.fill();
        const grad2 = ctx.createRadialGradient(collisionX - 3, collisionY - 13, 2, collisionX, collisionY - 10, 10);
        grad2.addColorStop(0, '#fca5a5');
        grad2.addColorStop(1, '#b91c1c');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(collisionX, collisionY - 10, 10, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const tAfter = currentTime - 0.3;
        const fallY = 0.5 * g * tAfter * tAfter;
        const fallYpx = (fallY * 150) / Math.max(0.01, tableH);

        const ball1X = collisionX + v1After * tAfter * 40;
        const ball1Y = collisionY + fallYpx;
        if (ball1Y < groundY) {
            const g1 = ctx.createRadialGradient(ball1X - 3, ball1Y - 3, 2, ball1X, ball1Y, 10);
            g1.addColorStop(0, '#93c5fd');
            g1.addColorStop(1, '#1d4ed8');
            ctx.fillStyle = g1;
            ctx.beginPath();
            ctx.arc(ball1X, Math.min(ball1Y, groundY - 10), 10, 0, Math.PI * 2);
            ctx.fill();
        }

        const ball2X = collisionX + v2After * tAfter * 40;
        const ball2Y = collisionY + fallYpx;
        if (ball2Y < groundY) {
            const g2 = ctx.createRadialGradient(ball2X - 3, ball2Y - 3, 2, ball2X, ball2Y, 10);
            g2.addColorStop(0, '#fca5a5');
            g2.addColorStop(1, '#b91c1c');
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.arc(ball2X, Math.min(ball2Y, groundY - 10), 10, 0, Math.PI * 2);
            ctx.fill();
        }

        const opX = collisionX + v1 * tFall * 40;
        const omX = collisionX + v1After * tFall * 40;
        const onX = collisionX + v2After * tFall * 40;

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)';
        ctx.lineWidth = 1;
        [opX, omX, onX].forEach((x, i) => {
            ctx.beginPath();
            ctx.moveTo(x, groundY - 5);
            ctx.lineTo(x, groundY + 5);
            ctx.stroke();
            const labels = ['OP', 'OM', 'ON'];
            const colors = [PURPLE, BLUE, RED];
            ctx.fillStyle = colors[i]!;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i] ?? '', x, groundY + 20);
        });
        ctx.setLineDash([]);
    }

    const pBefore = m1 * v1;
    const pAfter = m1 * v1After + m2 * v2After;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, width * 0.6, height * 0.2, 220, 80, 8);
    ctx.fill();
    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`碰前: p = m₁v₁ = ${pBefore.toFixed(4)}`, width * 0.6 + 10, height * 0.2 + 25);
    ctx.fillText(`碰后: p' = m₁v₁' + m₂v₂' = ${pAfter.toFixed(4)}`, width * 0.6 + 10, height * 0.2 + 48);
    ctx.fillText(`守恒验证: |Δp| = ${Math.abs(pBefore - pAfter).toFixed(6)}`, width * 0.6 + 10, height * 0.2 + 71);

    drawHud(ctx, isDark, [
        { label: 'v₁', value: `${v1} m/s` },
        { label: "v₁'", value: `${v1After.toFixed(2)} m/s` },
        { label: "v₂'", value: `${v2After.toFixed(2)} m/s` },
        { label: 't_fall', value: `${tFall.toFixed(3)} s` }
    ]);
    drawInfoBar(ctx, width, height, `m₁=${m1}kg  m₂=${m2}kg  v₁=${v1}m/s  e=${e}  h=${tableH}m`, isDark);
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// ======================= Task 5: 波动场景 =======================

export function drawVerticalCircleScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    const length = params['length'] ?? 1;
    const mass = params['mass'] ?? 0.2;
    const v0 = params['initialSpeed'] ?? 5;
    const g = 9.8;
    const r = Math.min(width, height) * 0.27;
    const cx = width * 0.52;
    const cy = height * 0.5;
    const omega = v0 / Math.max(0.1, length);
    const angle = -Math.PI / 2 + omega * currentTime;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const critical = Math.sqrt(g * length);
    const topOk = v0 >= critical;

    drawTitle(ctx, '竖直圆周运动: 最高点临界条件', width, isDark);
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = topOk ? GREEN : RED;
    ctx.beginPath();
    ctx.arc(cx, cy - r, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = topOk ? GREEN : RED;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(topOk ? '可通过最高点' : '最高点速度不足', cx, cy - r - 30);
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    drawBlock(ctx, x, y, 30, 30, ORANGE, isDark, `${mass}kg`);
    drawArrow(ctx, x, y, cx, cy, BLUE, 'Fn');
    drawArrow(ctx, x + 26, y - 10, x + 26, y + 50, RED, 'mg');
    drawHud(ctx, isDark, [
        { label: 'v0', value: `${v0.toFixed(2)} m/s` },
        { label: 'v_top_min', value: `${critical.toFixed(2)} m/s` },
        { label: 'L', value: `${length.toFixed(2)} m` }
    ]);
    drawInfoBar(ctx, width, height, `最高点轻绳模型: v >= sqrt(gR) = ${critical.toFixed(2)}m/s`, isDark);
}

export function drawCentrifugalScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const mass = params['mass'] ?? 1;
    const radius = params['radius'] ?? 0.3;
    const omega = params['angularSpeed'] ?? 5;
    const mu = params['frictionCoeff'] ?? 0.5;
    const g = 9.8;

    const omegaCrit = Math.sqrt((mu * g) / Math.max(0.01, radius));
    const isSliding = omega > omegaCrit;
    const Fneeded = mass * omega * omega * radius;
    const Fmax = mu * mass * g;

    // 布局：俯视图转盘
    const cx = width * 0.45;
    const cy = height * 0.5;
    const R = Math.min(width, height) * 0.25;

    drawTitle(ctx, `离心现象: F需=mω²r vs F实=μmg`, width, isDark);

    // 转盘
    const diskGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    diskGrad.addColorStop(0, isDark ? '#334155' : '#e2e8f0');
    diskGrad.addColorStop(0.8, isDark ? '#1e293b' : '#cbd5e1');
    diskGrad.addColorStop(1, isDark ? '#0f172a' : '#94a3b8');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 转盘旋转标记线
    const phase = omega * currentTime;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        const a = phase + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
        ctx.stroke();
    }

    // 中心点
    ctx.fillStyle = isDark ? '#64748b' : '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // 物块位置
    const rPx = (radius / Math.max(0.01, 1)) * R;
    let blockAngle: number;
    if (isSliding && simulationResult) {
        const f = getFrame(simulationResult, currentTime);
        if (f) {
            blockAngle = Math.atan2(f.position.y, f.position.x);
        } else {
            blockAngle = phase;
        }
    } else {
        blockAngle = phase;
    }
    const blockR = isSliding ? Math.min(rPx + currentTime * 20, R * 1.5) : rPx;
    const bx = cx + blockR * Math.cos(blockAngle);
    const by = cy + blockR * Math.sin(blockAngle);

    // 物块
    drawBlock(ctx, bx, by, 30, 30, isSliding ? RED : BLUE, isDark, `${mass}kg`);

    // 向心力箭头
    if (!isSliding) {
        const fDirX = (cx - bx) / rPx;
        const fDirY = (cy - by) / rPx;
        drawArrow(ctx, bx, by, bx + fDirX * 50, by + fDirY * 50, GREEN, 'f=μmg');
    }

    // 临界条件标注
    ctx.fillStyle = isSliding ? RED : GREEN;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
        isSliding
            ? `ω=${omega.toFixed(1)} > ω临界=${omegaCrit.toFixed(1)} → 离心滑出！`
            : `ω=${omega.toFixed(1)} < ω临界=${omegaCrit.toFixed(1)} → 随盘转动`,
        width / 2,
        height * 0.14
    );

    drawHud(ctx, isDark, [
        { label: 'ω', value: `${omega.toFixed(1)} rad/s` },
        { label: 'ωcrit', value: `${omegaCrit.toFixed(1)} rad/s` },
        { label: 'F需', value: `${Fneeded.toFixed(2)} N` },
        { label: 'Fmax', value: `${Fmax.toFixed(2)} N` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `m=${mass}kg  r=${radius}m  μ=${mu}  ωcrit=√(μg/r)=${omegaCrit.toFixed(1)}rad/s`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawTransmissionBeltScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    const mode = Math.round(params['mode'] ?? 0);
    const r1 = params['r1'] ?? 0.2;
    const r2 = params['r2'] ?? 0.4;
    const omega1 = params['omega1'] ?? 10;
    const omega2 = mode === 3 ? omega1 : (omega1 * r1) / Math.max(0.001, r2);
    const left = { x: width * 0.32, y: height * 0.52 };
    const right = { x: width * 0.68, y: height * 0.52 };
    const rr1 = 34 + r1 * 55;
    const rr2 = 34 + r2 * 55;

    drawTitle(ctx, '传动装置: v = ωr', width, isDark);
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = mode === 1 ? 3 : 10;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y - rr1);
    ctx.lineTo(right.x, right.y - rr2);
    ctx.moveTo(left.x, left.y + rr1);
    ctx.lineTo(right.x, right.y + rr2);
    ctx.stroke();
    if (mode === 1) {
        for (let i = 0; i < 16; i++) {
            const t = i / 16;
            const x = left.x + (right.x - left.x) * t;
            const y = left.y - rr1 + (right.y - rr2 - (left.y - rr1)) * t;
            drawBlock(ctx, x, y, 8, 8, ORANGE, isDark);
        }
    }

    const phase1 = omega1 * currentTime;
    const phase2 = omega2 * currentTime * (mode === 1 ? -1 : 1);
    drawWheel(ctx, left.x, left.y, rr1, phase1, BLUE, isDark, '1');
    drawWheel(ctx, right.x, right.y, rr2, phase2, RED, isDark, '2');
    drawArrow(ctx, left.x, left.y - rr1 - 24, left.x + 80, left.y - rr1 - 24, GREEN, 'v');
    drawArrow(ctx, right.x, right.y - rr2 - 24, right.x + 80, right.y - rr2 - 24, GREEN, 'v');

    const modeLabel = ['皮带传动', '齿轮传动', '摩擦轮传动', '同轴转动'][mode] ?? '传动';
    drawHud(ctx, isDark, [
        { label: 'mode', value: modeLabel },
        { label: 'ω1', value: `${omega1.toFixed(2)} rad/s` },
        { label: 'ω2', value: `${omega2.toFixed(2)} rad/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `r1=${r1}m  r2=${r2}m  ${mode === 3 ? '同轴: ω1=ω2' : '无打滑: ω1r1=ω2r2'}`,
        isDark
    );
}

function drawWheel(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    phase: number,
    color: string,
    isDark: boolean,
    label: string
): void {
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 5, cx, cy, r);
    grad.addColorStop(0, shadeColor(color, 40));
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, shadeColor(color, -40));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
        const a = phase + (i * Math.PI) / 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
        ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    ctx.textBaseline = 'alphabetic';
}
