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
 *
 * 单一真源 (#159 逐节审计 · 批次 F-2):
 *   旧版本的所有读数 (ν₀ / E_k / U_c) 都是 rig 本地按 `W₀ / h` 自算的,
 *   引擎 `diagnostics.maxValues` 里的 workFunction_eV / thresholdFrequency_THz /
 *   h_over_e / slope_dUc_dnu **一个都没用** —— 引擎改公式时标牌不会跟着变。
 *   现在读数全部来自引擎:
 *     - 标量 → `diagnostics.maxValues`;
 *     - E_k / U_c → 引擎 charts (`x_t` = U_c–ν, `y_t` = E_k–ν) 插值;
 *     - 演示时钟 (时间 → 当前频率) → `utils/photoelectricSweep`。
 *   同时修正两处视觉缺陷:
 *     - `ownParticles: true` —— 引擎轨迹是 (0,0) 占位点, 舞台按轨迹画的
 *       默认球/轨迹线/投影线会在光电管下方留一条无意义的竖线;
 *     - 显式 `framing` —— 旧版依赖轨迹包围盒自动取景, 装置在画面里过小。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import { getChart, PHYSICS_CONSTANTS } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeSphere, makeTextPanelSprite, makeTextSprite } from '../primitives';
import { createPhototube, type PhototubeHandles } from '../equipment/phototube';
import { setLabel, STAGE_CENTER_X } from './params';
import { H_EV_PER_THZ, photoelectricSweep } from '../../../utils/photoelectricSweep';

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

/** 3D rig 读数 — 单一真源: 引擎 maxValues + 引擎 charts */
export interface PhotoelectricRigReadouts {
    source: 'engine' | 'fallback';
    /** 逸出功 W₀ (eV) */
    workFunction_eV: number;
    /** 极限频率 ν₀ (THz) */
    thresholdFrequency_THz: number;
    /** h/e (V·s) —— U_c–ν 斜率 */
    hOverE: number;
    /** 当前入射频率 (THz, 演示时钟映射) */
    nu: number;
    /** 光子能量 hν (eV) */
    hNu_eV: number;
    /** 光电子最大初动能 E_k (eV) —— 引擎 E_k–ν 曲线插值 */
    maxKinetic_eV: number;
    /** 截止电压 U_c (V) —— 引擎 U_c–ν 曲线插值 */
    cutoffVoltage_V: number;
    /** 是否发生光电效应 (ν > ν₀) */
    emitting: boolean;
}

function engValue(result: SimulationResult | null | undefined, key: string): number | undefined {
    const v = result?.diagnostics?.maxValues?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** 引擎 chart 插值 (曲线 x 升序; 域外取端点值) */
function interpChart(result: SimulationResult | null | undefined, key: 'x_t' | 'y_t', nu: number): number | undefined {
    if (!result) return undefined;
    const chart = getChart(result, 'photoelectric', key);
    if (!chart || chart.points.length === 0) return undefined;
    const pts = chart.points;
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (!first || !last) return undefined;
    if (nu <= first.x) return first.y;
    if (nu >= last.x) return last.y;
    for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (!p) continue;
        if (nu <= p.x) {
            const prev = pts[i - 1];
            if (!prev) return p.y;
            const span = p.x - prev.x;
            if (span <= 1e-12) return p.y;
            return prev.y + ((p.y - prev.y) * (nu - prev.x)) / span;
        }
    }
    return last.y;
}

export function photoelectricRigReadouts(
    result: SimulationResult | null | undefined,
    params: Record<string, number>,
    time: number
): PhotoelectricRigReadouts {
    const sweep = photoelectricSweep(params, time);

    const engW0 = engValue(result, 'workFunction_eV');
    const engNu0 = engValue(result, 'thresholdFrequency_THz');
    const engH = engValue(result, 'h');
    const engE = engValue(result, 'e');
    const engHOverE = engValue(result, 'h_over_e');

    const workFunction_eV = engW0 ?? params['W0'] ?? 2.3;
    const thresholdFrequency_THz = engNu0 ?? workFunction_eV / H_EV_PER_THZ;
    const h = engH ?? PHYSICS_CONSTANTS.h.value;
    const e = engE ?? PHYSICS_CONSTANTS.e.value;
    const hOverE = engHOverE ?? h / e;

    // 引擎语义: ν < ν₀ 时「截止电压不存在」, 曲线里没有这一段点 ⇒ 此处取 0
    const belowThreshold = sweep.nu <= thresholdFrequency_THz;
    const fallbackEk = Math.max(0, H_EV_PER_THZ * sweep.nu - workFunction_eV);
    const maxKinetic_eV = belowThreshold ? 0 : (interpChart(result, 'y_t', sweep.nu) ?? fallbackEk);
    const cutoffVoltage_V = belowThreshold ? 0 : (interpChart(result, 'x_t', sweep.nu) ?? Math.max(0, maxKinetic_eV));
    const hNu_eV = (h * sweep.nu * 1e12) / e;

    return {
        source: engNu0 !== undefined && engW0 !== undefined ? 'engine' : 'fallback',
        workFunction_eV,
        thresholdFrequency_THz,
        hOverE,
        nu: sweep.nu,
        hNu_eV,
        maxKinetic_eV,
        cutoffVoltage_V,
        emitting: sweep.nu > thresholdFrequency_THz
    };
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

function updateReadout(handles: PhotoHandles, read: PhotoelectricRigReadouts): void {
    setLabel(
        handles.readoutLabel,
        `入射光 ν = ${read.nu.toFixed(0)} THz | hν = ${read.hNu_eV.toFixed(2)} eV | E_k = ${read.maxKinetic_eV.toFixed(2)} eV`,
        '#1d4ed8'
    );
    setLabel(
        handles.constantLabel,
        `W₀ = ${read.workFunction_eV.toFixed(2)} eV | 极限频率 ν₀ = ${read.thresholdFrequency_THz.toFixed(0)} THz | U_c = ${read.cutoffVoltage_V.toFixed(2)} V`,
        '#475569'
    );
    setLabel(
        handles.stateLabel,
        read.emitting ? 'ν > ν₀：光电子逸出 → 光电流 I > 0' : 'ν < ν₀：无光电子逸出（增大光强也无光电流）',
        read.emitting ? '#059669' : '#dc2626'
    );
}

function framingFor(): SceneFraming {
    // 装置主体 x ∈ [-1.35, 0.55] (相对 rig 根), 图例面板在 x≈1.65,
    // 顶部标牌到 y≈2.95 —— 显式取景, 避免自动取景把装置缩成一小块。
    // 目标点抬高到 y=1.58: 顶部标题 (y=2.85) 才不会被视口顶部的
    // 「3D 透视 / 正面 / 俯视」工具条压住 (工具条占视口顶部约 55 px)。
    const target: [number, number, number] = [STAGE_CENTER_X + 0.35, 1.58, 0];
    const distance = 4.35;
    return {
        target,
        // 相机略偏左上方：从光阴极「发射面」一侧看，光电子不会被阴极板挡住
        position: [target[0] - distance * 0.1, target[1] + distance * 0.24, distance * 0.96],
        distance
    };
}

export const photoelectricRig: SceneRig = {
    worldScale: 0.16,
    // 引擎轨迹是 (0,0) 占位点 → 舞台不生成默认球/轨迹线/投影线
    ownParticles: true,
    clampToGround: false,
    autoAnimate: true,

    framing() {
        return framingFor();
    },

    buildEquipment(_scene, params, result) {
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
        updateReadout(handles, photoelectricRigReadouts(result, params, 0));

        return { group: root, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as PhotoHandles;
        h.lastLabelTime = Number.NEGATIVE_INFINITY;
        updateReadout(h, photoelectricRigReadouts(result, params, 0));
    },

    onAnimate(handles, ctx) {
        const h = handles as PhotoHandles;
        const { time, params, result } = ctx;
        const read = photoelectricRigReadouts(result, params, time);
        const [r, g, b] = frequencyToRgb(read.nu);

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

        // 光电子：只有 ν > ν₀ 才逸出；速度随 E_k 增大
        const emit = read.emitting;
        const speed = 1.5 + Math.sqrt(Math.max(0, read.maxKinetic_eV)) * 0.55;
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
            updateReadout(h, read);
            h.lastLabelTime = time;
        }
    },

    getVisualPosition(_pos, _params) {
        // 引擎轨迹是 (0,0) 占位点 (光电效应没有确定轨迹) —— 装置运动由 rig 自建动画承担
        return new THREE.Vector3(STAGE_CENTER_X + 0.18, CENTER_Y, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(STAGE_CENTER_X + 0.18, CENTER_Y, 0);
    }
};
