/**
 * 油膜法估测油酸分子大小实验 rig — 浅水盘 + 痱子粉层 + 微量滴管 + 单分子油膜扩散 + 坐标方格玻璃板
 * 测量单分子油膜面积 S 与纯油酸体积 V，估算出油酸分子直径 d = V / S ~ 10⁻¹⁰ m
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface OilHandles {
    filmMesh: THREE.Mesh;
    fallingDrop: THREE.Mesh;
    powderPoints: THREE.Points;
    powderInitPos: Float32Array;
    dropperGroup: THREE.Group;
    gridPlate: THREE.Mesh;
    label: THREE.Sprite;
}

export const oilFilmRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 0.15;
        const trayRadius = 1.65;

        // ==================== 1. 搪瓷水盘与水层 ====================
        // 搪瓷浅圆盘底座
        const trayBase = makeCylinder(trayRadius + 0.12, 0.08, 0x1e3a8a, 0.3, 0.3);
        trayBase.position.set(0, cy, 0);
        group.add(trayBase);

        // 搪瓷水盘立壁 (白色搪瓷内壁 + 蓝边)
        const trayRim = new THREE.Mesh(
            new THREE.CylinderGeometry(trayRadius + 0.1, trayRadius + 0.1, 0.18, 48, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.2, metalness: 0.5, side: THREE.DoubleSide })
        );
        trayRim.position.set(0, cy + 0.08, 0);
        group.add(trayRim);

        // 水层表面 (高反射清水)
        const water = new THREE.Mesh(
            new THREE.CylinderGeometry(trayRadius, trayRadius, 0.12, 48),
            new THREE.MeshPhysicalMaterial({
                color: 0x60a5fa,
                transparent: true,
                opacity: 0.72,
                roughness: 0.05,
                transmission: 0.85,
                ior: 1.33
            })
        );
        water.position.set(0, cy + 0.04, 0);
        group.add(water);

        // ==================== 2. 爽身粉 (痱子粉) 表面颗粒群 ====================
        const powderCount = 260;
        const powderGeo = new THREE.BufferGeometry();
        const powderPos = new Float32Array(powderCount * 3);
        const powderInitPos = new Float32Array(powderCount * 3);

        for (let i = 0; i < powderCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * (trayRadius * 0.94);
            const px = Math.cos(theta) * r;
            const pz = Math.sin(theta) * r;
            const py = cy + 0.105;

            powderPos[i * 3] = px;
            powderPos[i * 3 + 1] = py;
            powderPos[i * 3 + 2] = pz;

            powderInitPos[i * 3] = px;
            powderInitPos[i * 3 + 1] = py;
            powderInitPos[i * 3 + 2] = pz;
        }
        powderGeo.setAttribute('position', new THREE.BufferAttribute(powderPos, 3));
        const powderPoints = new THREE.Points(
            powderGeo,
            new THREE.PointsMaterial({
                color: 0xfef9c3,
                size: 0.035,
                transparent: true,
                opacity: 0.85
            })
        );
        group.add(powderPoints);

        // ==================== 3. 单分子油酸薄膜 (虹彩干涉边缘) ====================
        const filmMesh = new THREE.Mesh(
            new THREE.CircleGeometry(0.8, 48),
            new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.55,
                roughness: 0.1,
                side: THREE.DoubleSide
            })
        );
        filmMesh.rotation.x = -Math.PI / 2;
        filmMesh.position.set(0, cy + 0.108, 0);
        group.add(filmMesh);

        // ==================== 4. 上方透明坐标方格玻璃板 (数格测面积) ====================
        const plateSize = 2.4;
        const gridPlate = new THREE.Mesh(
            new THREE.BoxGeometry(plateSize, 0.015, plateSize),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.35,
                roughness: 0.05,
                transmission: 0.92
            })
        );
        gridPlate.position.set(0, cy + 0.16, 0);

        // 方格网格线刻画
        const gridGroup = new THREE.Group();
        const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 });
        const step = 0.2;
        for (let x = -plateSize / 2; x <= plateSize / 2 + 0.001; x += step) {
            const pts = [new THREE.Vector3(x, 0.01, -plateSize / 2), new THREE.Vector3(x, 0.01, plateSize / 2)];
            const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
            gridGroup.add(l);
        }
        for (let z = -plateSize / 2; z <= plateSize / 2 + 0.001; z += step) {
            const pts = [new THREE.Vector3(-plateSize / 2, 0.01, z), new THREE.Vector3(plateSize / 2, 0.01, z)];
            const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
            gridGroup.add(l);
        }
        gridPlate.add(gridGroup);
        group.add(gridPlate);

        // ==================== 5. 微量滴管与下落液滴 ====================
        const dropperGroup = new THREE.Group();
        const dropBody = makeCylinder(0.04, 0.85, 0x94a3b8, 0.2, 0.8);
        dropperGroup.add(dropBody);
        const bulb = makeSphere(0.09, 0xdc2626, { roughness: 0.4, metalness: 0.1 });
        bulb.position.set(0, 0.45, 0);
        dropperGroup.add(bulb);
        const nozzle = makeCylinder(0.012, 0.25, 0xd4d4d8, 0.2, 0.9);
        nozzle.position.set(0, -0.5, 0);
        dropperGroup.add(nozzle);

        dropperGroup.position.set(0, 1.8, 0);
        group.add(dropperGroup);

        // 下落液滴
        const fallingDrop = makeSphere(0.028, 0x38bdf8, {
            roughness: 0.1,
            metalness: 0.2,
            emissive: 0x0284c7,
            emissiveIntensity: 0.4
        });
        fallingDrop.position.set(0, 1.1, 0);
        group.add(fallingDrop);

        // 状态 HUD
        const label = makeTextSprite('油膜法估测分子大小', '#0f172a', 26, { x: 2.3, y: 0.36 });
        label.position.set(0, 2.55, 0);
        group.add(label);

        const handles: OilHandles = {
            filmMesh,
            fallingDrop,
            powderPoints,
            powderInitPos,
            dropperGroup,
            gridPlate,
            label
        };
        updateOil(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateOil(handles as unknown as OilHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as OilHandles;
        if (!h.fallingDrop || !h.filmMesh) return;

        const cycle = (ctx.time % 4.5) / 4.5; // 4.5s 一个下落-扩散周期
        const cy = 0.15;
        const waterSurfaceY = cy + 0.108;
        const dropStartY = 1.15;

        // 前 0.3 周期：液滴从滴管口自由下落
        if (cycle < 0.25) {
            const dropProg = cycle / 0.25;
            h.fallingDrop.visible = true;
            h.fallingDrop.position.y = dropStartY - dropProg * (dropStartY - waterSurfaceY);
            h.filmMesh.scale.set(0.05, 0.05, 0.05);
        } else {
            // 液滴已落水，开始单分子油酸膜向四周扩展
            h.fallingDrop.visible = false;
            const spreadProg = Math.min(1.0, (cycle - 0.25) / 0.45);
            const areaCm2 = num(ctx.params['filmArea'], 200);
            // 将 200 cm² 映射到 3D 视觉半径 (最大约 1.25)
            const targetRadius = Math.max(0.4, Math.min(1.35, Math.sqrt(areaCm2 / 200) * 0.95));
            const curRadius = targetRadius * Math.sin(spreadProg * Math.PI * 0.5);

            h.filmMesh.scale.set(curRadius / 0.8, curRadius / 0.8, 1);

            // 爽身粉被油膜向外推挤
            const posAttr = h.powderPoints.geometry.attributes.position as THREE.BufferAttribute;
            const arr = posAttr.array as Float32Array;
            const init = h.powderInitPos;

            for (let i = 0; i < arr.length / 3; i++) {
                const ix = init[i * 3] ?? 0;
                const iz = init[i * 3 + 2] ?? 0;
                const r0 = Math.hypot(ix, iz);

                if (r0 < curRadius) {
                    const normX = ix / (r0 + 0.001);
                    const normZ = iz / (r0 + 0.001);
                    const pushedR = curRadius + (r0 / curRadius) * 0.22;
                    arr[i * 3] = normX * pushedR;
                    arr[i * 3 + 2] = normZ * pushedR;
                } else {
                    arr[i * 3] = ix;
                    arr[i * 3 + 2] = iz;
                }
            }
            posAttr.needsUpdate = true;
        }
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.6, 0);
    }
};

function updateOil(h: OilHandles, params: Record<string, number>): void {
    const concRatio = num(params['oilConcentration'], 500); // 1:500
    const drops = num(params['dropsPerMl'], 50); // 50 滴/mL
    const area = num(params['filmArea'], 200); // cm²

    // 1 滴纯油酸体积 (mL = cm³)
    const vOneDropSol = 1.0 / drops;
    const vPureOil = vOneDropSol / concRatio; // cm³
    // 分子直径 d = V / S
    const dMeters = (vPureOil * 1e-6) / (area * 1e-4); // cm³->m³, cm²->m²
    const dNm = dMeters * 1e9;

    setLabel(
        h.label,
        `浓缩比 1:${concRatio.toFixed(0)}  滴数=${drops.toFixed(0)}/mL  S=${area.toFixed(0)}cm² | V纯=${(vPureOil * 1e5).toFixed(2)}×10⁻⁵mL | 分子直径 d=${dNm.toFixed(2)}nm (~10⁻¹⁰m)`,
        '#0f172a'
    );
}
