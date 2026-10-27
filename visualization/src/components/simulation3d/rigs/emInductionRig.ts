/**
 * 电磁感应 rig — 线圈 + 往复磁铁 + ε/Φ 读数 (#159 F-A3 / #161)
 *
 * 单一真源：感生电动势 ε(t) 与单匝磁通 Φ(t) 读引擎 charts
 *   `chartsOf(result,'em-induction').y_t`(mV) / `.x_t`(mWb)，按引擎周期 T 取模插值；
 *   ε_peak / N / B 读 diagnostics.maxValues。磁铁往复为装饰动画 (引擎无磁铁位置输出)。
 * 背景：em-induction 曾误用 ampereForceRig（安培力 F=BIL），3D 显示与电磁感应无关、
 * 读数冻结默认 (#159 F-A3)。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { interpSeries } from '../../../rendering/renderingUtils';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.5;
/** 线圈环数 (视觉示意) 与半径/长度 */
const RING_COUNT = 6;
const COIL_R = 0.42;
const COIL_LEN = 0.9;

export interface EmInductionHandles {
    group: THREE.Group;
    magnet: THREE.Group;
    rings: THREE.Line[];
    meterLabel: THREE.Sprite;
    infoLabel: THREE.Sprite;
    /** 引擎周期 (s) */
    period: number;
}

function makeRing(): THREE.Line {
    const seg = 40;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(0, Math.cos(a) * COIL_R, Math.sin(a) * COIL_R));
    }
    return makeLine(pts, 0xb87333, 0.9);
}

/** 引擎周期 (s)：maxValues 无 period 时用 ω 反推, 再退 20ms */
function periodOf(result: SimulationResult | null | undefined): number {
    const w = num(result?.diagnostics?.maxValues?.['angularFreq'], NaN);
    return Number.isFinite(w) && w > 0 ? (Math.PI * 2) / w : 0.02;
}

export const emInductionRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 8.0;
        return {
            target,
            position: [target[0] + distance * 0.12, target[1] + distance * 0.24, distance * 0.94],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();

        // 线圈 (多个圆环沿 x 排列)
        const rings: THREE.Line[] = [];
        for (let i = 0; i < RING_COUNT; i++) {
            const ring = makeRing();
            ring.position.set(STAGE_CENTER_X + (i / (RING_COUNT - 1) - 0.5) * COIL_LEN, CENTER_Y, 0);
            group.add(ring);
            rings.push(ring);
        }

        // 磁铁 (红 N / 蓝 S 两半)，沿线圈轴向往复
        const magnet = new THREE.Group();
        const nPole = makeBox(0.3, 0.26, 0.26, 0xef4444, 0.4, 0.2);
        nPole.position.set(-0.15, 0, 0);
        const sPole = makeBox(0.3, 0.26, 0.26, 0x3b82f6, 0.4, 0.2);
        sPole.position.set(0.15, 0, 0);
        magnet.add(nPole, sPole);
        magnet.position.set(STAGE_CENTER_X - COIL_LEN, CENTER_Y, 0);
        group.add(magnet);

        // 导轨
        const rail = makeLine(
            [
                new THREE.Vector3(STAGE_CENTER_X - 2.2, CENTER_Y - 0.5, 0),
                new THREE.Vector3(STAGE_CENTER_X + 2.2, CENTER_Y - 0.5, 0)
            ],
            0x94a3b8,
            0.6
        );
        group.add(rail);

        const meterLabel = makeTextSprite('', '#b91c1c', 24, { x: 1.1, y: 0.4 });
        meterLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.0, 0.2);
        group.add(meterLabel);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 1.1, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.55, 0.2);
        group.add(infoLabel);

        const handles: EmInductionHandles = { group, magnet, rings, meterLabel, infoLabel, period: periodOf(result) };
        applyReadouts(handles, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as EmInductionHandles;
        h.period = periodOf(result);
        applyReadouts(h, params, result, 0);
    },

    onAnimate(handles, ctx) {
        const h = handles as EmInductionHandles;
        const T = h.period;
        const phase = T > 0 ? ((ctx.time % T) + T) % T : 0;
        // 磁铁往复 (装饰)：一周期内穿过线圈往返
        const x = STAGE_CENTER_X + Math.sin((phase / T) * Math.PI * 2) * (COIL_LEN * 0.9);
        h.magnet.position.x = x;
        applyReadouts(h, ctx.params, ctx.result, phase);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X, CENTER_Y, 0);
    }
};

/** 读数单一真源 (导出供契约测试)：t 秒处 ε(V)/Φ单匝(mWb) + maxValues 常量 */
export function emInductionReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): { emfV: number; fluxMwB: number; N: number; B: number; emfPeakV: number } {
    const charts = result ? chartsOf(result, 'em-induction') : undefined;
    const xMs = timeS * 1000;
    const mv = result?.diagnostics?.maxValues ?? {};
    return {
        // 引擎 y_t 单位为 mV, 统一换算为 V 展示; maxValues.emfPeak 已是 V (SI)
        emfV: interpSeries(charts?.y_t, xMs) / 1000,
        fluxMwB: interpSeries(charts?.x_t, xMs),
        N: num(mv['turns'], num(params['Nturns'], 100)),
        B: num(mv['magneticField'], num(params['Bind'], 0.5)),
        emfPeakV: num(mv['emfPeak'], NaN)
    };
}

function applyReadouts(
    h: EmInductionHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): void {
    const r = emInductionReadouts(params, result, timeS);
    // ε(t) 为多匝总电动势 (引擎 y_t 已含 N 倍, 见 M3 批次 4 备注); 单匝磁通读 x_t
    setLabel(h.meterLabel, `感生电动势 ε = ${r.emfV.toFixed(2)} V  (Φ单匝 = ${r.fluxMwB.toFixed(2)} mWb)`, '#b91c1c');
    const peakText = Number.isFinite(r.emfPeakV) ? `ε_peak = ${r.emfPeakV.toFixed(1)} V` : 'ε_peak —';
    setLabel(h.infoLabel, `N = ${r.N} 匝 | B = ${r.B.toFixed(2)} T | ${peakText} | 读数源自引擎 charts`, '#1e293b');
}
