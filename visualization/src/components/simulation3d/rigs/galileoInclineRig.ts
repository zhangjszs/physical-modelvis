/**
 * 伽利略理想斜面实验 rig — 对接斜面 + 等高基准线 + 水平面外推
 * 演示冲淡重力与惯性定律（如果不受阻力，小球将永远运动下去）
 *
 * 口径修正 (#159 逐节审计·问题一/问题二·阻断):
 *   旧实现**完全不消费引擎结果**: 斜面长度写死 INCLINE_SPAN=1.8 世界单位,
 *   配 WORLD_SCALE=0.16 → 画面上的斜面相当于 1.8/0.16 = 11.25 m,
 *   而引擎的斜面只有 2 m (差 5.6 倍); 小球位置用 `pos.x × WORLD_SCALE` 加
 *   一个**手写的三角函数高度剖面** —— 与引擎轨迹完全无关, 也到不了谷底。
 *   现在: 装置几何与小球位置都由引擎参数/轨迹推导, 斜面长度与倾角唯一决定
 *   一切 (单一真源)。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

/** 斜面在世界里的长度 (世界单位) */
const INCLINE_WORLD_LENGTH = 2.6;
const BALL_RADIUS = 0.16;
/** 斜面板厚度 */
const PLANE_THICKNESS = 0.08;

export interface GalileoHandles {
    leftIncline: THREE.Mesh;
    rightIncline: THREE.Mesh;
    horizontalPlane: THREE.Mesh;
    heightLine: THREE.Line;
    infoLabel: THREE.Sprite;
}

/** 演示模式 (与场景参数 0..3 一一对应) */
function modeIndex(params: Record<string, number>): number {
    return Math.round(num(params['mode'], 3));
}

/** 米 → 世界单位 */
function unitsPerMeter(params: Record<string, number>): number {
    const L = Math.max(0.1, num(params['inclineLength'], 2));
    return INCLINE_WORLD_LENGTH / L;
}

export const galileoInclineRig: SceneRig = {
    worldScale: 1,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    /**
     * 自定义取景 (#159 逐节审计·问题二):
     * 器材摆在 x≈0 (舞台中心在 x=3.6), 通用自动取景会把镜头对到舞台中心,
     * 斜面挤在画面一角; 这里显式对准装置本体。
     */
    framing(params) {
        const L = num(params['inclineLength'], 2);
        const k = unitsPerMeter(params);
        const rampLen = L * k;
        const target: [number, number, number] = [rampLen * 0.55, rampLen * 0.22, 0];
        const distance = Math.max(4.5, rampLen * 1.7);
        return {
            target,
            position: [target[0] + distance * 0.34, target[1] + distance * 0.3, distance * 0.9],
            distance
        };
    },

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        const angle = num(params['angleDeg'] ?? params['theta'], 30);
        const rad = (angle * Math.PI) / 180;
        const L = num(params['inclineLength'], 2);
        const k = unitsPerMeter(params);
        const rampLen = L * k; // 斜面世界长度
        const h0 = rampLen * Math.sin(rad); // 竖直落差 (世界单位)

        // 1. 左侧释放斜面 (自左上向右下, 小球下滑)
        const leftIncline = makeBox(rampLen, PLANE_THICKNESS, 0.35, 0x3b82f6, 0.3, 0.5);
        leftIncline.rotation.z = -rad;
        leftIncline.position.set(rampLen * 0.5 * Math.cos(rad), h0 * 0.5, 0);
        group.add(leftIncline);

        // 2. 右侧对接上升斜面 (mode=docked)
        const rightIncline = makeBox(rampLen, PLANE_THICKNESS, 0.35, 0x10b981, 0.3, 0.5);
        rightIncline.rotation.z = rad;
        rightIncline.position.set(rampLen * 1.5 * Math.cos(rad), h0 * 0.5, 0);
        rightIncline.visible = modeIndex(params) === 1;
        group.add(rightIncline);

        // 3. 谷底水平面 (对接斜面放平后的外推极限) —— 贴地薄条, 可见且不挡小球
        const horizontalPlane = makeBox(3.2, 0.03, 0.35, 0x7c3aed, 0.3, 0.5);
        horizontalPlane.position.set(rampLen * Math.cos(rad) + 1.6, 0.015, 0);
        horizontalPlane.visible = modeIndex(params) === 2 || modeIndex(params) === 3;
        group.add(horizontalPlane);

        // 4. 等高水平参考虚线
        const pts = [
            new THREE.Vector3(-rampLen * 0.2, h0, 0.18),
            new THREE.Vector3(rampLen * 2.2 * Math.cos(rad), h0, 0.18)
        ];
        const heightLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineDashedMaterial({ color: 0xd97706, dashSize: 0.06, gapSize: 0.04 })
        );
        heightLine.computeLineDistances();
        group.add(heightLine);

        // 5. 伽利略理想外推实验标牌
        const infoLabel = makeTextSprite('', '#0f172a', 34, { x: 1.9, y: 0.26 });
        infoLabel.position.set(rampLen * 0.6, h0 + 0.5, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: GalileoHandles = {
            leftIncline,
            rightIncline,
            horizontalPlane,
            heightLine,
            infoLabel
        };

        updateGalileo(handles, params);

        return { group, handles };
    },

    updateEquipment(handles, params) {
        updateGalileo(handles as GalileoHandles, params);
    },

    getVisualPosition(pos, params) {
        const angle = num(params['angleDeg'] ?? params['theta'], 30);
        const rad = (angle * Math.PI) / 180;
        const L = num(params['inclineLength'], 2);
        const k = unitsPerMeter(params);
        const rampLen = L * k;
        const h0 = rampLen * Math.sin(rad);
        // 引擎坐标: 原点在斜面顶端, x 向右, y 向下为正 → 世界 y 翻转
        const worldX = pos.x * k;
        const worldY = h0 - pos.y * k;
        // 球心必须**贴面**: 在斜面上沿法向抬起一个球半径, 在谷底水平面上竖直抬起
        const onIncline = pos.y < L * Math.sin(rad) - 1e-6;
        const nx = onIncline ? Math.sin(rad) : 0;
        const ny = onIncline ? Math.cos(rad) : 1;
        return new THREE.Vector3(worldX + nx * BALL_RADIUS, worldY + ny * BALL_RADIUS, 0);
    },

    getOrigin(params) {
        const angle = num(params['angleDeg'] ?? params['theta'], 30);
        const rad = (angle * Math.PI) / 180;
        const L = num(params['inclineLength'], 2);
        const k = unitsPerMeter(params);
        const rampLen = L * k;
        return new THREE.Vector3(0, rampLen * Math.sin(rad) + BALL_RADIUS, 0);
    }
};

function updateGalileo(h: GalileoHandles, params: Record<string, number>): void {
    const angle = num(params['angleDeg'] ?? params['theta'], 30);
    const rad = (angle * Math.PI) / 180;
    const L = num(params['inclineLength'], 2);
    const mode = modeIndex(params);
    const k = unitsPerMeter(params);
    const rampLen = L * k;
    const h0 = rampLen * Math.sin(rad);

    h.leftIncline.rotation.z = -rad;
    h.leftIncline.position.set(rampLen * 0.5 * Math.cos(rad), h0 * 0.5, 0);
    h.rightIncline.rotation.z = rad;
    h.rightIncline.position.set(rampLen * 1.5 * Math.cos(rad), h0 * 0.5, 0);
    h.rightIncline.visible = mode === 1;
    h.horizontalPlane.visible = mode === 2 || mode === 3;

    const pts = [
        new THREE.Vector3(-rampLen * 0.2, h0, 0.18),
        new THREE.Vector3(rampLen * 2.2 * Math.cos(rad), h0, 0.18)
    ];
    h.heightLine.geometry.dispose();
    h.heightLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    h.heightLine.computeLineDistances();

    const modeText = ['单斜面', '对接斜面', '水平面外推', '连续演示'][mode] ?? '连续演示';
    setLabel(h.infoLabel, `θ = ${angle.toFixed(0)}° | L = ${L.toFixed(1)} m | ${modeText}`, '#0f172a');
}
