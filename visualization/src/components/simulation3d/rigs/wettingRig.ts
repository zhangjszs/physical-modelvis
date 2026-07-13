/**
 * 润湿 rig — 液滴在固体表面铺展(浸润)或成球(不浸润)
 * 固体平板 + 液滴(接触角由 medium/surface 决定)
 * 用于 wetting
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface WetHandles {
    drop: THREE.Mesh;
    label: THREE.Sprite;
}

export const wettingRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 固体平板
        const plate = makeBox(2.0, 0.12, 1.2, 0x475569, 0.9, 0.0);
        plate.position.set(0, 0.4, 0);
        group.add(plate);
        // 液滴（扁球近似接触角）
        const drop = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 24, 16),
            new THREE.MeshStandardMaterial({ color: 0x2563eb, transparent: true, opacity: 0.8 })
        );
        group.add(drop);
        const label = makeTextSprite('润湿', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 1.8, 0);
        group.add(label);
        scene.add(group);
        const handles: WetHandles = { drop, label };
        updateWet(handles, params);
        return { group, handles: { drop, label } };
    },

    updateEquipment(handles, params) {
        updateWet(handles as unknown as WetHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.46 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.46, 0);
    }
};

function updateWet(h: WetHandles, params: Record<string, number>): void {
    const med = Math.round(num(params['medium'], 0)); // 0=水 1=汞
    const surf = Math.round(num(params['surface'], 0)); // 0=玻璃 1=石蜡
    const wet = med === 0 && surf === 0; // 水-玻璃浸润
    if (wet) {
        h.drop.scale.set(1.6, 0.35, 1.2);
        h.drop.position.set(0, 0.46 + 0.14, 0);
    } else {
        h.drop.scale.set(0.7, 0.9, 0.7);
        h.drop.position.set(0, 0.46 + 0.36, 0);
    }
    setLabel(h.label, wet ? '水-玻璃：铺展(θ<90°)' : '不浸润：成球(θ>90°)');
}
