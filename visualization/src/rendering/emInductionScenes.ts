/**
 * 电磁学场景渲染模块 — 选必二 第二章 电磁感应
 *
 * 场景列表：
 *   - drawEmInductionScene
 *   - drawEddyCurrentScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    COLORS,
    roundRectPath,
    clamp,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawArrow,
    drawMeter,
    drawText,
    interpSeries,
    getFrame
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
const CYAN = COLORS.CYAN;
const ORANGE = COLORS.ORANGE;
const RED = COLORS.RED;

export function drawEmInductionScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime, simulationResult } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电磁感应', width, isDark, { size: 18, y: 28 });
    const b = params['Bind'] ?? 0.5;
    const area = params['A'] ?? 0.01;
    const n = params['Nturns'] ?? 100;
    // 线圈摆角: 引擎 ω=2π·50 rad/s (20ms 周期), 画面用慢速示意摆动; HUD 数值读引擎
    const angle = ((params['angleBind'] ?? 0) * Math.PI) / 180 + Math.sin(currentTime * 2) * 0.35;
    const fluxSelf = n * b * area * Math.cos(angle);

    // 引擎逐时数据: x_t = Φ(t) mWb, y_t = ε(t) mV (x 轴 ms, 20ms 周期)
    const engCharts = simulationResult?.charts as
        | { x_t?: { points: Array<{ x: number; y: number }> }; y_t?: { points: Array<{ x: number; y: number }> } }
        | undefined;
    const engMax = simulationResult?.diagnostics?.maxValues as { emfPeak?: number; fluxTotal?: number } | undefined;
    const tMs = (((currentTime % 0.02) + 0.02) % 0.02) * 1000;
    // 引擎 x_t 为单匝磁通 B·A·cos(ωt) (mWb), HUD 显示总磁通需乘匝数 N
    const flux = engCharts?.x_t ? (interpSeries(engCharts.x_t, tMs) / 1000) * n : fluxSelf;
    const emfMv = engCharts?.y_t ? interpSeries(engCharts.y_t, tMs) : null;
    const emfPeakV = engMax?.emfPeak ?? n * b * area * 2 * Math.PI * 50;
    const meterVal =
        emfMv !== null
            ? clamp(Math.abs(emfMv / (emfPeakV * 1000)), 0, 1)
            : clamp(Math.abs(Math.sin(currentTime * 2)), 0, 1);

    const cx = width * 0.5;
    const cy = height * 0.52;
    for (let x = width * 0.18; x < width * 0.86; x += 42) {
        drawArrow(ctx, x, height * 0.25, x, height * 0.78, CYAN);
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 4;
    roundRectPath(ctx, -80, -48, 160, 96, 12);
    ctx.stroke();
    ctx.restore();
    drawMeter(ctx, width * 0.77, cy, 38, meterVal, isDark, 'G', '感应电流');
    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${b.toFixed(2)} T` },
            { label: 'N', value: `${n.toFixed(0)}` },
            { label: 'Phi', value: `${flux.toFixed(3)} Wb` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '磁通量变化产生感应电动势: E = -N dPhi/dt', isDark);
}

export function drawEddyCurrentScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime, simulationResult } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '涡流现象 (阻尼摆动)', width, isDark, { size: 18, y: 28 });
    const magneticField = params['magneticField'] ?? 0.2;
    const frequency = params['frequency'] ?? 50;
    const conductivity = params['conductivity'] ?? 5.8e7;
    const thickness = params['thickness'] ?? 0.001;
    const muR = params['muR'] ?? 1;
    // 引擎数值: 涡流热功率 / 趋肤深度 / 温升 (trajectory[0]: x=t(s), y=温度°C)
    const engMax = simulationResult?.diagnostics?.maxValues as
        { eddyPower_W?: number; skinDepth_mm?: number } | undefined;
    const eddyPower = engMax?.eddyPower_W;
    const skinDepth = engMax?.skinDepth_mm;
    const tempFrame = getFrame(simulationResult, currentTime, 0);
    const temperature = tempFrame?.position.y;

    // 阻尼时间常数随 σ、B²、t² 增大而减小（定性）
    const dampingRate =
        (conductivity / 1e7) * (magneticField * magneticField) * (thickness * 1000) * (thickness * 1000) * muR;
    const tau = clamp(1 / Math.max(dampingRate, 1e-3), 0.4, 25);
    const A0 = 0.5;
    const amp = A0 * Math.exp(-currentTime / tau);
    const omega = 2 * Math.PI * 0.6;
    const angle = amp * Math.sin(currentTime * omega);

    const pivotX = width * 0.3;
    const pivotY = height * 0.22;
    const rodLen = height * 0.42;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    const plateX = pivotX + Math.sin(angle) * rodLen;
    const plateY = pivotY + Math.cos(angle) * rodLen;
    ctx.lineTo(plateX, plateY);
    ctx.stroke();
    // 金属板
    ctx.save();
    ctx.translate(plateX, plateY);
    ctx.rotate(-angle);
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.strokeStyle = isDark ? '#64748b' : '#334155';
    ctx.lineWidth = 2;
    roundRectPath(ctx, -34, -26, 68, 52, 6);
    ctx.fill();
    ctx.stroke();
    // 涡流环（强度随速度）
    const speed = Math.abs(amp * omega * Math.cos(currentTime * omega));
    if (speed > 0.02) {
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 2;
        for (const cyc of [-12, 12]) {
            ctx.beginPath();
            ctx.arc(0, cyc, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, cyc, 6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
    // 磁铁
    drawText(ctx, 'N', plateX - 6, plateY + 70, isDark, 13, RED);
    drawText(ctx, 'S', plateX + 6, plateY + 70, isDark, 13, BLUE);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${magneticField.toFixed(2)} T` },
            { label: 'f', value: `${frequency.toFixed(0)} Hz` },
            { label: 'τ', value: `${tau.toFixed(1)} s` },
            ...(eddyPower !== undefined ? [{ label: 'P', value: `${eddyPower.toFixed(2)} W` }] : []),
            ...(skinDepth !== undefined ? [{ label: 'δ', value: `${skinDepth.toFixed(2)} mm` }] : [])
        ],
        { boxW: 250 }
    );
    drawInfoBar(
        ctx,
        width,
        height,
        `变化的磁场在导体中产生涡流，涡流阻碍相对运动（电磁阻尼）${
            temperature !== undefined ? ` | 温升 ${(temperature - 25).toFixed(1)}°C` : ''
        }`,
        isDark
    );
}
