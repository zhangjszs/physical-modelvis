/**
 * 传感器场景渲染模块 — 选必三 第四章 传感器应用
 *
 * 场景列表：
 *   - drawSecurityAlarmScene
 *   - drawLightControlSwitchScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    roundRectPath,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawEmptyState,
    drawArrow,
    drawMiniChart,
    interpSeries
} from './renderingUtils';

export interface SensorSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

export function drawSecurityAlarmScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const magnetDistance = params['magnetDistance'] ?? 5;
    const operateDist = params['operateDistance'] ?? 15;
    const releaseDist = params['releaseDistance'] ?? 25;

    // 引擎判定 (含滞回逻辑): doorStateFlag / reedStateFlag / alarmFlag; 回退渲染自算 (无滞回简化)
    const engMax = simulationResult?.diagnostics?.maxValues as
        { doorStateFlag?: number; reedStateFlag?: number; alarmFlag?: number } | undefined;
    const doorOpen = (engMax?.doorStateFlag ?? (magnetDistance > operateDist ? 1 : 0)) === 1;
    const alarm = (engMax?.alarmFlag ?? (doorOpen ? 1 : 0)) === 1;
    const reedClosed = (engMax?.reedStateFlag ?? (doorOpen ? 0 : 1)) === 1;

    drawTitle(ctx, '门窗防盗报警 (磁控开关)', w, isDark, { size: 18, y: 28 });

    // --- 左侧: 门框 + 门扇 + 磁体 + 干簧管 ---
    const doorX = w * 0.13;
    const doorY = h * 0.22;
    const doorW = 160;
    const doorH = 220;

    // 门框
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(doorX - 14, doorY - 14, 14, doorH + 28);
    ctx.fillRect(doorX + doorW, doorY - 14, 14, doorH + 28);
    ctx.fillRect(doorX - 14, doorY - 14, doorW + 42, 14);

    // 门扇 (开门时偏移)
    const openOffset = doorOpen ? Math.min(magnetDistance * 1.5, 80) : 0;
    // 门扇阴影
    if (doorOpen) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        roundRectPath(ctx, doorX + 2 + openOffset, doorY + 2, doorW, doorH, 4);
        ctx.fill();
    }
    // 门扇主体
    const doorGrad = ctx.createLinearGradient(doorX, doorY, doorX + doorW, doorY);
    doorGrad.addColorStop(0, isDark ? '#7c5e3c' : '#b07c4f');
    doorGrad.addColorStop(1, isDark ? '#6b4a2a' : '#946b3f');
    ctx.fillStyle = doorGrad;
    roundRectPath(ctx, doorX + openOffset, doorY, doorW, doorH, 4);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#4a3020' : '#6b4a2a';
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, doorX + openOffset, doorY, doorW, doorH, 4);
    ctx.stroke();
    // 门把手
    ctx.fillStyle = '#d4a030';
    ctx.beginPath();
    ctx.arc(doorX + openOffset + doorW - 22, doorY + doorH / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // 磁体 (在门扇顶部)
    const magnetX = doorX + openOffset + doorW - 30;
    const magnetY = doorY + 20;
    ctx.fillStyle = '#ef4444';
    roundRectPath(ctx, magnetX - 14, magnetY - 10, 28, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('磁体', magnetX, magnetY + 4);

    // 干簧管 (门框)
    const reedX = doorX + doorW - 30;
    const reedY2 = doorY + 18;
    ctx.fillStyle = isDark ? 'rgba(147,197,253,0.5)' : 'rgba(186,230,253,0.5)';
    ctx.beginPath();
    ctx.ellipse(reedX, reedY2, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 触点
    const contactOpen = !reedClosed;
    const reedGap = contactOpen ? 8 : 0;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(reedX - 12, reedY2);
    ctx.lineTo(reedX - reedGap, reedY2);
    ctx.moveTo(reedX + reedGap, reedY2);
    ctx.lineTo(reedX + 12, reedY2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('干簧管', reedX, reedY2 + 24);

    // 状态标签 (门)
    ctx.fillStyle = doorOpen ? '#ef4444' : '#22c55e';
    roundRectPath(ctx, doorX + openOffset, doorY + doorH + 10, doorW, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(doorOpen ? '门开启 (报警)' : '门关闭 (正常)', doorX + openOffset + doorW / 2, doorY + doorH + 22);

    // --- 右侧: 简易逻辑电路 ---
    const circX = w * 0.52;
    const circY = h * 0.22;
    const circW = w * 0.44;

    // 电路背景卡
    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.6)' : 'rgba(226,232,240,0.6)';
    roundRectPath(ctx, circX - 20, circY - 10, circW + 20, h * 0.4, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    roundRectPath(ctx, circX - 20, circY - 10, circW + 20, h * 0.4, 8);
    ctx.stroke();

    // 标题
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('逻辑电路', circX - 10, circY + 6);

    // 非门符号
    const notX = circX + 80;
    const notY = circY + 60;
    const notW = 60;
    const notH = 36;
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(notX, notY);
    ctx.lineTo(notX, notY + notH);
    ctx.lineTo(notX + notW - 10, notY + notH / 2);
    ctx.closePath();
    ctx.stroke();
    // 输入输出小圈
    ctx.beginPath();
    ctx.arc(notX + notW - 4, notY + notH / 2, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('非门', notX + notW / 2, notY + notH + 14);

    // 输入线
    const inY = notY + notH / 2;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(circX - 10, inY);
    ctx.lineTo(notX, inY);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(doorOpen ? '高(H)' : '低(L)', circX - 8, inY - 4);

    // 输出线
    const outX2 = notX + notW + 4;
    ctx.strokeStyle = doorOpen ? '#ef4444' : '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(outX2, inY);
    ctx.lineTo(circX + circW - 10, inY);
    ctx.stroke();
    ctx.fillStyle = doorOpen ? '#ef4444' : '#22c55e';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(doorOpen ? 'H → 报警' : 'L → 正常', (outX2 + circX + circW - 10) / 2, inY - 8);

    // --- 报警指示 + 蜂鸣器 ---
    const indX = circX + circW * 0.3;
    const indY = circY + 140;

    // LED (红色闪烁)
    const pulse = alarm ? 0.5 + 0.5 * Math.sin(currentTime * 8) : 0.1;
    const ledGrad3 = ctx.createRadialGradient(indX - 4, indY - 4, 2, indX, indY, 16);
    ledGrad3.addColorStop(0, alarm ? '#fca5a5' : '#475569');
    ledGrad3.addColorStop(1, alarm ? '#ef4444' : '#334155');
    ctx.fillStyle = ledGrad3;
    ctx.beginPath();
    ctx.arc(indX, indY, 14, 0, Math.PI * 2);
    ctx.fill();
    // LED 灯光
    if (alarm) {
        const alarmGlow = ctx.createRadialGradient(indX, indY, 4, indX, indY, 50);
        alarmGlow.addColorStop(0, `rgba(239,68,68,${0.7 * pulse})`);
        alarmGlow.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = alarmGlow;
        ctx.beginPath();
        ctx.arc(indX, indY, 50, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = alarm ? '#ef4444' : '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(alarm ? '⚠ 报警' : '正常', indX, indY + 34);

    // 蜂鸣器 (右侧)
    const buzzX = circX + circW * 0.7;
    const buzzY = indY;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(buzzX, buzzY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = alarm ? '#ef4444' : '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 蜂鸣片
    ctx.beginPath();
    ctx.arc(buzzX, buzzY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = alarm ? '#ef4444' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 声波
    if (alarm) {
        ctx.strokeStyle = `rgba(239,68,88,${pulse})`;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(buzzX, buzzY, 16 + i * 6, -Math.PI * 0.4, Math.PI * 0.4);
            ctx.stroke();
        }
        ctx.fillStyle = `rgba(239,68,68,${pulse})`;
        ctx.beginPath();
        ctx.arc(buzzX, buzzY - 24, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = alarm ? '#ef4444' : '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('蜂鸣器', buzzX, buzzY + 34);

    // --- 距离 + 门槛 ---
    const slidY = h * 0.78;
    const slidX = w * 0.1;
    const slidW = w * 0.8;
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.fillRect(slidX, slidY, slidW, 6);
    const slidF = Math.max(0, Math.min(1, magnetDistance / 50));
    ctx.fillStyle = doorOpen ? '#ef4444' : '#22c55e';
    ctx.fillRect(slidX, slidY, slidF * slidW, 6);
    // 门槛标记
    const operMark = (operateDist / 50) * slidW;
    const relMark = (releaseDist / 50) * slidW;
    ctx.strokeStyle = '#fbbf24';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(slidX + operMark, slidY - 10);
    ctx.lineTo(slidX + operMark, slidY + 14);
    ctx.stroke();
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(slidX + relMark, slidY - 10);
    ctx.lineTo(slidX + relMark, slidY + 14);
    ctx.stroke();
    ctx.setLineDash([]);
    // 标签
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0mm', slidX, slidY - 4);
    ctx.textAlign = 'right';
    ctx.fillText(`50mm  吸合=${operateDist}mm  释放=${releaseDist}mm`, slidX + slidW, slidY - 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`d = ${magnetDistance.toFixed(1)} mm`, slidX + slidW / 2, slidY + 24);

    // 真值表
    const tvX = w * 0.52;
    const tvY = h * 0.62;
    const tvW = circW;
    const tvH = 36;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
    roundRectPath(ctx, tvX - 10, tvY, tvW + 10, tvH + 16, 6);
    ctx.fill();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('逻辑真值表:', tvX - 4, tvY + 12);
    // 两端
    ctx.font = '9px monospace';
    const rowy = tvY + 28;
    ctx.fillText('干簧管: 闭合(=0) | 断开(=1)', tvX - 4, rowy);
    ctx.fillText(`输出  : ${doorOpen ? 'H (=1, 报警)' : 'L (=0, 正常)'}`, tvX - 4, rowy + 12);

    // HUD
    drawHud(
        ctx,
        isDark,
        [
            { label: 'd', value: `${magnetDistance.toFixed(1)} mm` },
            { label: '吸合阈', value: `${operateDist} mm` },
            { label: '释放阈', value: `${releaseDist} mm` },
            { label: '门', value: doorOpen ? '开启' : '关闭' },
            { label: '干簧管', value: doorOpen ? '断开' : '吸合' },
            { label: '报警', value: alarm ? '激活' : '关闭' }
        ],
        { boxW: 210, lineH: 16 }
    );

    drawInfoBar(
        ctx,
        w,
        h,
        `磁控报警: d=${magnetDistance.toFixed(1)}mm  吸合阈=${operateDist}mm  释放阈=${releaseDist}mm`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawLightControlSwitchScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const L = params['lightIntensity'] ?? 0.5;
    const threshold = params['threshold'] ?? 10;
    const Rfix = params['Rfix'] ?? 10000;
    const Esupply = params['Esupply'] ?? 12;

    // 引擎单一真源: x_t = 24h 照度曲线 (h/lux), y_t = 开关状态 (h/0·1), maxValues 数值
    const engCharts = simulationResult?.charts as
        | { x_t?: { points: Array<{ x: number; y: number }> }; y_t?: { points: Array<{ x: number; y: number }> } }
        | undefined;
    const engMax = simulationResult?.diagnostics?.maxValues as
        { rLdr?: number; vB?: number; lightOnFlag?: number; transistorOnFlag?: number } | undefined;
    // currentTime 模拟小时 (场景 duration 单位 = h)
    const tHours = ((currentTime % 24) + 24) % 24;
    // 当前时刻照度 (lx): 引擎 24h 曲线插值; 回退归一化自算
    const lightNow = engCharts?.x_t ? interpSeries(engCharts.x_t, tHours) : L * 40000;
    // 回退自算 (无引擎结果时): 原指数近似 + 阈值判定
    const Rdark2 = 1e6;
    const k2 = 7;
    // R_LDR / V_B (引擎幂律模型 R=R_dark·(L/L_ref)^-0.7, LDR 在下分压); 回退原指数自算
    const Rldr = engMax?.rLdr ?? Rdark2 * Math.exp(-k2 * L);
    const V_B = engMax?.vB ?? (Esupply * Rldr) / (Rldr + Rfix);
    // 状态: 引擎判定 (暗→V_B 高→三极管导通→继电器吸合→灯亮); 回退原阈值判定
    const lampOn = engMax?.lightOnFlag === 1 || (engMax === undefined && lightNow < threshold);
    const transistorOn = engMax?.transistorOnFlag === 1 || (engMax === undefined && !lampOn);

    drawTitle(ctx, '光控开关 (路灯自动控制)', w, isDark, { size: 18, y: 28 });

    // --- 左侧: 光敏分压电路 ---
    const circX = w * 0.04;
    const circY = h * 0.18;
    const circW = 280;
    const circH = 200;

    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.6)' : 'rgba(226,232,240,0.6)';
    roundRectPath(ctx, circX - 8, circY - 10, circW + 20, circH + 20, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    roundRectPath(ctx, circX - 8, circY - 10, circW + 20, circH + 20, 8);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LDR 分压电路', circX, circY + 6);

    // 电源
    const powX = circX + 20;
    const powY = circY + 30;
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`+${Esupply}V`, powX, powY);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(powX + 6, powY + 6);
    ctx.lineTo(powX + 6, powY + 50);
    ctx.stroke();

    // LDR 符号 (右上)
    const ldrX2 = circX + circW * 0.7;
    const ldrY2 = circY + 40;
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ldrX2 - 24, ldrY2 - 14, 48, 28);
    ctx.beginPath();
    ctx.moveTo(ldrX2 - 10, ldrY2 - 14);
    ctx.lineTo(ldrX2 - 6, ldrY2 - 8);
    ctx.lineTo(ldrX2 - 14, ldrY2);
    ctx.lineTo(ldrX2 - 6, ldrY2 + 8);
    ctx.lineTo(ldrX2 - 10, ldrY2 + 14);
    ctx.stroke();
    // 光箭头
    for (let ai = 0; ai < 2; ai++) {
        drawArrow(ctx, ldrX2 - 26 + ai * 10, ldrY2 - 24 - ai * 8, ldrX2 - 22 + ai * 10, ldrY2 - 28 - ai * 8, '#fbbf24');
    }
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LDR`, ldrX2, ldrY2 + 26);
    ctx.fillText(`R=${Rldr >= 1e3 ? (Rldr / 1e3).toFixed(0) + 'k' : Rldr.toFixed(0)}`, ldrX2, ldrY2 + 38);

    // R_fix (右下)
    const rfixX2 = ldrX2;
    const rfixY2 = ldrY2 + 70;
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rfixX2 - 24, rfixY2 - 10, 48, 20);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`R_fix`, rfixX2, rfixY2 + 22);
    ctx.fillText(`${Rfix >= 1e3 ? (Rfix / 1e3).toFixed(0) + 'k' : Rfix}`, rfixX2, rfixY2 + 34);

    // LDR 和 Rfix 之间连线 (V_cc 采样点)
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 1.2;
    // 上: 电源 +Esupply 到 LDR
    ctx.beginPath();
    ctx.moveTo(powX + 6, powY + 6);
    ctx.lineTo(powX + 6, ldrY2);
    ctx.lineTo(ldrX2 - 24, ldrY2);
    ctx.stroke();
    // LDR 到 Rfix
    ctx.beginPath();
    ctx.moveTo(ldrX2 + 24, ldrY2);
    ctx.lineTo(ldrX2 + 60, ldrY2);
    ctx.lineTo(rfixX2 + 60, rfixY2);
    ctx.lineTo(rfixX2 + 24, rfixY2);
    ctx.stroke();
    // Rfix 到 GND
    ctx.beginPath();
    ctx.moveTo(rfixX2 - 24, rfixY2);
    ctx.lineTo(rfixX2 - 60, rfixY2);
    ctx.lineTo(powX + 6, rfixY2);
    ctx.lineTo(powX + 6, powY + 50);
    ctx.stroke();
    // GND 符号
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(powX + 1, powY + 50);
    ctx.lineTo(powX + 11, powY + 50);
    ctx.moveTo(powX + 3, powY + 54);
    ctx.lineTo(powX + 9, powY + 54);
    ctx.moveTo(powX + 5, powY + 58);
    ctx.lineTo(powX + 7, powY + 58);
    ctx.stroke();

    // V_cc 采样点
    const vccX = (ldrX2 + 60 + rfixX2 + 60) / 2;
    const vccY = rfixY2 + 24;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(vccX, vccY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`V_B = ${V_B.toFixed(2)} V`, vccX + 10, vccY);

    // 三极管示意
    const trX = vccX + 100;
    const trY = vccY - 18;
    ctx.strokeStyle = transistorOn ? '#10b981' : '#94a3b8';
    ctx.lineWidth = 1.5;
    // NPN 三极管符号
    ctx.beginPath();
    ctx.moveTo(trX, trY + 16);
    ctx.lineTo(trX + 20, trY + 16);
    ctx.lineTo(trX + 20, trY);
    ctx.moveTo(trX + 20, trY + 8);
    ctx.lineTo(trX + 40, trY);
    ctx.lineTo(trX + 40, trY - 8);
    ctx.moveTo(trX + 20, trY + 24);
    ctx.lineTo(trX + 40, trY + 32);
    ctx.lineTo(trX + 40, trY + 38);
    ctx.stroke();
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(trX + 40, trY + 16);
    ctx.lineTo(trX + 60, trY + 16);
    ctx.stroke();
    ctx.fillStyle = transistorOn ? '#10b981' : '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(transistorOn ? 'NPN 导通' : 'NPN 截止', trX + 30, trY + 46);
    ctx.fillText(`V_cc ${transistorOn ? '≥' : '<'} V_be`, trX + 30, trY + 58);

    // --- 路灯 ---
    const lampX2 = w * 0.06;
    const lampY2 = h * 0.78;

    // 灯杆
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(lampX2 + 84, lampY2 + 40, 6, 80);
    // 灯罩
    ctx.beginPath();
    ctx.moveTo(lampX2 + 60, lampY2 + 40);
    ctx.lineTo(lampX2 + 120, lampY2 + 40);
    ctx.lineTo(lampX2 + 100, lampY2 + 22);
    ctx.lineTo(lampX2 + 80, lampY2 + 22);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#64748b' : '#475569';
    ctx.fill();
    // 灯泡
    const bulbGrad = ctx.createRadialGradient(lampX2 + 90, lampY2 + 48, 4, lampX2 + 90, lampY2 + 48, 16);
    if (lampOn) {
        bulbGrad.addColorStop(0, '#ffffff');
        bulbGrad.addColorStop(0.5, '#fde68a');
        bulbGrad.addColorStop(1, '#fbbf24');
    } else {
        bulbGrad.addColorStop(0, '#64748b');
        bulbGrad.addColorStop(1, '#334155');
    }
    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(lampX2 + 90, lampY2 + 48, 14, 0, Math.PI * 2);
    ctx.fill();
    // 灯光锥
    if (lampOn) {
        const lampGlow = ctx.createRadialGradient(lampX2 + 90, lampY2 + 50, 8, lampX2 + 90, lampY2 + 50, 80);
        lampGlow.addColorStop(0, 'rgba(251,191,36,0.6)');
        lampGlow.addColorStop(0.5, 'rgba(251,191,36,0.2)');
        lampGlow.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = lampGlow;
        ctx.beginPath();
        ctx.moveTo(lampX2 + 80, lampY2 + 50);
        ctx.lineTo(lampX2 + 20, lampY2 + 130);
        ctx.lineTo(lampX2 + 160, lampY2 + 130);
        ctx.lineTo(lampX2 + 100, lampY2 + 50);
        ctx.closePath();
        ctx.fill();
    }

    // 路灯状态
    ctx.fillStyle = lampOn ? '#fbbf24' : '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lampOn ? '路灯 ● 亮 (夜)' : '路灯 ○ 灭 (昼)', lampX2 + 90, lampY2 + 150);

    // --- 24h 光照度曲线 (右上) ---
    const chartX2 = w * 0.42;
    const chartY2 = 50;
    const chartW2 = w * 0.55;
    const chartH2 = h * 0.42;

    // 用简单的 sin 仿真白天正午照度高, 夜晚低
    // 曲线 (引擎单一真源): 6~18h 半正弦峰值 50000+100 lux, 夜间 0.5 lux
    const xs3: number[] = [];
    const ys3: number[] = [];
    if (engCharts?.x_t) {
        for (const p of engCharts.x_t.points) {
            xs3.push(p.x);
            ys3.push(p.y);
        }
    } else {
        for (let i = 0; i <= 48; i++) {
            const th = (i / 48) * 24;
            xs3.push(th);
            const lvl = Math.max(0.5, Math.max(0, Math.sin(((th - 6) / 24) * Math.PI * 2)) * 40000);
            ys3.push(lvl);
        }
    }

    drawMiniChart({
        ctx,
        x: chartX2,
        y: chartY2,
        w: chartW2,
        h: chartH2,
        xs: xs3,
        ys: ys3,
        isDark,
        lineColor: '#fbbf24',
        label: '24h 照度曲线',
        xLabel: '时间 t (h)',
        yLabel: '照度 E (lx)',
        logY: true,
        fillUnder: 'rgba(251,191,36,0.1)'
    });

    // 阈值线
    const thrY2 =
        chartY2 +
        chartH2 -
        ((Math.log10(Math.max(0.5, threshold)) - Math.log10(0.5)) / (Math.log10(40000) - Math.log10(0.5))) * chartH2;
    if (thrY2 >= chartY2 && thrY2 <= chartY2 + chartH2) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(chartX2, thrY2);
        ctx.lineTo(chartX2 + chartW2, thrY2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`阈值=${threshold}lx`, chartX2 + chartW2 - 4, thrY2 - 2);
    }

    // 当前时刻点 (引擎 24h 曲线插值)
    if (tHours >= 0 && tHours <= 24) {
        const px3 = chartX2 + (tHours / 24) * chartW2;
        const lvl = Math.max(0.5, lightNow);
        const py3 =
            chartY2 + chartH2 - ((Math.log10(lvl) - Math.log10(0.5)) / (Math.log10(40000) - Math.log10(0.5))) * chartH2;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px3, py3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // --- 逻辑指示 + LED (右下) ---
    const indY2 = h * 0.58;

    // LED 指示
    const aLedX = chartX2 + 30;
    const aLedY = indY2;
    const ledGrad2 = ctx.createRadialGradient(aLedX - 4, aLedY - 4, 2, aLedX, aLedY, 14);
    if (lampOn) {
        ledGrad2.addColorStop(0, '#fef3c7');
        ledGrad2.addColorStop(1, '#fbbf24');
    } else {
        ledGrad2.addColorStop(0, '#475569');
        ledGrad2.addColorStop(1, '#334155');
    }
    ctx.fillStyle = ledGrad2;
    ctx.beginPath();
    ctx.arc(aLedX, aLedY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lampOn ? '#fbbf24' : '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lampOn ? '灯亮' : '灯灭', aLedX, aLedY + 28);

    // 数值表
    const valX2 = chartX2 + chartW2 * 0.55;
    const valY2 = indY2 - 40;
    const valW = chartW2 * 0.42;
    const valH = 90;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
    roundRectPath(ctx, valX2 - 4, valY2, valW + 8, valH, 6);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    const vRows = [
        `E = ${lightNow.toFixed(2)} lx`,
        `R_LDR = ${Rldr >= 1e3 ? (Rldr / 1e3).toFixed(1) + ' kΩ' : Rldr.toFixed(0) + ' Ω'}`,
        `V_B = ${V_B.toFixed(3)} V`,
        `阈值 V_be = 0.7 V`,
        `输出 = ${lampOn ? '灯亮' : '灯灭'}`,
        `t = ${tHours.toFixed(1)} h`
    ];
    vRows.forEach((r, i) => {
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.fillText(r, valX2, valY2 + 14 + i * 14);
    });

    // 照度滑杆
    const slidX2 = w * 0.42;
    const slidY2 = h * 0.78;
    const slidW2 = w * 0.55;
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.fillRect(slidX2, slidY2, slidW2, 6);
    // 对数填充
    const slidR2 = Math.max(
        0,
        Math.min(1, (Math.log10(Math.max(0.5, L)) - Math.log10(0.5)) / (Math.log10(1e5) - Math.log10(0.5)))
    );
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(slidX2, slidY2, slidR2 * slidW2, 6);
    // 刻度
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0.5lx', slidX2, slidY2 - 4);
    ctx.textAlign = 'right';
    ctx.fillText('1e5lx', slidX2 + slidW2, slidY2 - 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`照度 E = ${L.toFixed(2)} lx  阈值 = ${threshold} lx`, slidX2 + slidW2 / 2, slidY2 + 22);

    // 公式
    const formY3 = h * 0.86;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V_B = E_supp · R_LDR / (R_LDR + R_fix)', w * 0.5 + 60, formY3);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('LDR: 光照↑ → R↓ → V_B↓ → 三极管截止 → 灯灭', w * 0.5 + 60, formY3 + 16);
    ctx.fillText('LDR: 光照↓ → R↑ → V_B↑ → 三极管导通 → 灯亮', w * 0.5 + 60, formY3 + 30);

    // HUD
    drawHud(
        ctx,
        isDark,
        [
            { label: 'E', value: `${lightNow.toFixed(2)} lx` },
            { label: 'R_LDR', value: `${Rldr >= 1e3 ? (Rldr / 1e3).toFixed(1) + ' k' : Rldr.toFixed(0)} Ω` },
            { label: 'R_fix', value: `${(Rfix / 1e3).toFixed(0)} kΩ` },
            { label: 'V_B', value: `${V_B.toFixed(3)} V` },
            { label: '阈值', value: `${threshold} lx` },
            { label: 't', value: `${currentTime.toFixed(1)} s` }
        ],
        { boxW: 210, lineH: 16 }
    );

    drawInfoBar(
        ctx,
        w,
        h,
        `VB=E·RLdr/(RLdr+Rfix)  E=${lightNow.toFixed(0)}lx  Rldr=${Rldr >= 1e3 ? (Rldr / 1e3).toFixed(0) + 'k' : Rldr.toFixed(0)}  VB=${V_B.toFixed(3)}V  阈值=${threshold}lx`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}
