/**
 * 偏转极板与电子枪实验腔 3D 器材组件
 * 适用于电场偏转、磁场偏转、电磁复合场 (速度选择器) 等实验场景
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';

export interface DeflectionPlatesHandles {
    group: THREE.Group;
    topPlate: THREE.Mesh;
    bottomPlate: THREE.Mesh;
    voltageLabel: THREE.Sprite;
    screen: THREE.Mesh;
    plateDistance: number;
    plateLength: number;
}

export function createDeflectionPlates(
    plateLength = 2.4,
    plateWidth = 1.0,
    plateDistance = 1.2,
    centerY = 1.5
): { group: THREE.Group; handles: DeflectionPlatesHandles } {
    const group = new THREE.Group();

    // 1. 上下金属极板 (磨砂金属黄铜/不锈钢质感)
    const topPlate = makeBox(plateLength, 0.05, plateWidth, 0xe2e8f0, 0.25, 0.85);
    topPlate.position.set(0, centerY + plateDistance / 2, 0);
    group.add(topPlate);

    const bottomPlate = makeBox(plateLength, 0.05, plateWidth, 0xe2e8f0, 0.25, 0.85);
    bottomPlate.position.set(0, centerY - plateDistance / 2, 0);
    group.add(bottomPlate);

    // 极板绝缘支撑柱
    const pillarPositions: [number, number][] = [
        [-plateLength / 2 + 0.15, -plateWidth / 2 + 0.1],
        [plateLength / 2 - 0.15, -plateWidth / 2 + 0.1],
        [-plateLength / 2 + 0.15, plateWidth / 2 - 0.1],
        [plateLength / 2 - 0.15, plateWidth / 2 - 0.1]
    ];
    pillarPositions.forEach(([x, z]) => {
        const pillar = makeCylinder(0.02, plateDistance, 0x94a3b8, 0.6, 0.2);
        pillar.position.set(x, centerY, z);
        group.add(pillar);
    });

    // 极板极性符号标识 (+ / -)
    const plusLabel = makeTextSprite('+', '#ef4444', 36, { x: 0.3, y: 0.3 });
    plusLabel.position.set(-plateLength / 2 + 0.2, centerY + plateDistance / 2 + 0.15, plateWidth / 2 + 0.05);
    group.add(plusLabel);

    const minusLabel = makeTextSprite('−', '#3b82f6', 36, { x: 0.3, y: 0.3 });
    minusLabel.position.set(-plateLength / 2 + 0.2, centerY - plateDistance / 2 - 0.15, plateWidth / 2 + 0.05);
    group.add(minusLabel);

    // 2. 电子枪发射准直管 (左端入口)
    const gunBody = makeCylinder(0.12, 0.6, 0x475569, 0.3, 0.7);
    gunBody.rotation.z = Math.PI / 2;
    gunBody.position.set(-plateLength / 2 - 0.35, centerY, 0);
    group.add(gunBody);

    const nozzle = makeCylinder(0.06, 0.15, 0xd97706, 0.2, 0.9);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(-plateLength / 2 - 0.05, centerY, 0);
    group.add(nozzle);

    // 3. 荧光接收屏 (右端出口)
    const screen = makeBox(0.04, plateDistance * 1.6, plateWidth * 1.2, 0x064e3b, 0.3, 0.1);
    screen.position.set(plateLength / 2 + 0.6, centerY, 0);
    group.add(screen);

    // 荧光屏网格发光面
    const screenFace = makeBox(0.005, plateDistance * 1.5, plateWidth * 1.1, 0x10b981, 0.4, 0.1);
    screenFace.position.set(plateLength / 2 + 0.575, centerY, 0);
    (screenFace.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x059669);
    (screenFace.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
    group.add(screenFace);

    // 4. 电压与场强实时读数标牌
    const voltageLabel = makeTextSprite('偏转电压 U', '#2563eb', 24, { x: 0.8, y: 0.2 });
    voltageLabel.position.set(0, centerY + plateDistance / 2 + 0.35, 0);
    group.add(voltageLabel);

    const handles: DeflectionPlatesHandles = {
        group,
        topPlate,
        bottomPlate,
        voltageLabel,
        screen,
        plateDistance,
        plateLength
    };

    return { group, handles };
}
