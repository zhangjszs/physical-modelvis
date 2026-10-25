/**
 * 竖直运动（自由落体/上抛）rig — 释放架 + 最高点标记 + 竖直高度标尺 + 地面缓冲垫
 * 统一释放高度 h₀、相对上升高度 Δh 与绝对最高点高度 H_max = h₀ + Δh
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createHeightRuler, updateHeightRuler, type HeightRulerHandles } from '../equipment/heightRuler';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.22;
const PAD_DEPTH = 0.06;
const LABEL_FONT = '600 24px "Microsoft YaHei", "PingFang SC", sans-serif';
const LABEL_LINE_HEIGHT = 34;
const LABEL_PADDING = 12;
const LABEL_WORLD_PER_PIXEL = 0.0035;

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

/** 仅本 rig 自适应多行纹理；实际字宽决定画布宽度，世界尺寸保持字形比例。 */
function paintVerticalLabel(sprite: THREE.Sprite, lines: string[], color: string): void {
    const texture = sprite.material.map;
    const canvas = texture?.image;
    if (!texture || !(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = LABEL_FONT;
    let textWidth = 0;
    for (const line of lines) textWidth = Math.max(textWidth, ctx.measureText(line).width);
    const width = Math.ceil(textWidth) + 2 * LABEL_PADDING;
    const height = lines.length * LABEL_LINE_HEIGHT + 2 * LABEL_PADDING;
    const resized = canvas.width !== width || canvas.height !== height;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.font = LABEL_FONT;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, LABEL_PADDING + (index + 0.5) * LABEL_LINE_HEIGHT);
    });
    sprite.scale.set(width * LABEL_WORLD_PER_PIXEL, height * LABEL_WORLD_PER_PIXEL, 1);
    if (resized) {
        // 已上传纹理的尺寸不可原地改变；换贴图并释放旧 GPU 资源，避免画布已更新但画面仍是旧字。
        const replacement = new THREE.CanvasTexture(canvas);
        replacement.colorSpace = texture.colorSpace;
        sprite.material.map = replacement;
        texture.dispose();
    } else {
        texture.needsUpdate = true;
    }
}

export const verticalMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const { h0, v0y, g, visualH0, visualHMax } = resolveVerticalParams(params);

        // 1. 嵌入式接料垫：实际顶面为 y=0，与既定球底/轨迹/残影接触面一致。
        const landingPad = new THREE.Group();
        landingPad.position.y = -PAD_DEPTH;
        const basePlate = makeBox(1.1, 0.04, 1.1, 0x1e293b, 0.6, 0.2);
        basePlate.position.set(0, 0.02, 0);
        landingPad.add(basePlate);
        const cushion = makeBox(0.92, 0.02, 0.92, 0x2563eb, 0.85, 0.05);
        cushion.position.set(0, 0.05, 0);
        // 与地面共面但不改变接触几何；深度偏移避免表面闪烁。
        if (cushion.material instanceof THREE.MeshStandardMaterial) {
            cushion.material.polygonOffset = true;
            cushion.material.polygonOffsetFactor = -1;
            cushion.material.polygonOffsetUnits = -1;
        }
        landingPad.add(cushion);
        group.add(landingPad);

        // 2. 后置释放高度参考架：实体全部退到球道后方，不模拟夹持/碰撞。
        const launcherBase = new THREE.Group();
        const sideArm = makeBox(0.55, 0.05, 0.08, 0x475569, 0.4, 0.6);
        sideArm.position.set(-0.45, 0, -0.6);
        launcherBase.add(sideArm);
        const collar = makeCylinder(0.26, 0.08, 0x0f766e, 0.35, 0.65);
        collar.position.set(0, 0, -0.6);
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

        const releaseLabel = makeTextSprite('', '#0f766e', 24);
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

        const apexLabel = makeTextSprite('', '#ef4444', 24);
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
    // 释放点接近最高点时共用一张读数牌，避免两张牌在同一高度重叠。
    const separateRelease = visualHMax - visualH0 >= 0.65;
    h.releaseLabel.visible = separateRelease;
    paintVerticalLabel(h.releaseLabel, [`释放高度 h₀ = ${h0.toFixed(1)} m`], '#0f766e');
    h.releaseLabel.position.set(1.05, Math.max(0.18, visualH0 - 0.2), 0);

    h.apexMarker.position.set(0, visualHMax, 0);
    h.apexLabel.position.set(1.05, visualHMax + 0.06, 0);
    h.apexLabel.center.set(0.5, 1);
    const apexLines = [`最高点 H_max = ${hMax.toFixed(1)} m`, `相对上升 Δh = ${deltaH.toFixed(1)} m`];
    if (!separateRelease) apexLines.unshift(`释放高度 h₀ = ${h0.toFixed(1)} m`);
    paintVerticalLabel(h.apexLabel, apexLines, '#ef4444');
    const infoLines = [
        `h₀ = ${h0.toFixed(1)} m · v₀y = ${v0y.toFixed(1)} m/s`,
        `Δh = ${deltaH.toFixed(1)} m · H_max = ${hMax.toFixed(1)} m`,
        `g = ${g.toFixed(1)} m/s²${v0y > 0 ? ` · t_上 = ${tUp.toFixed(2)} s` : ''}`
    ];
    paintVerticalLabel(h.infoLabel, infoLines, '#2563eb');
    h.infoLabel.position.set(1.05, Math.max(0.95, visualHMax * 0.3), 0.2);

    const rulerText = v0y > 0 ? `h₀=${h0.toFixed(1)}m / H=${hMax.toFixed(1)}m` : `h₀ = ${h0.toFixed(1)} m`;
    updateHeightRuler(h.heightRuler, -0.45, 0.05, visualHMax, rulerText);
    paintVerticalLabel(
        h.heightRuler.label,
        v0y > 0 ? [`h₀ = ${h0.toFixed(1)} m`, `H = ${hMax.toFixed(1)} m`] : [`h₀ = ${h0.toFixed(1)} m`],
        '#0f766e'
    );
    if (v0y > 0 && visualHMax - visualH0 > 1e-4) {
        const releaseTick = makeBox(0.32, 0.016, 0.016, 0x0f766e, 0.5);
        releaseTick.position.set(-0.45, visualH0, 0.05);
        h.heightRuler.group.add(releaseTick);
    }
}
