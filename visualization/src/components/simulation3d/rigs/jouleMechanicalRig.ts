/**
 * 焦耳机械功 rig — 重物下落带动搅拌器，机械能→内能
 * 量热器 + 搅拌桨 + 重物(绳滑轮)
 * 用于 joule-mechanical
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface JmHandles {
    label: THREE.Sprite;
}

export const jouleMechanicalRig: SceneRig = {
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
        // 搅拌桨
        const shaft = makeCylinder(0.03, 1.0, 0x475569, 0.9, 0.9);
        shaft.position.set(0, 1.1, 0);
        group.add(shaft);
        const blade = makeBox(0.5, 0.04, 0.12, 0x64748b, 0.9, 0.0);
        blade.position.set(0, 0.6, 0);
        group.add(blade);
        // 重物 + 绳
        const weight = makeSphere(0.18, 0x7c2d12, { emissive: 0x451a03, emissiveIntensity: 0.3 });
        weight.position.set(1.0, 1.6, 0);
        group.add(weight);
        const rope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 1.0, 8),
            new THREE.MeshStandardMaterial({ color: 0x1f2937 })
        );
        rope.position.set(1.0, 2.0, 0);
        group.add(rope);
        const label = makeTextSprite('焦耳机械功', '#334155', 26, { x: 1.2, y: 0.22 });
        label.position.set(0, 2.6, 0);
        group.add(label);
        scene.add(group);
        const handles: JmHandles = { label };
        updateJM(handles, params);
        return { group, handles: { label } };
    },

    updateEquipment(handles, params) {
        updateJM(handles as unknown as JmHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.6 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.6, 0);
    }
};

function updateJM(h: JmHandles, params: Record<string, number>): void {
    const m = num(params['mass'], 1);
    const hgt = num(params['height'], 1);
    const drops = num(params['drops'], 10);
    const W = m * 9.8 * hgt * drops;
    setLabel(h.label, `功 W=${W.toFixed(0)}J = ΔU (量热器升温)`);
}
