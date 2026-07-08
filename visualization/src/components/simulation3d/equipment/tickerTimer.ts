/**
 * 打点计时器 — 9 个实验（电磁/电火花式）
 * 固定在长木板一端，纸带穿过限位孔
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';

export interface TickerTimerHandles {
    body: THREE.Mesh;
    coil: THREE.Mesh;
    needle: THREE.Mesh;
    group: THREE.Group;
}

export function createTickerTimer(): {
    group: THREE.Group;
    handles: TickerTimerHandles;
} {
    const group = new THREE.Group();

    // 主体
    const body = makeBox(0.5, 0.22, 0.35, 0x475569, 0.45, 0.15);
    body.position.set(0, 0.11, 0);
    group.add(body);

    // 线圈 / 电磁铁
    const coil = makeCylinder(0.08, 0.12, 0xdc2626, 0.2, 0.3);
    coil.rotation.z = Math.PI / 2;
    coil.position.set(0, 0.18, 0);
    group.add(coil);

    // 振针
    const needle = makeCylinder(0.008, 0.14, 0x94a3b8, 0.5, 0.2);
    needle.position.set(0, 0.02, 0.12);
    group.add(needle);

    // 限位孔（薄板）
    const plate = makeBox(0.06, 0.16, 0.02, 0x64748b, 0.4, 0.3);
    plate.position.set(0, 0.1, 0.18);
    group.add(plate);

    // 标签
    const label = makeTextSprite('打点计时器', '#475569', 28, { x: 1.2, y: 0.4 });
    label.position.set(0, 0.38, 0);
    group.add(label);

    return { group, handles: { body, coil, needle, group } };
}
