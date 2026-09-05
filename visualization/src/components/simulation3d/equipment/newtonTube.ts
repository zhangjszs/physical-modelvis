/**
 * 牛顿管（羽钱管）— 演示真空中的自由落体
 * 竖直高透厚壁玻璃管 + 内置金属硬币与彩色羽毛 + 抽气抽气阀门与压力表
 */
import * as THREE from 'three';
import { makeCylinder, makeBox, makeTextSprite } from '../primitives';

export interface NewtonTubeHandles {
    tube: THREE.Mesh;
    coin: THREE.Mesh;
    feather: THREE.Mesh;
    pressureLabel: THREE.Sprite;
    valve: THREE.Mesh;
    group: THREE.Group;
    topY: number;
    bottomY: number;
}

export function createNewtonTube(): {
    group: THREE.Group;
    handles: NewtonTubeHandles;
} {
    const group = new THREE.Group();
    const topY = 1.8;
    const bottomY = 0.16;

    // 1. 厚壁石英玻璃管（高折射率半透明）
    const tubeGeo = new THREE.CylinderGeometry(0.12, 0.12, topY - bottomY + 0.1, 32, 1, true);
    const tubeMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.35,
        roughness: 0.08,
        metalness: 0.1,
        transmission: 0.7,
        ior: 1.5,
        side: THREE.DoubleSide
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.position.set(0, (topY + bottomY) / 2, 0);
    group.add(tube);

    // 管内参考刻度线（每 0.2m 一条细微磨砂环）
    for (let y = bottomY + 0.2; y < topY; y += 0.25) {
        const ring = makeCylinder(0.118, 0.003, 0x94a3b8, 0.4, 0.2);
        ring.position.set(0, y, 0);
        group.add(ring);
    }

    // 2. 金属密封底座与缓冲垫
    const bottom = makeCylinder(0.14, 0.05, 0x475569, 0.3, 0.7);
    bottom.position.set(0, bottomY - 0.025, 0);
    group.add(bottom);

    const pad = makeCylinder(0.11, 0.015, 0xdc2626, 0.8, 0.1);
    pad.position.set(0, bottomY, 0);
    group.add(pad);

    // 3. 金属管顶（带抽气口与排气旋钮阀门）
    const top = makeCylinder(0.14, 0.06, 0x475569, 0.3, 0.7);
    top.position.set(0, topY + 0.03, 0);
    group.add(top);

    const valveStem = makeCylinder(0.02, 0.08, 0x94a3b8, 0.3, 0.8);
    valveStem.position.set(0.14, topY + 0.03, 0);
    valveStem.rotation.z = Math.PI / 2;
    group.add(valveStem);

    const valve = makeCylinder(0.045, 0.02, 0xd97706, 0.3, 0.8);
    valve.position.set(0.19, topY + 0.03, 0);
    valve.rotation.z = Math.PI / 2;
    group.add(valve);

    // 4. 重金币（黄铜光泽）
    const coin = makeCylinder(0.045, 0.009, 0xf59e0b, 0.25, 0.85);
    coin.castShadow = true;
    coin.position.set(-0.025, topY - 0.04, 0);
    group.add(coin);

    // 5. 彩色羽毛（薄片带叶脉微小倾角）
    const featherGeo = new THREE.BoxGeometry(0.06, 0.035, 0.003);
    const featherMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.85,
        metalness: 0
    });
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.castShadow = true;
    feather.position.set(0.025, topY - 0.04, 0);
    feather.rotation.z = 0.2;
    group.add(feather);

    // 6. 重型实验台支架（双支撑夹固定）
    const standPole = makeCylinder(0.025, topY + 0.4, 0x64748b, 0.4, 0.6);
    standPole.position.set(0, (topY + 0.4) / 2, -0.22);
    group.add(standPole);

    // 夹头 1 (上)
    const clampTop = makeBox(0.08, 0.03, 0.24, 0x334155, 0.5, 0.4);
    clampTop.position.set(0, topY - 0.15, -0.11);
    group.add(clampTop);

    // 夹头 2 (下)
    const clampBottom = makeBox(0.08, 0.03, 0.24, 0x334155, 0.5, 0.4);
    clampBottom.position.set(0, bottomY + 0.3, -0.11);
    group.add(clampBottom);

    const basePlate = makeBox(0.48, 0.035, 0.36, 0x1e293b, 0.6, 0.3);
    basePlate.position.set(0, 0.0175, -0.15);
    basePlate.receiveShadow = true;
    group.add(basePlate);

    // 7. 真空度状态标牌（动态联动）
    const pressureLabel = makeTextSprite('真空: 0.1 kPa', '#059669', 24, { x: 0.8, y: 0.22 });
    pressureLabel.position.set(0, topY + 0.16, 0);
    group.add(pressureLabel);

    const handles: NewtonTubeHandles = {
        tube,
        coin,
        feather,
        pressureLabel,
        valve,
        group,
        topY,
        bottomY
    };

    return { group, handles };
}
