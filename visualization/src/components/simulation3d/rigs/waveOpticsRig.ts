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
    /** 单缝前透明薄片示意 (#181 interference 专用，默认隐藏) */
    filmSlab: THREE.Mesh;
    screenBoard: THREE.Mesh;
    fringeGroup: THREE.Group;
    rayLines: THREE.Line[];
    statusLabel: THREE.Sprite;
    formulaLabel: THREE.Sprite;
    wavelength: number;
    slitWidth: number;
    distance: number;
    sceneType: string;
    /** 双缝单缝加薄片状态快照 (供 2D/3D 同源校验) */
    interferenceState?: {
        deltaYmm: number;
        fringeShiftMm: number;
        filmShiftOrders: number;
        hasFilm: boolean;
        shiftY: number;
    };
    /** 薄膜干涉状态快照 (#182, 供 2D/3D 同源校验) */
    thinFilmState?: {
        Rnorm: number;
        hasRelativeHalfWave: boolean;
        isSingleInterface: boolean;
        isConstructive: boolean;
        isDestructive: boolean;
    };
}

export const waveOpticsRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params, result) {
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

        // 单缝前透明薄片示意 (置于上缝 +y 侧，仅 interference 且 t>0 && n>1 时显式)
        const filmSlab = new THREE.Mesh(
            new THREE.BoxGeometry(0.014, 0.12, 0.24),
            new THREE.MeshPhysicalMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.55,
                roughness: 0.1
            })
        );
        filmSlab.position.set(0.026, 0.075, 0);
        filmSlab.visible = false;
        slitPlate.add(filmSlab);

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
            filmSlab,
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

        this.updateEquipment(handles, params, result);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as WaveOpticsHandles;
        const mv = result?.diagnostics?.maxValues as Record<string, number> | undefined;
        const wavelength = num(params['wavelength'] ?? params['lambda'], 632.8); // nm

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

        h.rayLines.forEach(line => {
            (line.material as THREE.LineBasicMaterial).color.setHex(lightColor);
        });

        // #181 interference 双缝干涉 (含单缝插透明薄片相移) 专用消费引擎分支
        const isInterference =
            'filmThickness' in params || (mv !== undefined && 'fringeShiftMm' in mv && 'deltaYmm' in mv);
        if (isInterference) {
            const slitSepMm = num(params['slitSep'] ?? mv?.slitSeparationMm, 0.5);
            const screenDistM = num(params['screenDist'] ?? mv?.screenDistanceM, 2.0);
            const filmThicknessUm = num(params['filmThickness'], 0);
            const filmN = num(params['filmN'], 1.38);
            const hasFilm = filmThicknessUm > 0 && filmN > 1;
            const deltaYmm = mv?.deltaYmm ?? (screenDistM / Math.max(0.01, slitSepMm)) * wavelength * 1e-3;
            const fallbackOptUm = hasFilm ? (filmN - 1) * filmThicknessUm : 0;
            const fringeShiftMm =
                mv?.fringeShiftMm ?? (hasFilm ? ((fallbackOptUm * 1e-6 * screenDistM) / (slitSepMm * 1e-3)) * 1e3 : 0);
            const filmShiftOrders = mv?.filmShiftOrders ?? (deltaYmm > 0 ? fringeShiftMm / deltaYmm : 0);

            h.wavelength = wavelength;
            h.slitWidth = slitSepMm;
            h.distance = screenDistM;
            h.sceneType = 'interference';
            h.filmSlab.visible = hasFilm;

            const visualSpacing = THREE.MathUtils.clamp(deltaYmm * 0.018, 0.02, 0.085);
            const shiftY = hasFilm ? THREE.MathUtils.clamp(filmShiftOrders * visualSpacing, -0.32, 0.32) : 0;
            h.interferenceState = { deltaYmm, fringeShiftMm, filmShiftOrders, hasFilm, shiftY };

            h.fringeGroup.children.forEach((child, idx) => {
                const i = idx - 7;
                const mesh = child as THREE.Mesh;
                const yPos = i * visualSpacing + shiftY;
                mesh.position.y = yPos;
                mesh.visible = Math.abs(yPos) <= 0.39;
                const mat = mesh.material as THREE.MeshBasicMaterial;
                mat.color.setHex(lightColor);
                const isCenter = Math.abs(i) <= 1;
                mat.opacity = isCenter ? 0.95 : Math.max(0.2, 0.85 - Math.abs(i) * 0.08);
            });

            if (h.statusLabel) {
                const filmText = hasFilm ? ` | 单缝薄片 t=${filmThicknessUm.toFixed(2)}μm, n=${filmN.toFixed(2)}` : '';
                updateTextSprite(
                    h.statusLabel,
                    `双缝干涉 λ=${wavelength.toFixed(0)}nm | d=${slitSepMm.toFixed(2)}mm | L=${screenDistM.toFixed(1)}m${filmText}`,
                    '#0f172a',
                    20
                );
            }
            if (h.formulaLabel) {
                const text = hasFilm
                    ? `Δy=${deltaYmm.toFixed(2)}mm (不变) | 单缝薄片平移 Δx=+${fringeShiftMm.toFixed(2)}mm (${filmShiftOrders.toFixed(2)}Δy)`
                    : `条纹间距 Δy = (L/d)·λ = ${deltaYmm.toFixed(2)}mm`;
                updateTextSprite(h.formulaLabel, text, '#2563eb', 19);
            }
            return;
        }

        // #182 thin-film 薄膜干涉 (Fresnel 复振幅与相对半波损失) 专用消费引擎分支
        const isThinFilm =
            'refIndex' in params ||
            'subsIndex' in params ||
            (mv !== undefined && 'Rnorm' in mv && 'r1' in mv && 'r2' in mv);
        if (isThinFilm) {
            const flags = result?.diagnostics?.flags as
                | {
                      hasRelativeHalfWave?: boolean;
                      isSingleInterface?: boolean;
                      isConstructive?: boolean;
                      isDestructive?: boolean;
                  }
                | undefined;
            const nFilm = num(params['refIndex'] ?? mv?.n, 1.38);
            const nSub = num(params['subsIndex'] ?? mv?.nSub, 1.5);
            const thickness = num(params['thickness'] ?? mv?.d, 300);
            const r1 = mv?.r1 ?? (1 - nFilm) / (1 + nFilm);
            const r2 = mv?.r2 ?? (nFilm - nSub) / (nFilm + nSub);
            const isSingleInterface = flags?.isSingleInterface ?? (Math.abs(r1) < 1e-12 || Math.abs(r2) < 1e-12);
            const hasRelativeHalfWave = flags?.hasRelativeHalfWave ?? (!isSingleInterface && r1 * r2 < 0);
            const cosT = mv?.cosT ?? 1;
            const phiFallback = (4 * Math.PI * nFilm * thickness * cosT) / wavelength;
            const c = Math.cos(phiFallback);
            const rFallback =
                (r1 * r1 + r2 * r2 + 2 * r1 * r2 * c) / Math.max(1e-12, 1 + r1 * r1 * r2 * r2 + 2 * r1 * r2 * c);
            const Rnorm = THREE.MathUtils.clamp(mv?.Rnorm ?? rFallback, 0, 1);
            const isConstructive = flags?.isConstructive ?? false;
            const isDestructive = flags?.isDestructive ?? false;

            h.wavelength = wavelength;
            h.sceneType = 'thin-film';
            h.filmSlab.visible = false;
            h.interferenceState = undefined;
            h.thinFilmState = {
                Rnorm,
                hasRelativeHalfWave,
                isSingleInterface,
                isConstructive,
                isDestructive
            };

            const visualSpacing = 0.045;
            const baseOpacity = THREE.MathUtils.clamp(0.25 + Rnorm * 2.5, 0.2, 0.95);
            h.fringeGroup.children.forEach((child, idx) => {
                const i = idx - 7;
                const mesh = child as THREE.Mesh;
                mesh.position.y = i * visualSpacing;
                mesh.visible = true;
                const mat = mesh.material as THREE.MeshBasicMaterial;
                mat.color.setHex(lightColor);
                mat.opacity = baseOpacity * (1 - Math.abs(i) * 0.05);
            });

            const phaseText = isSingleInterface
                ? '单界面反射'
                : hasRelativeHalfWave
                  ? '有相对半波损失 (+λ/2)'
                  : '无相对半波损失 (0)';
            const verdict = isSingleInterface
                ? '单界面反射'
                : isConstructive
                  ? '相长 (反射增强)'
                  : isDestructive
                    ? '相消 (增透减弱)'
                    : '过渡态';
            if (h.statusLabel) {
                updateTextSprite(
                    h.statusLabel,
                    `薄膜干涉 (1→${nFilm.toFixed(2)}→${nSub.toFixed(2)}) | d=${thickness.toFixed(0)}nm | ${phaseText}`,
                    '#0f172a',
                    20
                );
            }
            if (h.formulaLabel) {
                updateTextSprite(
                    h.formulaLabel,
                    `Airy 反射率 R=${(Rnorm * 100).toFixed(2)}% | ${verdict} (r₁=${r1.toFixed(2)}, r₂=${r2.toFixed(2)})`,
                    '#2563eb',
                    19
                );
            }
            return;
        }

        h.filmSlab.visible = false;
        h.interferenceState = undefined;
        h.thinFilmState = undefined;
        const slitWidth = num(params['slitWidth'] ?? params['slitDist'] ?? params['spacing'] ?? params['d'], 0.15); // mm
        const distance = num(params['distance'] ?? params['L'], 1.5); // m

        h.wavelength = wavelength;
        h.slitWidth = slitWidth;
        h.distance = distance;

        // 双缝干涉条纹间距公式：Δx = (L / d) * λ
        // 纳米与毫米换算: Δx (mm) = (L(m) / d(mm)) * λ(nm) * 1e-3
        const deltaXmm = (distance / Math.max(0.01, slitWidth)) * wavelength * 1e-3;

        // 动态排布光屏条纹：间距随 deltaX 动态缩放
        const visualSpacing = THREE.MathUtils.clamp(deltaXmm * 0.007, 0.018, 0.085);
        h.fringeGroup.children.forEach((child, idx) => {
            const i = idx - 7;
            const mesh = child as THREE.Mesh;
            mesh.position.y = i * visualSpacing;
            mesh.visible = true;
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
        const h = handles as WaveOpticsHandles;
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
