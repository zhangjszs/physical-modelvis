/**
 * 电磁学场景渲染模块 — 必修三 第十章 静电场中的能量
 *
 * 场景列表：
 *   - drawParallelPlateCapacitorScene
 *   - drawCapacitorChargeScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { chartsOf } from 'physics-core';
import {
    COLORS,
    roundRectPath,
    clamp,
    mutedColor,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawArrow,
    drawWire,
    drawBattery,
    drawResistor,
    drawCapacitorSymbol,
    drawSineChart,
    interpSeries
} from './renderingUtils';

export interface ElectromagnetismSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const BLUE = COLORS.BLUE;
const RED = COLORS.RED;
const AMBER = COLORS.AMBER;

export function drawParallelPlateCapacitorScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '平行板电容器', width, isDark, { size: 18, y: 28 });
    const area = params['area'] ?? 0.01;
    const distanceMm = params['distance'] ?? 1;
    const er = params['epsilonR'] ?? 3;
    const cap = (8.854e-12 * er * area) / (distanceMm * 1e-3);
    const cx = width * 0.52;
    const cy = height * 0.52;
    const plateH = clamp(90 + area * 2600, 90, 170);
    const gap = clamp(36 + distanceMm * 18, 38, 130);
    ctx.fillStyle = BLUE;
    roundRectPath(ctx, cx - gap / 2 - 12, cy - plateH / 2, 12, plateH, 3);
    ctx.fill();
    ctx.fillStyle = RED;
    roundRectPath(ctx, cx + gap / 2, cy - plateH / 2, 12, plateH, 3);
    ctx.fill();
    for (let y = cy - plateH / 2 + 18; y < cy + plateH / 2; y += 28) {
        drawArrow(ctx, cx - gap / 2 + 8, y, cx + gap / 2 - 4, y, AMBER);
    }
    ctx.fillStyle = `rgba(34,197,94,${clamp(er / 8, 0.12, 0.5)})`;
    roundRectPath(ctx, cx - gap / 2 + 12, cy - plateH / 2, gap - 12, plateH, 4);
    ctx.fill();
    drawHud(
        ctx,
        isDark,
        [
            { label: 'S', value: `${area.toFixed(3)} m2` },
            { label: 'd', value: `${distanceMm.toFixed(2)} mm` },
            { label: 'C', value: `${(cap * 1e12).toFixed(1)} pF` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, 'C = epsilon0 * epsilonR * S / d, 极板越大/间距越小电容越大', isDark);
}

export function drawCapacitorChargeScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, 'RC 电容充放电', width, isDark, { size: 18, y: 28 });
    const r = params['resistance'] ?? 1000;
    const cMicro = params['capacitance'] ?? 100;
    const emf = params['emf'] ?? 10;
    const mode = params['mode'] ?? 0;
    /**
     * τ 与 Uc(t) 消费引擎 (#65 · B 局部): 引擎 capacitor-charge 模型产出
     * Uc-t 指数曲线 (charts.Uc_t, 121 点@5τ) 与 maxValues.tau/tMax。
     * 动画时间为演示 wall-clock (非引擎时间): 充/放电非周期, t 钳制到引擎域 [0, tMax]
     * (充满后冻结在渐近值, 物理合理); ratio 由引擎 Uc/E 导出 (充/放电两式统一)。
     * 无引擎结果回退旧自算 (τ=R·C, ratio=1−e^(−t/τ)/e^(−t/τ))。
     * 电路符号 (导线/电池/电阻/电容) 与充电视觉映射为示意保留, 仅数值取自引擎。
     */
    const mvCap = simulationResult?.diagnostics?.maxValues as { tau?: number; tMax?: number } | undefined;
    const tauEng = mvCap?.tau;
    const tau = typeof tauEng === 'number' && Number.isFinite(tauEng) && tauEng > 0 ? tauEng : r * cMicro * 1e-6;
    const tMaxEng = mvCap?.tMax;
    const tMax = typeof tMaxEng === 'number' && Number.isFinite(tMaxEng) && tMaxEng > 0 ? tMaxEng : 5 * tau;
    const engCap = simulationResult ? chartsOf(simulationResult, 'capacitor-charge') : undefined;
    const ucSeries = engCap?.Uc_t ?? engCap?.x_t;
    const tEng = clamp(Math.min(currentTime, tMax), 0, tMax);
    const uEng = ucSeries && ucSeries.points.length >= 2 ? interpSeries(ucSeries, tEng) : NaN;
    const uOld =
        emf *
        (mode < 0.5 ? 1 - Math.exp(-currentTime / Math.max(tau, 1e-6)) : Math.exp(-currentTime / Math.max(tau, 1e-6)));
    const u = Number.isFinite(uEng) ? uEng : uOld;
    const ratio = emf > 0 ? clamp(u / emf, 0, 1) : 0;
    const y = height * 0.52;
    drawWire(
        ctx,
        [
            [width * 0.2, y],
            [width * 0.78, y]
        ],
        mutedColor(isDark)
    );
    drawBattery(ctx, width * 0.22, y, isDark, `${emf} V`);
    drawResistor(ctx, width * 0.44, y, 90, isDark, `${r}Ω`);
    drawCapacitorSymbol(ctx, width * 0.66, y, isDark, `${cMicro}μF`);
    ctx.fillStyle = `rgba(59,130,246,${0.18 + ratio * 0.55})`;
    ctx.fillRect(width * 0.655, y - 24, 10, 48);
    drawSineChart({
        ctx,
        x: width * 0.58,
        y: height * 0.18,
        w: width * 0.3,
        h: height * 0.2,
        phase: -Math.PI / 2 + ratio * Math.PI,
        color: BLUE,
        isDark,
        label: 'U_C(t)'
    });
    drawHud(
        ctx,
        isDark,
        [
            { label: 'tau', value: `${tau.toFixed(3)} s` },
            { label: 'Uc', value: `${u.toFixed(2)} V` },
            { label: 'mode', value: mode < 0.5 ? 'charge' : 'discharge' }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, mode < 0.5 ? '充电: Uc=E(1-e^-t/RC)' : '放电: Uc=U0 e^-t/RC', isDark);
}
