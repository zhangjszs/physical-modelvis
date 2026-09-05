/**
 * 斜面滑块 rig — 可调角度实验斜面 + 角度刻度盘 + 底部缓冲挡块
 * 用于 inclined-plane
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createInclinedPlane, updateInclinedPlane, InclinedPlaneHandles } from '../equipment/inclinedPlane';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const PLANE_LEN = 3.2;

interface InclineRigHandles {
    planeHandles: InclinedPlaneHandles;
    stopper: THREE.Mesh;
    infoLabel: THREE.Sprite;
}

export const inclineRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const theta = num(params['theta'] ?? params['angle'], 30);

        // 1. 可调角度斜面装置
        const { group: planeGroup, handles: planeHandles } = createInclinedPlane(theta);
        planeGroup.position.set(0, 0, 0);
        scene.add(planeGroup);

        // 2. 底部缓冲挡板
        const stopper = makeBox(0.06, 0.16, 0.4, 0xdc2626, 0.4, 0.3);
        stopper.position.set(0, 0.08, 0);
        scene.add(stopper);

        // 3. 角度与加速度标牌
        const mu = num(params['mu'] ?? params['friction'], 0.1);
        const a = 9.8 * (Math.sin((theta * Math.PI) / 180) - mu * Math.cos((theta * Math.PI) / 180));
        const infoLabel = makeTextSprite(
            `θ = ${theta.toFixed(1)}°, μ = ${mu.toFixed(2)} → a = ${Math.max(0, a).toFixed(2)} m/s²`,
            '#2563eb',
            24,
            { x: 1.4, y: 0.22 }
        );
        infoLabel.position.set(0, 1.8, 0.35);
        scene.add(infoLabel);

        const group = new THREE.Group();
        return {
            group,
            handles: { planeHandles, stopper, infoLabel }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as InclineRigHandles;
        const theta = num(params['theta'] ?? params['angle'], 30);
        const mu = num(params['mu'] ?? params['friction'], 0.1);
        updateInclinedPlane(h.planeHandles, theta);

        const a = 9.8 * (Math.sin((theta * Math.PI) / 180) - mu * Math.cos((theta * Math.PI) / 180));
        setLabel(
            h.infoLabel,
            `θ = ${theta.toFixed(1)}°, μ = ${mu.toFixed(2)} → a = ${Math.max(0, a).toFixed(2)} m/s²`,
            '#2563eb'
        );
    },

    getVisualPosition(pos, params) {
        const theta = num(params['theta'] ?? params['angle'], 30);
        const rad = (theta * Math.PI) / 180;
        const topH = Math.sin(rad) * PLANE_LEN * 0.5;
        const halfSpan = Math.cos(rad) * PLANE_LEN * 0.5;

        // 起点位于斜面顶端, 沿斜面向下运动
        const startX = -halfSpan;
        const startY = topH + BALL_RADIUS;

        const disp = pos.x * WORLD_SCALE;
        const currX = startX + disp * Math.cos(rad);
        const currY = Math.max(BALL_RADIUS, startY - disp * Math.sin(rad));

        return new THREE.Vector3(currX, currY, 0);
    },

    getOrigin(params) {
        const theta = num(params['theta'] ?? params['angle'], 30);
        const rad = (theta * Math.PI) / 180;
        const topH = Math.sin(rad) * PLANE_LEN * 0.5;
        const halfSpan = Math.cos(rad) * PLANE_LEN * 0.5;
        return new THREE.Vector3(-halfSpan, topH + BALL_RADIUS, 0);
    }
};
