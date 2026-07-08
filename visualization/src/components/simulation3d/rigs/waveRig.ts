/**
 * 波动 rig — 波的传播（横波/纵波/声波/水波）
 * 用于 mechanical-wave、sound-waveform、doppler-effect
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const waveRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 正弦波形
        const wavePoints = Array.from({ length: 64 }, (_, i) => {
            const x = (i / 63) * 4 - 2;
            const y = Math.sin((i / 63) * Math.PI * 3) * 0.4;
            return new THREE.Vector3(x, 1.0 + y, 0);
        });
        const wave = makeLine(wavePoints, 0x3b82f6, 0.7);
        scene.add(wave);

        // 波传播方向箭头
        const arrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0.4, 0),
            0.4,
            0x2563eb,
            0.08,
            0.05
        );
        scene.add(arrow);

        const label = makeTextSprite('波速 v →', '#2563eb', 22, { x: 0.6, y: 0.18 });
        label.position.set(0, 0.2, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.0, 0);
    }
};
