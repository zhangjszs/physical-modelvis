/**
 * 牛顿第三定律 rig — 两个弹簧测力计对拉
 * 演示作用力与反作用力大小相等、方向相反
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createSpringScale } from '../equipment/springScale';
import { makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const newtonThirdLawRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 测力计 A（左侧，水平向右）
        const { group: scaleA } = createSpringScale();
        scaleA.rotation.z = -Math.PI / 2;
        scaleA.position.set(-0.6, 0, 0);
        scene.add(scaleA);

        // 测力计 B（右侧，水平向左）
        const { group: scaleB } = createSpringScale();
        scaleB.rotation.z = Math.PI / 2;
        scaleB.position.set(0.6, 0, 0);
        scene.add(scaleB);

        // 连接细绳
        const connector = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 1.0, 8),
            new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
        );
        connector.rotation.z = Math.PI / 2;
        connector.position.set(0, 0, 0);
        scene.add(connector);

        // 标签
        const labelA = makeTextSprite('A', '#2563eb', 28, { x: 0.3, y: 0.2 });
        labelA.position.set(-0.6, 0.5, 0);
        scene.add(labelA);

        const labelB = makeTextSprite('B', '#dc2626', 28, { x: 0.3, y: 0.2 });
        labelB.position.set(0.6, 0.5, 0);
        scene.add(labelB);

        const faLabel = makeTextSprite('F_A = F_B', '#0f766e', 24, { x: 0.8, y: 0.2 });
        faLabel.position.set(0, -0.4, 0);
        scene.add(faLabel);

        const group = new THREE.Group();
        return { group, handles: { scaleA, scaleB, connector } };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.3, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.3, 0);
    }
};
