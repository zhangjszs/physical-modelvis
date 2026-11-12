/**
 * 盖革计数器 rig — GM 计数管 + 脉冲闪烁 + 计数率读数 (#159 F-A3 / #161)
 *
 * 单一真源：计数率读 charts.y_t(s/Bq)、剩余核数读 charts.x_t；半衰期读 maxValues。
 * 替代误用 nuclearRig（α 粒子散射）。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { interpSeries } from '../../../rendering/renderingUtils';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.6;

export interface GeigerHandles {
    group: THREE.Group;
    tube: THREE.Mesh;
    pulses: THREE.Mesh[];
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
    lastTime: number;
}

export function geigerReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): { countRate: number; atoms: number; halfLife: number } {
    const c = result ? chartsOf(result, 'radioactive-decay') : undefined;
    const mv = result?.diagnostics?.maxValues ?? {};
    return {
        countRate: interpSeries(c?.y_t, timeS),
        atoms: interpSeries(c?.x_t, timeS),
        halfLife: num(mv['halfLife'], num(params['halfLife'], 10))
    };
}

export const geigerCounterRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 7.6;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.2, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        const tube = makeCylinder(0.14, 1.6, 0x94a3b8, 0.7, 0.3);
        tube.rotation.z = Math.PI / 2;
        tube.position.set(STAGE_CENTER_X, CENTER_Y, 0);
        group.add(tube);

        const pulses: THREE.Mesh[] = [];
        for (let i = 0; i < 6; i++) {
            const pulse = makeSphere(0.06, 0x22c55e, { emissive: 0x15803d, emissiveIntensity: 0.6 });
            pulse.position.set(STAGE_CENTER_X - 0.6 + i * 0.24, CENTER_Y + 0.28, 0);
            pulse.visible = false;
            group.add(pulse);
            pulses.push(pulse);
        }

        const label = makeTextSprite('', '#15803d', 24, { x: 1.1, y: 0.4 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + 0.95, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 1.1, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.45, 0.2);
        group.add(infoLabel);

        const handles: GeigerHandles = { group, tube, pulses, label, infoLabel, lastTime: 0 };
        applyReadouts(handles, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as GeigerHandles, params, result, 0);
    },

    onAnimate(handles, ctx) {
        const h = handles as GeigerHandles;
        const r = geigerReadouts(ctx.params, ctx.result, ctx.time);
        // 脉冲闪烁频率 ∝ 计数率 (装饰)
        const litCount = Math.max(0, Math.min(Math.round(Math.log10(r.countRate + 1) * 1.5), h.pulses.length));
        h.pulses.forEach((p, i) => {
            p.visible = i < litCount;
        });
        applyReadouts(h, ctx.params, ctx.result, ctx.time);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X, CENTER_Y, 0);
    }
};

function applyReadouts(
    h: GeigerHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): void {
    const r = geigerReadouts(params, result, timeS);
    setLabel(h.label, `计数率 ≈ ${r.countRate.toFixed(2)} 次/s`, '#15803d');
    setLabel(
        h.infoLabel,
        `剩余核数 ${r.atoms.toFixed(0)} | T½ = ${r.halfLife.toFixed(1)} s | 读数源自引擎 charts`,
        '#1e293b'
    );
}
