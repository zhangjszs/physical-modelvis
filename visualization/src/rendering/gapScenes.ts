/**
 * 可视化缺口补建场景渲染模块 (Stage K: 8 个独立场景)
 *
 * 对应 visualization-gap-list.md 的 8 个待建场景，每个场景一个独立的完整渲染函数：
 *   1. drawTotalInternalReflectionScene — 全反射与光导 (复用 refraction 模型, 渲染层算光线几何)
 *   2. drawCurrentMagneticFieldScene    — 电流的磁场 (current-magnetic-field 模型, 读 result.extra)
 *   3. drawElectricFieldLinesScene      — 电场线分布 (electric-field-lines 模型, 读 result.extra)
 *   4. drawNewtonTubeScene              — 牛顿管 (复用 uniform-accelerated, 渲染层算羽毛空气阻力)
 *   5. drawBulbVIScene                  — 小灯泡伏安特性 (复用 circuit, 读 charts.vx_t)
 *   6. drawWorkEnergyScene              — 动能定理 (复用 uniform-accelerated, 读 charts.ke_t)
 *   7. drawBallXTimeScene               — 小球 x-t 图像 (复用 simple-pendulum, 提取轨迹 x(t))
 *   8. drawGeigerCounterScene           — 盖革计数器 (复用 radioactive-decay, 读 charts.x_t/y_t)
 *
 * 设计原则 (沿用 thermalScenes.ts / nuclearScenes.ts)：
 *   - 纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染 (背景 + 动态元素 + HUD)
 *   - 共享工具函数在本文件内复用
 */

import type { SimulationResult } from 'physics-core';

// ========== 共享类型 ==========

export interface GapSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

// result.extra 的局部收窄类型 (与 physics-core 模型输出结构一致)
interface Vec2 {
    x: number;
    y: number;
}
interface MagFieldLine {
    points: Vec2[];
}
interface MagFieldSample {
    x: number;
    y: number;
    bx: number;
    by: number;
    magnitude: number;
}
interface MagFieldExtra {
    fieldLines: MagFieldLine[];
    samples: MagFieldSample[];
    wire?: Vec2;
    poles?: { north: Vec2; south: Vec2 };
}
interface FieldLine {
    points: Vec2[];
    sign: 1 | -1;
}
interface FieldSample {
    x: number;
    y: number;
    ex: number;
    ey: number;
    magnitude: number;
}
interface ElectricFieldExtra {
    fieldLines: FieldLine[];
    samples: FieldSample[];
    plates?: { top: number; bottom: number; left: number; right: number };
    plateField?: number;
}
interface SeriesLike {
    points: Array<{ x: number; y: number }>;
}

// ========== 共享工具函数 ==========

function clearScene(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, w: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, w / 2, 28);
    ctx.textAlign = 'left';
}

function drawHud(ctx: CanvasRenderingContext2D, isDark: boolean, rows: Array<{ label: string; value: string }>): void {
    if (rows.length === 0) return;
    const padding = 8;
    const lineH = 16;
    const boxH = rows.length * lineH + padding * 2;
    const boxW = 210;
    const x = 10;
    const y = 42;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.88)';
    roundRectPath(ctx, x, y, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    rows.forEach((row, i) => {
        const ry = y + padding + i * lineH;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${row.label} = ${row.value}`, x + padding, ry);
    });
    ctx.textBaseline = 'alphabetic';
}

function drawInfoBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    text: string,
    isDark: boolean
): void {
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, height - 34, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(text, width / 2, height - 18);
}

/** 在 (x1,y1)->(x2,y2) 方向末端画箭头 */
function arrowHead(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    size: number,
    color: string
): void {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(ang - 0.4), y2 - size * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - size * Math.cos(ang + 0.4), y2 - size * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
}

/** 画一条带方向箭头(沿线中段)的折线 */
function drawFieldLine(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>, color: string, size = 8): void {
    if (pts.length < 2) return;
    const p0 = pts[0];
    if (!p0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    for (let i = 1; i < pts.length; i++) {
        const pi = pts[i];
        if (!pi) continue;
        ctx.lineTo(pi[0], pi[1]);
    }
    ctx.stroke();
    const n = pts.length;
    const marks = [Math.floor(n * 0.32), Math.floor(n * 0.62), Math.floor(n * 0.88)].filter(i => i > 0 && i < n - 1);
    for (const i of marks) {
        const a = pts[i - 1];
        const b = pts[i + 1];
        if (!a || !b) continue;
        arrowHead(ctx, a[0], a[1], b[0], b[1], size, color);
    }
}

/** 画矢量场箭头 (math 坐标, 屏幕 y 翻转) */
function drawVectorField(
    ctx: CanvasRenderingContext2D,
    samples: Array<{ x: number; y: number; ex: number; ey: number; magnitude: number }>,
    toScreen: (x: number, y: number) => [number, number],
    maxMag: number,
    color: string
): void {
    if (maxMag <= 0) return;
    for (const s of samples) {
        if (s.magnitude < maxMag * 0.04) continue;
        const [px, py] = toScreen(s.x, s.y);
        const len = 16 * Math.min(1, s.magnitude / maxMag);
        const mag = Math.hypot(s.ex, s.ey) || 1e-9;
        const dx = (s.ex / mag) * len;
        const dy = -(s.ey / mag) * len; // 屏幕 y 翻转
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + dx, py + dy);
        ctx.stroke();
        arrowHead(ctx, px, py, px + dx, py + dy, 5, color);
    }
}

/** 在序列点上按 x 线性插值取 y (用于从 charts 取某时刻物理量) */
function interpSeries(series: SeriesLike | undefined, x: number): number {
    if (!series || series.points.length === 0) return 0;
    const pts = series.points;
    const first = pts[0];
    if (!first) return 0;
    if (x <= first.x) return first.y;
    const last = pts[pts.length - 1];
    if (!last) return 0;
    if (x >= last.x) return last.y;
    for (let i = 1; i < pts.length; i++) {
        const pi = pts[i];
        if (!pi) continue;
        if (x <= pi.x) {
            const a = pts[i - 1];
            const b = pts[i];
            if (!a || !b) return last.y;
            const f = (x - a.x) / Math.max(1e-9, b.x - a.x);
            return a.y + f * (b.y - a.y);
        }
    }
    return last.y;
}

/** 取最大值 (用循环代替 Math.max(...arr), 避免大数组展开触发 RangeError) */
function maxOf(values: Array<number>, base: number): number {
    let m = base;
    for (const v of values) if (v > m) m = v;
    return m;
}

interface PendTrajPoint {
    t: number;
    position: { x: number };
}

/**
 * 由摆轨迹过零时刻实测周期。
 * 摆球起点在极端位置, x 首过零在 t=T/4; 若采到 ≥2 个过零, 相邻过零间距 = T/2。
 * 窗口太短 (无过零) 返回 null, 由调用方回退小角度公式。
 */
function measurePendulumPeriod(traj: PendTrajPoint[] | undefined): number | null {
    if (!traj || traj.length < 4) return null;
    const crossings: number[] = [];
    for (let i = 1; i < traj.length; i++) {
        const a = traj[i - 1];
        const b = traj[i];
        if (!a || !b) continue;
        const xa = a.position.x;
        const xb = b.position.x;
        if (xa * xb < 0) {
            const f = xa / (xa - xb);
            crossings.push(a.t + f * (b.t - a.t));
        } else if (xa === 0) {
            crossings.push(a.t);
        }
    }
    if (crossings.length >= 2) {
        const T = (2 * (crossings[crossings.length - 1]! - crossings[0]!)) / (crossings.length - 1);
        return T > 0 ? T : null;
    }
    if (crossings.length === 1) {
        const T = 4 * crossings[0]!;
        return T > 0 ? T : null;
    }
    return null;
}

function placeholder(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击「运行仿真」开始', w / 2, h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

// ============================================================================
// 1. 全反射与光导 (复用 refraction 模型, 渲染层计算光线几何)
// ============================================================================

export function drawTotalInternalReflectionScene(o: GapSceneOptions): void {
    const { ctx, width, height, isDark, params } = o;
    clearScene(ctx, width, height, isDark);
    const n1 = params['n1'] ?? 1.5;
    const n2 = params['n2'] ?? 1.0;
    const angleDeg = params['angle'] ?? 50;
    const mode = Math.round(params['mode'] ?? 1); // 0=普通折射 1=全反射 2=光导纤维
    const fg = isDark ? '#e2e8f0' : '#1e293b';
    const grid = isDark ? '#334155' : '#cbd5e1';

    drawTitle(ctx, '全反射与光导', width, isDark);

    if (mode === 2) {
        // ---- 光导纤维：水平纤芯内的全反射传导 ----
        const fy0 = height * 0.3;
        const fy1 = height * 0.7;
        const fx0 = width * 0.12;
        const fx1 = width * 0.88;
        ctx.fillStyle = isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.12)';
        ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
        ctx.strokeStyle = grid;
        ctx.lineWidth = 2;
        ctx.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
        const cy = (fy0 + fy1) / 2;
        const phi = (angleDeg * Math.PI) / 180;
        let x = fx0;
        let y = cy;
        const dx = Math.cos(phi);
        let dy = Math.sin(phi);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const stepLen = 4;
        for (let i = 0; i < 4000; i++) {
            x += dx * stepLen;
            y += dy * stepLen;
            if (y <= fy0) {
                y = fy0;
                dy = -dy;
            } else if (y >= fy1) {
                y = fy1;
                dy = -dy;
            }
            ctx.lineTo(x, y);
            if (x >= fx1) break;
        }
        ctx.stroke();
        arrowHead(ctx, fx0, cy, fx0 + Math.cos(phi) * 30, cy + Math.sin(phi) * 30, 10, '#f59e0b');
        ctx.fillStyle = fg;
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`纤芯 n₁=${n1.toFixed(2)}  /  包层 n₂=${n2.toFixed(2)}`, 12, height - 40);
        ctx.fillText(`入射角 φ=${angleDeg.toFixed(0)}° → 全反射在芯-包层界面上传导`, 12, height - 22);
        drawHud(ctx, isDark, [
            { label: 'n₁(芯)', value: n1.toFixed(2) },
            { label: 'n₂(包层)', value: n2.toFixed(2) },
            { label: 'φ', value: `${angleDeg.toFixed(0)}°` }
        ]);
        return;
    }

    // ---- 界面折射 / 全反射 ----
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.34;
    const math = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];

    // 两种介质
    ctx.fillStyle = isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.10)';
    ctx.fillRect(0, 0, width, cy);
    ctx.fillStyle = isDark ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.10)';
    ctx.fillRect(0, cy, width, height - cy);

    // 界面
    ctx.strokeStyle = grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const [lx, ly] = math(-2, 0);
    const [rx, ry] = math(2, 0);
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // 法线
    ctx.strokeStyle = grid;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    const [nx0, ny0] = math(0, 1.6);
    const [nx1, ny1] = math(0, -1.6);
    ctx.moveTo(nx0, ny0);
    ctx.lineTo(nx1, ny1);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = fg;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`介质1  n₁=${n1.toFixed(2)}`, 12, 20);
    ctx.fillText(`介质2  n₂=${n2.toFixed(2)}`, 12, height - 12);

    const th1 = (angleDeg * Math.PI) / 180;
    const critical = n1 > n2 ? Math.asin(Math.min(1, n2 / n1)) : NaN;
    const hit = math(0, 0);

    // 入射光线 (自左上射向界面)
    const L = 2.2;
    const start = math(-L * Math.sin(th1), L * Math.cos(th1));
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(hit[0], hit[1]);
    ctx.stroke();
    arrowHead(ctx, start[0], start[1], hit[0], hit[1], 11, '#f59e0b');

    const isTIR = mode === 1 || (n1 > n2 && !isNaN(critical) && th1 > critical);
    if (isTIR) {
        const end = math(L * Math.sin(th1), L * Math.cos(th1)); // 反射回介质1 (向上)
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(hit[0], hit[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
        arrowHead(ctx, hit[0], hit[1], end[0], end[1], 11, '#ef4444');
        const critDeg = isNaN(critical) ? 0 : (critical * 180) / Math.PI;
        drawHud(ctx, isDark, [
            { label: '入射角 θ₁', value: `${angleDeg.toFixed(0)}°` },
            { label: '临界角 θc', value: `${critDeg.toFixed(1)}°` },
            { label: '现象', value: '全反射' }
        ]);
        drawInfoBar(ctx, width, height, `θ₁ > θc → 光全部反射回光密介质 (光导/全反射棱镜原理)`, isDark);
    } else {
        const sinTh2 = Math.min(1, (n1 * Math.sin(th1)) / Math.max(1e-6, n2));
        const th2 = Math.asin(sinTh2);
        const end = math(L * Math.sin(th2), -L * Math.cos(th2)); // 折射入介质2 (向下)
        ctx.strokeStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(hit[0], hit[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
        arrowHead(ctx, hit[0], hit[1], end[0], end[1], 11, '#22c55e');
        drawHud(ctx, isDark, [
            { label: '入射角 θ₁', value: `${angleDeg.toFixed(0)}°` },
            { label: '折射角 θ₂', value: `${((th2 * 180) / Math.PI).toFixed(0)}°` },
            { label: '现象', value: '折射' }
        ]);
        drawInfoBar(ctx, width, height, `n₁sinθ₁ = n₂sinθ₂ (斯涅尔定律)`, isDark);
    }
}

// ============================================================================
// 2. 电流的磁场 (current-magnetic-field 模型, 读 result.extra)
// ============================================================================

export function drawCurrentMagneticFieldScene(o: GapSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电流的磁场', width, isDark);
    if (!simulationResult || !simulationResult.extra) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const extra = simulationResult.extra as unknown as MagFieldExtra;
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.4;
    const toScreen = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];
    const I = params['current'] ?? 5;
    const lineColor = isDark ? '#38bdf8' : '#0284c7';

    const maxMag = maxOf(
        extra.samples.map(s => s.magnitude),
        1e-9
    );
    // 磁场采样点用 bx/by, 适配矢量场绘制 (统一为 ex/ey)
    const magVectors = extra.samples.map(s => ({ x: s.x, y: s.y, ex: s.bx, ey: s.by, magnitude: s.magnitude }));
    drawVectorField(ctx, magVectors, toScreen, maxMag, isDark ? '#64748b' : '#94a3b8');

    for (const line of extra.fieldLines) {
        const pts = line.points.map(p => toScreen(p.x, p.y));
        drawFieldLine(ctx, pts, lineColor, 8);
    }

    if (extra.wire) {
        const [wx, wy] = toScreen(extra.wire.x, extra.wire.y);
        const r = 12;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(wx, wy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(I >= 0 ? '⊙' : '⊗', wx, wy);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.font = '12px sans-serif';
        ctx.fillText(`导线 (I=${I}A ${I >= 0 ? '出纸面⊙' : '入纸面⊗'})`, wx + r + 6, wy + 4);
    }

    if (extra.poles) {
        const [nx, ny] = toScreen(extra.poles.north.x, extra.poles.north.y);
        const [sx, sy] = toScreen(extra.poles.south.x, extra.poles.south.y);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', nx, ny - 6);
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('S', sx, sy + 18);
        ctx.textAlign = 'left';
    }

    const modeLabel = params['mode'] === 2 ? '螺线管' : params['mode'] === 1 ? '线圈' : '直导线';
    drawHud(ctx, isDark, [
        { label: '模式', value: modeLabel },
        { label: 'I', value: `${I}A` },
        { label: '方向', value: I >= 0 ? '逆时针' : '顺时针' }
    ]);
}

// ============================================================================
// 3. 电场线分布 (electric-field-lines 模型, 读 result.extra)
// ============================================================================

export function drawElectricFieldLinesScene(o: GapSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电场线分布', width, isDark);
    if (!simulationResult || !simulationResult.extra) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const extra = simulationResult.extra as unknown as ElectricFieldExtra;
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.4;
    const toScreen = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];

    const maxMag = maxOf(
        extra.samples.map(s => s.magnitude),
        1e-9
    );
    drawVectorField(ctx, extra.samples, toScreen, maxMag, isDark ? '#64748b' : '#94a3b8');

    const lineColor = isDark ? '#f472b6' : '#db2777';
    for (const line of extra.fieldLines) {
        const pts = line.points.map(p => toScreen(p.x, p.y));
        drawFieldLine(ctx, pts, lineColor, 8);
    }

    if (extra.plates) {
        const [pl, pt] = toScreen(extra.plates.left, extra.plates.top);
        const [pr, pb] = toScreen(extra.plates.right, extra.plates.bottom);
        ctx.fillStyle = isDark ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.12)';
        ctx.fillRect(pl, pt, pr - pl, pb - pt);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pl, pt);
        ctx.lineTo(pr, pt);
        ctx.moveTo(pl, pb);
        ctx.lineTo(pr, pb);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', (pl + pr) / 2, pt - 8);
        ctx.fillText('−', (pl + pr) / 2, pb + 18);
        if (extra.plateField !== undefined) {
            ctx.font = '12px sans-serif';
            ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
            ctx.fillText(`板间匀强场 E≈${extra.plateField.toExponential(2)} V/m`, cx, pb + 38);
        }
        ctx.textAlign = 'left';
    } else {
        // 电荷符号来自关键帧位置
        for (const kf of simulationResult.keyframes ?? []) {
            const [px, py] = toScreen(kf.position.x, kf.position.y);
            const positive = kf.label.includes('正');
            ctx.fillStyle = positive ? '#ef4444' : '#3b82f6';
            ctx.beginPath();
            ctx.arc(px, py, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(positive ? '+' : '−', px, py);
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
        }
    }

    const modeLabel = params['mode'] === 2 ? '平行板' : params['mode'] === 1 ? '电偶极' : '点电荷';
    drawHud(ctx, isDark, [
        { label: '模式', value: modeLabel },
        { label: '电场线', value: `${extra.fieldLines.length} 条` },
        { label: '采样点', value: `${extra.samples.length}` }
    ]);
}

// ============================================================================
// 4. 牛顿管 (复用 uniform-accelerated, 渲染层计算羽毛空气阻力下落)
// ============================================================================

export function drawNewtonTubeScene(o: GapSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '牛顿管 (真空 vs 空气)', width, isDark);

    const heightM = params['height'] ?? 5;
    const duration = params['duration'] ?? 2;
    const withAir = Math.round(params['withAir'] ?? 1) === 1;
    const t = Math.max(0, Math.min(duration, currentTime));

    const tubeLeft = width * 0.36;
    const tubeRight = width * 0.64;
    const tubeTop = height * 0.14;
    const tubeBottom = height * 0.9;
    const tubeH = tubeBottom - tubeTop;
    const tubeCx = (tubeLeft + tubeRight) / 2;

    // 玻璃管
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(tubeLeft, tubeTop, tubeRight - tubeLeft, tubeH);
    ctx.fillStyle = isDark ? 'rgba(148,163,184,0.06)' : 'rgba(148,163,184,0.08)';
    ctx.fillRect(tubeLeft, tubeTop, tubeRight - tubeLeft, tubeH);

    // 硬币位移 (来自模型轨迹, 物理下落距离 → 管内比例)
    // 注意: 模型按真实 g 自由下落, 总位移 = 0.5·g·duration² 不一定等于 height 参数;
    // 用轨迹自身最大位移归一化, 保证硬币恰好在动画结束时抵达管底, 与 height 标注一致。
    let coinFrac = 0;
    const traj = simulationResult?.trajectories?.[0];
    if (traj && traj.length > 0) {
        // 轨迹点按 t 排序; 取当前 t 的 |y| 位移
        let best = traj[0]!;
        for (const p of traj) {
            if (p.t <= t) best = p;
            else break;
        }
        const drop = Math.abs(best.position.y);
        const maxDrop = maxOf(
            traj.map(p => Math.abs(p.position.y)),
            1e-6
        );
        coinFrac = Math.max(0, Math.min(1, drop / maxDrop));
    }
    // 羽毛: 有空气则受阻力, 终端速度有限; 真空则与硬币一致
    const featherFrac = withAir ? 1 - Math.exp((-3 * t) / Math.max(1e-6, duration)) : coinFrac;

    const coinY = tubeTop + coinFrac * tubeH;
    const featherY = tubeTop + featherFrac * tubeH;

    // 硬币
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(tubeCx - 14, coinY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? '#0f172a' : '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¢', tubeCx - 14, coinY);
    ctx.textBaseline = 'alphabetic';

    // 羽毛
    ctx.strokeStyle = withAir ? '#a78bfa' : '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tubeCx + 14, featherY - 12);
    ctx.quadraticCurveTo(tubeCx + 22, featherY, tubeCx + 14, featherY + 12);
    ctx.moveTo(tubeCx + 14, featherY - 12);
    ctx.lineTo(tubeCx + 14, featherY + 12);
    ctx.stroke();
    ctx.textAlign = 'left';

    drawHud(ctx, isDark, [
        { label: 't', value: `${t.toFixed(2)} s` },
        { label: '介质', value: withAir ? '空气' : '真空' },
        { label: '硬币', value: `${(coinFrac * heightM).toFixed(2)} m` },
        { label: '羽毛', value: `${(featherFrac * heightM).toFixed(2)} m` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        withAir ? '空气中: 羽毛受空气阻力下落更慢; 真空时两者同时落地' : '真空中: 轻重物体同时落地 (伽利略)',
        isDark
    );
}

// ============================================================================
// 5. 小灯泡伏安特性 (复用 circuit, 读 charts.vx_t)
// ============================================================================

export function drawBulbVIScene(o: GapSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '小灯泡伏安特性 (I-U 曲线)', width, isDark);
    if (!simulationResult || !simulationResult.charts) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const vi = simulationResult.charts.vx_t;
    const E = params['emf'] ?? 12;
    const r = params['r'] ?? 1;
    if (!vi || vi.points.length === 0) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const padL = 70;
    const padB = 50;
    const padT = 50;
    const padR = 30;
    const gx = padL;
    const gy = height - padB;
    const gw = width - padL - padR;
    const gh = height - padT - padB;
    const uMax = E;
    const iMax = Math.max(0.1, E / Math.max(0.1, r));

    const ux = (u: number) => gx + (u / uMax) * gw;
    const iy = (i: number) => gy - (i / iMax) * gh;

    // 坐标轴
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, padT);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('电压 U (V)', gx + gw / 2, height - 14);
    ctx.save();
    ctx.translate(18, padT + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('电流 I (A)', 0, 0);
    ctx.restore();

    // 灯泡伏安曲线
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    vi.points.forEach((p, idx) => {
        const X = ux(p.x);
        const Y = iy(p.y);
        if (idx === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    // 负载线: I = (E - U)/r
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(ux(0), iy(E / Math.max(0.1, r)));
    ctx.lineTo(ux(E), iy(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // 工作点: 伏安曲线与负载线交点 (数值找穿越)
    let op: { u: number; i: number } | null = null;
    for (const p of vi.points) {
        const loadI = (E - p.x) / Math.max(0.1, r);
        if (Math.abs(loadI - p.y) < Math.max(1e-3, loadI * 0.02)) {
            op = { u: p.x, i: p.y };
            break;
        }
    }
    if (op) {
        const ox = ux(op.u);
        const oy = iy(op.i);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(ox, oy, 6, 0, Math.PI * 2);
        ctx.fill();
        drawHud(ctx, isDark, [
            { label: 'U_op', value: `${op.u.toFixed(2)} V` },
            { label: 'I_op', value: `${op.i.toFixed(3)} A` },
            { label: 'P_op', value: `${(op.u * op.i).toFixed(2)} W` }
        ]);
    }
    drawInfoBar(ctx, width, height, '非线性电阻: 温度↑→电阻↑, I-U 曲线上凸 (与负载线交点为工作点)', isDark);
}

// ============================================================================
// 6. 动能定理 (复用 uniform-accelerated, 读 charts.ke_t)
// ============================================================================

export function drawWorkEnergyScene(o: GapSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '动能定理 W = ΔEk', width, isDark);

    const m = params['mass'] ?? 1;
    const F = params['force'] ?? 5;
    const v0 = params['v0'] ?? 0;
    const duration = params['duration'] ?? 3;
    const t = Math.max(0, Math.min(duration, currentTime));
    const a = F / Math.max(1e-6, m);
    const s = v0 * t + 0.5 * a * t * t; // 含初速度, 与模型 ke_t 一致
    const W = F * s;

    // 动能来自模型 charts.ke_t (合外力做功 = 动能增量)
    const keChart = simulationResult?.charts?.ke_t;
    const Ek = interpSeries(keChart, t);
    const Ek0 = keChart?.points?.[0]?.y ?? 0;
    const dEk = Ek - Ek0;

    // 运动方块 (沿水平轨道按位移 s 移动)
    const trackY = height * 0.42;
    const startX = width * 0.12;
    const trackLen = width * 0.55;
    const sMax = v0 * duration + 0.5 * a * duration * duration;
    const blockX = startX + Math.min(1, s / Math.max(1e-6, sMax)) * trackLen;

    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, trackY + 28);
    ctx.lineTo(startX + trackLen, trackY + 28);
    ctx.stroke();

    // 方块
    ctx.fillStyle = '#f59e0b';
    roundRectPath(ctx, blockX - 18, trackY - 18, 36, 36, 5);
    ctx.fill();
    // 力箭头
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(blockX + 18, trackY);
    ctx.lineTo(blockX + 18 + 40, trackY);
    ctx.stroke();
    arrowHead(ctx, blockX + 18, trackY, blockX + 18 + 40, trackY, 9, '#ef4444');
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('F', blockX + 18 + 20, trackY - 8);

    // 位移标注
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, trackY + 34);
    ctx.lineTo(blockX, trackY + 34);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.fillText(`s = ${s.toFixed(2)} m`, (startX + blockX) / 2, trackY + 48);

    // W 与 ΔEk 柱状对比
    const barX = width * 0.78;
    const barBaseY = height * 0.82;
    const barMaxH = height * 0.5;
    const wVal = Math.max(0, W);
    const ekVal = Math.max(0, dEk);
    const refMax = Math.max(wVal, ekVal, 1e-6);
    const wH = (wVal / refMax) * barMaxH;
    const ekH = (ekVal / refMax) * barMaxH;

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(barX, barBaseY - wH, 36, wH);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(barX + 52, barBaseY - ekH, 36, ekH);

    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('W', barX + 18, barBaseY + 16);
    ctx.fillText('ΔEk', barX + 70, barBaseY + 16);
    ctx.textAlign = 'left';

    const equal = Math.abs(W - dEk) < Math.max(1e-6, Math.abs(W) * 0.02);
    drawHud(ctx, isDark, [
        { label: 'm', value: `${m} kg` },
        { label: 'F', value: `${F} N` },
        { label: 'W', value: `${W.toFixed(2)} J` },
        { label: 'ΔEk', value: `${dEk.toFixed(2)} J` },
        { label: 'W=ΔEk', value: equal ? '✓' : '…' }
    ]);
}

// ============================================================================
// 7. 小球 x-t 图像 (复用 simple-pendulum, 提取轨迹 x(t))
// ============================================================================

export function drawBallXTimeScene(o: GapSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '小球 x-t 图像 (简谐运动)', width, isDark);

    const traj = simulationResult?.trajectories?.[0];
    if (!traj || traj.length === 0) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const duration = params['duration'] ?? 10;
    const L = params['length'] ?? 1.0;
    const g = params['g'] ?? 9.8;
    // 优先从真实轨迹过零实测周期 (大摆角下 != 小角度公式); 窗口太短回退小角度估算
    const Tsmall = 2 * Math.PI * Math.sqrt(Math.max(1e-6, L) / Math.max(1e-6, g));
    const Tmeasured = measurePendulumPeriod(traj);
    const T = Tmeasured ?? Tsmall;
    const Tlabel = Tmeasured ? `${T.toFixed(2)} s` : `${T.toFixed(2)} s (小角度估算)`;

    // 图表区 (右侧 60%)
    const gx = width * 0.4;
    const gy = height * 0.18;
    const gw = width * 0.55;
    const gh = height * 0.64;
    const xMax = maxOf(
        traj.map(p => Math.abs(p.position.x)),
        1e-6
    );
    const tMax = duration;

    const px = (t: number) => gx + (t / tMax) * gw;
    const py = (x: number) => gy + gh / 2 - (x / xMax) * (gh / 2) * 0.9;

    // 坐标轴
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
    // 零线
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(gx, py(0));
    ctx.lineTo(gx + gw, py(0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', gx + gw / 2, gy + gh + 18);
    ctx.save();
    ctx.translate(gx - 22, gy + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('x (m)', 0, 0);
    ctx.restore();

    // x(t) 曲线
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    traj.forEach((p, idx) => {
        const X = px(p.t);
        const Y = py(p.position.x);
        if (idx === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    // 当前时刻标记点
    const t = Math.max(0, Math.min(duration, currentTime));
    let cur = traj[0]!;
    for (const p of traj) {
        if (p.t <= t) cur = p;
        else break;
    }
    const mx = px(cur.t);
    const my = py(cur.position.x);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();

    // 左侧小摆示意
    const pivotX = width * 0.18;
    const pivotY = height * 0.22;
    const lenPx = height * 0.4;
    const ang = Math.asin(Math.max(-1, Math.min(1, cur.position.x / Math.max(1e-6, L))));
    const bx = pivotX + Math.sin(ang) * lenPx;
    const by = pivotY + Math.cos(ang) * lenPx;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();

    drawHud(ctx, isDark, [
        { label: 't', value: `${t.toFixed(2)} s` },
        { label: 'x', value: `${cur.position.x.toFixed(3)} m` },
        { label: 'T', value: Tlabel }
    ]);
    drawInfoBar(ctx, width, height, '摆球水平位移 x(t) 近似正弦 → 简谐运动', isDark);
}

// ============================================================================
// 8. 盖革计数器 (复用 radioactive-decay, 读 charts.x_t / y_t)
// ============================================================================

export function drawGeigerCounterScene(o: GapSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '盖革计数器 (射线探测)', width, isDark);

    const Nchart = simulationResult?.charts?.x_t;
    const Achart = simulationResult?.charts?.y_t;
    if (!Nchart || !Achart) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const duration = params['tEnd'] ?? 50;
    const t = Math.max(0, Math.min(duration, currentTime));
    const N = interpSeries(Nchart, t);
    const A = interpSeries(Achart, t);
    const A0 = Achart.points[0]?.y ?? 1;

    // 盖革管 (左侧)
    const tubeX = width * 0.08;
    const tubeY = height * 0.2;
    const tubeW = width * 0.26;
    const tubeH = height * 0.6;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 3;
    roundRectPath(ctx, tubeX, tubeY, tubeW, tubeH, 10);
    ctx.stroke();
    ctx.fillStyle = isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.10)';
    ctx.fill();
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GM 计数管', tubeX + tubeW / 2, tubeY - 8);

    // 确定性计数闪光: 闪光数随活度 A 增多 (保留物理意义), 但位置/大小由索引伪随机固定, 避免逐帧乱跳不可复现
    const flashes = Math.round(A * 0.4);
    const hash01 = (n: number) => {
        const s = Math.sin(n) * 43758.5453;
        return s - Math.floor(s);
    };
    for (let i = 0; i < flashes; i++) {
        const fx = tubeX + 8 + hash01(i * 1.7 + 0.5) * (tubeW - 16);
        const fy = tubeY + 8 + hash01(i * 2.3 + 1.9) * (tubeH - 16);
        const fr = 2 + hash01(i * 3.1 + 0.2) * 3;
        ctx.fillStyle = `rgba(34,197,94,${0.3 + hash01(i * 4.7 + 0.8) * 0.6})`;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
    }

    // 计数率表 (条形)
    const meterX = tubeX + tubeW + width * 0.05;
    const meterY = tubeY + tubeH * 0.3;
    const meterH = tubeH * 0.4;
    const meterW = width * 0.05;
    const ratio = Math.max(0, Math.min(1, A / Math.max(1e-6, A0)));
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    roundRectPath(ctx, meterX, meterY, meterW, meterH, 4);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    const fillH = ratio * meterH;
    roundRectPath(ctx, meterX, meterY + meterH - fillH, meterW, fillH, 4);
    ctx.fill();

    // 衰变曲线 N(t) (右侧)
    const gx = width * 0.55;
    const gy = height * 0.18;
    const gw = width * 0.4;
    const gh = height * 0.64;
    const nMax = maxOf(
        Nchart.points.map(p => p.y),
        1
    );
    const px = (tt: number) => gx + (tt / duration) * gw;
    const py = (nn: number) => gy + gh - (nn / nMax) * gh;

    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    Nchart.points.forEach((p, idx) => {
        const X = px(p.x);
        const Y = py(p.y);
        if (idx === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
    });
    ctx.stroke();
    // 当前时刻标记
    const mx = px(t);
    const my = py(N);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N(t) 剩余核数', gx + gw / 2, gy + gh + 18);

    drawHud(ctx, isDark, [
        { label: 't', value: `${t.toFixed(1)} s` },
        { label: 'N(t)', value: `${N.toFixed(0)}` },
        { label: '活度 A', value: `${A.toFixed(1)} Bq` }
    ]);
    drawInfoBar(ctx, width, height, '活度 A=λN 越大, 单位时间计数闪光越多', isDark);
}
