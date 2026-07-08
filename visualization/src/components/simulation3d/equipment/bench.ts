/**
 * 长木板 / 实验台 — 通用平台
 * 用于打点计时器、牛顿第二定律、滑动摩擦等
 */
import * as THREE from 'three';
import { makeBox } from '../primitives';

export interface BenchHandles {
    board: THREE.Mesh;
    group: THREE.Group;
}

export function createBench(
    length = 3.5,
    height = 0.1
): {
    group: THREE.Group;
    handles: BenchHandles;
} {
    const group = new THREE.Group();

    // 木板
    const board = makeBox(length, height, 0.8, 0xb45309, 0.65, 0.03);
    board.position.set(0, height / 2, 0);
    group.add(board);

    // 支撑脚（四只）
    const footGeo = () => {
        const foot = makeBox(0.08, 0.3, 0.08, 0x78716c, 0.6);
        return foot;
    };
    const positions: [number, number, number][] = [
        [-length / 2 + 0.15, -0.15, 0.3],
        [length / 2 - 0.15, -0.15, 0.3],
        [-length / 2 + 0.15, -0.15, -0.3],
        [length / 2 - 0.15, -0.15, -0.3]
    ];
    positions.forEach(([x, y, z]) => {
        const foot = footGeo();
        foot.position.set(x, y, z);
        group.add(foot);
    });

    return { group, handles: { board, group } };
}
