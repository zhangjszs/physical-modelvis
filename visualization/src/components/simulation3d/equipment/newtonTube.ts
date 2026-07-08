/**
 * 牛顿管（羽钱管）— 演示真空中的自由落体
 * 竖直玻璃管 + 内置硬币和羽毛
 */
import * as THREE from 'three';
import { makeCylinder, makeBox, makeTextSprite } from '../primitives';

export interface NewtonTubeHandles {
    tube: THREE.Mesh;
    coin: THREE.Mesh;
    feather: THREE.Mesh;
    group: THREE.Group;
}

export function createNewtonTube(): {
    group: THREE.Group;
    handles: NewtonTubeHandles;
} {
    const group = new THREE.Group();

    // 玻璃管（半透明）
    const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.8, 32, 1, true),
        new THREE.MeshPhysicalMaterial({
            color: 0xbfdbfe,
            transparent: true,
            opacity: 0.25,
            roughness: 0.05,
            metalness: 0,
            side: THREE.DoubleSide
        })
    );
    tube.position.set(0, 1.0, 0);
    group.add(tube);

    // 管底
    const bottom = makeCylinder(0.12, 0.04, 0x64748b, 0.3, 0.3);
    bottom.position.set(0, 0.1, 0);
    group.add(bottom);

    // 管顶（抽气口）
    const top = makeCylinder(0.12, 0.06, 0x475569, 0.3, 0.3);
    top.position.set(0, 1.92, 0);
    group.add(top);

    // 硬币
    const coin = makeCylinder(0.05, 0.008, 0xfbbf24, 0.3, 0.4);
    coin.position.set(0, 1.7, 0);
    group.add(coin);

    // 羽毛
    const feather = makeBox(0.08, 0.04, 0.004, 0xf8fafc, 0.8, 0);
    feather.position.set(0.02, 1.65, 0);
    group.add(feather);

    // 支架
    const stand = makeBox(0.06, 0.9, 0.06, 0x334155, 0.4, 0.2);
    stand.position.set(0, 0.45, -0.18);
    group.add(stand);

    const base = makeBox(0.5, 0.04, 0.3, 0x334155, 0.4, 0.2);
    base.position.set(0, 0.02, -0.18);
    group.add(base);

    // 标签
    const label = makeTextSprite('牛顿管', '#475569', 26, { x: 0.7, y: 0.24 });
    label.position.set(0, 2.05, 0);
    group.add(label);

    return { group, handles: { tube, coin, feather, group } };
}
