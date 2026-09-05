/**
 * 真空光电管实验装置 3D 器材组件
 * 适用于光电效应、测量普朗克常量、截止电压与饱和电流实验
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';

export interface PhototubeHandles {
    group: THREE.Group;
    lightBeam: THREE.Line;
    cathodePlate: THREE.Mesh;
    anodeRing: THREE.Mesh;
    readoutLabel: THREE.Sprite;
}

export function createPhototube(centerY = 1.3): { group: THREE.Group; handles: PhototubeHandles } {
    const group = new THREE.Group();

    // 1. 光学暗箱与实验基座
    const base = makeBox(2.8, 0.06, 1.2, 0x1e293b, 0.6, 0.2);
    base.position.set(0, 0.03, 0);
    group.add(base);

    // 2. 单色平行光源与透镜镜筒 (左侧)
    const lampHouse = makeBox(0.4, 0.4, 0.4, 0x334155, 0.4, 0.3);
    lampHouse.position.set(-1.1, centerY, 0);
    group.add(lampHouse);

    const lensTube = makeCylinder(0.1, 0.35, 0x475569, 0.3, 0.6);
    lensTube.rotation.z = Math.PI / 2;
    lensTube.position.set(-0.8, centerY, 0);
    group.add(lensTube);

    // 滤光片滑槽
    const filterSlot = makeBox(0.04, 0.26, 0.24, 0x6366f1, 0.3, 0.2);
    filterSlot.position.set(-0.7, centerY, 0);
    group.add(filterSlot);

    // 3. 真空光电管泡体 (高透球形玻璃泡)
    const bulbMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.28,
        roughness: 0.05,
        transmission: 0.9,
        ior: 1.48
    });
    const bulb = makeSphere(0.42, 0xe0f2fe);
    bulb.material = bulbMat;
    bulb.position.set(0.1, centerY, 0);
    group.add(bulb);

    // 管座
    const socket = makeCylinder(0.18, 0.22, 0x0f172a, 0.5, 0.2);
    socket.position.set(0.1, centerY - 0.42, 0);
    group.add(socket);

    // 阴极光电发射板 K (半圆柱金属板，受光照)
    const cathodeGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 32, 1, true, 0, Math.PI);
    const cathodeMat = new THREE.MeshStandardMaterial({
        color: 0xd97706, // 碱金属镀层质感 (铯/钠)
        metalness: 0.8,
        roughness: 0.25,
        side: THREE.DoubleSide
    });
    const cathodePlate = new THREE.Mesh(cathodeGeo, cathodeMat);
    cathodePlate.rotation.x = Math.PI / 2;
    cathodePlate.rotation.z = -Math.PI / 2;
    cathodePlate.position.set(0.18, centerY, 0);
    group.add(cathodePlate);

    // 阳极收集环 A (细金属丝圆环)
    const ringGeo = new THREE.TorusGeometry(0.12, 0.008, 16, 48);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const anodeRing = new THREE.Mesh(ringGeo, ringMat);
    anodeRing.rotation.y = Math.PI / 2;
    anodeRing.position.set(-0.05, centerY, 0);
    group.add(anodeRing);

    // 4. 入射单色光束 (高亮光束线)
    const beamPts = [new THREE.Vector3(-0.65, centerY, 0), new THREE.Vector3(0.18, centerY, 0)];
    const lightBeam = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(beamPts),
        new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 3 })
    );
    group.add(lightBeam);

    // 5. 测量说明标牌
    const readoutLabel = makeTextSprite('光电管 K-A | 爱因斯坦方程 E_k = hν - W₀', '#3b82f6', 22, { x: 1.3, y: 0.22 });
    readoutLabel.position.set(0, centerY + 0.65, 0);
    group.add(readoutLabel);

    const handles: PhototubeHandles = {
        group,
        lightBeam,
        cathodePlate,
        anodeRing,
        readoutLabel
    };

    return { group, handles };
}
