/**
 * 分子间相互作用力实验 rig — 铅柱挤压对接吊重锤 + 双球弹簧分子力学模型 + Lennard-Jones F-r 曲线
 * 验证分子间同时存在引力与斥力，其合力随距离 r 变化关系：r < r₀ 斥力、r = r₀ 平衡、r > r₀ 引力
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeSphere, makeLine, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

/** LJ 力 F(r) = 24ε/r · [2(σ/r)^12 − (σ/r)^6] (正=斥, 负=引) */
function ljForce(r: number, eps: number, sig: number): number {
    const s = sig / Math.max(0.1, r);
    const s6 = Math.pow(s, 6);
    const s12 = s6 * s6;
    return ((24 * eps) / r) * (2 * s12 - s6);
}

interface MolHandles {
    curve: THREE.Line;
    curveDot: THREE.Mesh;
    molLeft: THREE.Mesh;
    molRight: THREE.Mesh;
    fArrow: THREE.ArrowHelper;
    leadGroup: THREE.Group;
    label: THREE.Sprite;
}

export const molecularForceRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 1.35;

        // ==================== 1. 经典演示：两截对接铅柱悬挂 5kg 砝码 ====================
        const leadGroup = new THREE.Group();
        // 上悬挂挂钩与挂绳
        const upperHook = makeCylinder(0.018, 0.45, 0x475569, 0.4, 0.6);
        upperHook.position.set(-1.45, cy + 0.9, 0);
        leadGroup.add(upperHook);

        // 上半截铅柱 (金属铅灰微反光)
        const leadTop = makeCylinder(0.22, 0.45, 0x64748b, 0.4, 0.5);
        leadTop.position.set(-1.45, cy + 0.45, 0);
        leadGroup.add(leadTop);

        // 下半截铅柱 (紧密贴合接触面)
        const leadBottom = makeCylinder(0.22, 0.45, 0x64748b, 0.4, 0.5);
        leadBottom.position.set(-1.45, cy - 0.02, 0);
        leadGroup.add(leadBottom);

        // 铅柱下吊挂的 5kg 铸铁砝码
        const hookLower = makeCylinder(0.015, 0.35, 0x334155, 0.3, 0.7);
        hookLower.position.set(-1.45, cy - 0.4, 0);
        leadGroup.add(hookLower);
        const weight5kg = makeCylinder(0.28, 0.4, 0x1e293b, 0.5, 0.3);
        weight5kg.position.set(-1.45, cy - 0.75, 0);
        leadGroup.add(weight5kg);

        const leadLabel = makeTextSprite('铅柱对接吊重 (分子引力)', '#0f172a', 24, { x: 1.4, y: 0.25 });
        leadLabel.position.set(-1.45, cy - 1.15, 0);
        leadGroup.add(leadLabel);
        group.add(leadGroup);

        // ==================== 2. 双分子相互作用模型 (右侧) ====================
        const molLeft = makeSphere(0.24, 0x2563eb, {
            roughness: 0.2,
            metalness: 0.2,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.2
        });
        molLeft.position.set(0.2, cy + 0.55, 0);
        group.add(molLeft);

        const molRight = makeSphere(0.24, 0xef4444, {
            roughness: 0.2,
            metalness: 0.2,
            emissive: 0xb91c1c,
            emissiveIntensity: 0.2
        });
        molRight.position.set(1.2, cy + 0.55, 0);
        group.add(molRight);

        // 分子间作用力矢量箭头
        const fArrow = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(1.2, cy + 0.55, 0),
            0.45,
            0xf59e0b,
            0.14,
            0.08
        );
        group.add(fArrow);

        // ==================== 3. 3D Lennard-Jones F-r 曲线看板 ====================
        // 坐标轴
        const axisX = makeLine(
            [new THREE.Vector3(0.1, cy - 0.45, 0), new THREE.Vector3(2.4, cy - 0.45, 0)],
            0x475569,
            0.6
        );
        group.add(axisX);
        const axisY = makeLine(
            [new THREE.Vector3(0.4, cy - 0.95, 0), new THREE.Vector3(0.4, cy + 0.05, 0)],
            0x475569,
            0.6
        );
        group.add(axisY);

        // F-r 连续折线 (初始预置 2 个点防崩溃)
        const initPts = [new THREE.Vector3(0.4, cy - 0.45, 0), new THREE.Vector3(2.2, cy - 0.45, 0)];
        const curve = makeLine(initPts, 0x0284c7, 0.95);
        group.add(curve);

        // 曲线当前工作点指示珠
        const curveDot = makeSphere(0.045, 0xdc2626, { emissive: 0xb91c1c, emissiveIntensity: 0.5 });
        curveDot.position.set(1.0, cy - 0.45, 0.02);
        group.add(curveDot);

        // 状态 HUD
        const label = makeTextSprite('分子力曲线 (引力/斥力/平衡距离 r₀)', '#0f172a', 26, { x: 2.5, y: 0.36 });
        label.position.set(0.6, cy + 1.25, 0);
        group.add(label);

        const handles: MolHandles = {
            curve,
            curveDot,
            molLeft,
            molRight,
            fArrow,
            leadGroup,
            label
        };
        updateMol(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateMol(handles as unknown as MolHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as MolHandles;
        if (!h.molRight || !h.fArrow) return;

        // 分子间距往复扫描 (周期 4.0s)
        const cycle = (ctx.time % 4.0) / 4.0;
        const cy = 1.35;
        const rScan = 0.5 + Math.sin(cycle * Math.PI * 2) * 0.45; // 间距在 0.5 ~ 1.4 变化
        const r0 = 0.85; // 平衡距离

        h.molRight.position.set(0.2 + rScan, cy + 0.55, 0);

        // 力方向与大小
        const F = rScan < r0 ? (r0 - rScan) * 2.2 : -(rScan - r0) * 1.5; // 正为斥力向右，负为引力向左
        const fLen = Math.min(0.8, Math.max(0.12, Math.abs(F) * 0.5));

        const dir = F >= 0 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
        h.fArrow.setDirection(dir);
        h.fArrow.setLength(fLen, 0.12, 0.07);
        h.fArrow.position.set(0.2 + rScan, cy + 0.55, 0);

        // 更新曲线上红点指示
        const chartX = 0.4 + (rScan / 1.5) * 1.6;
        const chartY = cy - 0.45 + F * 0.28;
        h.curveDot.position.set(chartX, chartY, 0.02);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.35 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.35, 0);
    }
};

function updateMol(h: MolHandles, params: Record<string, number>): void {
    const eps = num(params['epsilon'], 1.0); // 1e-21 J
    const sig = num(params['sigma'], 0.34); // nm
    const r0 = sig * Math.pow(2, 1 / 6); // 平衡间距

    // 重新绘制 F-r 理论曲线采样点 (40 点)
    const cy = 1.35;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) {
        const rNorm = 0.88 + (i / 36) * 1.5; // r / r0
        const rVal = rNorm * sig;
        const F = ljForce(rVal, eps, sig);
        const chartX = 0.4 + (rNorm / 2.5) * 1.8;
        const chartY = cy - 0.45 + Math.max(-0.45, Math.min(0.5, F * 0.08));
        pts.push(new THREE.Vector3(chartX, chartY, 0));
    }
    h.curve.geometry.setFromPoints(pts);

    setLabel(
        h.label,
        `σ=${sig.toFixed(2)}nm  平衡位 r₀=${r0.toFixed(2)}nm | r < r₀ 斥力为主 | r = r₀ F=0 平衡 | r > r₀ 引力为主 (如铅柱对接)`,
        '#0f172a'
    );
}
