/**
 * 声波干涉 rig — 双喇叭 + 同心波前 + 引擎 scan_line 强度剖面 (#159 F-A3 / #161)
 *
 * 单一真源：沿扫描线的强度剖面读 charts.scan_line(m/相对强度)，
 * 观察点强度比 / λ / f / Δr 读 maxValues；波前与喇叭为示意几何。
 * 替代误用 waveOpticsRig（光的双缝干涉）。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.6;
const SPEAKER_Y = 1.0;

export interface SoundInterferenceHandles {
    group: THREE.Group;
    speakerL: THREE.Mesh;
    speakerR: THREE.Mesh;
    rings: THREE.Line[];
    profile: THREE.Line | null;
    observer: THREE.Mesh;
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
    sepWorld: number;
    lastTime: number;
}

export function soundInterferenceReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): { lambda: number; f: number; v: number; d: number; iRatio: number; deltaR: number } {
    const mv = result?.diagnostics?.maxValues ?? {};
    return {
        lambda: num(mv['lambda'], NaN),
        f: num(mv['f'], num(params['frequency'], 500)),
        v: num(mv['v'], num(params['soundSpeed'], 340)),
        d: num(mv['d'], num(params['speakerDist'], 3)),
        iRatio: num(mv['I_ratio'], NaN),
        deltaR: num(mv['deltaR'], NaN)
    };
}

function makeRing(): THREE.Line {
    const seg = 40;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    return makeLine(pts, 0x38bdf8, 0.5);
}

export const soundInterferenceRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 8.6;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.22, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        const d = Math.min(Math.max(num(params['speakerDist'], 3) * 0.4, 0.8), 2.6);

        const speakerL = makeBox(0.26, 0.34, 0.26, 0x334155, 0.5, 0.2);
        speakerL.position.set(STAGE_CENTER_X - d / 2, SPEAKER_Y, 0);
        const speakerR = makeBox(0.26, 0.34, 0.26, 0x334155, 0.5, 0.2);
        speakerR.position.set(STAGE_CENTER_X + d / 2, SPEAKER_Y, 0);
        group.add(speakerL, speakerR);

        const rings: THREE.Line[] = [];
        for (let i = 0; i < 8; i++) {
            const ring = makeRing();
            group.add(ring);
            rings.push(ring);
        }

        // 沿扫描线的强度剖面 (引擎 scan_line): x→世界 x, y(强度)→世界 y
        const scan = result ? chartsOf(result, 'sound-interference')?.scan_line : undefined;
        let profile: THREE.Line | null = null;
        if (scan && scan.points.length >= 2) {
            const pts = scan.points;
            const xMin = pts[0]!.x;
            const xMax = pts[pts.length - 1]!.x;
            const spanX = Math.max(xMax - xMin, 1e-6);
            const world = pts.map(pt => {
                const wx = STAGE_CENTER_X + ((pt.x - xMin) / spanX - 0.5) * 4.0;
                const wy = CENTER_Y + 1.1 + Math.max(0, Math.min(pt.y, 1.2)) * 0.6;
                return new THREE.Vector3(wx, wy, 0);
            });
            profile = makeLine(world, 0x16a34a, 0.9);
            group.add(profile);
        }

        const observer = makeSphere(0.1, 0xf59e0b);
        observer.position.set(STAGE_CENTER_X + 1.6, CENTER_Y, 0);
        group.add(observer);

        const label = makeTextSprite('', '#b45309', 24, { x: 3.4, y: 0.44 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + 0.62, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.75, 0.2);
        group.add(infoLabel);

        const handles: SoundInterferenceHandles = {
            group,
            speakerL,
            speakerR,
            rings,
            profile,
            observer,
            label,
            infoLabel,
            sepWorld: d,
            lastTime: 0
        };
        applyReadouts(handles, params, result);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as SoundInterferenceHandles, params, result);
    },

    onAnimate(handles, ctx) {
        const h = handles as SoundInterferenceHandles;
        // 两喇叭交替发射同心波前 (装饰; 间距/频率读引擎)
        const lambdaWorld = 0.6;
        for (let i = 0; i < h.rings.length; i++) {
            const ring = h.rings[i]!;
            const fromLeft = i % 2 === 0;
            const phase = ((ctx.time * 0.8 + i * 0.35) % 2.0) / 2.0;
            const r = phase * 2.2;
            ring.position.set(fromLeft ? h.speakerL.position.x : h.speakerR.position.x, SPEAKER_Y, 0);
            ring.scale.setScalar(Math.max(r * lambdaWorld, 1e-3));
            (ring.material as THREE.LineBasicMaterial).opacity = Math.max(0.05, 0.5 * (1 - phase));
        }
        applyReadouts(h, ctx.params, ctx.result);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X - 1.5, SPEAKER_Y, 0);
    }
};

function applyReadouts(
    h: SoundInterferenceHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): void {
    const r = soundInterferenceReadouts(params, result);
    const ratioText = Number.isFinite(r.iRatio) ? `I/I₀ = ${r.iRatio.toFixed(3)}` : 'I/I₀ —';
    setLabel(
        h.label,
        `观察点 ${ratioText} (${Number.isFinite(r.iRatio) && r.iRatio < 0.3 ? '相消/减弱' : r.iRatio > 0.7 ? '加强' : '部分干涉'})`,
        '#b45309'
    );
    const lam = Number.isFinite(r.lambda) ? `λ = ${r.lambda.toFixed(2)} m` : 'λ —';
    const dr = Number.isFinite(r.deltaR) ? `Δr = ${r.deltaR.toFixed(3)} m` : '';
    setLabel(
        h.infoLabel,
        `f = ${r.f.toFixed(0)} Hz | v = ${r.v.toFixed(0)} m/s | ${lam} | d = ${r.d.toFixed(1)} m | ${dr} | 读数源自引擎`,
        '#1e293b'
    );
}
