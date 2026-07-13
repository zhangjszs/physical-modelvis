/**
 * 热敏电阻 (NTC) rig — 热敏电阻珠 + 加热线圈 + 温度计 + 测量电路
 * 用于 thermistor (R-T 特性演示)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

type ThermistorHandles = {
    bead: THREE.Mesh;
    coil: THREE.Mesh;
};

export const thermistorRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        const base = makeBox(2.2, 0.06, 1.2, 0xe2e8f0, 0.8, 0);
        base.position.set(0, 0.03, 0);
        group.add(base);

        // NTC 半导体瓷珠（核心敏感元件）
        const bead = makeSphere(0.12, 0xf87171, { emissive: 0x7f1d1d, emissiveIntensity: 0.2 });
        bead.position.set(-0.2, 0.55, 0);
        group.add(bead);

        // 两根引脚
        const leadL = makeCylinder(0.015, 0.5, 0x94a3b8, 0.6, 0.4);
        leadL.rotation.z = Math.PI / 2.2;
        leadL.position.set(-0.45, 0.3, 0);
        group.add(leadL);

        const leadR = makeCylinder(0.015, 0.5, 0x94a3b8, 0.6, 0.4);
        leadR.rotation.z = -Math.PI / 2.2;
        leadR.position.set(0.05, 0.3, 0);
        group.add(leadR);

        // 加热线圈（温度变化的来源）
        const coil = makeCylinder(0.18, 0.14, 0xfb923c, 0.3, 0.5);
        coil.position.set(0.6, 0.55, 0);
        group.add(coil);

        const coilLabel = makeTextSprite('加热', '#ea580c', 22, { x: 0.5, y: 0.18 });
        coilLabel.position.set(0.6, 0.82, 0);
        group.add(coilLabel);

        // 数字温度计
        const thermometer = makeBox(0.08, 0.6, 0.04, 0x334155, 0.4, 0.3);
        thermometer.position.set(-0.95, 0.4, 0);
        group.add(thermometer);

        const label = makeTextSprite('热敏电阻 NTC', '#b91c1c', 24, { x: 0.95, y: 0.22 });
        label.position.set(-0.2, 1.0, 0);
        group.add(label);

        scene.add(group);
        const handles: ThermistorHandles = { bead, coil };
        applyTemperature(handles, num(params['temperature'], 300));
        return { group, handles };
    },

    updateEquipment(handles, params) {
        applyTemperature(handles as unknown as ThermistorHandles, num(params['temperature'], 300));
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.55 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.55, 0);
    }
};

function applyTemperature(h: ThermistorHandles, T: number): void {
    // 温度 200..600 K → 冷蓝 → 热红，并增强辉光
    const t = Math.min(1, Math.max(0, (T - 200) / 400));
    const bmat = h.bead.material as THREE.MeshStandardMaterial;
    bmat.color.setHSL((1 - t) * 0.58, 0.6, 0.45 + t * 0.08);
    bmat.emissive.setHSL(0.0, 0.85, 0.08 + t * 0.35);
    bmat.emissiveIntensity = 0.15 + t * 0.7;
    const cmat = h.coil.material as THREE.MeshStandardMaterial;
    cmat.emissive.setHSL(0.08, 0.85, 0.08 + t * 0.3);
    cmat.emissiveIntensity = 0.1 + t * 0.5;
}
