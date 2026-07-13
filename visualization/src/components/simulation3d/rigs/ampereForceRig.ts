/**
 * 安培力 / 电流磁场 rig — 蹄形磁铁 + 通电导线
 * 用于 ampere-force、current-magnetic、em-induction 等
 *
 * 参数响应：
 * - B / I / L / angle：安培力 F = B·I·L·sinθ
 *   → 安培力箭头长度 ∝ F（方向随正负翻转）；电流箭头长度 ∝ I
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

export const ampereForceRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 蹄形磁铁（N 极）
        const nPole = makeBox(0.15, 0.8, 0.3, 0xdc2626, 0.3, 0.2);
        nPole.position.set(-0.3, 1.0, 0);
        scene.add(nPole);

        // S 极
        const sPole = makeBox(0.15, 0.8, 0.3, 0x3b82f6, 0.3, 0.2);
        sPole.position.set(0.3, 1.0, 0);
        scene.add(sPole);

        // 磁铁底部连接
        const magnetBase = makeBox(0.6, 0.12, 0.3, 0x475569, 0.4, 0.2);
        magnetBase.position.set(0, 0.55, 0);
        scene.add(magnetBase);

        // 通电导线（水平，在两极间）
        const wire = makeCylinder(0.015, 0.5, 0xf59e0b, 0.3, 0.3);
        wire.rotation.z = Math.PI / 2;
        wire.position.set(0, 1.0, 0);
        scene.add(wire);

        // 电流方向箭头
        const currentArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-0.4, 1.0, 0),
            0.2,
            0x16a34a,
            0.05,
            0.03
        );
        scene.add(currentArrow);

        // 安培力方向箭头
        const forceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 1.0, 0),
            0.3,
            0xef4444,
            0.06,
            0.04
        );
        scene.add(forceArrow);

        const labelN = makeTextSprite('N', '#dc2626', 22, { x: 0.25, y: 0.16 });
        labelN.position.set(-0.3, 1.5, 0);
        scene.add(labelN);

        const labelS = makeTextSprite('S', '#3b82f6', 22, { x: 0.25, y: 0.16 });
        labelS.position.set(0.3, 1.5, 0);
        scene.add(labelS);

        return { group: new THREE.Group(), handles: { forceArrow, currentArrow } };
    },

    updateEquipment(handles, params) {
        const forceArrow = handles.forceArrow as THREE.ArrowHelper;
        const currentArrow = handles.currentArrow as THREE.ArrowHelper;
        const B = num(params['B'], NaN);
        const I = num(params['I'], NaN);
        const L = num(params['L'], NaN);
        const angle = num(params['angle'], NaN);
        if (Number.isNaN(B) || Number.isNaN(I) || Number.isNaN(L) || Number.isNaN(angle)) return;

        const F = B * I * L * Math.sin((angle * Math.PI) / 180);
        // 基准 F≈0.1（B=0.5,I=2,L=0.2,θ=30°）→ 长度 0.3
        const len = THREE.MathUtils.clamp((Math.abs(F) / 0.1) * 0.3, 0.05, 1.2);
        forceArrow.setLength(len, len * 0.22, len * 0.14);
        if (F < 0) forceArrow.setDirection(new THREE.Vector3(0, -1, 0));
        else forceArrow.setDirection(new THREE.Vector3(0, 1, 0));

        // 电流箭头长度随 I 变化
        const iLen = THREE.MathUtils.clamp(0.1 + I * 0.04, 0.1, 0.8);
        currentArrow.setLength(iLen, 0.05, 0.03);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.0, 0);
    }
};
