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
import { clamp, clearScene, drawTitle, drawHud, drawGlowCircle } from './renderingUtils';

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

/**
 * 玻尔半径 a₀ (nm)
 *
 * 独立物理常数(H⁻ 基态轨道半径), 无法由能级数据 Eₙ=E₁/n² 反推 —— 需额外给出 E₁。
 * 像素半径的**动画驱动量**已改读引擎能级(见 readEngineOrbitRadii);
 * 此常量仅用于 HUD 的**展示文本**(a₀ / r₁ / r_max 的 nm 数值)。
 */
const BOHR_RADIUS_NM = 0.0529;

/**
 * 从引擎能级数据推出各量子数 n 的轨道半径 (像素)。
 *
 * 玻尔模型: Eₙ = E₁/n² (引擎 charts.x_t 给出 (n, E) 点), 而 rₙ = a₀·n²,
 * 故 r ∝ 1/|Eₙ|。取基准半径 baseR 对应最内层, 按 1/|E| 之比缩放。
 *
 * @returns (n) => 像素半径; 无引擎数据或数据不可用时返回 null, 由调用方回退
 *
 * 单一真源契约 (#30) 由 single-source-contract.test.ts 的 bohr-orbit 用例锁定。
 */
export function readEngineOrbitRadii(result: SimulationResult | null): ((n: number) => number) | null {
    // 引擎键名 x_t 对应语义"能级图" (n, E) —— 见 bohr.ts 的 charts: { x_t: energyDiagram }
    const series = (result?.charts as Record<string, { points?: Array<{ x: number; y: number }> }> | undefined)?.[
        'x_t'
    ];
    const points = series?.points;
    if (!points || points.length === 0) return null;

    // n → |E| (eV); 引擎返回的是带符号能量, 取绝对值
    const absE = new Map<number, number>();
    for (const p of points) {
        const n = Math.round(p.x);
        if (!Number.isFinite(p.y) || p.y === 0) continue;
        absE.set(n, Math.abs(p.y));
    }
    const inner = absE.get(1);
    if (inner === undefined || !(inner > 0)) return null;

    // 基准: 最内层 n=1 半径 14 px (沿用既有视觉比例)
    const BASE_R = 14;
    return (n: number): number => {
        const e = absE.get(n);
        if (e === undefined) return BASE_R;
        // r ∝ 1/|E|
        return BASE_R * (inner / e);
    };
}

/**
 * 从引擎能级数据读各主量子数 n 的能量 E (eV, 带符号)。
 *
 * 供 drawBohrScene 能级标注 / 跃迁 ΔE 与 drawBohrOrbitScene 右侧跃迁说明消费;
 * 无引擎数据或数据不可用时返回 null, 由调用方回退玻尔公式。
 *
 * 单一真源契约 (#31) 由 single-source-contract.test.ts 的 bohr 用例锁定。
 */
export function readEngineBohrLevels(result: SimulationResult | null): Map<number, number> | null {
    // 引擎键名 x_t 对应语义"能级图" (n, E) —— 见 bohr.ts 的 charts: { x_t: energyDiagram }
    const series = (result?.charts as Record<string, { points?: Array<{ x: number; y: number }> }> | undefined)?.[
        'x_t'
    ];
    const points = series?.points;
    if (!points || points.length === 0) return null;

    const levels = new Map<number, number>();
    for (const p of points) {
        const n = Math.round(p.x);
        if (!Number.isFinite(p.y)) continue;
        levels.set(n, p.y);
    }
    if (!levels.has(1) || levels.size === 0) return null;
    return levels;
}

function wavelengthToColor(nm: number): string {
    if (nm < 380) return '#7c3aed';
    if (nm > 750) return '#7f1d1d';
    const t = clamp((nm - 380) / (750 - 380), 0, 1);
    const hue = 270 - t * 250; // 紫(270)→红(20)
    return `hsl(${hue.toFixed(0)}, 90%, 60%)`;
}

export function drawBohrScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '玻尔氢原子模型 — 能级与发射光谱', w, isDark, { size: 18, y: 28 });

    const seriesNum = params['seriesB'] ?? 1;
    const maxN = Math.max(3, Math.round(params['maxN'] ?? 6));
    const n1 = seriesNum === 0 ? 1 : seriesNum === 2 ? 3 : 2;
    const seriesName = seriesNum === 0 ? '赖曼系(紫外)' : seriesNum === 2 ? '帕邢系(红外)' : '巴尔末系(可见)';
    const seriesColor = seriesNum === 0 ? COL.purple : seriesNum === 2 ? COL.orange : COL.green;
    /**
     * 能级 E(n): 优先读引擎能级表 (Eₙ=E₁/n², 见 readEngineBohrLevels),
     * 引擎改公式时标注自动跟随; 无引擎结果回退玻尔公式。
     */
    const engineLevels = readEngineBohrLevels(simulationResult);
    const E = (n: number) => engineLevels?.get(n) ?? -13.6 / (n * n); // eV
    /**
     * 本线系谱线波长 (nm): 引擎 charts.y_t 按 n₂ 升序排列,
     * 元素 i 对应 n₂=n₁+1+i (引擎 seriesLines 嵌套循环同序, 见 bohr.ts);
     * 无引擎结果回退里德伯公式。
     */
    const engineSpectrum = (
        simulationResult?.charts as Record<string, { points?: Array<{ x: number; y: number }> }> | undefined
    )?.['y_t']?.points;
    const Rydberg = 1.097e7; // m⁻¹ (回退公式用; 引擎真源为 maxValues.R_inf)
    const lambdaNmFor = (n2: number): number => {
        const y = engineSpectrum?.[n2 - n1 - 1]?.y;
        if (typeof y === 'number' && Number.isFinite(y)) return y;
        return (1 / (Rydberg * (1 / (n1 * n1) - 1 / (n2 * n2)))) * 1e9;
    };

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
        const lamNm = lambdaNmFor(n2);
        const color = wavelengthToColor(lamNm);
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
        ctx.fillText(`${lamNm.toFixed(0)}nm`, xPos, specY + specH + 24);
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
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '玻尔氢原子模型 — 轨道能级 (rₙ ∝ n²)', w, isDark, { size: 18, y: 28 });

    const seriesNum = params['seriesB'] ?? 1;
    const maxN = Math.max(3, Math.round(params['maxN'] ?? 6));
    const n1 = seriesNum === 0 ? 1 : seriesNum === 2 ? 3 : 2;
    const cx = w * 0.42,
        cy = h * 0.5;
    const baseR = 14;

    /**
     * 轨道半径: rₙ = a₀·n² (玻尔模型)。
     *
     * 单一真源: 半径由**引擎**的能级数据 Eₙ = E₁/n² 推出 r ∝ 1/|Eₙ| ∝ n²,
     * 渲染层不再自行硬编码比例系数 —— 引擎改玻尔公式时画面自动跟随。
     * 无引擎结果时回退到等价的 n² 布局(见下), 保证场景仍可渲染。
     */
    const engineRadii = readEngineOrbitRadii(simulationResult);
    const rN = engineRadii ?? ((n: number) => baseR + n * n * 4);

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
        /**
         * 电子角位置: 纯装饰动画, 豁免单一真源 (见 #20/#30)。
         *
         * 引擎 bohr 模型输出仅为能级 (charts.x_t) + 谱线 (charts.y_t),
         * trajectories 为单点占位, 无电子位置数据 —— 量子模型本就没有
         * 经典轨道相位可言。角速度 1.2/n 仅为视觉示意 (内层快/外层慢),
         * 与引擎公式无耦合, 故保留 currentTime 自算, 不迁引擎。
         */
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
    /**
     * 跃迁能量 ΔE: 优先取引擎能级差 |E(n₂)−E(n₁)|, 无引擎结果回退玻尔公式。
     */
    const orbitLevels = readEngineBohrLevels(simulationResult);
    for (let n2 = n1 + 1; n2 <= Math.min(maxN, n1 + 5); n2++) {
        const e1 = orbitLevels?.get(n1);
        const e2 = orbitLevels?.get(n2);
        const dE = e1 !== undefined && e2 !== undefined ? Math.abs(e2 - e1) : 13.6 * (1 / (n1 * n1) - 1 / (n2 * n2));
        ctx.fillText(`  n=${n2} → ${n1}: ΔE=${dE.toFixed(2)} eV`, rx, ry + 22 + (n2 - n1) * 16);
    }

    drawHud(
        ctx,
        isDark,
        [
            { label: 'a₀', value: `${BOHR_RADIUS_NM} nm` },
            { label: 'n_max', value: `${maxN}` },
            { label: 'r₁', value: `${BOHR_RADIUS_NM.toFixed(3)} nm` },
            { label: 'r_max', value: `${(BOHR_RADIUS_NM * maxN * maxN).toFixed(1)} nm` }
        ],
        { boxW: 230, lineH: 16 }
    );
}
