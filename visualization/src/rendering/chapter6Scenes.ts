/**
 * 力学场景渲染模块 — 第六章 万有引力与航天
 *
 * 场景列表：
 *   - drawOrbitalScene
 *   - drawCavendishScene
 *   - drawMoonEarthTestScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    roundRectPath,
    textColor,
    mutedColor,
    panelFill,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawEmptyState,
    drawArrow,
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
const RED = '#ef4444';

export function drawOrbitalScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const h_km = params['altitude'] ?? 400;
    const vFactor = params['velocityFactor'] ?? 1.0;
    const GM = 3.986e14;
    const R_EARTH = 6.371e6;
    const r = R_EARTH + h_km * 1000;
    const vOrbit = Math.sqrt(GM / r);
    const v = vOrbit * vFactor;

    // 布局
    const cx = width * 0.45;
    const cy = height * 0.5;
    const earthR = Math.min(width, height) * 0.12;
    const orbitR = earthR + (h_km / 36000) * (Math.min(width, height) * 0.3);

    drawTitle(ctx, '万有引力与航天: 卫星轨道运动', width, isDark);

    // 地球
    const earthGrad = ctx.createRadialGradient(cx - earthR * 0.3, cy - earthR * 0.3, earthR * 0.1, cx, cy, earthR);
    earthGrad.addColorStop(0, '#60a5fa');
    earthGrad.addColorStop(0.4, '#3b82f6');
    earthGrad.addColorStop(0.8, '#1d4ed8');
    earthGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, earthR * 0.9, earthR * 0.3, 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('地球', cx, cy + 4);

    // 轨道
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    if (Math.abs(vFactor - 1.0) < 0.02) {
        ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    } else {
        const a = orbitR * (vFactor > 1 ? 1.3 : 0.8);
        const b = orbitR * (vFactor > 1 ? 0.9 : 1.1);
        ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 卫星位置: 优先用引擎轨迹 (真实引力积分), 空结果时回退匀速圆
    const T = (2 * Math.PI * r) / vOrbit;
    const fallbackAngle = (currentTime / T) * Math.PI * 2;
    const frame = getFrame(simulationResult, currentTime);
    let satX: number;
    let satY: number;
    let vAngle: number;
    if (frame) {
        // 引擎轨迹以地球中心为原点 (物理米), 按轨道半径比例 + 角度映射到屏幕
        // 椭圆/逃逸轨道的真实形状与不均匀角速度都由引擎积分决定
        const orbitScale = Math.hypot(frame.position.x, frame.position.y) / Math.max(r, 1);
        const angle = Math.atan2(frame.position.y, frame.position.x);
        satX = cx + orbitR * orbitScale * Math.cos(angle);
        satY = cy + orbitR * orbitScale * Math.sin(angle);
        // 速度方向来自引擎 (屏幕 y 向下翻转)
        vAngle = Math.atan2(-frame.velocity.y, frame.velocity.x);
    } else {
        satX = cx + orbitR * Math.cos(fallbackAngle);
        satY = cy + orbitR * Math.sin(fallbackAngle);
        vAngle = fallbackAngle + Math.PI / 2;
    }

    // 卫星
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(satX, satY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(satX - 20, satY - 3, 12, 6);
    ctx.fillRect(satX + 8, satY - 3, 12, 6);

    // 速度箭头 (方向来自引擎轨迹速度, 椭圆上非切线垂直)
    drawArrow(ctx, satX, satY, satX + Math.cos(vAngle) * 40, satY + Math.sin(vAngle) * 40, GREEN, 'v');

    // 引力箭头
    const gDirX = (cx - satX) / orbitR;
    const gDirY = (cy - satY) / orbitR;
    drawArrow(ctx, satX, satY, satX + gDirX * 35, satY + gDirY * 35, RED, 'F引');

    // 宇宙速度参考
    const v1 = Math.sqrt(GM / R_EARTH) / 1000;
    const v2 = v1 * Math.sqrt(2);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`第一宇宙速度 v₁=${v1.toFixed(2)}km/s`, 16, height - 80);
    ctx.fillText(`第二宇宙速度 v₂=${v2.toFixed(2)}km/s`, 16, height - 62);

    const orbitType =
        vFactor >= 1.41 ? '逃逸轨道' : vFactor > 1.01 ? '椭圆(近地点)' : vFactor < 0.99 ? '椭圆(远地点)' : '圆轨道';
    drawHud(ctx, isDark, [
        { label: 'h', value: `${h_km} km` },
        { label: 'v', value: `${(v / 1000).toFixed(2)} km/s` },
        { label: 'v/v圆', value: `${vFactor.toFixed(2)}` },
        { label: 'type', value: orbitType }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `h=${h_km}km  v=${(v / 1000).toFixed(2)}km/s  v圆=${(vOrbit / 1000).toFixed(2)}km/s  ${orbitType}`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// ======================= Task 4: 碰撞与动量场景 =======================

export function drawCavendishScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    const m1 = params['m1'] ?? 10;
    const m2 = params['m2'] ?? 0.5;
    const distance = params['distance'] ?? 0.1;
    const torsionConst = params['torsionConst'] ?? 1e-4;
    const mirrorDist = params['mirrorDist'] ?? 5;

    const G = 6.674e-11;
    const armLength = 1;
    const F = (G * m1 * m2) / (distance * distance);
    const tau = F * armLength;
    const theta = tau / torsionConst;
    const spotDisp = 2 * mirrorDist * theta;

    const cx = width * 0.42;
    const cy = height * 0.48;
    const armPx = Math.min(width * 0.2, 140);

    drawTitle(ctx, '卡文迪什扭秤测万有引力常数 G', width, isDark);

    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 60);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(cx - 20, 52, 40, 12);

    ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - armPx, cy);
    ctx.lineTo(cx + armPx, cy);
    ctx.stroke();

    const smallR = 10 + m2 * 3;
    const ballPositions = [cx - armPx, cx + armPx];
    for (const bx of ballPositions) {
        const grad = ctx.createRadialGradient(bx - 2, cy - 2, 1, bx, cy, smallR);
        grad.addColorStop(0, '#d4d4d8');
        grad.addColorStop(1, '#71717a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, cy, smallR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('m₂', bx, cy);
    }
    ctx.textBaseline = 'alphabetic';

    const bigR = 18 + Math.log10(Math.max(1, m1)) * 8;
    const bigBallPositions = [cx - armPx - bigR - smallR - 4, cx + armPx + bigR + smallR + 4];
    for (const bx of bigBallPositions) {
        const grad = ctx.createRadialGradient(bx - 3, cy - 3, 2, bx, cy, bigR);
        grad.addColorStop(0, '#fbbf24');
        grad.addColorStop(0.6, '#d97706');
        grad.addColorStop(1, '#92400e');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, cy, bigR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('m₁', bx, cy);
    }
    ctx.textBaseline = 'alphabetic';

    drawArrow(ctx, cx - armPx, cy + smallR + 8, cx - armPx - 30, cy + smallR + 8, RED, 'F引');
    drawArrow(ctx, cx + armPx, cy + smallR + 8, cx + armPx + 30, cy + smallR + 8, RED, 'F引');

    ctx.fillStyle = isDark ? '#67e8f9' : '#06b6d4';
    ctx.fillRect(cx - 8, cy - 32, 16, 4);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(width * 0.85, cy - 50);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx.fillRect(width * 0.85 - 5, cy - 80, 10, 80);
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.strokeRect(width * 0.85 - 5, cy - 80, 10, 80);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(width * 0.85, cy - 50, 4, 0, Math.PI * 2);
    ctx.fill();

    const panelX = width * 0.08;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, panelX, height * 0.72, width * 0.84, 65, 8);
    ctx.fill();
    ctx.fillStyle = textColor(isDark);
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
        `三级放大: 力矩τ=F·L=${tau.toExponential(2)}N·m → 扭转角θ=τ/k=${theta.toExponential(2)}rad → 光点偏移Δ=2Dθ=${spotDisp.toExponential(2)}m`,
        panelX + 10,
        height * 0.72 + 25
    );
    ctx.fillText(`F = G·m₁m₂/r² = ${F.toExponential(3)}N   G ≈ 6.674×10⁻¹¹ N·m²/kg²`, panelX + 10, height * 0.72 + 50);

    drawHud(ctx, isDark, [
        { label: 'm₁', value: `${m1} kg` },
        { label: 'm₂', value: `${m2} kg` },
        { label: 'r', value: `${distance} m` },
        { label: 'F', value: `${F.toExponential(2)} N` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `m₁=${m1}kg  m₂=${m2}kg  r=${distance}m  k=${torsionConst.toExponential(1)}N·m/rad  D=${mirrorDist}m`,
        isDark
    );
}

export function drawMoonEarthTestScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, currentTime, simulationResult } = opts;
    // 引擎单一真源: maxValues aMoon/gOver3600/aFromSquareInv/ratioRr/relDiff_pct (G=9.80665)
    const engMax = simulationResult?.diagnostics?.maxValues as
        | {
              aMoon?: number;
              gOver3600?: number;
              aFromSquareInv?: number;
              ratioRr?: number;
              relDiff_pct?: number;
              r?: number;
          }
        | undefined;
    const R_earth = 6.371e6;
    const r_moon = 3.844e8;
    const T_moon = 27.3 * 86400;
    const g_surface = 9.8;

    // 回退自算 (无引擎结果时)
    const a_moon = engMax?.aMoon ?? (4 * Math.PI * Math.PI * r_moon) / (T_moon * T_moon);
    const ratio = (R_earth / r_moon) * (R_earth / r_moon);
    const a_theory = engMax?.aFromSquareInv ?? g_surface * ratio;
    const a_ref = engMax?.gOver3600 ?? g_surface / 3600;
    const ratioRr = engMax?.ratioRr ?? R_earth / r_moon;
    const rShow = engMax?.r ?? r_moon;
    const error = engMax?.relDiff_pct ?? (Math.abs(a_moon - a_theory) / a_theory) * 100;

    const cx = width * 0.35;
    const cy = height * 0.45;
    const earthR = 45;
    const moonOrbitR = Math.min(width * 0.25, 160);

    drawTitle(ctx, '月地检验: 验证万有引力平方反比律', width, isDark);

    const earthGrad = ctx.createRadialGradient(cx - earthR * 0.3, cy - earthR * 0.3, earthR * 0.1, cx, cy, earthR);
    earthGrad.addColorStop(0, '#60a5fa');
    earthGrad.addColorStop(0.5, '#2563eb');
    earthGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('地球', cx, cy + 4);

    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, moonOrbitR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const moonAngle = currentTime * 0.3;
    const moonX = cx + moonOrbitR * Math.cos(moonAngle);
    const moonY = cy + moonOrbitR * Math.sin(moonAngle);
    const moonR = 14;
    const moonGrad = ctx.createRadialGradient(moonX - 3, moonY - 3, 2, moonX, moonY, moonR);
    moonGrad.addColorStop(0, '#e5e7eb');
    moonGrad.addColorStop(0.6, '#9ca3af');
    moonGrad.addColorStop(1, '#4b5563');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('月球', moonX, moonY + 3);

    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(moonX, moonY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`r = ${(rShow / 1e8).toFixed(2)}×10⁸m`, (cx + moonX) / 2, (cy + moonY) / 2 - 10);
    const gDir = { x: (cx - moonX) / moonOrbitR, y: (cy - moonY) / moonOrbitR };
    drawArrow(ctx, moonX, moonY, moonX + gDir.x * 40, moonY + gDir.y * 40, RED, 'F引');

    const barX = width * 0.65;
    const barW = 60;
    const barH = height * 0.35;
    const barTop = height * 0.22;

    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, barX - 20, barTop - 30, barW * 2 + 60, barH + 80, 8);
    ctx.fill();

    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('a_月 vs g/3600 对比', barX + barW + 10, barTop - 10);

    const maxA = Math.max(a_moon, a_theory) * 1.2;
    const h1 = (a_moon / maxA) * barH;
    ctx.fillStyle = BLUE;
    roundRectPath(ctx, barX, barTop + barH - h1, barW, h1, 4);
    ctx.fill();
    ctx.fillStyle = BLUE;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`实测`, barX + barW / 2, barTop + barH + 16);
    ctx.fillText(`${a_moon.toExponential(3)}`, barX + barW / 2, barTop + barH - h1 - 6);

    const h2 = (a_theory / maxA) * barH;
    ctx.fillStyle = GREEN;
    roundRectPath(ctx, barX + barW + 20, barTop + barH - h2, barW, h2, 4);
    ctx.fill();
    ctx.fillStyle = GREEN;
    ctx.fillText(`理论`, barX + barW + 20 + barW / 2, barTop + barH + 16);
    ctx.fillText(`${a_theory.toExponential(3)}`, barX + barW + 20 + barW / 2, barTop + barH - h2 - 6);

    ctx.fillStyle = error < 5 ? GREEN : RED;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
        `误差: ${error.toFixed(1)}%  ${error < 5 ? '✓ 验证通过' : '✗ 偏差较大'}`,
        barX + barW + 10,
        barTop + barH + 45
    );

    drawHud(ctx, isDark, [
        { label: 'a月', value: `${a_moon.toExponential(3)} m/s²` },
        { label: 'g/3600', value: `${a_ref.toExponential(3)} m/s²` },
        { label: 'R/r', value: `${ratioRr.toExponential(3)}` },
        { label: 'error', value: `${error.toFixed(1)}%` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `a月=4π²r/T²=${a_moon.toExponential(3)}  g(R/r)²=${a_theory.toExponential(3)}  验证平方反比律`,
        isDark
    );
}
