/**
 * 伽利略理想斜面实验 rig — 对接双斜面 + 等高基准线 + 角度外推
 * 演示冲淡重力与惯性定律（如果不受阻力，小球将永远运动下去）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const INCLINE_SPAN = 1.8;

interface GalileoHandles {
    leftIncline: THREE.Mesh;
    rightIncline: THREE.Mesh;
    heightLine: THREE.Line;
    infoLabel: THREE.Sprite;
}

export const galileoInclineRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        const angle = num(params['angleDeg'] ?? params['theta'], 30);
        const rad = (angle * Math.PI) / 180;
        const h0 = Math.sin(rad) * INCLINE_SPAN;

        // 1. 左侧释放斜面 (固定角度，供小球加速下滑)
        const leftIncline = makeBox(INCLINE_SPAN, 0.05, 0.35, 0x3b82f6, 0.3, 0.5);
        leftIncline.rotation.z = -rad;
        leftIncline.position.set(-INCLINE_SPAN * 0.5 * Math.cos(rad), h0 * 0.5, 0);
        group.add(leftIncline);

        // 2. 右侧对接上升斜面 (随演示模式可调角度)
        const rightIncline = makeBox(INCLINE_SPAN, 0.05, 0.35, 0x10b981, 0.3, 0.5);
        rightIncline.rotation.z = rad;
        rightIncline.position.set(INCLINE_SPAN * 0.5 * Math.cos(rad), h0 * 0.5, 0);
        group.add(rightIncline);

        // 3. 等高水平参考虚线
        const pts = [new THREE.Vector3(-INCLINE_SPAN * 1.2, h0, 0.18), new THREE.Vector3(INCLINE_SPAN * 1.2, h0, 0.18)];
        const heightLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineDashedMaterial({ color: 0xd97706, dashSize: 0.06, gapSize: 0.04 })
        );
        heightLine.computeLineDistances();
        group.add(heightLine);

        // 4. 伽利略理想外推实验标牌
        const infoLabel = makeTextSprite('伽利略理想斜面：上升等高原理', '#0f172a', 24, { x: 1.3, y: 0.22 });
        infoLabel.position.set(0, h0 + 0.45, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: GalileoHandles = {
            leftIncline,
            rightIncline,
            heightLine,
            infoLabel
        };

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as GalileoHandles;
        const angle = num(params['angleDeg'] ?? params['theta'], 30);
        const rad = (angle * Math.PI) / 180;
        const h0 = Math.sin(rad) * INCLINE_SPAN;

        h.leftIncline.rotation.z = -rad;
        h.leftIncline.position.set(-INCLINE_SPAN * 0.5 * Math.cos(rad), h0 * 0.5, 0);

        h.rightIncline.rotation.z = rad;
        h.rightIncline.position.set(INCLINE_SPAN * 0.5 * Math.cos(rad), h0 * 0.5, 0);

        const pts = [new THREE.Vector3(-INCLINE_SPAN * 1.2, h0, 0.18), new THREE.Vector3(INCLINE_SPAN * 1.2, h0, 0.18)];
        h.heightLine.geometry.dispose();
        h.heightLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
        h.heightLine.computeLineDistances();

        setLabel(h.infoLabel, `θ = ${angle.toFixed(0)}° | 伽利略等高理想外推`, '#0f172a');
    },

    getVisualPosition(pos, params) {
        const angle = num(params['angleDeg'] ?? params['theta'], 30);
        const rad = (angle * Math.PI) / 180;
        const spanX = Math.cos(rad) * INCLINE_SPAN;
        const h0 = Math.sin(rad) * INCLINE_SPAN;

        // pos.x 映射为对称双斜面往返/下滑
        const xWorld = -spanX + pos.x * WORLD_SCALE;
        let yWorld = BALL_RADIUS;

        if (xWorld < 0) {
            yWorld = BALL_RADIUS + (-xWorld / spanX) * h0;
        } else {
            yWorld = BALL_RADIUS + (xWorld / spanX) * h0;
        }

        return new THREE.Vector3(xWorld, Math.max(BALL_RADIUS, yWorld), 0);
    },

    getOrigin(params) {
        const angle = num(params['angleDeg'] ?? params['theta'], 30);
        const rad = (angle * Math.PI) / 180;
        const spanX = Math.cos(rad) * INCLINE_SPAN;
        const h0 = Math.sin(rad) * INCLINE_SPAN;
        return new THREE.Vector3(-spanX, h0 + BALL_RADIUS, 0);
    }
};
