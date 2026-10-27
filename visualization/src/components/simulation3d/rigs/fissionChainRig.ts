/**
 * 链式反应 rig — 逐代中子数柱 + 增殖系数读数 (#159 F-A3 / #161)
 *
 * 单一真源：每代中子数读 charts.x_t / charts.y_t；增殖系数 k / 代数 / 总裂变数读 maxValues。
 * 替代误用 nuclearRig（α 粒子散射）。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.2;
const BAR_SPAN = 3.8;
const BAR_H = 1.4;

export interface FissionChainHandles {
    group: THREE.Group;
    bars: THREE.Mesh[];
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

export function fissionReadouts(result: SimulationResult | null | undefined): {
    k: number;
    genMax: number;
    totalFissions: number;
    generations: number;
} {
    const mv = result?.diagnostics?.maxValues ?? {};
    const c = result ? chartsOf(result, 'fission-chain') : undefined;
    return {
        k: num(mv['k'], NaN),
        genMax: num(mv['genMax'], NaN),
        totalFissions: num(mv['totalFissions'], NaN),
        generations: c?.x_t?.points.length ?? 0
    };
}

export const fissionChainRig: SceneRig = {
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
        const c = result ? chartsOf(result, 'fission-chain') : undefined;
        const pts = c?.x_t && c.y_t ? c.x_t.points.map((p, i) => ({ x: p.x, y: c.y_t!.points[i]?.y ?? 0 })) : [];
        if (pts.length >= 2) {
            const xMin = pts[0]!.x;
            const xMax = pts[pts.length - 1]!.x;
            const spanX = Math.max(xMax - xMin, 1e-6);
            const yMax = Math.max(...pts.map(p => p.y), 1e-9);
            const barW = Math.max((BAR_SPAN / pts.length) * 0.6, 0.01);
            for (const pt of pts) {
                const h = Math.max((pt.y / yMax) * BAR_H, 0.004);
                const bar = makeBox(barW, h, 0.3, 0xf59e0b, 0.4, 0.35);
                bar.position.set(STAGE_CENTER_X + ((pt.x - xMin) / spanX - 0.5) * BAR_SPAN, CENTER_Y + h / 2, 0);
                group.add(bar);
                bars.push(bar);
            }
        }

        const label = makeTextSprite('', '#b45309', 22, { x: 1.1, y: 0.4 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + BAR_H + 0.55, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 1.1, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + BAR_H + 0.95, 0.2);
        group.add(infoLabel);

        const handles: FissionChainHandles = { group, bars, label, infoLabel };
        applyReadouts(handles, result);
        return { group, handles };
    },

    updateEquipment(handles, _params, result) {
        applyReadouts(handles as FissionChainHandles, result);
    },

    onAnimate() {
        /* 静态逐代柱 */
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X - BAR_SPAN / 2, CENTER_Y, 0);
    }
};

function applyReadouts(h: FissionChainHandles, result: SimulationResult | null | undefined): void {
    const r = fissionReadouts(result);
    const kText = Number.isFinite(r.k) ? `增殖系数 k = ${r.k.toFixed(2)}` : 'k —';
    const regime = Number.isFinite(r.k) ? (r.k > 1 ? '超临界' : r.k < 1 ? '次临界' : '临界') : '';
    setLabel(h.label, `链式反应 ${kText}${regime ? ' (' + regime + ')' : ''}`, '#b45309');
    const gen = Number.isFinite(r.genMax) ? `最大代 ${r.genMax.toFixed(0)}` : '';
    const tot = Number.isFinite(r.totalFissions) ? `总裂变 ${r.totalFissions.toFixed(0)}` : '';
    setLabel(h.infoLabel, `${gen} | ${tot} | 每代中子数源自引擎 charts`, '#1e293b');
}
