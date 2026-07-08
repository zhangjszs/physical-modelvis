/**
 * 运动合成与分解 rig — 红蜡块在玻璃管中上升 + 管水平移动
 * 用于 motion-composition（合运动 = 分运动合成）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const motionCompositionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 玻璃管（竖直）
        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 2.0, 16, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            })
        );
        tube.position.set(0, 1.0, 0);
        scene.add(tube);

        // 红蜡块
        const wax = makeCylinder(0.05, 0.08, 0xdc2626, 0.3, 0.3);
        wax.position.set(0, 0.5, 0);
        scene.add(wax);

        // 合运动方向箭头
        const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 1, 0).normalize(),
            new THREE.Vector3(0, 0.5, 0),
            0.8,
            0x2563eb,
            0.15,
            0.1
        );
        scene.add(arrow);

        const label = makeTextSprite('合运动', '#2563eb', 24, { x: 0.5, y: 0.18 });
        label.position.set(0.8, 1.8, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0, 0);
    }
};
