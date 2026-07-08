/**
 * 铁架台 — 15+ 个实验的通用支架
 */
import * as THREE from 'three';
import { makeBox, makeCylinder } from '../primitives';

export interface IronStandHandles {
    base: THREE.Mesh;
    rod: THREE.Mesh;
    clamp: THREE.Mesh;
    group: THREE.Group;
}

export function createIronStand(height = 2.2): {
    group: THREE.Group;
    handles: IronStandHandles;
} {
    const group = new THREE.Group();

    // 底座
    const base = makeBox(0.8, 0.06, 0.5, 0x334155, 0.4, 0.2);
    base.position.set(0, 0.03, 0);
    group.add(base);

    // 立柱
    const rod = makeCylinder(0.04, height, 0x64748b, 0.3, 0.4);
    rod.position.set(0, height / 2 + 0.06, 0);
    group.add(rod);

    // 夹具
    const clamp = makeBox(0.28, 0.1, 0.2, 0x1f2937, 0.36);
    clamp.position.set(0, height * 0.7, 0.18);
    group.add(clamp);

    return { group, handles: { base, rod, clamp, group } };
}
