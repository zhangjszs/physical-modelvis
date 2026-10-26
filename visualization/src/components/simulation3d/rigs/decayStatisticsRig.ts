/**
 * 衰变统计规律 rig — 引擎直方图柱 + 高斯参数读数 (#159 F-A3 / #161)
 *
 * 单一真源：直方图 (bin, count) 读 charts.x_t / charts.y_t；
 * 均值 λ、标准差 σ、峰值 bin 读 maxValues。替代误用 nuclearRig（α 粒子散射）。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.2;
const BAR_SPAN = 3.8;
const BAR_H = 1.3;

export interface DecayStatsHandles {
    group: THREE.Group;
    bars: THREE.Mesh[];
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

export function decayStatsReadouts(result: SimulationResult | null | undefined): {
    lambda: number;
    sigma: number;
    maxBin: number;
    bins: number;
} {
    const mv = result?.diagnostics?.maxValues ?? {};
    const c = result ? chartsOf(result, 'decay-statistics') : undefined;
    return {
        lambda: num(mv['lambda'], NaN),
        sigma: num(mv['sigma'], NaN),
        maxBin: num(mv['maxBin'], NaN),
        bins: c?.x_t?.points.length ?? 0
    };
}

export const decayStatisticsRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y + 0.5, 0];
        const distance = 7.8;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.18, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, _params, result) {
        const group = new THREE.Group();
        const bars: THREE.Mesh[] = [];
        const c = result ? chartsOf(result, 'decay-statistics') : undefined;
        const pts = c?.x_t && c.y_t ? c.x_t.points.map((p, i) => ({ x: p.x, y: c.y_t!.points[i]?.y ?? 0 })) : [];
        if (pts.length >= 2) {
            const xMin = pts[0]!.x;
            const xMax = pts[pts.length - 1]!.x;
            const spanX = Math.max(xMax - xMin, 1e-6);
            const yMax = Math.max(...pts.map(p => p.y), 1e-9);
            const barW = Math.max((BAR_SPAN / pts.length) * 0.72, 0.01);
            for (const pt of pts) {
                const h = Math.max((pt.y / yMax) * BAR_H, 0.004);
                const bar = makeBox(barW, h, 0.3, 0x0ea5e9, 0.4, 0.35);
                bar.position.set(STAGE_CENTER_X + ((pt.x - xMin) / spanX - 0.5) * BAR_SPAN, CENTER_Y + h / 2, 0);
                group.add(bar);
                bars.push(bar);
            }
        }

        const label = makeTextSprite('', '#0369a1', 22, { x: 3.6, y: 0.4 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + BAR_H + 0.55, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + BAR_H + 0.95, 0.2);
        group.add(infoLabel);

        const handles: DecayStatsHandles = { group, bars, label, infoLabel };
        applyReadouts(handles, result);
        return { group, handles };
    },

    updateEquipment(handles, _params, result) {
        applyReadouts(handles as DecayStatsHandles, result);
    },

    onAnimate() {
        /* 静态直方图 */
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X - BAR_SPAN / 2, CENTER_Y, 0);
    }
};

function applyReadouts(h: DecayStatsHandles, result: SimulationResult | null | undefined): void {
    const r = decayStatsReadouts(result);
    const lam = Number.isFinite(r.lambda) ? `均值 λ = ${r.lambda.toFixed(1)}` : 'λ —';
    const sig = Number.isFinite(r.sigma) ? `σ = ${r.sigma.toFixed(2)}` : 'σ —';
    const peak = Number.isFinite(r.maxBin) ? `峰值 bin = ${r.maxBin.toFixed(0)}` : '';
    setLabel(h.label, `多次计数统计 | ${lam} | ${sig}`, '#0369a1');
    setLabel(h.infoLabel, `${peak} | ${r.bins} 个 bin | 直方图源自引擎 charts | √λ 与 σ 对应`, '#1e293b');
}
