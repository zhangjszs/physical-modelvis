/**
 * 毛细 rig — 毛细管插入液体，液面上升(浸润)或下降(不浸润)
 * 液体槽 + 毛细管(管径∝tubeRadius) + 管内液柱(高度由浸润决定)
 * 用于 capillary
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface CapHandles {
    liquid: THREE.Mesh;
    label: THREE.Sprite;
}

export const capillaryRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 液体槽
        const bath = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.3, 1.0),
            new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6 })
        );
        bath.position.set(0, 0.15, 0);
        group.add(bath);
        // 毛细管
        const r = Math.max(0.03, num(params['tubeRadius'], 0.5) / 10);
        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(r, r, 2.0, 24, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide
            })
        );
        tube.position.set(0.3, 1.15, 0);
        group.add(tube);
        // 管内液柱
        const liquid = new THREE.Mesh(
            new THREE.CylinderGeometry(r * 0.9, r * 0.9, 1.0, 24),
            new THREE.MeshStandardMaterial({ color: 0x2563eb, transparent: true, opacity: 0.8 })
        );
        group.add(liquid);
        const label = makeTextSprite('毛细现象', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 2.6, 0);
        group.add(label);
        scene.add(group);
        const handles: CapHandles = { liquid, label };
        updateCap(handles, params);
        return { group, handles: { liquid, label } };
    },

    updateEquipment(handles, params) {
        updateCap(handles as unknown as CapHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.3 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.3, 0);
    }
};

function updateCap(h: CapHandles, params: Record<string, number>): void {
    const r = Math.max(0.03, num(params['tubeRadius'], 0.5) / 10);
    const mat = Math.round(num(params['material'], 0)); // 0=玻-水(上升) 1=玻-汞(下降)
    const rise = mat === 1 ? -1 : 1;
    const hH = Math.min(1.6, (0.06 / r) * 0.18) * rise;
    const absH = Math.max(0.05, Math.abs(hH));
    h.liquid.scale.y = absH / 1.0;
    h.liquid.position.set(0.3, hH > 0 ? 0.3 + absH / 2 : 0.3 - absH / 2, 0);
    const mName = mat === 1 ? '玻-汞(下降)' : '玻-水(上升)';
    setLabel(h.label, `管径=${r.toFixed(3)}m ${mName} h∝1/r`);
}
