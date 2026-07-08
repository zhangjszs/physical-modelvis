/**
 * 微小形变 rig — 桌面 + 双平面镜光杠杆 + 激光笔
 * 演示光杠杆放大法观察桌面微小形变
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const microDeformationRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 桌面
        const table = makeBox(2.0, 0.08, 1.2, 0x78716c, 0.6, 0.05);
        table.position.set(0, 0.4, 0);
        scene.add(table);

        // 桌腿
        const legPositions: [number, number][] = [[-0.9, 0.5], [0.9, 0.5], [-0.9, -0.5], [0.9, -0.5]];
        for (const [x, z] of legPositions) {
            const leg = makeBox(0.06, 0.4, 0.06, 0x57534e, 0.6);
            leg.position.set(x, 0.2, z);
            scene.add(leg);
        }

        // 平面镜 M1（置于桌面）
        const mirror1 = makeBox(0.3, 0.02, 0.01, 0xbfdbfe, 0.1, 0.5);
        mirror1.position.set(-0.5, 0.45, 0.3);
        mirror1.rotation.y = 0.2;
        scene.add(mirror1);

        // 平面镜 M2（远处）
        const mirror2 = makeBox(0.3, 0.02, 0.01, 0xbfdbfe, 0.1, 0.5);
        mirror2.position.set(0.8, 0.45, 0.3);
        mirror2.rotation.y = -0.2;
        scene.add(mirror2);

        // 激光束路径
        const laserBeam = makeLine(
            [
                new THREE.Vector3(-1.2, 0.5, 0.3),
                new THREE.Vector3(-0.5, 0.45, 0.3),
                new THREE.Vector3(0.8, 0.45, 0.3),
                new THREE.Vector3(1.5, 0.4, 0.3)
            ],
            0xef4444,
            0.6
        );
        scene.add(laserBeam);

        // 激光笔
        const laser = makeCylinder(0.02, 0.12, 0x334155, 0.3, 0.3);
        laser.rotation.z = Math.PI / 2;
        laser.position.set(-1.2, 0.5, 0.3);
        scene.add(laser);

        // 标签
        const label = makeTextSprite('光杠杆放大', '#92400e', 24, { x: 0.8, y: 0.2 });
        label.position.set(0.2, 0.7, 0);
        scene.add(label);

        const group = new THREE.Group();
        return { group, handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.5, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.5, 0);
    }
};
