/**
 * 焦耳电功 rig — 电阻通电发热 Q=(U²/R)t
 * 量热器 + 电阻丝(螺旋) + 电池
 * 用于 joule-electrical
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface JeHandles {
    coil: THREE.Mesh;
    label: THREE.Sprite;
}

export const jouleElectricalRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 量热器
        const outer = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.6, 1.0, 32, 1, true),
            new THREE.MeshPhysicalMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
        );
        outer.position.set(0, 0.6, 0);
        group.add(outer);
        const water = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.7, 32),
            new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6 })
        );
        water.position.set(0, 0.5, 0);
        group.add(water);
        // 电阻丝（两层螺旋）
        const coil = new THREE.Mesh(
            new THREE.TorusGeometry(0.2, 0.03, 12, 32),
            new THREE.MeshStandardMaterial({ color: 0xb45309, emissive: 0x7c2d12, emissiveIntensity: 0.4 })
        );
        coil.position.set(0, 0.5, 0);
        group.add(coil);
        const coil2 = coil.clone();
        coil2.position.set(0, 0.7, 0);
        group.add(coil2);
        // 电池
        const batt = makeBox(0.4, 0.4, 0.3, 0x16a34a, 0.9, 0.0);
        batt.position.set(1.1, 0.3, 0);
        group.add(batt);
        const label = makeTextSprite('焦耳电功', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 2.0, 0);
        group.add(label);
        scene.add(group);
        const handles: JeHandles = { coil, label };
        updateJE(handles, params);
        return { group, handles: { coil, label } };
    },

    updateEquipment(handles, params) {
        updateJE(handles as unknown as JeHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.6 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.6, 0);
    }
};

function updateJE(h: JeHandles, params: Record<string, number>): void {
    const U = num(params['voltage'], 6);
    const R = num(params['resistance'], 10);
    const t = num(params['time'], 10);
    const Q = ((U * U) / R) * t;
    const g = Math.max(0, Math.min(1, Q / 1000));
    (h.coil.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + g * 0.6;
    setLabel(h.label, `Q=(U²/R)t=${Q.toFixed(0)}J 发热丝升温`);
}
