/**
 * 必修一 第三章「相互作用——力」场景渲染模块
 *
 * 包含 4 个可视化场景：
 *   1. drawHookeLawScene         — 胡克定律 F=kx (竖直弹簧+钩码)
 *   2. drawSlidingFrictionScene  — 滑动摩擦力 f=μN (水平面+物块)
 *   3. drawForceCompositionScene — 力的合成平行四边形定则
 *   4. drawNewtonThirdLawScene   — 牛顿第三定律 (作用力与反作用力)
 *
 * 设计原则：
 *   - 纯函数 + 屏幕坐标，零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染（背景 + 动态元素 + HUD）
 *   - 共享工具函数（drawArrow / roundRectPath）在本文件内复用
 *   - 与 SimulationCanvas 中已有的 drawCollisionScene / drawSpringScene 风格一致
 */

import type { SimulationResult, TrajectoryPoint } from 'physics-core';
import { findFrameIndex, interpolateFrame } from '../utils/frameUtils';

// ========== 共享类型 ==========

export interface Chapter3SceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

// ========== 共享工具函数 ==========

/** 圆角矩形路径 */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

/**
 * 绘制带渐变和箭头的力向量。
 * 可复用：所有需要展示力向量的第三章场景共用此函数。
 */
function drawForceArrow(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label?: string,
    labelOffset?: { dx: number; dy: number }
): void {
    const dx = x2 - x1,
        dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 3) return;
    ctx.save();
    const angle = Math.atan2(dy, dx);
    const headLen = Math.min(14, len * 0.3);

    // 渐变线身
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, color + '66');
    grad.addColorStop(1, color);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - headLen * 0.6 * Math.cos(angle), y2 - headLen * 0.6 * Math.sin(angle));
    ctx.stroke();

    // 箭头头部
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - 0.38), y2 - headLen * Math.sin(angle - 0.38));
    ctx.lineTo(x2 - headLen * 0.45 * Math.cos(angle), y2 - headLen * 0.45 * Math.sin(angle));
    ctx.lineTo(x2 - headLen * Math.cos(angle + 0.38), y2 - headLen * Math.sin(angle + 0.38));
    ctx.closePath();
    ctx.fill();

    // 标签
    if (label) {
        const off = labelOffset ?? { dx: 8, dy: -4 };
        ctx.fillStyle = color;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x2 + off.dx, y2 + off.dy);
    }
    ctx.restore();
}

/** 绘制 3D 风格方块（带阴影、渐变、高光） */
function draw3DBlock(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    baseColor: string,
    isDark: boolean,
    label?: string
): void {
    const x = cx - w / 2,
        y = cy - h / 2;
    // 阴影
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
    roundRectPath(ctx, x + 3, y + 3, w, h, 4);
    ctx.fill();
    // 主体渐变
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, shadeColor(baseColor, -30));
    ctx.fillStyle = grad;
    roundRectPath(ctx, x, y, w, h, 4);
    ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRectPath(ctx, x + 3, y + 3, w - 6, h * 0.3, 3);
    ctx.fill();
    // 标签
    if (label) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
    }
}

/** 颜色加深/变亮 */
function shadeColor(hex: string, amount: number): string {
    const h = hex.replace('#', '');
    const full =
        h.length === 3
            ? h
                  .split('')
                  .map(c => c + c)
                  .join('')
            : h;
    const r = Math.max(0, Math.min(255, parseInt(full.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(full.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(full.slice(4, 6), 16) + amount));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** 绘制底部信息条 */
function drawInfoBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    text: string,
    isDark: boolean
): void {
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, height - 34, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(text, width / 2, height - 18);
}

/** 从轨迹中获取当前帧（插值后） */
function getCurrentFrame(
    simulationResult: SimulationResult | null,
    currentTime: number,
    trajectoryIndex = 0
): TrajectoryPoint | null {
    if (!simulationResult) return null;
    const traj = simulationResult.trajectories[trajectoryIndex];
    if (!traj || traj.length === 0) return null;
    const idx = findFrameIndex([traj], currentTime);
    const p0 = traj[idx]!;
    const p1 = traj[Math.min(idx + 1, traj.length - 1)]!;
    return interpolateFrame(p0, p1, currentTime);
}

/** 绘制"点击运行仿真"提示 */
function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击「运行仿真」开始', width / 2, height / 2);
}

// =====================================================================
// 场景 1: 胡克定律 F=kx (竖直弹簧 + 钩码)
// =====================================================================

/**
 * 绘制胡克定律场景：天花板 + 竖直弹簧 + 钩码 + 刻度尺 + 力向量。
 *
 * 物理关系：
 *   平衡时：mg = kx  →  x = mg/k
 *   弹簧弹力：F = kx (方向向上)
 *   重力：G = mg (方向向下)
 */
export function drawHookeLawScene(opts: Chapter3SceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const k = params['k'] ?? 20;
    const massPerWeight_g = params['massPerWeight'] ?? 50;
    const weightCount = Math.max(1, params['weightCount'] ?? 4);
    const g = params['g'] ?? 9.8;
    const m = (massPerWeight_g / 1000) * weightCount;
    const x_eq = (m * g) / k; // 平衡位置弹簧伸长量 (m)

    // 布局
    const ceilingY = 50;
    const springX = width * 0.55;
    const pixelsPerMeter = 120; // 1m = 120px

    // 当前帧的弹簧伸长量
    const frame = getCurrentFrame(simulationResult, currentTime);
    const currentX = frame ? frame.position.x : x_eq;
    const extensionPx = Math.max(20, currentX * pixelsPerMeter);
    const blockY = ceilingY + extensionPx;

    // --- 天花板 ---
    const ceilGrad = ctx.createLinearGradient(0, ceilingY - 14, 0, ceilingY);
    ceilGrad.addColorStop(0, isDark ? '#334155' : '#94a3b8');
    ceilGrad.addColorStop(1, isDark ? '#475569' : '#cbd5e1');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(springX - 60, ceilingY - 14, 120, 14);
    // 天花板斜线纹理
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.25)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = -50; i < 70; i += 6) {
        ctx.beginPath();
        ctx.moveTo(springX + i, ceilingY - 14);
        ctx.lineTo(springX + i + 8, ceilingY - 4);
        ctx.stroke();
    }

    // --- 竖直弹簧 ---
    const coils = 14;
    const coilSpacing = extensionPx / coils;
    const amplitude = Math.max(6, Math.min(14, 10 * (extensionPx / 200)));
    // 弹簧外发光
    ctx.strokeStyle = isDark ? 'rgba(34,211,238,0.15)' : 'rgba(8,145,178,0.12)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(springX, ceilingY);
    for (let i = 0; i <= coils; i++) {
        const py = ceilingY + coilSpacing * i;
        const px = springX + (i === 0 || i === coils ? 0 : i % 2 === 0 ? -amplitude : amplitude);
        ctx.lineTo(px, py);
    }
    ctx.stroke();
    // 弹簧主体
    const springGrad = ctx.createLinearGradient(springX - amplitude, 0, springX + amplitude, 0);
    springGrad.addColorStop(0, isDark ? '#67e8f9' : '#06b6d4');
    springGrad.addColorStop(0.5, isDark ? '#22d3ee' : '#0891b2');
    springGrad.addColorStop(1, isDark ? '#06b6d4' : '#0e7490');
    ctx.strokeStyle = springGrad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(springX, ceilingY);
    for (let i = 0; i <= coils; i++) {
        const py = ceilingY + coilSpacing * i;
        const px = springX + (i === 0 || i === coils ? 0 : i % 2 === 0 ? -amplitude : amplitude);
        ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.lineJoin = 'miter';

    // --- 钩码 (3D 方块) ---
    const blockW = 50,
        blockH = 36;
    draw3DBlock(ctx, springX, blockY + blockH / 2, blockW, blockH, '#3b82f6', isDark, `${m.toFixed(2)}kg`);

    // --- 刻度尺 (竖直，在弹簧左侧) ---
    // 标尺 X 钳制在左界内，窄画布不再越出画布左侧
    const rulerX = Math.max(20, springX - 80);
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rulerX, ceilingY);
    ctx.lineTo(rulerX, ceilingY + 200);
    ctx.stroke();
    // 刻度
    const rulerMeters = 200 / pixelsPerMeter;
    const majorCount = Math.ceil(rulerMeters / 0.1);
    ctx.font = '10px monospace';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    for (let i = 0; i <= majorCount; i++) {
        const ty = ceilingY + i * 0.1 * pixelsPerMeter;
        if (ty > ceilingY + 200) break;
        ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
        ctx.beginPath();
        ctx.moveTo(rulerX, ty);
        ctx.lineTo(rulerX + 8, ty);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${(i * 0.1).toFixed(1)}m`, rulerX - 4, ty);
    }
    // 标记平衡位置 x_eq
    const eqY = ceilingY + x_eq * pixelsPerMeter;
    if (eqY <= ceilingY + 200) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(rulerX - 4, eqY);
        ctx.lineTo(springX + 30, eqY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`x=${x_eq.toFixed(3)}m`, rulerX - 6, eqY);
    }
    // 尺标签
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.save();
    ctx.translate(rulerX - 28, ceilingY + 100);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('伸长量 x', 0, 0);
    ctx.restore();

    // --- 力向量 ---
    const forceScale = 30; // 1N = 30px
    const gravityN = m * g;
    const springForceN = k * currentX;
    // 重力 (向下，红色)
    drawForceArrow(ctx, springX, blockY + blockH, springX, blockY + blockH + gravityN * forceScale, '#ef4444', 'G=mg', {
        dx: 8,
        dy: 0
    });
    // 弹簧弹力 (向上，绿色)
    drawForceArrow(ctx, springX, blockY, springX, blockY - springForceN * forceScale, '#22c55e', 'F=kx', {
        dx: 8,
        dy: 0
    });

    // --- 信息条 ---
    drawInfoBar(
        ctx,
        width,
        height,
        `k=${k}N/m  m=${m.toFixed(2)}kg  x=${currentX.toFixed(3)}m  F=kx=${(k * currentX).toFixed(2)}N  G=mg=${gravityN.toFixed(2)}N`,
        isDark
    );

    // --- 左上角 HUD ---
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 'x', value: `${currentX.toFixed(3)} m` },
        { label: 'F', value: `${(k * currentX).toFixed(3)} N` }
    ]);

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 2: 滑动摩擦力 f=μN (水平面 + 物块)
// =====================================================================

/**
 * 绘制滑动摩擦力场景：水平面 + 物块 + 受力分析。
 *
 * 物理关系：
 *   正压力：N = mg (水平面)
 *   滑动摩擦力：f = μN = μmg (方向与运动方向相反)
 *   匀速条件：F_pull = f
 *   加速条件：F_pull > f, a = (F_pull - f) / m
 */
export function drawSlidingFrictionScene(opts: Chapter3SceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const mu = params['mu'] ?? 0.3;
    const mass = params['mass'] ?? 1;
    const v0 = params['v0'] ?? 0.5;
    const uniformMotion = (params['uniformMotion'] ?? 1) === 1;
    const g = params['g'] ?? 9.8;

    const N = mass * g;
    const f = mu * N;
    const F_pull = uniformMotion ? f : f * 1.5;
    const a = uniformMotion ? 0 : (F_pull - f) / mass;

    // 布局
    const groundY = height * 0.65;
    const startX = 80;
    const pixelsPerMeter = 80;

    // --- 地面 (带斜线纹理) ---
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    // 地面斜线
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.3)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x - 10, groundY + 10);
        ctx.stroke();
    }

    // --- 刻度尺 (水平，在地面上方) ---
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= (width - startX) / (0.5 * pixelsPerMeter); i++) {
        const mx = startX + i * 0.5 * pixelsPerMeter;
        if (mx > width - 20) break;
        ctx.beginPath();
        ctx.moveTo(mx, groundY);
        ctx.lineTo(mx, groundY + 5);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${(i * 0.5).toFixed(1)}`, mx, groundY + 8);
    }
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x (m)', width - 30, groundY + 8);

    // --- 物块位置 ---
    const frame = getCurrentFrame(simulationResult, currentTime);
    const blockX_m = frame ? frame.position.x : 0;
    const blockV = frame ? frame.velocity.x : v0;
    // 物块屏幕位置按画布钳制，大位移不再越出右界
    const blockScreenX = Math.max(startX, Math.min(width - 58, startX + blockX_m * pixelsPerMeter));
    const blockW = 48,
        blockH = 40;
    const blockCY = groundY - blockH / 2;

    draw3DBlock(ctx, blockScreenX, blockCY, blockW, blockH, '#3b82f6', isDark, `${mass}kg`);

    // --- 速度向量 ---
    if (Math.abs(blockV) > 0.01) {
        const vScale = 60;
        drawForceArrow(
            ctx,
            blockScreenX + blockW / 2,
            blockCY,
            blockScreenX + blockW / 2 + blockV * vScale,
            blockCY,
            '#22c55e',
            'v',
            { dx: 4, dy: -16 }
        );
    }

    // --- 受力分析 ---
    const forceScale = 8; // 1N = 8px
    const cx = blockScreenX,
        cy = blockCY;

    // 重力 G (向下)
    drawForceArrow(ctx, cx, cy, cx, cy + (N * forceScale) / 5, '#a855f7', 'G=mg', { dx: 8, dy: 0 });
    // 支持力 N (向上)
    drawForceArrow(ctx, cx, cy, cx, cy - (N * forceScale) / 5, '#3b82f6', 'N', { dx: -20, dy: -4 });
    // 拉力 F_pull (向右)
    drawForceArrow(ctx, cx + blockW / 2, cy, cx + blockW / 2 + F_pull * forceScale, cy, '#f59e0b', 'F_pull', {
        dx: 4,
        dy: -16
    });
    // 摩擦力 f (向左，与运动方向相反)
    drawForceArrow(ctx, cx - blockW / 2, cy, cx - blockW / 2 - f * forceScale, cy, '#ef4444', 'f=μN', {
        dx: -32,
        dy: -16
    });

    // --- 运动模式标签 ---
    const motionLabel = uniformMotion ? '匀速运动 (F_pull=f)' : `加速运动 a=${a.toFixed(3)}m/s²`;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(motionLabel).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, 50, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = uniformMotion ? '#22c55e' : '#f59e0b';
    ctx.fillText(motionLabel, width / 2, 65);

    // --- 信息条 ---
    drawInfoBar(
        ctx,
        width,
        height,
        `μ=${mu}  m=${mass}kg  N=mg=${N.toFixed(2)}N  f=μN=${f.toFixed(2)}N  F_pull=${F_pull.toFixed(2)}N`,
        isDark
    );

    // --- 左上角 HUD ---
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 'x', value: `${blockX_m.toFixed(3)} m` },
        { label: 'v', value: `${blockV.toFixed(3)} m/s` }
    ]);

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 3: 力的合成 (平行四边形定则)
// =====================================================================

/**
 * 绘制力的合成场景：平行四边形 + 两个分力 + 合力 + 夹角标注。
 *
 * 物理关系 (余弦定理)：
 *   F = √(F1² + F2² + 2·F1·F2·cosθ)
 *   tanφ = F2·sinθ / (F1 + F2·cosθ)   (合力与 F1 夹角)
 *
 * 注：本场景的"轨迹"为伪轨迹 (扫过夹角 0°→180° 的合力)，
 *     可视化只展示用户指定夹角下的静态平行四边形。
 */
export function drawForceCompositionScene(opts: Chapter3SceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult } = opts;

    const F1 = params['f1'] ?? 3;
    const F2 = params['f2'] ?? 4;
    const angleDeg = params['angleDeg'] ?? 90;
    const angleRad = (angleDeg * Math.PI) / 180;

    // 合力计算
    const F1vec = { x: F1, y: 0 };
    const F2vec = { x: F2 * Math.cos(angleRad), y: -F2 * Math.sin(angleRad) }; // 屏幕y向下为正，取负让F2向上
    const Fvec = { x: F1vec.x + F2vec.x, y: F1vec.y + F2vec.y };
    const Fmag = Math.sqrt(Fvec.x * Fvec.x + Fvec.y * Fvec.y);
    const FangleDeg = (Math.atan2(-Fvec.y, Fvec.x) * 180) / Math.PI; // 转回数学角度

    // 布局：共点在画面中心偏左
    const originX = width * 0.35;
    const originY = height * 0.55;
    const forceScale = 40; // 1N = 40px

    // --- 坐标原点 ---
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.beginPath();
    ctx.arc(originX, originY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('O', originX - 8, originY + 4);

    // --- 平行四边形虚线 (F1 平移到 F2 端点, F2 平移到 F1 端点) ---
    const F1end = { x: originX + F1vec.x * forceScale, y: originY + F1vec.y * forceScale };
    const F2end = { x: originX + F2vec.x * forceScale, y: originY + F2vec.y * forceScale };
    const Fend = { x: originX + Fvec.x * forceScale, y: originY + Fvec.y * forceScale };
    // F1 平移到 F2 端点
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(F2end.x, F2end.y);
    ctx.lineTo(Fend.x, Fend.y);
    ctx.stroke();
    // F2 平移到 F1 端点
    ctx.beginPath();
    ctx.moveTo(F1end.x, F1end.y);
    ctx.lineTo(Fend.x, Fend.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- 夹角弧线 ---
    const arcR = 30;
    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(originX, originY, arcR, 0, -angleRad, true);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const arcMidAngle = -angleRad / 2;
    ctx.fillText(
        `θ=${angleDeg}°`,
        originX + (arcR + 16) * Math.cos(arcMidAngle),
        originY + (arcR + 16) * Math.sin(arcMidAngle)
    );
    ctx.textBaseline = 'alphabetic';

    // --- 分力 F1 (蓝色, 水平向右) ---
    drawForceArrow(ctx, originX, originY, F1end.x, F1end.y, '#3b82f6', `F₁=${F1}N`, { dx: 8, dy: -8 });
    // --- 分力 F2 (红色) ---
    drawForceArrow(ctx, originX, originY, F2end.x, F2end.y, '#ef4444', `F₂=${F2}N`, { dx: 8, dy: -8 });
    // --- 合力 F (绿色, 平行四边形对角线) ---
    drawForceArrow(ctx, originX, originY, Fend.x, Fend.y, '#22c55e', `F=${Fmag.toFixed(2)}N`, { dx: 8, dy: 8 });

    // --- 合力方向角 φ 标注 ---
    if (Math.abs(FangleDeg) > 0.1) {
        const phiArcR = 22;
        ctx.strokeStyle = isDark ? 'rgba(34,197,94,0.6)' : 'rgba(22,163,74,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(originX, originY, phiArcR, 0, (-FangleDeg * Math.PI) / 180, true);
        ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`φ=${FangleDeg.toFixed(1)}°`, originX + phiArcR + 4, originY - phiArcR);
    }

    // --- 公式展示 (右侧) ---
    const formulaX = width * 0.7;
    const formulaY = height * 0.25;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)';
    const formulaText = [
        '合力公式 (余弦定理)',
        'F = √(F₁² + F₂² + 2·F₁·F₂·cosθ)',
        `  = √(${F1}² + ${F2}² + 2×${F1}×${F2}×cos${angleDeg}°)`,
        `  = ${Fmag.toFixed(3)} N`,
        '',
        '方向角',
        `φ = ${FangleDeg.toFixed(2)}°`,
        '',
        '特例验证',
        'θ=0°:  F = F₁+F₂ = ' + (F1 + F2).toFixed(2) + 'N',
        'θ=90°: F = √(F₁²+F₂²) = ' + Math.sqrt(F1 * F1 + F2 * F2).toFixed(2) + 'N',
        'θ=180°: F = |F₁-F₂| = ' + Math.abs(F1 - F2).toFixed(2) + 'N'
    ];
    const lineH = 18;
    const boxW = 280,
        boxH = formulaText.length * lineH + 16;
    roundRectPath(ctx, formulaX, formulaY, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, formulaX, formulaY, boxW, boxH, 6);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    formulaText.forEach((line, i) => {
        const isTitle = i === 0 || i === 5 || i === 8;
        ctx.font = isTitle ? 'bold 12px sans-serif' : '12px monospace';
        ctx.fillStyle = isTitle ? (isDark ? '#60a5fa' : '#2563eb') : isDark ? '#e2e8f0' : '#1e293b';
        ctx.fillText(line, formulaX + 12, formulaY + 10 + i * lineH);
    });
    ctx.textBaseline = 'alphabetic';

    // --- 信息条 ---
    drawInfoBar(
        ctx,
        width,
        height,
        `F₁=${F1}N  F₂=${F2}N  θ=${angleDeg}°  →  F=${Fmag.toFixed(3)}N  φ=${FangleDeg.toFixed(2)}°`,
        isDark
    );

    // --- 左上角 HUD ---
    drawHud(ctx, isDark, [
        { label: 'F₁', value: `${F1} N` },
        { label: 'F₂', value: `${F2} N` },
        { label: 'θ', value: `${angleDeg}°` },
        { label: 'F', value: `${Fmag.toFixed(3)} N` }
    ]);

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 4: 牛顿第三定律 (作用力与反作用力)
// =====================================================================

/**
 * 绘制牛顿第三定律场景：两个物块 A、B + 作用力 F_AB + 反作用力 F_BA。
 *
 * 物理关系：
 *   F_AB = -F_BA  (大小相等、方向相反、作用在两个物体上)
 *   allowMotion=true: 两物体共同加速 a = F_AB / (mA + mB)
 *   allowMotion=false: 两物体静止，仅展示力
 */
export function drawNewtonThirdLawScene(opts: Chapter3SceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const forceAB = params['forceAB'] ?? 5;
    const massA = params['massA'] ?? 1;
    const massB = params['massB'] ?? 2;
    const allowMotion = (params['allowMotion'] ?? 0) === 1;

    const F_AB = forceAB;
    const F_BA = -forceAB;
    const aSystem = allowMotion ? F_AB / (massA + massB) : 0;

    const labelColor = isDark ? '#e2e8f0' : '#1e293b';

    // 布局
    const groundY = height * 0.65;
    const startX = width * 0.25;
    const gap = 60; // A 与 B 初始间距 (像素)
    const pixelsPerMeter = 80;

    // --- 地面 ---
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.3)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x - 10, groundY + 10);
        ctx.stroke();
    }

    // --- 物块位置 ---
    const frameA = getCurrentFrame(simulationResult, currentTime, 0);
    const frameB = getCurrentFrame(simulationResult, currentTime, 1);
    // 初位置从轨迹首帧取，避免硬编码 ±1 与 physics-core 初值耦合
    const initA = getCurrentFrame(simulationResult, 0, 0);
    const initB = getCurrentFrame(simulationResult, 0, 1);
    const initAx = initA ? initA.position.x : -1;
    const initBx = initB ? initB.position.x : 1;
    const dxA = frameA ? frameA.position.x - initAx : 0; // 相对初始位置的位移
    const dxB = frameB ? frameB.position.x - initBx : 0;
    const blockW = 56,
        blockH = 44;
    // 钳制到画布内，防止大位移越界
    const maxOff = Math.max(0, width - (startX + gap + blockW) - 10);
    const minOff = -(startX - 10);
    const xA_offset = Math.max(minOff, Math.min(maxOff, dxA * pixelsPerMeter));
    const xB_offset = Math.max(minOff, Math.min(maxOff, dxB * pixelsPerMeter));
    const ax = startX + xA_offset;
    const bx = startX + gap + blockW + xB_offset;
    const blockCY = groundY - blockH / 2;

    // --- 物块 A (蓝色) ---
    draw3DBlock(ctx, ax, blockCY, blockW, blockH, '#3b82f6', isDark, 'A');
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${massA}kg`, ax, blockCY + blockH / 2 + 16);

    // --- 物块 B (红色) ---
    draw3DBlock(ctx, bx, blockCY, blockW, blockH, '#ef4444', isDark, 'B');
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${massB}kg`, bx, blockCY + blockH / 2 + 16);

    // --- 连接线 (A 与 B 之间) ---
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ax + blockW / 2, blockCY);
    ctx.lineTo(bx - blockW / 2, blockCY);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- 作用力 F_AB (A 对 B，作用在 B 上，向右) ---
    const forceScale = 12; // 1N = 12px
    drawForceArrow(ctx, bx, blockCY - 20, bx + F_AB * forceScale, blockCY - 20, '#f59e0b', `F_AB=${F_AB}N`, {
        dx: 4,
        dy: -14
    });

    // --- 反作用力 F_BA (B 对 A，作用在 A 上，向左) ---
    drawForceArrow(
        ctx,
        ax,
        blockCY - 20,
        ax + F_BA * forceScale,
        blockCY - 20, // F_BA 是负数，自动向左
        '#a855f7',
        `F_BA=${F_BA}N`,
        { dx: -50, dy: -14 }
    );

    // --- 运动状态标签 ---
    const motionLabel = allowMotion
        ? `共同加速 a=F/(mA+mB)=${aSystem.toFixed(3)} m/s²`
        : '两物体静止 (作用力与反作用力依然存在)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(motionLabel).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, 50, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = allowMotion ? '#f59e0b' : '#22c55e';
    ctx.fillText(motionLabel, width / 2, 65);

    // --- 关系标注 ---
    ctx.font = 'bold 14px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22c55e';
    ctx.fillText('F_AB = -F_BA', width / 2, height * 0.3);

    // --- 信息条 ---
    drawInfoBar(
        ctx,
        width,
        height,
        `F_AB=${F_AB}N  F_BA=${F_BA}N  |F_AB|=|F_BA|=${Math.abs(F_AB)}N  mA=${massA}kg  mB=${massB}kg`,
        isDark
    );

    // --- 左上角 HUD ---
    const v = frameA ? frameA.velocity.x : 0;
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 'F_AB', value: `${F_AB} N` },
        { label: 'F_BA', value: `${F_BA} N` },
        ...(allowMotion ? [{ label: 'v', value: `${v.toFixed(3)} m/s` }] : [])
    ]);

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 共享 HUD 绘制
// =====================================================================

/** 绘制左上角状态 HUD */
function drawHud(ctx: CanvasRenderingContext2D, isDark: boolean, rows: Array<{ label: string; value: string }>): void {
    const padding = 10;
    const lineH = 18;
    const boxH = rows.length * lineH + padding * 2;
    const boxW = 180;

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)';
    roundRectPath(ctx, 8, 10, boxW, boxH, 6);
    ctx.fill();

    rows.forEach((row, i) => {
        const y = 10 + padding + i * lineH;
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${row.label} = ${row.value}`, 16, y);
    });
    ctx.textBaseline = 'alphabetic';
}
