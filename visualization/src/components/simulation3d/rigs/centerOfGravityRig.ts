/**
 * 重心 rig — 不规则薄板 + 重垂线（悬挂法）
 * 两次悬挂确定重心位置
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const centerOfGravityRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 不规则薄板（梯形近似）
        const plate = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.3, 0.04, 6),
            new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide })
        );
        plate.rotation.x = Math.PI / 2;
        plate.position.set(0, 1.5, 0);
        scene.add(plate);

        // 悬挂点
        const pivot = makeCylinder(0.03, 0.03, 0x475569, 0.4, 0.3);
        pivot.rotation.x = Math.PI / 2;
        pivot.position.set(0.4, 1.8, 0);
        scene.add(pivot);

        // 重垂线
        const plumbLine = makeLine([new THREE.Vector3(0.4, 1.8, 0), new THREE.Vector3(0.4, 0.8, 0)], 0xdc2626, 0.7);
        scene.add(plumbLine);

        // 垂锤
        const weight = makeCylinder(0.05, 0.08, 0x334155, 0.3, 0.3);
        weight.position.set(0.4, 0.75, 0);
        scene.add(weight);

        // 标签
        const label = makeTextSprite('重心', '#dc2626', 24, { x: 0.4, y: 0.18 });
        label.position.set(0, 0.5, 0);
        scene.add(label);

        const group = new THREE.Group();
        return { group, handles: { plate, plumbLine, pivot } };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.5 - pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.5, 0);
    }
};
