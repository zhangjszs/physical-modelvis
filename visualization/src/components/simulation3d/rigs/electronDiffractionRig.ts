/**
 * 电子衍射 rig — 电子枪 → 晶体 → 衍射环
 * 衍射环半径 ∝ 1/√V (德布罗意波长随加速电压升高而减小)
 * 用于 electron-diffraction
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeLine, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

function ringLine(radius: number, color: number): THREE.Line {
    const pts = Array.from({ length: 49 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return new THREE.Vector3(0, Math.cos(a) * radius, Math.sin(a) * radius);
    });
    return makeLine(pts, color, 0.9);
}

interface ElectronDiffractionHandles {
    rings: THREE.Line[];
}

export const electronDiffractionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const cy = 1.4;

        // 电子枪 (左)
        const gun = makeCylinder(0.16, 0.5, 0x475569, 0.4, 0.4);
        gun.rotation.z = Math.PI / 2;
        gun.position.set(-2.2, cy, 0);
        group.add(gun);
        const filament = makeSphere(0.1, 0xfbbf24, { emissive: 0xb45309, emissiveIntensity: 0.4 });
        filament.position.set(-1.95, cy, 0);
        group.add(filament);

        // 入射电子束
        const beam = makeLine([new THREE.Vector3(-1.8, cy, 0), new THREE.Vector3(-0.5, cy, 0)], 0x3b82f6, 0.7);
        group.add(beam);

        // 晶体薄片 (中)
        const crystal = makeBox(0.08, 0.9, 0.9, 0x94a3b8, 0.3, 0.5);
        crystal.position.set(-0.4, cy, 0);
        group.add(crystal);

        // 荧光屏 (右) + 衍射环
        const screen = makeBox(0.06, 1.6, 1.6, 0x0f172a, 0.6, 0.1);
        group.add(screen);
        const screenX = 1.9;
        screen.position.set(screenX, cy, 0);

        const rings: THREE.Line[] = [];
        for (let i = 0; i < 3; i++) {
            const ring = ringLine(0.3 + i * 0.22, i === 0 ? 0xef4444 : i === 1 ? 0x22c55e : 0x3b82f6);
            ring.position.set(screenX, cy, 0);
            group.add(ring);
            rings.push(ring);
        }

        const label = makeTextSprite('电子衍射环', '#334155', 28, { x: 0.9, y: 0.24 });
        label.position.set(screenX, cy + 1.0, 0);
        group.add(label);

        scene.add(group);

        const handles: ElectronDiffractionHandles = { rings };
        updateElectronDiffraction(handles, params);
        return { group, handles: { rings } };
    },

    updateEquipment(handles, params) {
        updateElectronDiffraction(handles as unknown as ElectronDiffractionHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.4, 0);
    }
};

function updateElectronDiffraction(h: ElectronDiffractionHandles, params: Record<string, number>): void {
    const V = Math.max(100, num(params['accVoltage'], 10000));
    // 环距随 √V 增大而减小：基环半径 ∝ 1/√V
    const base = 0.9 / Math.sqrt(V / 10000);
    h.rings.forEach((ring, i) => {
        const r = base * (0.55 + i * 0.5);
        const pts = Array.from({ length: 49 }, (_, k) => {
            const a = (k / 48) * Math.PI * 2;
            return new THREE.Vector3(0, Math.cos(a) * r, Math.sin(a) * r);
        });
        ring.geometry.dispose();
        ring.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    });
}
