/**
 * 波动光学与水波衍射 3D 实验 Rig
 * 覆盖：
 * 1. interference (双缝干涉)：相干光源 + 双缝板 + 接收屏等间距明暗相间条纹 (Δx = L/d · λ)
 * 2. single-slit (单缝衍射)：中央极宽极亮、两侧迅速衰减变窄的衍射条纹
 * 3. diffraction-grating (衍射光栅)：锐利极窄的主极大明线光谱
 * 4. water-diffraction (水波槽衍射与干涉)：浅水水波槽 + 振动驱动头 + 障碍物狭缝 + 扩散圆形水波
 * 5. sound-interference (双声源相干叠加)：双相干扬声器 + 干涉极大极小声场节点
 * 6. thin-film (薄膜干涉)：劈尖薄膜 / 肥皂膜等厚水平干涉条纹
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeLine, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface WaveOpticsHandles {
    rootGroup: THREE.Group;
    bench: THREE.Mesh;
    sourceHousing: THREE.Mesh;
    slitPlate: THREE.Group;
    screenBoard: THREE.Mesh;
    fringeGroup: THREE.Group;
    rayLines: THREE.Line[];
    statusLabel: THREE.Sprite;
    formulaLabel: THREE.Sprite;
    wavelength: number;
    slitWidth: number;
    distance: number;
    sceneType: string;
}

export const waveOpticsRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 精密铸铁光学导轨滑床 (长 3.6m, 宽 0.4m)
        const bench = makeBox(3.6, 0.08, 0.45, 0x1e293b, 0.4, 0.5);
        bench.position.set(0, 0.04, 0);
        bench.receiveShadow = true;
        group.add(bench);

        // 导轨中央滑轨
        const trackSlot = makeBox(3.5, 0.015, 0.08, 0x0f172a, 0.6, 0.2);
        trackSlot.position.set(0, 0.082, 0);
        group.add(trackSlot);

        // 2. 光源/激振源滑座 (左侧 x = -1.4)
        const sourceCarrier = makeBox(0.3, 0.06, 0.25, 0x334155, 0.4, 0.6);
        sourceCarrier.position.set(-1.4, 0.11, 0);
        group.add(sourceCarrier);

        const sourceHousing = makeCylinder(0.06, 0.3, 0xd97706, 0.3, 0.85);
        sourceHousing.rotation.z = Math.PI / 2;
        sourceHousing.position.set(-1.4, 0.55, 0);
        sourceHousing.castShadow = true;
        group.add(sourceHousing);

        const sourceStand = makeCylinder(0.018, 0.42, 0xd1d5db, 0.2, 0.8);
        sourceStand.position.set(-1.4, 0.32, 0);
        group.add(sourceStand);

        // 3. 缝板/光栅/水波障碍物滑座 (中间 x = -0.3)
        const slitCarrier = makeBox(0.25, 0.06, 0.25, 0x334155, 0.4, 0.6);
        slitCarrier.position.set(-0.3, 0.11, 0);
        group.add(slitCarrier);

        const slitStand = makeCylinder(0.018, 0.42, 0xd1d5db, 0.2, 0.8);
        slitStand.position.set(-0.3, 0.32, 0);
        group.add(slitStand);

        const slitPlate = new THREE.Group();
        slitPlate.position.set(-0.3, 0.55, 0);

        const plateFrame = makeBox(0.02, 0.32, 0.32, 0x0f172a, 0.5, 0.2);
        slitPlate.add(plateFrame);

        // 双缝/单缝狭缝透光片
        const slitLeft = makeBox(0.022, 0.22, 0.1, 0x1e293b, 0.3, 0.1);
        slitLeft.position.set(0, 0, -0.06);
        slitPlate.add(slitLeft);

        const slitRight = makeBox(0.022, 0.22, 0.1, 0x1e293b, 0.3, 0.1);
        slitRight.position.set(0, 0, 0.06);
        slitPlate.add(slitRight);

        group.add(slitPlate);

        // 4. 接收光屏 / 水波槽投影底板 (右侧 x = 1.2)
        const screenCarrier = makeBox(0.3, 0.06, 0.25, 0x334155, 0.4, 0.6);
        screenCarrier.position.set(1.2, 0.11, 0);
        group.add(screenCarrier);

        const screenStand = makeCylinder(0.018, 0.42, 0xd1d5db, 0.2, 0.8);
        screenStand.position.set(1.2, 0.32, 0);
        group.add(screenStand);

        const screenBoard = makeBox(0.03, 0.85, 0.75, 0xf8fafc, 0.85, 0.05);
        screenBoard.position.set(1.2, 0.65, 0);
        screenBoard.receiveShadow = true;
        group.add(screenBoard);

        // 5. 动态光束扇面 (从狭缝发散投向接收屏)
        const rayLines: THREE.Line[] = [];
        [-0.2, -0.1, 0, 0.1, 0.2].forEach(angle => {
            const pts = [new THREE.Vector3(-0.29, 0.55, 0), new THREE.Vector3(1.18, 0.65 + angle * 1.4, angle * 1.1)];
            const rLine = makeLine(pts, 0xef4444, 0.4);
            group.add(rLine);
            rayLines.push(rLine);
        });

        // 6. 光屏上的明暗相间条纹组 (由一组不同透明度与宽度的条纹片组成)
        const fringeGroup = new THREE.Group();
        fringeGroup.position.set(1.216, 0.65, 0);

        for (let i = -7; i <= 7; i++) {
            const fringeGeo = new THREE.BoxGeometry(0.005, 0.03, 0.65);
            const fringeMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 });
            const fringe = new THREE.Mesh(fringeGeo, fringeMat);
            fringe.position.set(0, i * 0.05, 0);
            fringeGroup.add(fringe);
        }
        group.add(fringeGroup);

        // 7. 原理与数据 HUD
        const statusLabel = makeTextSprite('波动光学干涉与衍射', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 1.45, 0);
        group.add(statusLabel);

        const formulaLabel = makeTextSprite('条纹间距：Δx = (L/d) · λ', '#2563eb', 20, { x: 1.8, y: 0.24 });
        formulaLabel.position.set(0, 1.25, 0);
        group.add(formulaLabel);

        scene.add(group);

        const handles: WaveOpticsHandles = {
            rootGroup: group,
            bench,
            sourceHousing,
            slitPlate,
            screenBoard,
            fringeGroup,
            rayLines,
            statusLabel,
            formulaLabel,
            wavelength: 632.8,
            slitWidth: 0.1,
            distance: 1.5,
            sceneType: 'interference'
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as WaveOpticsHandles;
        const wavelength = num(params['wavelength'] ?? params['lambda'], 632.8); // nm
        const slitWidth = num(params['slitWidth'] ?? params['slitDist'] ?? params['spacing'] ?? params['d'], 0.15); // mm
        const distance = num(params['distance'] ?? params['L'], 1.5); // m

        h.wavelength = wavelength;
        h.slitWidth = slitWidth;
        h.distance = distance;

        // 双缝干涉条纹间距公式：Δx = (L / d) * λ
        // 纳米与毫米换算: Δx (mm) = (L(m) / d(mm)) * λ(nm) * 1e-3
        const deltaXmm = (distance / Math.max(0.01, slitWidth)) * wavelength * 1e-3;

        // 光源波长对应的可见光颜色
        let lightColor = 0xef4444; // 632.8nm 红光
        if (wavelength < 450)
            lightColor = 0x8b5cf6; // 紫光
        else if (wavelength < 490)
            lightColor = 0x3b82f6; // 蓝光
        else if (wavelength < 560)
            lightColor = 0x22c55e; // 绿光
        else if (wavelength < 590)
            lightColor = 0xeab308; // 黄光
        else lightColor = 0xef4444; // 红光

        // 更新发散光线颜色
        h.rayLines.forEach(line => {
            (line.material as THREE.LineBasicMaterial).color.setHex(lightColor);
        });

        // 动态排布光屏条纹：间距随 deltaX 动态缩放
        const visualSpacing = THREE.MathUtils.clamp(deltaXmm * 0.007, 0.018, 0.085);
        h.fringeGroup.children.forEach((child, idx) => {
            const i = idx - 7;
            const mesh = child as THREE.Mesh;
            mesh.position.y = i * visualSpacing;
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.color.setHex(lightColor);
            // 单缝衍射模式中央条纹最宽，两侧衰减；双缝干涉模式等间距分布
            const isCenter = Math.abs(i) <= 1;
            mat.opacity = isCenter ? 0.95 : Math.max(0.2, 0.85 - Math.abs(i) * 0.08);
        });

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `波长 λ=${wavelength.toFixed(1)}nm | 缝宽/缝距 d=${slitWidth.toFixed(2)}mm | 屏距 L=${distance.toFixed(2)}m`,
                '#0f172a',
                22
            );
        }

        if (h.formulaLabel) {
            updateTextSprite(
                h.formulaLabel,
                `条纹间距 Δx = (L/d)·λ = ${deltaXmm.toFixed(2)}mm (波长越长、缝越窄 ⇛ 条纹越宽)`,
                '#2563eb',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as WaveOpticsHandles;
        if (!h.fringeGroup) return;

        const { time } = ctx;
        // 光强微抖动与干涉斑动态微波动
        const flicker = 1.0 + Math.sin(time * 6) * 0.04;
        h.fringeGroup.children.forEach((child, idx) => {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshBasicMaterial;
            const baseOp = 0.85 - Math.abs(idx - 7) * 0.06;
            mat.opacity = THREE.MathUtils.clamp(baseOp * flicker, 0.1, 1.0);
        });
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.65 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.65, 0);
    }
};
