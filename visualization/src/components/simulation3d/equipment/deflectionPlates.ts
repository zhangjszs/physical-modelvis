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
    /** 绝缘支撑柱 (随板间距缩放) */
    pillars: THREE.Mesh[];
    /** 上板/下板的 +/− 标牌 (极性由 E 方向决定, 运行时可换位) */
    plusLabel: THREE.Sprite;
    minusLabel: THREE.Sprite;
    voltageLabel: THREE.Sprite;
    screen: THREE.Mesh;
    /** 荧光屏发光面 (随板间距缩放) */
    screenFace: THREE.Mesh;
    plateDistance: number;
    plateLength: number;
    plateWidth: number;
    centerY: number;
    /** 建造时的初始板间距 (支撑柱缩放的基准) */
    basePlateDistance: number;
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
    const pillars: THREE.Mesh[] = [];
    pillarPositions.forEach(([x, z]) => {
        const pillar = makeCylinder(0.02, plateDistance, 0x94a3b8, 0.6, 0.2);
        pillar.position.set(x, centerY, z);
        group.add(pillar);
        pillars.push(pillar);
    });

    // 极板极性符号标识 (+ / -)
    // 画布 384×128 → 单字符要保持正方, 横向 scale 必须是纵向的 3 倍 (否则会被压扁)
    // 极性与 E 方向绑定 (E 向上 → 下板 + / 上板 −), 由 updateDeflectionPolarity 运行时换位
    const plusLabel = makeTextSprite('+', '#ef4444', 36, { x: 0.9, y: 0.3 });
    plusLabel.position.set(-plateLength / 2 + 0.2, centerY - plateDistance / 2 - 0.15, plateWidth / 2 + 0.05);
    group.add(plusLabel);

    const minusLabel = makeTextSprite('−', '#3b82f6', 36, { x: 0.9, y: 0.3 });
    minusLabel.position.set(-plateLength / 2 + 0.2, centerY + plateDistance / 2 + 0.15, plateWidth / 2 + 0.05);
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
    const screen = makeBox(0.04, plateDistance * 0.95, plateWidth * 0.5, 0x064e3b, 0.3, 0.1);
    screen.position.set(plateLength / 2 + 0.42, centerY, 0);
    group.add(screen);

    // 荧光屏网格发光面
    const screenFace = makeBox(0.005, plateDistance * 0.88, plateWidth * 0.45, 0x10b981, 0.4, 0.1);
    screenFace.position.set(plateLength / 2 + 0.395, centerY, 0);
    (screenFace.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x059669);
    (screenFace.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.18;
    group.add(screenFace);

    // 4. 电压与场强实时读数标牌
    const voltageLabel = makeTextSprite('偏转电压 U', '#2563eb', 24, { x: 0.8, y: 0.2 });
    voltageLabel.position.set(0, centerY + plateDistance / 2 + 0.35, 0);
    group.add(voltageLabel);

    const handles: DeflectionPlatesHandles = {
        group,
        topPlate,
        bottomPlate,
        pillars,
        plusLabel,
        minusLabel,
        voltageLabel,
        screen,
        screenFace,
        plateDistance,
        plateLength,
        plateWidth,
        centerY,
        basePlateDistance: plateDistance
    };

    return { group, handles };
}

/**
 * 更新板间距 (世界单位) —— 支撑柱 / 荧光屏 / 标牌同步伸缩。
 *
 * 偏转极板的间距必须跟着「粒子在板间的偏转量」走: 偏转量由引擎轨迹决定,
 * 固定间距会出现「粒子撞出极板」或「板间空旷得看不出场」两种失真。
 */
export function updateDeflectionPlateGeometry(handles: DeflectionPlatesHandles, plateDistance: number): void {
    if (Math.abs(plateDistance - handles.plateDistance) < 1e-6) return;
    handles.plateDistance = plateDistance;
    const half = plateDistance / 2;
    const { centerY, plateWidth } = handles;
    handles.topPlate.position.y = centerY + half;
    handles.bottomPlate.position.y = centerY - half;
    const scaleY = plateDistance / handles.basePlateDistance;
    handles.pillars.forEach(p => {
        p.scale.y = scaleY;
    });
    handles.screen.scale.y = scaleY;
    handles.screenFace.scale.y = scaleY;
    handles.voltageLabel.position.y = centerY + half + 0.35;
    handles.plusLabel.position.z = plateWidth / 2 + 0.05;
    handles.minusLabel.position.z = plateWidth / 2 + 0.05;
}

/**
 * 更新极板极性 —— 与电场方向绑定。
 *
 * E = (0, Ey): Ey > 0 时场线由下板指向上板 → 下板为正极 (+)、上板为负极 (−)。
 * 旧实现把 +/− 写死在上板, 与引擎的场方向相反 (#159 逐节审计 · 问题一·物理)。
 */
export function updateDeflectionPolarity(handles: DeflectionPlatesHandles, topIsPositive: boolean): void {
    const half = handles.plateDistance / 2;
    const { centerY, plateWidth, plateLength } = handles;
    const labelX = -plateLength / 2 + 0.2;
    const labelZ = plateWidth / 2 + 0.05;
    const plusY = topIsPositive ? centerY + half + 0.15 : centerY - half - 0.15;
    const minusY = topIsPositive ? centerY - half - 0.15 : centerY + half + 0.15;
    handles.plusLabel.position.set(labelX, plusY, labelZ);
    handles.minusLabel.position.set(labelX, minusY, labelZ);
}
