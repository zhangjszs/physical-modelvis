/**
 * 库仑力探究 rig — 两点电荷 + 斥力箭头 + 间距标尺 (#159 F-A3 / #161)
 *
 * 单一真源：库仑力大小读引擎 `diagnostics.maxValues.F0_N`；q₁/q₂/r 为输入回显 (读 param)。
 * 背景：coulomb-force-explore 曾误用 electroscopeRig（验电器箔片），3D 显示与
 * 「两点电荷库仑力」无关且读数冻结默认 (#159 F-A3)。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeLine, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.5;

export interface CoulombHandles {
    group: THREE.Group;
    q1: THREE.Mesh;
    q2: THREE.Mesh;
    arrow1: THREE.ArrowHelper;
    arrow2: THREE.ArrowHelper;
    ruler: THREE.Line;
    forceLabel: THREE.Sprite;
    rulerLabel: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

/** 间距显示映射 (cm → 世界单位)，限幅避免极端 r 撑出舞台 */
function displaySpan(distanceCm: number): number {
    return Math.min(3.2, Math.max(1.2, 1.2 + (distanceCm - 5) * 0.012));
}

/** 力箭头长度 (世界单位)：随力对数缩放，限幅 0.3–1.3 */
function arrowLen(F: number): number {
    if (!Number.isFinite(F) || F <= 0) return 0.3;
    return Math.min(1.3, Math.max(0.3, 0.3 + 0.45 * Math.log10(F / 3.6 + 1)));
}

export const coulombRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 7.2;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.2, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        const d = displaySpan(num(params['distance'], 5));

        const q1 = makeSphere(0.2, 0xef4444, { emissive: 0x991b1b, emissiveIntensity: 0.3 });
        q1.position.set(STAGE_CENTER_X - d / 2, CENTER_Y, 0);
        group.add(q1);
        const q2 = makeSphere(0.2, 0xef4444, { emissive: 0x991b1b, emissiveIntensity: 0.3 });
        q2.position.set(STAGE_CENTER_X + d / 2, CENTER_Y, 0);
        group.add(q2);

        // 同号电荷相斥：q1 受力向左 (-x)，q2 受力向右 (+x)
        const arrow1 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), q1.position, 0.5, 0xf59e0b, 0.12, 0.07);
        group.add(arrow1);
        const arrow2 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), q2.position, 0.5, 0xf59e0b, 0.12, 0.07);
        group.add(arrow2);

        const ruler = makeLine(
            [
                new THREE.Vector3(STAGE_CENTER_X - d / 2, CENTER_Y - 0.55, 0),
                new THREE.Vector3(STAGE_CENTER_X + d / 2, CENTER_Y - 0.55, 0)
            ],
            0x64748b,
            0.9
        );
        group.add(ruler);

        const forceLabel = makeTextSprite('', '#b45309', 22, { x: 1.7, y: 0.34 });
        forceLabel.position.set(STAGE_CENTER_X, CENTER_Y + 0.62, 0);
        group.add(forceLabel);
        const rulerLabel = makeTextSprite('', '#475569', 20, { x: 1.4, y: 0.3 });
        rulerLabel.position.set(STAGE_CENTER_X, CENTER_Y - 0.8, 0);
        group.add(rulerLabel);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.15, 0.2);
        group.add(infoLabel);

        const handles: CoulombHandles = { group, q1, q2, arrow1, arrow2, ruler, forceLabel, rulerLabel, infoLabel };
        applyReadouts(handles, params, result);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as CoulombHandles, params, result);
    },

    onAnimate() {
        /* 静态受力图，无逐帧动画 */
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X, CENTER_Y, 0);
    }
};

function applyReadouts(
    h: CoulombHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): void {
    const mv = result?.diagnostics?.maxValues ?? {};
    const q1 = num(params['q1'], num(mv['q1_muC'], 1));
    const q2 = num(params['q2'], num(mv['q2_muC'], 1));
    const rCm = num(params['distance'], num(mv['distance_cm'], 5));
    const F = num(mv['F0_N'], NaN);
    const fText = Number.isFinite(F) ? `F = ${F.toFixed(3)} N` : 'F = —';
    setLabel(h.forceLabel, `${fText} (引擎库仑力, 同号相斥)`, '#b45309');
    setLabel(h.rulerLabel, `r = ${rCm.toFixed(1)} cm`, '#475569');

    const kErr = num(mv['k_relative_error_pct'], NaN);
    const errText = Number.isFinite(kErr) ? ` | k 相对误差 ${kErr.toExponential(1)}%` : '';
    setLabel(h.infoLabel, `q₁ = ${q1.toFixed(1)} μC | q₂ = ${q2.toFixed(1)} μC | ${fText}${errText}`, '#1e293b');

    const len = arrowLen(F);
    h.arrow1.setLength(len, 0.12, 0.07);
    h.arrow2.setLength(len, 0.12, 0.07);
}
