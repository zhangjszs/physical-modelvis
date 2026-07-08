/**
 * 电场/磁场 rig — 匀强场区域 + 带电粒子运动
 * 用于 electric-field、magnetic-field、em-combined、efield-lines
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const fieldRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 场区域（半透明长方体）
        const region = new THREE.Mesh(
            new THREE.BoxGeometry(3, 2, 1.5),
            new THREE.MeshBasicMaterial({
                color: 0x3b82f6,
                transparent: true,
                opacity: 0.05,
                side: THREE.DoubleSide
            })
        );
        region.position.set(0, 1.5, 0);
        scene.add(region);

        // 场方向箭头（表示 E/B 场）
        const fieldArrows: THREE.ArrowHelper[] = [];
        for (let i = 0; i < 5; i++) {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(-1.2 + i * 0.6, 1.5, 0),
                0.3,
                0x3b82f6,
                0.08,
                0.05
            );
            scene.add(arrow);
            fieldArrows.push(arrow);
        }

        const label = makeTextSprite('匀强电场 E', '#3b82f6', 24, { x: 0.8, y: 0.2 });
        label.position.set(0, 2.7, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: { fieldArrows, region } };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.5, 0);
    }
};
