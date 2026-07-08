/**
 * 光电门 — 6 个实验（测速度、加速度）
 * U 形支架 + 发光器 + 接收器
 */
import * as THREE from 'three';
import { makeBox, makeTextSprite } from '../primitives';

export interface PhotogateHandles {
    group: THREE.Group;
    beam: THREE.Mesh;
}

export function createPhotogate(width = 0.25): {
    group: THREE.Group;
    handles: PhotogateHandles;
} {
    const group = new THREE.Group();

    // 左立柱
    const leftPillar = makeBox(0.06, 0.4, 0.08, 0x475569, 0.4, 0.2);
    leftPillar.position.set(-width / 2, 0.2, 0);
    group.add(leftPillar);

    // 右立柱
    const rightPillar = makeBox(0.06, 0.4, 0.08, 0x475569, 0.4, 0.2);
    rightPillar.position.set(width / 2, 0.2, 0);
    group.add(rightPillar);

    // 红外光束（可视化）
    const beam = makeBox(width, 0.008, 0.008, 0xef4444, 0.3, 0.1);
    beam.position.set(0, 0.25, 0);
    group.add(beam);

    // 底座
    const base = makeBox(width + 0.1, 0.04, 0.12, 0x334155, 0.4, 0.2);
    base.position.set(0, 0.02, 0);
    group.add(base);

    // 标签
    const label = makeTextSprite('光电门', '#475569', 22, { x: 0.6, y: 0.22 });
    label.position.set(0, 0.48, 0);
    group.add(label);

    return { group, handles: { group, beam } };
}
