/**
 * 光电效应实验 rig — 真空光电管 + 单色光源 + 光子/光电子流 + 关键要素说明
 * 验证爱因斯坦光电方程 E_k = hν − W₀ 与截止电压 e·U_c = E_k
 *
 * 该场景是「讲解型装置」：仿真结果只有时间轴上的一个占位点，播放时间轴无法推进。
 * 通过 SceneRig.autoAnimate 让装置自带演示时钟：
 *   - 入射光频率 ν 在 [ν_min, ν_max] 内循环扫描，光束颜色随频率变化；
 *   - 光子持续从光源飞向阴极 K；
 *   - 仅当 hν > W₀ 时光电子从 K 飞向阳极 A（否则一个也不逸出）；
 *   - 数值面板实时给出 ν、hν、E_k、ν₀、U_c，并解释「为什么没光电流」。
 */
import * as THREE from 'three';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeSphere, makeTextPanelSprite, makeTextSprite } from '../primitives';
import { createPhototube, type PhototubeHandles } from '../equipment/phototube';
import { setLabel, STAGE_CENTER_X } from './params';
import { photoelectricSweep } from '../../../utils/photoelectricSweep';

const WORLD_SCALE = 0.16;
const CENTER_Y = 1.3;
const N_PHOTONS = 7;
const N_ELECTRONS = 6;

interface PhotoHandles {
    tubeHandles: PhototubeHandles;
    photons: THREE.Mesh[];
    electrons: THREE.Mesh[];
    beamMaterial: THREE.LineBasicMaterial;
    titleLabel: THREE.Sprite;
    readoutLabel: THREE.Sprite;
    constantLabel: THREE.Sprite;
    stateLabel: THREE.Sprite;
    legend: THREE.Sprite;
    lastLabelTime: number;
}

/** 可见光波长 (nm) → 近似 sRGB；紫外/红外用紫/暗红表示 */
function wavelengthToRgb(nm: number): [number, number, number] {
    if (nm < 380) return [0.45, 0.05, 0.9];
    if (nm > 780) return [0.55, 0.03, 0.02];
    let r = 0;
    let g = 0;
    let b = 0;
    if (nm < 440) {
        r = (440 - nm) / 60;
        b = 1;
    } else if (nm < 490) {
        g = (nm - 440) / 50;
        b = 1;
    } else if (nm < 510) {
        g = 1;
        b = (510 - nm) / 20;
    } else if (nm < 580) {
        r = (nm - 510) / 70;
        g = 1;
    } else if (nm < 645) {
        r = 1;
        g = (645 - nm) / 65;
    } else {
        r = 1;
    }
    // 两端做强度衰减，避免接近不可见区时仍显示高亮纯色
    const edge = Math.min(1, Math.min(nm - 380, 780 - nm) / 60);
    return [r * edge, g * edge, b * edge];
}

/** 频率 (THz) → RGB */
function frequencyToRgb(nuTHz: number): [number, number, number] {
    const nm = 299792.458 / Math.max(1, nuTHz);
    return wavelengthToRgb(nm);
}

/** 当前扫频频率与光电参数（与引擎同式，不重算动力学） */
function sweepState(params: Record<string, number>, time: number) {
    return photoelectricSweep(params, time);
}

function updateReadout(handles: PhotoHandles, params: Record<string, number>, time: number): void {
    const s = sweepState(params, time);
    setLabel(
        handles.readoutLabel,
        `入射光 ν = ${s.nu.toFixed(0)} THz | hν = ${s.hNu.toFixed(2)} eV | E_k = ${s.Ek.toFixed(2)} eV`,
        '#1d4ed8'
    );
    setLabel(
        handles.constantLabel,
        `W₀ = ${s.W0.toFixed(2)} eV | 极限频率 ν₀ = ${s.nu0.toFixed(0)} THz | 截止电压 U_c = ${s.Uc.toFixed(2)} V`,
        '#475569'
    );
    setLabel(
        handles.stateLabel,
        s.emitting ? 'ν > ν₀：光电子逸出 → 光电流 I > 0' : 'ν < ν₀：无光电子逸出（增大光强也无光电流）',
        s.emitting ? '#059669' : '#dc2626'
    );
    handles.lastLabelTime = time;
}

function framingFor(): SceneFraming {
    const target: [number, number, number] = [STAGE_CENTER_X + 0.35, CENTER_Y + 0.35, 0];
    const distance = 5.4;
    return {
        target,
        // 相机略偏左：从光阴极「发射面」一侧看，光电子不会被阴极板挡住
        position: [target[0] - distance * 0.12, target[1] + distance * 0.26, distance * 0.95],
        distance
    };
}

export const photoelectricRig: SceneRig = {
    worldScale: WORLD_SCALE,
    // 默认小球隐藏：光电子/光子由本 rig 自建并随演示时钟运动
    ballRadius: 0.001,
    clampToGround: false,
    autoAnimate: true,

    framing() {
        return framingFor();
    },

    buildEquipment(_scene, params) {
        const { group: tubeGroup, handles: tubeHandles } = createPhototube(CENTER_Y);
        // 旧的单行标牌保留在器材内但不再使用（改由 rig 提供分段说明）
        tubeHandles.readoutLabel.visible = false;

        const root = new THREE.Group();
        root.position.x = STAGE_CENTER_X;
        root.add(tubeGroup);

        const beamMaterial = tubeHandles.lightBeam.material as THREE.LineBasicMaterial;
        beamMaterial.transparent = true;
        beamMaterial.opacity = 0.85;

        // 入射光子流（光源 → 阴极）
        const photons: THREE.Mesh[] = [];
        for (let i = 0; i < N_PHOTONS; i++) {
            const photon = makeSphere(0.026, 0x60a5fa, {
                emissive: 0x60a5fa,
                emissiveIntensity: 1.8,
                roughness: 0.2
            });
            photon.castShadow = false;
            root.add(photon);
            photons.push(photon);
        }

        // 光电子流（阴极 K → 阳极 A），仅 hν > W₀ 时出现
        const electrons: THREE.Mesh[] = [];
        for (let i = 0; i < N_ELECTRONS; i++) {
            const electron = makeSphere(0.026, 0x22d3ee, {
                emissive: 0x22d3ee,
                emissiveIntensity: 2.4,
                roughness: 0.2
            });
            electron.castShadow = false;
            const material = electron.material as THREE.MeshStandardMaterial;
            material.transparent = true;
            material.opacity = 0.95;
            root.add(electron);
            electrons.push(electron);
        }

        // 标题 / 实时读数 / 关键要素图例
        const titleLabel = makeTextSprite('光电效应：光子 → 光电子 → 光电流', '#0f172a', 26, { x: 2.5, y: 0.66 });
        titleLabel.position.set(0.35, CENTER_Y + 1.55, 0.15);
        root.add(titleLabel);

        const readoutLabel = makeTextSprite('', '#1d4ed8', 22, { x: 2.4, y: 0.62 });
        readoutLabel.position.set(0.35, CENTER_Y + 1.15, 0.15);
        root.add(readoutLabel);

        const constantLabel = makeTextSprite('', '#475569', 20, { x: 2.2, y: 0.56 });
        constantLabel.position.set(0.35, CENTER_Y + 0.88, 0.15);
        root.add(constantLabel);

        const stateLabel = makeTextSprite('', '#dc2626', 20, { x: 2.2, y: 0.52 });
        stateLabel.position.set(0.35, CENTER_Y + 0.62, 0.15);
        root.add(stateLabel);

        const legend = makeTextPanelSprite(
            [
                '入射光 ν：颜色随频率变化',
                'K 阴极：受光逸出光电子 e⁻',
                'A 阳极：收集 e⁻ 形成光电流 I',
                '截止电压 U_c：eU_c = hν − W₀'
            ],
            {
                title: '关键要素：光电效应的物理图像',
                fontSize: 19,
                lineHeight: 27,
                padding: 14,
                worldHeight: 0.9,
                titleColor: '#1d4ed8'
            }
        );
        legend.position.set(1.65, CENTER_Y - 0.02, 0);
        root.add(legend);

        const handles: PhotoHandles = {
            tubeHandles,
            photons,
            electrons,
            beamMaterial,
            titleLabel,
            readoutLabel,
            constantLabel,
            stateLabel,
            legend,
            lastLabelTime: Number.NEGATIVE_INFINITY
        };
        updateReadout(handles, params, 0);

        return { group: root, handles };
    },

    updateEquipment(handles, params) {
        const h = handles as PhotoHandles;
        h.lastLabelTime = Number.NEGATIVE_INFINITY;
        updateReadout(h, params, 0);
    },

    onAnimate(handles, ctx) {
        const h = handles as PhotoHandles;
        const { time, params } = ctx;
        const s = sweepState(params, time);
        const [r, g, b] = frequencyToRgb(s.nu);

        // 光束颜色随频率变化
        h.beamMaterial.color.setRGB(r, g, b);
        h.beamMaterial.opacity = 0.6 + 0.2 * Math.sin(time * 8);

        // 光子沿光源 → 阴极运动
        for (let i = 0; i < h.photons.length; i++) {
            const photon = h.photons[i]!;
            const p = (time * 0.55 + i / h.photons.length) % 1;
            photon.position.set(-0.65 + p * 0.83, CENTER_Y + Math.sin(p * Math.PI * 2 + i) * 0.008, 0.035);
            const material = photon.material as THREE.MeshStandardMaterial;
            material.color.setRGB(r, g, b);
            material.emissive.setRGB(r, g, b);
            photon.visible = true;
        }

        // 光电子：只有 hν > W₀ 才逸出；速度随 E_k 增大
        const emit = s.emitting;
        const speed = 1.5 + Math.sqrt(s.Ek) * 0.55;
        for (let i = 0; i < h.electrons.length; i++) {
            const electron = h.electrons[i]!;
            if (!emit) {
                electron.visible = false;
                continue;
            }
            const p = (time * speed + i / h.electrons.length) % 1;
            const fade = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
            const lane = ((i % 3) - 1) * 0.06;
            electron.position.set(
                0.14 - p * 0.23,
                CENTER_Y + lane + 0.02 * Math.sin(p * Math.PI * 2 + i),
                0.3 + Math.floor(i / 3) * 0.06
            );
            const material = electron.material as THREE.MeshStandardMaterial;
            material.opacity = 0.25 + 0.7 * fade;
            electron.visible = p < 0.97;
        }

        // 阴极/阳极在逸出阶段发亮，强化「收集电子」的视觉因果
        const cathodeMat = h.tubeHandles.cathodePlate.material as THREE.MeshStandardMaterial;
        const anodeMat = h.tubeHandles.anodeRing.material as THREE.MeshStandardMaterial;
        const pulse = 0.5 + 0.5 * Math.sin(time * 8);
        cathodeMat.emissive.setRGB(emit ? 0.55 * pulse : 0, emit ? 0.32 * pulse : 0, 0);
        anodeMat.emissive.setRGB(0, emit ? 0.55 * pulse : 0, emit ? 0.6 * pulse : 0);

        // 文本节流（约 6 Hz），避免每帧重绘 canvas 纹理
        if (time - h.lastLabelTime > 0.16 || time < h.lastLabelTime) {
            updateReadout(h, params, time);
        }
    },

    getVisualPosition(pos, _params) {
        // 占位轨迹停留在阴极附近（装置运动由 rig 自建动画承担）
        return new THREE.Vector3(
            STAGE_CENTER_X + 0.18 - pos.x * WORLD_SCALE * 0.4,
            CENTER_Y + pos.y * WORLD_SCALE * 0.2,
            0
        );
    },

    getOrigin(_params) {
        return new THREE.Vector3(STAGE_CENTER_X + 0.18, CENTER_Y, 0);
    }
};
