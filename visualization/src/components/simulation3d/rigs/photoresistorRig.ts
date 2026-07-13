/**
 * 光敏电阻 (CdS) rig — 光敏电阻片 + 白炽灯 + 测量电路
 * 用于 photoresistor (R-L 特性演示)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

type PhotoHandles = {
    bulb: THREE.Mesh;
};

export const photoresistorRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        const base = makeBox(2.2, 0.06, 1.2, 0xe2e8f0, 0.8, 0);
        base.position.set(0, 0.03, 0);
        group.add(base);

        // 光敏电阻片（暗色陶瓷基片 + 梳状电极）
        const cell = makeBox(0.5, 0.05, 0.4, 0x1f2937, 0.7, 0.1);
        cell.position.set(-0.3, 0.32, 0);
        group.add(cell);

        const electrode = makeBox(0.46, 0.06, 0.36, 0xcbd5e1, 0.2, 0.7);
        electrode.position.set(-0.3, 0.36, 0);
        group.add(electrode);

        // 两引脚
        const leadL = makeCylinder(0.015, 0.3, 0x94a3b8, 0.6, 0.4);
        leadL.rotation.z = Math.PI / 2;
        leadL.position.set(-0.62, 0.25, 0.12);
        group.add(leadL);

        const leadR = makeCylinder(0.015, 0.3, 0x94a3b8, 0.6, 0.4);
        leadR.rotation.z = Math.PI / 2;
        leadR.position.set(-0.62, 0.25, -0.12);
        group.add(leadR);

        // 白炽灯（光源）
        const socket = makeCylinder(0.1, 0.2, 0x475569, 0.4, 0.5);
        socket.position.set(0.9, 0.45, 0);
        group.add(socket);

        const bulb = makeSphere(0.18, 0xfde68a, { emissive: 0xfacc15, emissiveIntensity: 0.6 });
        bulb.position.set(0.9, 0.72, 0);
        group.add(bulb);

        const label = makeTextSprite('光敏电阻 CdS', '#a16207', 24, { x: 0.95, y: 0.22 });
        label.position.set(-0.3, 0.7, 0);
        group.add(label);

        scene.add(group);
        const handles: PhotoHandles = { bulb };
        applyLight(handles, num(params['lightIntensity'], 100));
        return { group, handles };
    },

    updateEquipment(handles, params) {
        applyLight(handles as unknown as PhotoHandles, num(params['lightIntensity'], 100));
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.4, 0);
    }
};

function applyLight(h: PhotoHandles, E: number): void {
    // 光照度 0.1..1e5 lx（对数）→ 灯泡亮度
    const t = Math.min(1, Math.max(0, Math.log10(Math.max(0.1, E)) / 5));
    const mat = h.bulb.material as THREE.MeshStandardMaterial;
    mat.color.setHSL(0.13, 0.7, 0.55 + t * 0.25);
    mat.emissiveIntensity = 0.1 + t * 1.6;
}
