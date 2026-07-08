/**
 * 弹簧测力计 — 6 个实验（摩擦力、胡克定律、力的合成等）
 * 外壳 + 弹簧 + 指针 + 刻度盘 + 挂钩
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';

export interface SpringScaleHandles {
    casing: THREE.Mesh;
    hook: THREE.Mesh;
    pointer: THREE.Mesh;
    group: THREE.Group;
}

export function createSpringScale(): {
    group: THREE.Group;
    handles: SpringScaleHandles;
} {
    const group = new THREE.Group();

    // 外壳
    const casing = makeBox(0.22, 0.9, 0.12, 0xfbbf24, 0.4, 0.15);
    casing.position.set(0, 0.45, 0);
    group.add(casing);

    // 顶部挂环
    const ring = makeCylinder(0.06, 0.02, 0x64748b, 0.4, 0.3);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.95, 0);
    group.add(ring);

    // 弹簧（可见部分）
    const spring = makeCylinder(0.04, 0.3, 0x94a3b8, 0.5, 0.2);
    spring.position.set(0, 0.2, 0);
    group.add(spring);

    // 底部挂钩
    const hook = makeCylinder(0.02, 0.16, 0x475569, 0.5, 0.2);
    hook.position.set(0, 0.02, 0);
    group.add(hook);

    // 指针
    const pointer = makeBox(0.01, 0.12, 0.01, 0xdc2626, 0.3);
    pointer.position.set(0.08, 0.5, 0.07);
    group.add(pointer);

    // 刻度数字
    const label = makeTextSprite('N', '#475569', 24, { x: 0.3, y: 0.18 });
    label.position.set(0, 1.05, 0);
    group.add(label);

    return { group, handles: { casing, hook, pointer, group } };
}
