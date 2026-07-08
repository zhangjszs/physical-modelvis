/**
 * 单摆 — 细线 + 摆球 + 支架
 */
import * as THREE from 'three';
import { makeSphere, makeCylinder, makeBox, makeLine } from '../primitives';

export interface PendulumHandles {
    string: THREE.Line;
    bob: THREE.Mesh;
    pivot: THREE.Mesh;
    group: THREE.Group;
}

export function createPendulum(length = 1.5): {
    group: THREE.Group;
    handles: PendulumHandles;
} {
    const group = new THREE.Group();

    // 支架
    const stand = makeBox(0.05, 1.6, 0.05, 0x334155, 0.4, 0.2);
    stand.position.set(0, 1.6, -0.15);
    group.add(stand);

    const base = makeBox(0.5, 0.04, 0.3, 0x334155, 0.4, 0.2);
    base.position.set(0, 0.02, -0.15);
    group.add(base);

    // 悬挂点
    const pivot = makeCylinder(0.04, 0.04, 0x64748b, 0.4, 0.3);
    pivot.rotation.z = Math.PI / 2;
    pivot.position.set(0, 2.4, 0);
    group.add(pivot);

    // 摆线
    const string = makeLine([new THREE.Vector3(0, 2.4, 0), new THREE.Vector3(0, 2.4 - length, 0)], 0x475569, 0.7);
    group.add(string);

    // 摆球
    const bob = makeSphere(0.12, 0x2563eb, { emissive: 0x1d4ed8, emissiveIntensity: 0.1 });
    bob.position.set(0, 2.4 - length, 0);
    group.add(bob);

    return { group, handles: { string, bob, pivot, group } };
}
