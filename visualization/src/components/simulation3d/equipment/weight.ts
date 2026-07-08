/**
 * 钩码 / 砝码 — 用于牵引或配重
 */
import * as THREE from 'three';
import { makeCylinder } from '../primitives';

export interface WeightHandles {
    body: THREE.Mesh;
    group: THREE.Group;
}

export function createWeight(mass = 0.05, color = 0x64748b): {
    group: THREE.Group;
    handles: WeightHandles;
} {
    const group = new THREE.Group();

    // 主体（圆柱）
    const r = 0.06 + mass * 0.3;
    const h = 0.08 + mass * 0.5;
    const body = makeCylinder(r, h, color, 0.3, 0.25);
    group.add(body);

    // 顶部挂环
    const ring = makeCylinder(0.025, 0.015, 0x94a3b8, 0.4, 0.3);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, h / 2 + 0.02, 0);
    group.add(ring);

    return { group, handles: { body, group } };
}
