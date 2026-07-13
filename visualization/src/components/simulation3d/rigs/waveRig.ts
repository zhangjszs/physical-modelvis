/**
 * 波动 rig — 波的传播（横波/纵波/声波/水波）
 * 用于 mechanical-wave、sound-waveform、doppler-effect
 * 参数响应：振幅 amplitude → 波形高低；波长 wavelength → 疏密；波模式 waveMode → 横波/干涉
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeLine, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const N = 64;
const BASE_Y = 1.0;

export const waveRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 正弦波形
        const wavePoints = Array.from({ length: N }, (_, i) => {
            const x = (i / (N - 1)) * 4 - 2;
            const y = Math.sin((i / (N - 1)) * Math.PI * 3) * 0.4;
            return new THREE.Vector3(x, BASE_Y + y, 0);
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

        return { group: new THREE.Group(), handles: { wave } };
    },

    updateEquipment(handles, params) {
        const wave = handles.wave as THREE.Line;
        const A = num(params.amplitude, 0.1);
        const lambda = num(params.wavelength, 1);
        const mode = Math.round(num(params.waveMode, 0));
        const pts = Array.from({ length: N }, (_, i) => {
            const x = (i / (N - 1)) * 4 - 2;
            if (mode === 2) {
                // 干涉：两列对向波叠加
                const y =
                    A * Math.sin((2 * Math.PI * (x + 2)) / lambda) + A * Math.sin((2 * Math.PI * (2 - x)) / lambda);
                return new THREE.Vector3(x, BASE_Y + y, 0);
            }
            // 横波 / 纵波示意：y = A·sin(kx)
            const y = A * Math.sin((2 * Math.PI * (x + 2)) / lambda);
            return new THREE.Vector3(x, BASE_Y + y, 0);
        });
        wave.geometry.setFromPoints(pts);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, BASE_Y + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, BASE_Y, 0);
    }
};
