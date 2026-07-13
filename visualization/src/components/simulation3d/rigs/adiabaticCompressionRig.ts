/**
 * 绝热压缩 rig — 活塞快速压缩气体升温（无热交换）
 * 绝热气缸(深色壁) + 活塞(下压) + 气体(压缩后变红)
 * 用于 adiabatic-compression
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface AdHandles {
    piston: THREE.Mesh;
    gas: THREE.Mesh;
    label: THREE.Sprite;
}

export const adiabaticCompressionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 绝热气缸（深色壁）
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 2.0, 32, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x334155, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        );
        wall.position.set(0, 1.0, 0);
        group.add(wall);
        const piston = makeCylinder(0.46, 0.1, 0x475569, 0.9, 0.9);
        group.add(piston);
        const gas = new THREE.Mesh(
            new THREE.CylinderGeometry(0.46, 0.46, 1.0, 32),
            new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 })
        );
        group.add(gas);
        const label = makeTextSprite('绝热压缩', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(1.3, 1.9, 0);
        group.add(label);
        scene.add(group);
        const handles: AdHandles = { piston, gas, label };
        updateAd(handles, params);
        return { group, handles: { piston, gas, label } };
    },

    updateEquipment(handles, params) {
        updateAd(handles as unknown as AdHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateAd(h: AdHandles, params: Record<string, number>): void {
    const T0 = num(params['initialTemp'], 300);
    const ratio = Math.max(1, num(params['compressionRatio'], 5));
    const T2 = T0 * Math.pow(ratio, 0.4); // γ≈1.4 → ^0.4
    const hMax = 1.8;
    const hGas = Math.max(0.05, hMax / ratio);
    h.gas.scale.y = hGas / 1.0;
    h.gas.position.set(0, 0.1 + hGas / 2, 0);
    h.piston.position.set(0, 0.1 + hGas, 0);
    const t = Math.max(0, Math.min(1, (T2 - 200) / 600));
    const c = new THREE.Color();
    c.setHSL((1 - t) * 0.62, 0.7, 0.55);
    (h.gas.material as THREE.MeshStandardMaterial).color.copy(c);
    setLabel(h.label, `T₁=${T0.toFixed(0)}K → T₂=${T2.toFixed(0)}K (r=${ratio.toFixed(1)})`);
}
