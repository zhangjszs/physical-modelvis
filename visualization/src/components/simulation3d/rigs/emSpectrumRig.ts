/**
 * 电磁波谱 rig — 对数频率谱带 + 高亮频段 + 引擎读数 (#159 F-A3 / #161)
 *
 * 单一真源：谱带强度曲线读 charts.spectrum_curve(Hz/相对强度)；
 * 频率范围 / 高亮中心频率 / 对应波长与光子能量读 maxValues。
 * 替代误用 emWaveRig（赫兹波装置，与“波谱分布”无关）。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.5;
/** 谱带分档 (名称, 起止 log10(Hz), 颜色) */
const BANDS: Array<{ name: string; lo: number; hi: number; color: number }> = [
    { name: '无线电', lo: 1, hi: 9, color: 0x64748b },
    { name: '微波', lo: 9, hi: 11.5, color: 0x0ea5e9 },
    { name: '红外', lo: 11.5, hi: 14.3, color: 0xef4444 },
    { name: '可见光', lo: 14.3, hi: 14.9, color: 0x22c55e },
    { name: '紫外', lo: 14.9, hi: 16.5, color: 0x8b5cf6 },
    { name: 'X/γ 射线', lo: 16.5, hi: 20, color: 0xf59e0b }
];

export interface EmSpectrumHandles {
    group: THREE.Group;
    bars: THREE.Mesh[];
    highlight: THREE.Mesh;
    curve: THREE.Line | null;
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

export function emSpectrumReadouts(result: SimulationResult | null | undefined): {
    freqMin: number;
    freqMax: number;
    center: number;
    wavelength: number;
    photonEnergy: number;
} {
    const mv = result?.diagnostics?.maxValues ?? {};
    return {
        freqMin: num(mv['freqMin_Hz'], NaN),
        freqMax: num(mv['freqMax_Hz'], NaN),
        center: num(mv['centerFreqHighlight_Hz'], NaN),
        wavelength: num(mv['waveLengthHighlight_m'], NaN),
        photonEnergy: num(mv['photonEnergyHighlight_eV'], NaN)
    };
}

/** log10(Hz) → 世界 x (映射 [1,20] 到 [CENTER−2.4, CENTER+2.4]) */
function logToWorldX(logHz: number): number {
    const t = Math.min(Math.max((logHz - 1) / 19, 0), 1);
    return STAGE_CENTER_X - 2.4 + t * 4.8;
}

export const emSpectrumRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 8.4;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.22, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, _params, result) {
        const group = new THREE.Group();
        const bars: THREE.Mesh[] = [];
        for (const band of BANDS) {
            const x0 = logToWorldX(band.lo);
            const x1 = logToWorldX(band.hi);
            const w = Math.max(x1 - x0, 0.02);
            const bar = makeBox(w, 0.34, 0.3, band.color, 0.4, 0.35);
            bar.position.set((x0 + x1) / 2, CENTER_Y, 0);
            group.add(bar);
            bars.push(bar);
        }

        // 高亮频段标记 (中心频率处竖线)
        const highlight = makeBox(0.05, 0.8, 0.34, 0x111827, 0.3, 0.5);
        highlight.position.set(STAGE_CENTER_X, CENTER_Y, 0.02);
        group.add(highlight);

        // 谱强度曲线 (引擎 spectrum_curve): log 频率 → x, 强度 → y
        const src = result ? chartsOf(result, 'em-spectrum')?.spectrum_curve : undefined;
        let curve: THREE.Line | null = null;
        if (src && src.points.length >= 2) {
            const pts = src.points;
            const xMin = pts[0]!.x;
            const xMax = pts[pts.length - 1]!.x;
            const spanX = Math.max(xMax - xMin, 1e-6);
            const world = pts.map(pt => {
                const wx = STAGE_CENTER_X + ((pt.x - xMin) / spanX - 0.5) * 4.6;
                const wy = CENTER_Y + 0.75 + Math.max(0, Math.min(pt.y, 1.2)) * 0.35;
                return new THREE.Vector3(wx, wy, 0);
            });
            curve = makeLine(world, 0x0f172a, 0.8);
            group.add(curve);
        }

        const label = makeTextSprite('', '#1e293b', 22, { x: 3.6, y: 0.4 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + 1.35, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#334155', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y - 0.85, 0.2);
        group.add(infoLabel);

        const handles: EmSpectrumHandles = { group, bars, highlight, curve, label, infoLabel };
        applyReadouts(handles, result);
        return { group, handles };
    },

    updateEquipment(handles, _params, result) {
        applyReadouts(handles as EmSpectrumHandles, result);
    },

    onAnimate() {
        /* 静态谱图 */
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X - 2.4, CENTER_Y, 0);
    }
};

function applyReadouts(h: EmSpectrumHandles, result: SimulationResult | null | undefined): void {
    const r = emSpectrumReadouts(result);
    const bandText = (hz: number): string => {
        if (!Number.isFinite(hz)) return '—';
        const logHz = Math.log10(hz);
        return BANDS.find(b => logHz >= b.lo && logHz < b.hi)?.name ?? '—';
    };
    const cText = Number.isFinite(r.center)
        ? `高亮 ≈ ${r.center.toExponential(1)} Hz (${bandText(r.center)})`
        : '高亮 —';
    setLabel(h.label, `电磁波谱 | ${cText}`, '#1e293b');
    const range =
        Number.isFinite(r.freqMin) && Number.isFinite(r.freqMax)
            ? `范围 ${r.freqMin.toExponential(0)} ~ ${r.freqMax.toExponential(0)} Hz`
            : '范围 —';
    const lam = Number.isFinite(r.wavelength) ? `λ ≈ ${(r.wavelength * 1e9).toFixed(0)} nm` : '';
    const e = Number.isFinite(r.photonEnergy) ? `E ≈ ${r.photonEnergy.toFixed(2)} eV` : '';
    setLabel(h.infoLabel, `${range} | ${lam} | ${e} | 曲线为引擎 spectrum_curve`, '#334155');

    // 高亮标记对齐到中心频率
    if (Number.isFinite(r.center)) {
        h.highlight.position.x = logToWorldX(Math.log10(r.center));
    } else {
        h.highlight.visible = false;
    }
}
