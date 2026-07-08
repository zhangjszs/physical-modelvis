/**
 * 波动光学 rig — 干涉/衍射/水波衍射
 * 用于 interference、water-diffraction、sound-interference、
 * single-slit、diffraction-grating、thin-film
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const waveOpticsRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 双缝/单缝
        const slit = makeLine(
            [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.8, 0)],
            0x475569,
            0.8
        );
        scene.add(slit);

        // 干涉条纹（从缝向外扩散的波纹）
        for (let i = 1; i <= 4; i++) {
            const arcPoints = Array.from({ length: 32 }, (_, j) => {
                const a = -Math.PI / 3 + (j / 31) * (Math.PI * 2 / 3);
                return new THREE.Vector3(
                    Math.sin(a) * i * 0.4,
                    0.4 + Math.cos(a) * i * 0.4,
                    0
                );
            });
            const arc = makeLine(arcPoints, 0x3b82f6, 0.3 + i * 0.05);
            scene.add(arc);
        }

        const label = makeTextSprite('干涉图样', '#3b82f6', 24, { x: 0.7, y: 0.2 });
        label.position.set(0, 2.2, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.0, 0);
    }
};
