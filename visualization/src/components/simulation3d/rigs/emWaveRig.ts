/**
 * 电磁波 rig — 发射天线 + 接收天线 + 电磁波传播
 * 用于 em-wave-communication、em-wave-hertz
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const emWaveRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 发射天线（左）
        const txAntenna = makeCylinder(0.02, 1.0, 0x475569, 0.4, 0.3);
        txAntenna.position.set(-1.5, 1.0, 0);
        scene.add(txAntenna);

        // 接收天线（右）
        const rxAntenna = makeCylinder(0.02, 1.0, 0x475569, 0.4, 0.3);
        rxAntenna.position.set(1.5, 1.0, 0);
        scene.add(rxAntenna);

        // 电磁波（正弦波示意）
        const wavePoints = Array.from({ length: 48 }, (_, i) => {
            const x = -1.2 + (i / 47) * 2.4;
            const y = 1.0 + Math.sin((i / 47) * Math.PI * 4) * 0.3;
            return new THREE.Vector3(x, y, 0);
        });
        const wave = makeLine(wavePoints, 0x3b82f6, 0.6);
        scene.add(wave);

        // 标签
        const txLabel = makeTextSprite('发射', '#475569', 22, { x: 0.4, y: 0.16 });
        txLabel.position.set(-1.5, 1.65, 0);
        scene.add(txLabel);

        const rxLabel = makeTextSprite('接收', '#475569', 22, { x: 0.4, y: 0.16 });
        rxLabel.position.set(1.5, 1.65, 0);
        scene.add(rxLabel);

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
