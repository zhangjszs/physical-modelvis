/**
 * 电阻应变片 (惠斯通电桥) rig — 悬臂梁 + 箔式应变片 + 配重 + 电桥输出指示
 * 用于 strain-gauge
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeSphere, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

type StrainHandles = {
    pivot: THREE.Group;
    foil: THREE.Mesh;
    led: THREE.Mesh;
};

export const strainGaugeRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        const base = makeBox(2.4, 0.06, 1.0, 0xe2e8f0, 0.8, 0);
        base.position.set(0, 0.03, 0);
        group.add(base);

        // 固定端夹块
        const clamp = makeBox(0.2, 0.5, 0.8, 0x475569, 0.4, 0.5);
        clamp.position.set(-1.0, 0.3, 0);
        group.add(clamp);

        // 悬臂梁（绕夹紧端为支点弯曲）
        const pivot = new THREE.Group();
        pivot.position.set(-1.0, 0.5, 0);
        group.add(pivot);

        const beam = makeBox(1.8, 0.08, 0.5, 0x94a3b8, 0.5, 0.2);
        beam.position.set(0.9, 0, 0);
        pivot.add(beam);

        // 箔式应变片（贴于梁上表面近夹端）
        const foil = makeBox(0.4, 0.02, 0.3, 0xf59e0b, 0.3, 0.6);
        foil.position.set(0.3, 0.05, 0);
        pivot.add(foil);

        // 自由端配重
        const weight = makeBox(0.3, 0.3, 0.3, 0x334155, 0.4, 0.3);
        weight.position.set(1.8, 0.19, 0);
        pivot.add(weight);

        // 电桥输出指示
        const indicator = makeBox(0.3, 0.25, 0.25, 0x1e293b, 0.4, 0.3);
        indicator.position.set(0.0, 0.2, 0.6);
        group.add(indicator);

        const led = makeSphere(0.07, 0x22c55e, { emissive: 0x16a34a, emissiveIntensity: 0.3 });
        led.position.set(0.0, 0.42, 0.6);
        group.add(led);

        const label = makeTextSprite('电阻应变片', '#b45309', 24, { x: 0.7, y: 0.2 });
        label.position.set(-0.2, 0.95, 0);
        group.add(label);

        scene.add(group);
        const handles: StrainHandles = { pivot, foil, led };
        applyStrain(handles, num(params['strain'], 1000), num(params['bridgeVoltage'], 5));
        return { group, handles };
    },

    updateEquipment(handles, params) {
        applyStrain(handles as unknown as StrainHandles, num(params['strain'], 1000), num(params['bridgeVoltage'], 5));
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.5, 0);
    }
};

function applyStrain(h: StrainHandles, strain: number, U: number): void {
    // 应变 με (-5000..5000) → 悬臂梁自由端下垂/上翘
    const t = Math.min(1, Math.max(-1, strain / 5000));
    h.pivot.rotation.z = -Math.atan2(t * 0.4, 1.8);
    const fmat = h.foil.material as THREE.MeshStandardMaterial;
    fmat.emissive.setHSL(0.13, 0.85, 0.05 + Math.abs(t) * 0.3);
    fmat.emissiveIntensity = 0.1 + Math.abs(t) * 0.6;
    const lmat = h.led.material as THREE.MeshStandardMaterial;
    lmat.emissiveIntensity = 0.15 + Math.min(1.5, Math.abs(t) * (U / 5) * 1.2);
}
