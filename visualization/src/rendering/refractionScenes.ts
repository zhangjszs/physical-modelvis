/**
 * 光的折射定律 2D 专属板书 — Snell 定律 n₁·sinθ₁ = n₂·sinθ₂
 *
 * 背景 (#159 逐节审计 · 批次 F 折射):
 *   旧板书 (`waveOptScenes.drawRefractionScene`) 有三处问题:
 *     1. **非全反射分支不画反射光线** —— 只有入射线 (橙) 与折射线 (绿);
 *        反射定律 θ_r = θ₁ 是本实验的另一半结论, 画面上完全缺席
 *        (只有全反射分支才画反射线, 逻辑正好反了)。
 *     2. θ₁/θ₂/临界角全部由渲染层**自算** (sinθ₂ = (n₁/n₂)·sinθ₁),
 *        不读引擎 `diagnostics.maxValues.refractionAngleDeg` /
 *        `totalInternalReflection` / `criticalAngleDeg`; 且全反射判据用
 *        `sinθ₂ > 1` 而引擎用 `sinθ₂ >= 1`, 边界不一致。
 *     3. 引擎的 sinθ₁-sinθ₂ 直线 (Snell 定律的直接验证) 没有画出来。
 *
 * 本模块的单一真源:
 *   - 光路几何读引擎轨迹的四个端点 (入射起点 / 界面点 / 折射终点 / 反射终点);
 *   - 角度读引擎 maxValues (含 -1 哨兵约定: 角度类 -1 = 该配置下无定义);
 *   - sinθ₁-sinθ₂ 直线读引擎 charts.x_t (经 getChart 类型化访问)。
 */
import type { ChartSeries, SimulationResult } from 'physics-core';
import { getChart } from 'physics-core';
import {
    clearScene,
    drawArrow,
    drawHud,
    drawMiniChart,
    drawSubtitle,
    drawTitle,
    mutedColor,
    textColor
} from './renderingUtils';

export interface RefractionSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const ORANGE = '#f59e0b';
const GREEN = '#22c55e';
const RED = '#ef4444';

/** 引擎角度哨兵: -1 = 该配置下无定义 (全反射 / n₁≤n₂ 无临界角) */
const UNDEFINED_ANGLE = -1;

/** 2D 板书读数 — 单一真源: 引擎 maxValues + 引擎轨迹 + 引擎 charts */
export interface RefractionReadouts {
    source: 'engine' | 'fallback';
    /** 介质 1 折射率 */
    n1: number;
    /** 介质 2 折射率 */
    n2: number;
    /** 入射角 θ₁ (°) */
    theta1: number;
    /** 折射角 θ₂ (°); 全反射时为 null */
    theta2: number | null;
    /** 临界角 θ_c (°); n₁ ≤ n₂ 时为 null */
    criticalAngle: number | null;
    /** 是否全反射 (引擎 totalInternalReflection) */
    totalInternalReflection: boolean;
    /** sinθ₁ */
    sinTheta1: number;
    /** sinθ₂ */
    sinTheta2: number;
    /** 入射起点 (引擎单位, y 向上) */
    incidentStart: { x: number; y: number };
    /** 界面交点 (恒为原点) */
    hit: { x: number; y: number };
    /** 折射终点 (全反射时为 null) */
    refractEnd: { x: number; y: number } | null;
    /** 反射终点 */
    reflectEnd: { x: number; y: number };
    /** sinθ₁-sinθ₂ 曲线点数 */
    curvePoints: number;
}

/** 取引擎 chart (无引擎结果时返回 undefined) —— 键名受 chart-registry 编译期约束 */
function chartOf(result: SimulationResult | null | undefined, key: 'x_t' | 'y_t'): ChartSeries | undefined {
    return result ? getChart(result, 'refraction', key) : undefined;
}

export function refractionReadouts(
    params: Record<string, number>,
    result?: SimulationResult | null
): RefractionReadouts {
    const n1 = params['n1'] ?? 1.0;
    const n2 = params['n2'] ?? 1.5;
    const theta1 = params['angle'] ?? 30;

    const mv = result?.diagnostics?.maxValues;
    const eng = (key: string): number | undefined => {
        const v = mv?.[key];
        return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    };

    const totalInternalReflection = eng('totalInternalReflection') === 1;
    const rawTheta2 = eng('refractionAngleDeg');
    const rawCritical = eng('criticalAngleDeg');

    // 角度哨兵: -1 = 无定义 ⇒ 不能当真实角度用
    const theta2 = rawTheta2 === undefined || rawTheta2 === UNDEFINED_ANGLE ? null : rawTheta2;
    const criticalAngle = rawCritical === undefined || rawCritical === UNDEFINED_ANGLE ? null : rawCritical;

    // 光路端点: 优先读引擎轨迹 (4 个点: 入射起点/界面点/折射终点/反射终点)
    const traj = result?.trajectories?.[0] ?? [];
    const hit = traj[1]?.position ?? { x: 0, y: 0 };
    const incidentStart = traj[0]?.position ?? { x: 0, y: 1 };
    const refractEnd = totalInternalReflection ? null : (traj[2]?.position ?? null);
    const reflectEnd = traj[traj.length - 1]?.position ?? { x: 0, y: 1 };

    const sinTheta1 = eng('sinTheta1') ?? Math.sin((theta1 * Math.PI) / 180);
    const sinTheta2 = eng('sinTheta2') ?? sinTheta1;

    return {
        source: mv ? 'engine' : 'fallback',
        n1,
        n2,
        theta1,
        theta2,
        criticalAngle,
        totalInternalReflection,
        sinTheta1,
        sinTheta2,
        incidentStart,
        hit,
        refractEnd,
        reflectEnd,
        curvePoints: chartOf(result, 'x_t')?.points.length ?? 0
    };
}

/**
 * 折射定律专属板书。
 *
 * 画面结构:
 *   - 左侧: 完整光路 (入射 + **反射** + 折射) + 法线 + 界面;
 *   - 右上: sinθ₁-sinθ₂ 直线 (Snell 定律验证), 标出当前工作点;
 *   - 右上 HUD: θ₁ / θ₂ / θ_c / n₁·sinθ₁ = n₂·sinθ₂;
 *   - 底部: 结论信息条。
 */
export function drawRefractionScene(opts: RefractionSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = opts;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '光的折射定律 (Snell)', w, isDark, { size: 20, y: 32 });

    const read = refractionReadouts(params, simulationResult);

    // 光路区占左侧 55%, 右侧留给 sinθ-sinθ 验证图
    const cx = w * 0.3;
    const cy = h * 0.56;
    const rayLen = Math.min(h * 0.36, w * 0.2);

    // —— 两种介质背景 ——
    ctx.fillStyle = 'rgba(56,189,248,0.10)';
    ctx.fillRect(0, 0, w, cy);
    ctx.fillStyle = 'rgba(168,85,247,0.12)';
    ctx.fillRect(0, cy, w, h - cy);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`介质1  n₁=${read.n1.toFixed(2)}`, 14, cy - 12);
    ctx.fillText(`介质2  n₂=${read.n2.toFixed(2)}`, 14, cy + 22);

    // —— 界面 + 法线 ——
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w * 0.56, cy);
    ctx.stroke();
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - rayLen - 20);
    ctx.lineTo(cx, cy + rayLen + 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = mutedColor(isDark);
    ctx.fillText('法线', cx + 8, cy - rayLen - 20);

    /** 引擎坐标 (y 向上, 单位长度 1) → 屏幕坐标 */
    const toScreen = (p: { x: number; y: number }): [number, number] => [cx + p.x * rayLen, cy - p.y * rayLen];

    // —— 入射光线 (引擎端点) ——
    const [ix, iy] = toScreen(read.incidentStart);
    const [hx, hy] = toScreen(read.hit);
    drawArrow(ctx, ix, iy, hx, hy, ORANGE, '');

    // —— 反射光线 (旧版非全反射分支漏画; 引擎端点) ——
    const [rx, ry] = toScreen(read.reflectEnd);
    drawArrow(ctx, hx, hy, rx, ry, RED, '反射');

    // —— 折射光线 (全反射时不存在) ——
    if (read.refractEnd) {
        const [fx, fy] = toScreen(read.refractEnd);
        drawArrow(ctx, hx, hy, fx, fy, GREEN, '折射');
    }

    // —— HUD (引擎读数) ——
    drawHud(
        ctx,
        isDark,
        [
            { label: 'θ₁', value: `${read.theta1.toFixed(1)}°` },
            { label: 'θ₂', value: read.theta2 === null ? '全反射' : `${read.theta2.toFixed(2)}°` },
            { label: 'θc', value: read.criticalAngle === null ? '无' : `${read.criticalAngle.toFixed(2)}°` },
            { label: 'n₁sinθ₁', value: (read.n1 * read.sinTheta1).toFixed(4) },
            { label: 'n₂sinθ₂', value: (read.n2 * read.sinTheta2).toFixed(4) }
        ],
        {
            boxX: 8,
            boxY: 32,
            boxW: 168,
            lineH: 19,
            borderRadius: 8,
            bgAlpha: { dark: 0.7, light: 0.82 },
            font: '12px monospace',
            textBaseline: 'alphabetic',
            textStartY: 52,
            twoColumn: true,
            valueX: 74,
            boxH: 118
        }
    );

    // —— sinθ₁-sinθ₂ 直线 (引擎曲线, Snell 定律的直接验证) ——
    const curve = chartOf(simulationResult, 'x_t');
    const xs = curve?.points.map(p => p.x) ?? [];
    const ys = curve?.points.map(p => p.y) ?? [];
    const plotX = w * 0.58;
    const plotW = w * 0.38;
    const plotH = h * 0.34;
    const plotY = h * 0.16;
    drawMiniChart({
        ctx,
        x: plotX,
        y: plotY,
        w: plotW,
        h: plotH,
        xs,
        ys,
        isDark,
        lineColor: GREEN,
        clampYZero: true,
        label: 'sinθ₁-sinθ₂ 直线 (斜率 = n₁/n₂)',
        xLabel: 'sinθ₁',
        yLabel: 'sinθ₂'
    });
    // 标出当前工作点
    if (xs.length > 0) {
        const xMin = xs[0]!;
        const xMax = xs[xs.length - 1]!;
        const yMin = Math.min(...ys);
        const yMax = Math.max(...ys);
        const pad = (yMax - yMin) * 0.12;
        const lo = yMin - pad;
        const hi = yMax + pad;
        const sx = plotX + ((read.sinTheta1 - xMin) / (xMax - xMin)) * plotW;
        const sy = plotY + plotH - ((read.sinTheta2 - lo) / (hi - lo)) * plotH;
        ctx.fillStyle = ORANGE;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = textColor(isDark);
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
            `工作点 (${read.sinTheta1.toFixed(3)}, ${read.sinTheta2.toFixed(3)})`,
            plotX + 6,
            plotY + plotH + 22
        );
    }

    drawSubtitle(
        ctx,
        read.totalInternalReflection
            ? `n₁>n₂ 且 θ₁=${read.theta1.toFixed(1)}° > θc=${(read.criticalAngle ?? 0).toFixed(1)}° → 全反射, 无折射光`
            : `n₁sinθ₁ = n₂sinθ₂ → sinθ₂ = (n₁/n₂)sinθ₁ = ${((read.n1 / read.n2) * read.sinTheta1).toFixed(4)}`,
        20,
        h - 20,
        isDark
    );
}
