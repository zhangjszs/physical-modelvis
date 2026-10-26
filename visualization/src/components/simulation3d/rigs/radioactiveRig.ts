/**
 * 放射性衰变 rig — 样品 + 云室径迹 + N(t) 衰减曲线 + 读数 (#159 F-A3 / #161)
 *
 * 单一真源：剩余核数 N(t) 读 charts.x_t(s/个)，活度读 charts.y_t(s/Bq)；
 * 半衰期 / 初始核数 / 衰变常数读 maxValues；云室径迹为引擎 trajectories 示意。
 * 替代误用 nuclearRig（标题「α粒子散射」，与衰变无关）。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { interpSeries } from '../../../rendering/renderingUtils';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.5;
const CHAMBER_W = 2.2;
const CHAMBER_H = 1.4;

export interface RadioactiveHandles {
    group: THREE.Group;
    tracks: THREE.Line[];
    curve: THREE.Line | null;
    sample: THREE.Mesh;
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

export function radioactiveReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): { atoms: number; activity: number; halfLife: number; initialAtoms: number } {
    const c = result ? chartsOf(result, 'radioactive-decay') : undefined;
    const mv = result?.diagnostics?.maxValues ?? {};
    return {
        atoms: interpSeries(c?.x_t, timeS),
        activity: interpSeries(c?.y_t, timeS),
        halfLife: num(mv['halfLife'], num(params['halfLife'], 10)),
        initialAtoms: num(mv['initialAtoms'], num(params['N0'], 1000))
    };
}

export const radioactiveRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 8.2;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.22, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();

        // 样品 (放射源)
        const sample = makeBox(0.5, 0.28, 0.4, 0x78716c, 0.4, 0.5);
        sample.position.set(STAGE_CENTER_X - 1.1, CENTER_Y - 0.55, 0);
        group.add(sample);

        // 云室径迹 (引擎 trajectories 拟合到云室区域，装饰示意)
        const tracks: THREE.Line[] = [];
        const trajs = result?.trajectories ?? [];
        const all = trajs.flatMap(tr => tr.map(p => p.position));
        if (all.length) {
            let minX = Infinity,
                maxX = -Infinity,
                minY = Infinity,
                maxY = -Infinity;
            for (const p of all) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            }
            const spanX = Math.max(maxX - minX, 1e-6);
            const spanY = Math.max(maxY - minY, 1e-6);
            const s = Math.min(CHAMBER_W / spanX, CHAMBER_H / spanY);
            const midX = (minX + maxX) / 2;
            const midY = (minY + maxY) / 2;
            for (const tr of trajs.slice(0, 20)) {
                if (tr.length < 2) continue;
                const pts = tr.map(
                    p =>
                        new THREE.Vector3(
                            STAGE_CENTER_X + (p.position.x - midX) * s,
                            CENTER_Y + (p.position.y - midY) * s,
                            0
                        )
                );
                const line = makeLine(pts, 0x94a3b8, 0.35);
                group.add(line);
                tracks.push(line);
            }
        }

        // N(t) 衰减曲线 (引擎 x_t): t→x, N/N₀→y
        const src = result ? chartsOf(result, 'radioactive-decay')?.x_t : undefined;
        let curve: THREE.Line | null = null;
        if (src && src.points.length >= 2) {
            const pts = src.points;
            const xMin = pts[0]!.x;
            const xMax = pts[pts.length - 1]!.x;
            const spanX = Math.max(xMax - xMin, 1e-6);
            const yMax = Math.max(...pts.map(p => p.y), 1e-9);
            const world = pts.map(pt => {
                const wx = STAGE_CENTER_X + ((pt.x - xMin) / spanX - 0.5) * 3.6;
                const wy = CENTER_Y + 0.4 + (pt.y / yMax) * 0.8;
                return new THREE.Vector3(wx, wy, 0);
            });
            curve = makeLine(world, 0xef4444, 0.9);
            group.add(curve);
        }

        const label = makeTextSprite('', '#b91c1c', 22, { x: 3.6, y: 0.4 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + 1.55, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.95, 0.2);
        group.add(infoLabel);

        const handles: RadioactiveHandles = { group, tracks, curve, sample, label, infoLabel };
        applyReadouts(handles, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as RadioactiveHandles, params, result, 0);
    },

    onAnimate(handles, ctx) {
        applyReadouts(handles as RadioactiveHandles, ctx.params, ctx.result, ctx.time);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X - 1.1, CENTER_Y - 0.55, 0);
    }
};

function applyReadouts(
    h: RadioactiveHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): void {
    const r = radioactiveReadouts(params, result, timeS);
    setLabel(h.label, `剩余核数 N = ${r.atoms.toFixed(0)} 个 | 活度 A = ${r.activity.toFixed(2)} Bq`, '#b91c1c');
    setLabel(
        h.infoLabel,
        `N₀ = ${r.initialAtoms.toFixed(0)} | 半衰期 T½ = ${r.halfLife.toFixed(1)} s | 读数源自引擎 charts`,
        '#1e293b'
    );
}
