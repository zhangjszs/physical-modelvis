/**
 * 永动机 rig — 热机循环示意，标注卡诺效率不可能达到 100%
 * 高/低温热源(红/蓝球) + 工质气缸 + 循环环
 * 用于 perpetuum-mobile
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface PmHandles {
    label: THREE.Sprite;
}

export const perpetuumMobileRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 高温热源
        const hot = makeSphere(0.4, 0xdc2626, { emissive: 0x7f1d1d, emissiveIntensity: 0.5 });
        hot.position.set(-1.2, 0.6, 0);
        group.add(hot);
        // 低温热源
        const cold = makeSphere(0.4, 0x2563eb, { emissive: 0x1e3a8a, emissiveIntensity: 0.4 });
        cold.position.set(1.2, 0.6, 0);
        group.add(cold);
        // 工质气缸
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 1.0, 24, 1, true),
            new THREE.MeshPhysicalMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
        );
        wall.position.set(0, 1.2, 0);
        group.add(wall);
        const piston = makeCylinder(0.32, 0.06, 0x475569, 0.9, 0.9);
        piston.position.set(0, 1.6, 0);
        group.add(piston);
        // 循环环
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.03, 10, 40),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b })
        );
        ring.position.set(0, 0.6, 0);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        const label = makeTextSprite('永动机', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 2.4, 0);
        group.add(label);
        scene.add(group);
        const handles: PmHandles = { label };
        updatePM(handles, params);
        return { group, handles: { label } };
    },

    updateEquipment(handles, params) {
        updatePM(handles as unknown as PmHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.2 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.2, 0);
    }
};

function updatePM(h: PmHandles, params: Record<string, number>): void {
    const Th = num(params['hotTemp'], 500);
    const Tc = num(params['coldTemp'], 300);
    const eta = 1 - Tc / Th;
    setLabel(h.label, `卡诺效率 η=1-T冷/T热=${(eta * 100).toFixed(0)}% (不可能100%)`);
}
