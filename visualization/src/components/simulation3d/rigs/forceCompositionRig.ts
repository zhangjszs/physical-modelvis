/**
 * 力的合成 rig — 橡皮条 + 两个弹簧测力计互成角度拉
 * 验证平行四边形定则
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createSpringScale } from '../equipment/springScale';
import { makeCylinder } from '../primitives';

const WORLD_SCALE = 0.16;

export const forceCompositionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 结点 O
        const node = makeCylinder(0.06, 0.04, 0xdc2626, 0.3, 0.3);
        node.rotation.x = Math.PI / 2;
        node.position.set(0, 0, 0);
        scene.add(node);

        // 两个弹簧测力计（互成角度）
        const scale1 = createSpringScale();
        scale1.group.rotation.z = -Math.PI / 4;
        scale1.group.position.set(-0.5, 0.5, 0);
        scene.add(scale1.group);

        const scale2 = createSpringScale();
        scale2.group.rotation.z = -Math.PI + Math.PI / 4;
        scale2.group.position.set(0.5, 0.5, 0);
        scene.add(scale2.group);

        // 橡皮条（连线）
        const rubberBand = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.5, 0.5, 0),
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0.5, 0.5, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0x92400e, transparent: true, opacity: 0.5 })
        );
        scene.add(rubberBand);

        // 力的箭头
        const arrow1 = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 1, 0).normalize(),
            new THREE.Vector3(0, 0, 0),
            0.6,
            0xef4444,
            0.12,
            0.08
        );
        scene.add(arrow1);

        const arrow2 = new THREE.ArrowHelper(
            new THREE.Vector3(1, 1, 0).normalize(),
            new THREE.Vector3(0, 0, 0),
            0.6,
            0x3b82f6,
            0.12,
            0.08
        );
        scene.add(arrow2);

        const group = new THREE.Group();
        return {
            group,
            handles: { node, rubberBand, scaleGroups: [scale1.group, scale2.group], forceArrows: [arrow1, arrow2] }
        };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.5 - pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.5, 0);
    }
};
