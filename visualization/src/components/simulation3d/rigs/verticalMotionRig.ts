/**
 * 竖直运动（自由落体/上抛）rig — 释放架 + 最高点标记 + 竖直高度标尺 + 地面缓冲垫
 * 统一释放高度 h₀、相对上升高度 Δh 与绝对最高点高度 H_max = h₀ + Δh
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createHeightRuler, updateHeightRuler, type HeightRulerHandles } from '../equipment/heightRuler';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.22;

export interface VerticalHandles {
    landingPad: THREE.Group;
    launcherBase: THREE.Group;
    releaseLabel: THREE.Sprite;
    apexMarker: THREE.Group;
    heightRuler: HeightRulerHandles;
    apexLabel: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

function resolveVerticalParams(params: Record<string, number>) {
    const h0 = Math.max(0, num(params['height'] ?? params['h0'], 20));
    const v0y = num(params['v0y'], 0);
    const g = Math.max(0.1, num(params['g'], 9.8));
    const deltaH = v0y > 0 ? (v0y * v0y) / (2 * g) : 0;
    const hMax = h0 + deltaH;
    const tUp = v0y > 0 ? v0y / g : 0;
    const visualH0 = BALL_RADIUS + h0 * WORLD_SCALE;
    const visualHMax = BALL_RADIUS + hMax * WORLD_SCALE;
    return { h0, v0y, g, deltaH, hMax, tUp, visualH0, visualHMax };
}

export const verticalMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const { h0, v0y, g, deltaH, hMax, visualH0, visualHMax } = resolveVerticalParams(params);

        // 1. 地面阻尼接料垫 (位于 y=0，落地时小球中心停在 BALL_RADIUS，底部贴合地面)
        const landingPad = new THREE.Group();
        const basePlate = makeBox(1.1, 0.04, 1.1, 0x1e293b, 0.6, 0.2);
        basePlate.position.set(0, 0.02, 0);
        landingPad.add(basePlate);
        const cushion = makeBox(0.92, 0.02, 0.92, 0x2563eb, 0.85, 0.05);
        cushion.position.set(0, 0.05, 0);
        landingPad.add(cushion);
        group.add(landingPad);

        // 2. 释放/发射位标记架 (位于真实初始高度 visualH0，开放式环臂不阻挡竖直下落)
        const launcherBase = new THREE.Group();
        const sideArm = makeBox(0.55, 0.05, 0.08, 0x475569, 0.4, 0.6);
        sideArm.position.set(-0.45, 0, 0);
        launcherBase.add(sideArm);
        const collar = makeCylinder(0.26, 0.08, 0x0f766e, 0.35, 0.65);
        collar.position.set(0, 0, -0.26);
        launcherBase.add(collar);
        const releasePts = [new THREE.Vector3(-1.0, 0, 0), new THREE.Vector3(1.0, 0, 0)];
        const releaseLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(releasePts),
            new THREE.LineDashedMaterial({ color: 0x0f766e, dashSize: 0.05, gapSize: 0.04 })
        );
        releaseLine.computeLineDistances();
        launcherBase.add(releaseLine);
        launcherBase.position.set(0, visualH0, 0);
        group.add(launcherBase);

        const releaseLabel = makeTextSprite(`释放高度 h₀ = ${h0.toFixed(1)} m`, '#0f766e', 24, { x: 1.05, y: 0.22 });
        releaseLabel.position.set(1.4, visualH0, 0);
        group.add(releaseLabel);

        // 3. 最高点 H_max 激光水平指示线
        const apexMarker = new THREE.Group();
        const pts = [new THREE.Vector3(-1.2, 0, 0), new THREE.Vector3(1.2, 0, 0)];
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineDashedMaterial({ color: 0xef4444, dashSize: 0.06, gapSize: 0.04 })
        );
        line.computeLineDistances();
        apexMarker.add(line);
        apexMarker.position.set(0, visualHMax, 0);
        group.add(apexMarker);

        const apexLabel = makeTextSprite(
            `最高点 H_max = ${hMax.toFixed(1)} m (Δh = +${deltaH.toFixed(1)} m)`,
            '#ef4444',
            24,
            { x: 1.25, y: 0.22 }
        );
        apexLabel.position.set(1.4, visualHMax, 0);
        group.add(apexLabel);

        // 4. 竖直高度标尺 (沿左侧测量)
        const { group: heightGroup, handles: heightRuler } = createHeightRuler();
        scene.add(heightGroup);

        // 5. 运动学标牌
        const infoLabel = makeTextSprite('', '#2563eb', 24, { x: 1.75, y: 0.22 });
        infoLabel.position.set(0, visualHMax + 0.65, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: VerticalHandles = {
            landingPad,
            launcherBase,
            releaseLabel,
            apexMarker,
            heightRuler,
            apexLabel,
            infoLabel
        };

        updateVertical(handles, h0, v0y, g);

        return { group, handles };
    },

    updateEquipment(handles, params) {
        const h = handles as VerticalHandles;
        const { h0, v0y, g } = resolveVerticalParams(params);
        updateVertical(h, h0, v0y, g);
    },

    getVisualPosition(pos, _params) {
        // 真实物理高度线性映射；仅在到达地面 (pos.y <= 0) 后停靠在接触平面 BALL_RADIUS
        const visualY = BALL_RADIUS + Math.max(0, pos.y) * WORLD_SCALE;
        return new THREE.Vector3(pos.x * WORLD_SCALE, visualY, 0);
    },

    getOrigin(params) {
        const { visualH0 } = resolveVerticalParams(params);
        return new THREE.Vector3(0, visualH0, 0);
    }
};

function updateVertical(h: VerticalHandles, h0: number, v0y: number, g: number): void {
    const deltaH = v0y > 0 && g > 0 ? (v0y * v0y) / (2 * g) : 0;
    const hMax = h0 + deltaH;
    const tUp = v0y > 0 && g > 0 ? v0y / g : 0;
    const visualH0 = BALL_RADIUS + h0 * WORLD_SCALE;
    const visualHMax = BALL_RADIUS + hMax * WORLD_SCALE;

    h.launcherBase.position.set(0, visualH0, 0);
    setLabel(h.releaseLabel, `释放高度 h₀ = ${h0.toFixed(1)} m`, '#0f766e');
    h.releaseLabel.position.set(1.4, v0y > 0 ? visualH0 : Math.max(0.22, visualH0 - 0.32), 0);

    h.apexMarker.position.set(0, visualHMax, 0);
    h.apexLabel.position.set(1.4, visualHMax, 0);
    if (v0y > 0) {
        setLabel(h.apexLabel, `最高点 H_max = ${hMax.toFixed(1)} m (Δh = +${deltaH.toFixed(1)} m)`, '#ef4444');
        setLabel(
            h.infoLabel,
            `h₀ = ${h0.toFixed(1)} m, v₀y = ${v0y.toFixed(1)} m/s → Δh = ${deltaH.toFixed(1)} m, H_max = ${hMax.toFixed(1)} m (t_上 = ${tUp.toFixed(2)}s)`,
            '#2563eb'
        );
    } else if (v0y === 0) {
        setLabel(h.apexLabel, `最高点 H_max = ${hMax.toFixed(1)} m (即释放高度 h₀)`, '#ef4444');
        setLabel(
            h.infoLabel,
            `自由落体: h₀ = ${h0.toFixed(1)} m, v₀y = 0.0 m/s, g = ${g.toFixed(1)} m/s² → H_max = ${hMax.toFixed(1)} m`,
            '#2563eb'
        );
    } else {
        setLabel(h.apexLabel, `最高点 H_max = ${hMax.toFixed(1)} m (即释放高度 h₀)`, '#ef4444');
        setLabel(
            h.infoLabel,
            `竖直下抛: h₀ = ${h0.toFixed(1)} m, v₀y = ${v0y.toFixed(1)} m/s, g = ${g.toFixed(1)} m/s² → H_max = ${hMax.toFixed(1)} m`,
            '#2563eb'
        );
    }
    h.infoLabel.position.set(0, visualHMax + 0.65, 0.2);

    const rulerText = v0y > 0 ? `h₀=${h0.toFixed(1)}m / H=${hMax.toFixed(1)}m` : `h₀ = ${h0.toFixed(1)} m`;
    updateHeightRuler(h.heightRuler, -0.45, 0.05, visualHMax, rulerText);
    if (v0y > 0 && visualHMax - visualH0 > 1e-4) {
        const releaseTick = makeBox(0.32, 0.016, 0.016, 0x0f766e, 0.5);
        releaseTick.position.set(-0.45, visualH0, 0.05);
        h.heightRuler.group.add(releaseTick);
    }
}
