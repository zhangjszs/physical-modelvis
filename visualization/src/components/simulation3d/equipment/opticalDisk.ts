/**
 * 光学分度盘与半圆形玻璃砖 3D 器材组件
 * 适用于光的折射定律、全反射、折射率测定实验
 */
import * as THREE from 'three';
import { makeCylinder, makeTextSprite } from '../primitives';

export interface OpticalDiskHandles {
    group: THREE.Group;
    glassBlock: THREE.Mesh;
    laserEmitter: THREE.Group;
    incidentBeam: THREE.Line;
    refractedBeam: THREE.Line;
    reflectedBeam: THREE.Line;
    angleLabel: THREE.Sprite;
}

export function createOpticalDisk(
    diskRadius = 1.6,
    centerY = 1.4
): { group: THREE.Group; handles: OpticalDiskHandles } {
    const group = new THREE.Group();

    // 1. 光学分度盘 (白色哑光圆盘，立在 X-Y 平面)
    const disk = makeCylinder(diskRadius, 0.04, 0xf1f5f9, 0.6, 0.1);
    disk.rotation.x = Math.PI / 2;
    disk.position.set(0, centerY, -0.025);
    group.add(disk);

    // 分度盘外圈刻度线环 (每 30° 粗线，每 10° 细线)
    const dialLineGroup = new THREE.Group();
    for (let deg = 0; deg < 360; deg += 10) {
        const rad = (deg * Math.PI) / 180;
        const isMajor = deg % 30 === 0;
        const innerR = diskRadius - (isMajor ? 0.15 : 0.08);
        const outerR = diskRadius - 0.02;

        const pts = [
            new THREE.Vector3(Math.cos(rad) * innerR, centerY + Math.sin(rad) * innerR, 0),
            new THREE.Vector3(Math.cos(rad) * outerR, centerY + Math.sin(rad) * outerR, 0)
        ];
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: isMajor ? 0x1e293b : 0x94a3b8, linewidth: 2 })
        );
        dialLineGroup.add(line);
    }
    group.add(dialLineGroup);

    // 法线 (点划线)
    const normalPts = [
        new THREE.Vector3(0, centerY + diskRadius * 0.9, 0.005),
        new THREE.Vector3(0, centerY - diskRadius * 0.9, 0.005)
    ];
    const normalLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(normalPts),
        new THREE.LineDashedMaterial({ color: 0x64748b, dashSize: 0.08, gapSize: 0.05 })
    );
    normalLine.computeLineDistances();
    group.add(normalLine);

    // 介质分界面水平基准线
    const interfacePts = [
        new THREE.Vector3(-diskRadius * 0.9, centerY, 0.005),
        new THREE.Vector3(diskRadius * 0.9, centerY, 0.005)
    ];
    const interfaceLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(interfacePts),
        new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 })
    );
    group.add(interfaceLine);

    // 2. 半圆形光学玻璃砖 (安装在分度盘下半部，圆心对齐法线交点)
    const glassGeo = new THREE.CylinderGeometry(diskRadius * 0.55, diskRadius * 0.55, 0.14, 48, 1, false, 0, Math.PI);
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        transmission: 0.85,
        ior: 1.5,
        metalness: 0.05
    });
    const glassBlock = new THREE.Mesh(glassGeo, glassMat);
    glassBlock.rotation.x = Math.PI / 2;
    glassBlock.rotation.z = Math.PI; // 平面朝上对准界面
    glassBlock.position.set(0, centerY, 0.05);
    group.add(glassBlock);

    // 3. 激光发射器组件 (随入射角绕圆心旋转)
    const laserEmitter = new THREE.Group();
    const laserBarrel = makeCylinder(0.04, 0.28, 0xdc2626, 0.3, 0.8);
    laserBarrel.rotation.z = Math.PI / 2;
    laserEmitter.add(laserBarrel);
    group.add(laserEmitter);

    // 4. 光线 (入射光线红色高亮、折射光线深红、反射光线微红)
    const redMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 3 });
    const incidentBeam = new THREE.Line(new THREE.BufferGeometry(), redMat);
    const refractedBeam = new THREE.Line(new THREE.BufferGeometry(), redMat);
    const reflectedBeam = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: 0xf87171, linewidth: 1 })
    );
    group.add(incidentBeam);
    group.add(refractedBeam);
    group.add(reflectedBeam);

    // 5. 角度说明标牌
    const angleLabel = makeTextSprite('入射角 θ₁ → 折射角 θ₂', '#0f172a', 24, { x: 1.1, y: 0.22 });
    angleLabel.position.set(0, centerY + diskRadius + 0.3, 0);
    group.add(angleLabel);

    const handles: OpticalDiskHandles = {
        group,
        glassBlock,
        laserEmitter,
        incidentBeam,
        refractedBeam,
        reflectedBeam,
        angleLabel
    };

    return { group, handles };
}

export function updateOpticalDisk(
    handles: OpticalDiskHandles,
    theta1Deg: number,
    n = 1.5,
    centerY = 1.4,
    diskRadius = 1.6
): void {
    const r1 = (theta1Deg * Math.PI) / 180;
    // 激光器位置 (位于空气中第二象限)
    const laserR = diskRadius * 0.85;
    const lx = -Math.sin(r1) * laserR;
    const ly = centerY + Math.cos(r1) * laserR;

    handles.laserEmitter.position.set(lx, ly, 0.05);
    handles.laserEmitter.rotation.z = -r1;

    // 入射光线 (从激光器到圆心)
    handles.incidentBeam.geometry.dispose();
    handles.incidentBeam.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lx, ly, 0.05),
        new THREE.Vector3(0, centerY, 0.05)
    ]);

    // 折射定律 n1*sin(theta1) = n2*sin(theta2), n1=1, n2=n
    const sinTheta2 = Math.sin(r1) / n;
    if (sinTheta2 <= 1.0) {
        const r2 = Math.asin(sinTheta2);
        const rx = Math.sin(r2) * (diskRadius * 0.75);
        const ry = centerY - Math.cos(r2) * (diskRadius * 0.75);

        handles.refractedBeam.geometry.dispose();
        handles.refractedBeam.geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, centerY, 0.05),
            new THREE.Vector3(rx, ry, 0.05)
        ]);
        handles.refractedBeam.visible = true;
    } else {
        // 全反射
        handles.refractedBeam.visible = false;
    }

    // 反射光线
    const reflX = Math.sin(r1) * (diskRadius * 0.75);
    const reflY = centerY + Math.cos(r1) * (diskRadius * 0.75);
    handles.reflectedBeam.geometry.dispose();
    handles.reflectedBeam.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, centerY, 0.05),
        new THREE.Vector3(reflX, reflY, 0.05)
    ]);
}
