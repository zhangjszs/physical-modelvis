/**
 * 角度尺 / 量角器 — 测量斜面角度、力的方向等
 */
import * as THREE from 'three';
import { makeLine, makeTextSprite } from '../primitives';

export interface AngleGaugeHandles {
    arc: THREE.Line;
    label: THREE.Sprite;
    group: THREE.Group;
}

export function createAngleGauge(radius = 0.7): {
    group: THREE.Group;
    handles: AngleGaugeHandles;
} {
    const group = new THREE.Group();

    // 量角器底板（半圆）
    const base = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 48, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7, side: THREE.DoubleSide })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(0, 0.02, 0);
    group.add(base);

    // 角度弧
    const arc = makeLine([], 0x2563eb, 0.8);
    group.add(arc);

    // 标签
    const label = makeTextSprite('0°', '#2563eb', 28, { x: 0.5, y: 0.2 });
    group.add(label);

    return { group, handles: { arc, label, group } };
}
