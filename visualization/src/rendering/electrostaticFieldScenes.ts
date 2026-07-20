/**
 * 电磁学场景渲染模块 — 必修三 第九章 静电场及其应用
 *
 * 场景列表：
 *   - drawCoulombForceExploreScene
 *   - drawElectroscopeScene
 *   - drawElectrostaticInductionScene
 *   - drawElectrostaticShieldingScene
 *   - drawFaradayCupScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    COLORS,
    roundRectPath,
    clamp,
    textColor,
    mutedColor,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawArrow,
    drawChargeSymbol,
    drawText
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
const GREEN = COLORS.GREEN;
const ORANGE = COLORS.ORANGE;
const RED = COLORS.RED;

export function drawCoulombForceExploreScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '探究电荷间作用力 (库仑定律)', width, isDark, { size: 18, y: 28 });
    const K = 8.9875517923e9;
    const q1 = params['q1'] ?? 1;
    const q2 = params['q2'] ?? 1;
    const distance = params['distance'] ?? 5;
    const mode = (params['mode'] ?? 0) >= 0.5 ? 1 : 0;
    const q1C = q1 * 1e-6;
    const q2C = q2 * 1e-6;
    const r = Math.max(distance * 1e-2, 1e-4);
    const F = (K * q1C * q2C) / (r * r); // N
    const repulsive = q1 * q2 > 0;

    const y = height * 0.46;
    const x1 = width * 0.28;
    const x2 = width * 0.72;
    const rad = 22;
    drawChargeSymbol(ctx, x1, y, rad, q1, isDark);
    drawChargeSymbol(ctx, x2, y, rad, q2, isDark);
    // 作用力箭头（沿两球连线）
    const midX = (x1 + x2) / 2;
    if (repulsive) {
        drawArrow(ctx, midX - 6, y - 40, x1 + rad + 6, y - 40, ORANGE, '');
        drawArrow(ctx, midX + 6, y - 40, x2 - rad - 6, y - 40, ORANGE, 'F');
    } else {
        drawArrow(ctx, x1 + rad + 6, y - 40, midX - 6, y - 40, ORANGE, '');
        drawArrow(ctx, x2 - rad - 6, y - 40, midX + 6, y - 40, ORANGE, 'F');
    }
    drawText(ctx, `r = ${distance.toFixed(1)} cm`, midX - 28, y + 50, isDark, 13, mutedColor(isDark));

    // 关系示意图：左 F∝q₁q₂，右 F∝1/r²
    const bx = width * 0.12;
    const by = height * 0.72;
    const bw = width * 0.76;
    const bh = height * 0.16;
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '12px system-ui, sans-serif';
    const label = mode === 0 ? '模式: 固定 r, 改变 q → F ∝ q₁·q₂' : '模式: 固定 q, 改变 r → F ∝ 1/r²';
    drawText(ctx, label, bx + 8, by - 6, isDark, 12, mutedColor(isDark));
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const px = bx + 8 + t * (bw - 16);
        const norm = mode === 0 ? t : 1 - t; // q 线性 / r 反比
        const py = by + bh - 8 - norm * (bh - 18);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    drawHud(
        ctx,
        isDark,
        [
            { label: 'q₁', value: `${q1.toFixed(2)} μC` },
            { label: 'q₂', value: `${q2.toFixed(2)} μC` },
            { label: 'F', value: `${F < 1e-3 ? (F * 1e6).toFixed(2) + ' μN' : F.toFixed(3) + ' N'}` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, `F = k·q₁q₂/r² = ${F.toExponential(2)} N（k=8.99×10⁹）`, isDark);
}

export function drawElectroscopeScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '验电器 (箔片张角 vs 电量)', width, isDark, { size: 18, y: 28 });
    const K = 8.9875517923e9;
    const q = params['charge'] ?? 1;
    const foilLength = params['foilLength'] ?? 5;
    const foilMass = params['foilMass'] ?? 1;
    const qC = q * 1e-6;
    const L = Math.max(foilLength * 1e-2, 0.01);
    const g = 9.8;
    // 简化模型：箔尖斥力 F = k q² / (2L)²，与重力矩平衡 → tanθ = F/(mg)
    const repel = (K * qC * qC) / (4 * L * L);
    const gravity = Math.max(foilMass * 1e-3 * g, 1e-9);
    const theta = clamp(Math.atan(repel / gravity), 0, (78 * Math.PI) / 180);

    const cx = width * 0.5;
    const topY = height * 0.2;
    const domeR = 26;
    // 顶部金属球 + 杆
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.beginPath();
    ctx.arc(cx, topY + domeR, domeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#94a3b8' : '#334155';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, topY + domeR * 2);
    ctx.lineTo(cx, height * 0.45);
    ctx.stroke();
    // 两箔片
    const pivotY = height * 0.45;
    const tipLen = height * 0.28 * clamp(foilLength / 10, 0.4, 1.4);
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 4;
    for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx, pivotY);
        ctx.lineTo(cx + dir * Math.sin(theta) * tipLen, pivotY + Math.cos(theta) * tipLen);
        ctx.stroke();
    }
    drawText(
        ctx,
        `张角 2θ ≈ ${((theta * 2 * 180) / Math.PI).toFixed(1)}°`,
        cx + 40,
        pivotY + tipLen * 0.6,
        isDark,
        13,
        textColor(isDark)
    );
    drawHud(
        ctx,
        isDark,
        [
            { label: 'q', value: `${q.toFixed(2)} μC` },
            { label: 'L', value: `${foilLength.toFixed(1)} cm` },
            { label: 'θ', value: `${((theta * 180) / Math.PI).toFixed(1)}°` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '同种电荷相互排斥，箔片张角随带电量增大', isDark);
}

export function drawElectrostaticInductionScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '静电感应 (近/远端感应电荷)', width, isDark, { size: 18, y: 28 });
    const chargeC = params['chargeC'] ?? 1;
    const separation = params['separation'] ?? 2;
    const distanceAC = params['distanceAC'] ?? 10;
    const cSign = chargeC >= 0 ? 1 : -1;
    // 感应强度随电荷量增大、随距离平方减小（定性）
    const induced = clamp((Math.abs(chargeC) / 100) * (10 / Math.max(distanceAC, 0.5)), 0.1, 1);

    const conductorY = height * 0.5;
    const aLeft = width * 0.42;
    const gap = clamp(separation * 2, 6, 60);
    const aRight = aLeft + 70;
    const bLeft = aRight + gap;
    const bRight = bLeft + 70;
    const conductorH = 46;
    // 导体 A、B
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    for (const [x0, x1] of [
        [aLeft, aRight],
        [bLeft, bRight]
    ] as Array<[number, number]>) {
        roundRectPath(ctx, x0, conductorY - conductorH / 2, x1 - x0, conductorH, 6);
        ctx.fill();
        ctx.stroke();
    }
    // 外部带电体 C
    const cX = aLeft - Math.max(distanceAC * 1.6, 40);
    drawChargeSymbol(ctx, cX, conductorY, 20, cSign, isDark);
    // 感应电荷标注：A 近端(左)与 C 异种，A 远端(右)同种；B 近端(左)同种
    const aNearSign = -cSign;
    const aFarSign = cSign;
    const bNearSign = cSign;
    const sym = (s: number) => (s > 0 ? '+' : '−');
    const col = (s: number) => (s > 0 ? RED : BLUE);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = col(aNearSign);
    ctx.fillText(sym(aNearSign), aLeft + 10, conductorY - conductorH / 2 - 8);
    ctx.fillStyle = col(aFarSign);
    ctx.fillText(sym(aFarSign), aRight - 18, conductorY - conductorH / 2 - 8);
    ctx.fillStyle = col(bNearSign);
    ctx.fillText(sym(bNearSign), bLeft + 10, conductorY - conductorH / 2 - 8);
    // 电场线：C → A 近端
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cX + 20, conductorY + i * 10);
        ctx.lineTo(aLeft - 2, conductorY + i * 10);
        ctx.stroke();
    }
    drawText(
        ctx,
        `感应强度 ≈ ${(induced * 100).toFixed(0)}%`,
        width * 0.12,
        height * 0.8,
        isDark,
        13,
        mutedColor(isDark)
    );
    drawHud(
        ctx,
        isDark,
        [
            { label: 'C', value: `${chargeC.toFixed(2)} μC ${cSign > 0 ? '(+)' : '(−)'}` },
            { label: 'd_AC', value: `${distanceAC.toFixed(1)} cm` },
            { label: '近端', value: sym(aNearSign) }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '导体近端感应出异种电荷、远端同种电荷', isDark);
}

export function drawElectrostaticShieldingScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '静电屏蔽 (接地 vs 不接地)', width, isDark, { size: 18, y: 28 });
    const externalField = params['externalField'] ?? 500;
    const cavityCharge = params['cavityCharge'] ?? 0;
    const grounded = (params['isGrounded'] ?? 1) >= 0.5;

    const shellX = width * 0.34;
    const shellY = height * 0.28;
    const shellW = width * 0.34;
    const shellH = height * 0.44;
    const wall = 22;
    // 外部电场线（水平，遇导体壳偏折）
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i++) {
        const ly = height * 0.3 + i * height * 0.1;
        ctx.beginPath();
        ctx.moveTo(10, ly);
        ctx.lineTo(shellX, ly);
        ctx.stroke();
        // 壳外绕过
        ctx.beginPath();
        ctx.moveTo(shellX + shellW, ly);
        ctx.lineTo(width - 10, ly);
        ctx.stroke();
    }
    // 导体壳（外框 + 空腔）
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 2;
    roundRectPath(ctx, shellX, shellY, shellW, shellH, 10);
    ctx.fill();
    ctx.stroke();
    // 空腔
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    roundRectPath(ctx, shellX + wall, shellY + wall, shellW - wall * 2, shellH - wall * 2, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';
    ctx.stroke();
    // 接地符号
    if (grounded) {
        const gx = shellX + shellW / 2;
        const gy = shellY + shellH;
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, gy + 18);
        for (let i = 0; i < 3; i++) {
            ctx.moveTo(gx - 9 + i * 9, gy + 18 + i * 5);
            ctx.lineTo(gx + 9 - i * 9, gy + 18 + i * 5);
        }
        ctx.stroke();
    }
    // 腔内电荷
    if (cavityCharge !== 0) {
        drawChargeSymbol(ctx, shellX + shellW / 2, shellY + shellH / 2, 14, cavityCharge >= 0 ? 1 : -1, isDark);
    }
    const eInside = cavityCharge !== 0 ? '≠ 0 (腔内电荷)' : '= 0';
    drawText(ctx, `导体内部场强 ${eInside}`, shellX, shellY - 10, isDark, 13, textColor(isDark));
    drawHud(
        ctx,
        isDark,
        [
            { label: 'E_ext', value: `${externalField.toFixed(0)} V/m` },
            { label: '接地', value: grounded ? '是' : '否' },
            { label: 'E_in', value: cavityCharge !== 0 ? '见腔内' : '0' }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '静电平衡时导体内部场强为零，外电场被屏蔽', isDark);
}

export function drawFaradayCupScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '法拉第圆筒 (内表面电荷=0)', width, isDark, { size: 18, y: 28 });
    const totalCharge = params['totalCharge'] ?? 5;
    const cx = width * 0.5;
    const topY = height * 0.26;
    const cupW = width * 0.26;
    const cupH = height * 0.4;
    const wall = 16;
    // 圆筒外壳（U 形）
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 2;
    roundRectPath(ctx, cx - cupW / 2, topY, cupW, cupH, 8);
    ctx.fill();
    ctx.stroke();
    // 内部掏空
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    roundRectPath(ctx, cx - cupW / 2 + wall, topY + wall, cupW - wall * 2, cupH - wall, 4);
    ctx.fill();
    // 外表面电荷（+ 号）
    ctx.fillStyle = RED;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const nOuter = 7;
    for (let i = 0; i < nOuter; i++) {
        const x = cx - cupW / 2 + wall / 2;
        const y = topY + 18 + (i / (nOuter - 1)) * (cupH - 30);
        ctx.fillText('+', x - 4, y);
        ctx.fillText('+', cx + cupW / 2 - wall / 2 - 4, y);
    }
    // 探针
    const innerProbeY = topY + cupH * 0.5;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, topY - 26);
    ctx.lineTo(cx, innerProbeY);
    ctx.stroke();
    drawText(ctx, '内探针: 0', cx + 18, innerProbeY, isDark, 13, mutedColor(isDark));
    drawText(ctx, `外探针: ${totalCharge.toFixed(1)} μC`, cx + 18, topY + 14, isDark, 13, ORANGE);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'Q', value: `${totalCharge.toFixed(1)} μC` },
            { label: '内表面', value: '0' },
            { label: '外表面', value: `${totalCharge.toFixed(1)} μC` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '静电平衡时净电荷只分布在外表面，内表面电荷为零', isDark);
}
