/**
 * 近代物理场景渲染模块 — 选必三 第四章 原子结构
 *
 * 场景列表：
 *   - drawBohrScene
 *   - drawBohrOrbitScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { clamp, clearScene, drawTitle, drawHud } from './renderingUtils';

export interface ModernSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const COL = {
    blue: '#3b82f6',
    cyan: '#06b6d4',
    green: '#22c55e',
    orange: '#f59e0b',
    red: '#ef4444',
    purple: '#a855f7',
    yellow: '#eab308',
    pink: '#ec4899',
    gray: '#94a3b8'
};

function drawGlowCircle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    color: string,
    alpha: number
): void {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color + '88');
    grad.addColorStop(1, color + '00');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
}
function wavelengthToColor(nm: number): string {
    if (nm < 380) return '#7c3aed';
    if (nm > 750) return '#7f1d1d';
    const t = clamp((nm - 380) / (750 - 380), 0, 1);
    const hue = 270 - t * 250; // 紫(270)→红(20)
    return `hsl(${hue.toFixed(0)}, 90%, 60%)`;
}

export function drawBohrScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '玻尔氢原子模型 — 能级与发射光谱', w, isDark, { size: 18, y: 28 });

    const seriesNum = params['seriesB'] ?? 1;
    const maxN = Math.max(3, Math.round(params['maxN'] ?? 6));
    const n1 = seriesNum === 0 ? 1 : seriesNum === 2 ? 3 : 2;
    const seriesName = seriesNum === 0 ? '赖曼系(紫外)' : seriesNum === 2 ? '帕邢系(红外)' : '巴尔末系(可见)';
    const seriesColor = seriesNum === 0 ? COL.purple : seriesNum === 2 ? COL.orange : COL.green;
    const E = (n: number) => -13.6 / (n * n); // eV
    const Rydberg = 1.097e7; // m⁻¹

    // 左半: 能级图 (能量轴水平, 越负越靠左)
    const leftX = 60,
        topY = 70,
        botY = h - 60;
    const xE0 = leftX + (w * 0.42 - leftX);
    for (let n = 1; n <= maxN; n++) {
        const y = topY + ((n - 1) / (maxN - 1)) * (botY - topY);
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(xE0, y);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`n=${n}`, xE0 + 6, y + 3);
        ctx.textAlign = 'right';
        ctx.fillText(`${E(n).toFixed(2)} eV`, leftX - 4, y + 3);
    }
    ctx.textAlign = 'left';
    // 跃迁箭头
    for (let n2 = n1 + 1; n2 <= maxN; n2++) {
        const y1 = topY + ((n1 - 1) / (maxN - 1)) * (botY - topY);
        const y2 = topY + ((n2 - 1) / (maxN - 1)) * (botY - topY);
        ctx.strokeStyle = seriesColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xE0 - 8, y2);
        ctx.lineTo(xE0 - 8, y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xE0 - 8, y1);
        ctx.lineTo(xE0 - 13, y1 + 6);
        ctx.lineTo(xE0 - 3, y1 + 6);
        ctx.closePath();
        ctx.fillStyle = seriesColor;
        ctx.fill();
    }

    // 右半: 发射光谱条带
    const specX = w * 0.56,
        specW = w - specX - 30,
        specY = h * 0.3,
        specH = 40;
    ctx.fillStyle = isDark ? '#0b1220' : '#0f172a';
    ctx.fillRect(specX, specY, specW, specH);
    for (let n2 = n1 + 1; n2 <= maxN; n2++) {
        const invLam = Rydberg * (1 / (n1 * n1) - 1 / (n2 * n2));
        const lam = 1 / invLam; // m
        const color = wavelengthToColor(lam * 1e9);
        const xPos = specX + ((n2 - n1 - 1) / Math.max(1, maxN - n1)) * specW;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xPos, specY - 10);
        ctx.lineTo(xPos, specY + specH + 10);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${(lam * 1e9).toFixed(0)}nm`, xPos, specY + specH + 24);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('发射光谱 (波长)', specX, specY - 16);

    drawHud(
        ctx,
        isDark,
        [
            { label: '线系', value: seriesName },
            { label: 'n₁', value: `${n1}` },
            { label: 'n_max', value: `${maxN}` },
            { label: '谱线条数', value: `${Math.max(0, maxN - n1)}` }
        ],
        { boxW: 230, lineH: 16 }
    );
}

export function drawBohrOrbitScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '玻尔氢原子模型 — 轨道能级 (rₙ ∝ n²)', w, isDark, { size: 18, y: 28 });

    const seriesNum = params['seriesB'] ?? 1;
    const maxN = Math.max(3, Math.round(params['maxN'] ?? 6));
    const n1 = seriesNum === 0 ? 1 : seriesNum === 2 ? 3 : 2;
    const a0 = 0.0529; // nm
    const cx = w * 0.42,
        cy = h * 0.5;
    const baseR = 14;
    const rN = (n: number) => baseR + n * n * 4;

    for (let n = 1; n <= maxN; n++) {
        const r = rN(n);
        if (r > h * 0.45) break;
        ctx.strokeStyle = isDark ? `rgba(148,163,184,${0.25 + n * 0.05})` : `rgba(100,116,139,${0.25 + n * 0.05})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`n=${n}`, cx + r + 3, cy - 2);
        const ang = currentTime * (1.2 / n) + n;
        const ex = cx + r * Math.cos(ang);
        const ey = cy + r * Math.sin(ang);
        ctx.fillStyle = COL.cyan;
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    // 原子核
    drawGlowCircle(ctx, cx, cy, 8, COL.red, 0.9);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', cx, cy);
    ctx.textBaseline = 'alphabetic';

    // 右侧: 跃迁说明
    const rx = w * 0.7,
        ry = h * 0.3;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`线系: ${seriesNum === 0 ? '赖曼' : seriesNum === 2 ? '帕邢' : '巴尔末'} (n₁=${n1})`, rx, ry);
    ctx.fillText('跃迁 n → n₁ 能量:', rx, ry + 22);
    for (let n2 = n1 + 1; n2 <= Math.min(maxN, n1 + 5); n2++) {
        const dE = 13.6 * (1 / (n1 * n1) - 1 / (n2 * n2));
        ctx.fillText(`  n=${n2} → ${n1}: ΔE=${dE.toFixed(2)} eV`, rx, ry + 22 + (n2 - n1) * 16);
    }

    drawHud(
        ctx,
        isDark,
        [
            { label: 'a₀', value: `${a0} nm` },
            { label: 'n_max', value: `${maxN}` },
            { label: 'r₁', value: `${a0.toFixed(3)} nm` },
            { label: 'r_max', value: `${(a0 * maxN * maxN).toFixed(1)} nm` }
        ],
        { boxW: 230, lineH: 16 }
    );
}
