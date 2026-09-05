/**
 * 光电效应实验 rig — 真空光电管 + 单色光源 + 滤光片 + 爱因斯坦光电方程标牌
 * 验证爱因斯坦光电方程 E_k = hν - W₀ 与截止电压 e·U_c = E_k
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createPhototube, PhototubeHandles } from '../equipment/phototube';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const CENTER_Y = 1.3;
const H_PLANCK_EV = 4.135667e-15; // eV·s

interface PhotoHandles {
    tubeHandles: PhototubeHandles;
}

export const photoelectricRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const { group, handles: tubeHandles } = createPhototube(CENTER_Y);
        scene.add(group);

        const W0 = num(params['W0'], 2.3);
        const nuMin = num(params['nuMin'], 300);
        // nuMin 是 THz = 1e12 Hz
        const hNuEv = H_PLANCK_EV * (nuMin * 1e12);
        const Ek = Math.max(0, hNuEv - W0);
        const nu0THz = (W0 / H_PLANCK_EV) * 1e-12;

        setLabel(
            tubeHandles.readoutLabel,
            `W₀=${W0.toFixed(2)}eV (极限频率 ν₀=${nu0THz.toFixed(0)}THz) | E_k = hν - W₀ = ${Ek.toFixed(2)} eV`,
            '#2563eb'
        );

        return {
            group,
            handles: { tubeHandles }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as PhotoHandles;
        const W0 = num(params['W0'], 2.3);
        const nuMin = num(params['nuMin'], 300);
        const hNuEv = H_PLANCK_EV * (nuMin * 1e12);
        const Ek = Math.max(0, hNuEv - W0);
        const nu0THz = (W0 / H_PLANCK_EV) * 1e-12;

        setLabel(
            h.tubeHandles.readoutLabel,
            `W₀=${W0.toFixed(2)}eV (极限频率 ν₀=${nu0THz.toFixed(0)}THz) | E_k = hν - W₀ = ${Ek.toFixed(2)} eV`,
            '#2563eb'
        );
    },

    getVisualPosition(pos, _params) {
        // 光电子在光电管阴极至阳极间飞渡
        return new THREE.Vector3(0.18 - pos.x * WORLD_SCALE * 0.4, CENTER_Y + pos.y * WORLD_SCALE * 0.2, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.18, CENTER_Y, 0);
    }
};
