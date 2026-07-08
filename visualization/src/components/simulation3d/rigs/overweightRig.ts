/**
 * 超重失重 rig — 电梯中弹簧测力计 + 钩码
 * 演示加速上升（超重）/ 加速下降（失重）时示数变化
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createSpringScale } from '../equipment/springScale';
import { createWeight } from '../equipment/weight';
import { makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const overweightRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 电梯厢（线框）
        const elevator = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 2.0, 1.0),
            new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true, transparent: true, opacity: 0.3 })
        );
        elevator.position.set(0, 1.0, -0.5);
        scene.add(elevator);

        // 铁架台（电梯内）
        const { group: standGroup } = createIronStand(1.8);
        standGroup.position.set(0, 0, 0);
        scene.add(standGroup);

        // 弹簧测力计（悬挂）
        const { group: scaleGroup } = createSpringScale();
        scaleGroup.position.set(0, 1.8, 0);
        scene.add(scaleGroup);

        // 钩码
        const { group: weightGroup } = createWeight(0.05, 0x64748b);
        weightGroup.position.set(0, 1.3, 0);
        scene.add(weightGroup);

        // 状态标签
        const label = makeTextSprite('静止', '#2563eb', 28, { x: 0.6, y: 0.22 });
        label.position.set(0.9, 2.0, 0);
        scene.add(label);

        const group = new THREE.Group();
        return { group, handles: { elevator, scaleGroup, weightGroup } };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(0.5, 1.5 - pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.5, 1.5, 0);
    }
};
