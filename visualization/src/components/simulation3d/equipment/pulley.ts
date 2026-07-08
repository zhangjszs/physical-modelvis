/**
 * 滑轮 — 用于牛顿第二定律（钩码牵引小车）
 */
import * as THREE from 'three';
import { makeCylinder, makeBox } from '../primitives';

export interface PulleyHandles {
    wheel: THREE.Mesh;
    group: THREE.Group;
}

export function createPulley(): {
    group: THREE.Group;
    handles: PulleyHandles;
} {
    const group = new THREE.Group();

    // 滑轮轮
    const wheel = makeCylinder(0.12, 0.06, 0x64748b, 0.4, 0.3);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);

    // 轮毂
    const hub = makeCylinder(0.03, 0.07, 0x334155, 0.5, 0.2);
    hub.rotation.z = Math.PI / 2;
    group.add(hub);

    // 支架
    const bracket = makeBox(0.04, 0.2, 0.04, 0x475569, 0.4, 0.3);
    bracket.position.set(0, 0.14, 0);
    group.add(bracket);

    // 顶部固定板
    const mount = makeBox(0.2, 0.03, 0.1, 0x334155, 0.4, 0.2);
    mount.position.set(0, 0.26, 0);
    group.add(mount);

    return { group, handles: { wheel, group } };
}
