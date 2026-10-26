/**
 * 电磁阻尼 rig — 磁极间的摆动圆盘 + ω(t) 读数 (#159 F-A3 / #161)
 *
 * 单一真源：角速度 ω(t) 读 charts.angular_velocity_vs_time(s/rad·s⁻¹)；
 * τ_c / ω₀ 读 maxValues。替代误用 ampereForceRig。
 * 圆盘摆角由 ω(t) 积分 (装饰动画，非另造物理)。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeSphere, makeTextSprite } from '../primitives';
import { interpSeries } from '../../../rendering/renderingUtils';
import { num, setLabel, STAGE_CENTER_X } from './params';

const PIVOT_Y = 2.6;
const ARM_L = 1.0;

export interface EmDampingHandles {
    group: THREE.Group;
    arm: THREE.Mesh;
    disk: THREE.Mesh;
    magnetN: THREE.Mesh;
    magnetS: THREE.Mesh;
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
    /** 累积摆角 (跨帧积分) */
    angle: number;
    lastTime: number;
}

export function emDampingReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): { omega: number; tauC: number; omega0: number } {
    const c = result ? chartsOf(result, 'em-damping') : undefined;
    const mv = result?.diagnostics?.maxValues ?? {};
    return {
        omega: interpSeries(c?.angular_velocity_vs_time, timeS),
        tauC: num(mv['tauC_s'], NaN),
        omega0: num(mv['omega0_rad_s'], num(params['angularSpeed'], 100))
    };
}

export const emDampingRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, 1.8, 0];
        const distance = 8.2;
        return {
            target,
            position: [target[0] + distance * 0.12, target[1] + distance * 0.2, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();

        // 支架
        const beam = makeBox(1.8, 0.08, 0.12, 0x475569, 0.5, 0.2);
        beam.position.set(STAGE_CENTER_X, PIVOT_Y + 0.1, 0);
        group.add(beam);

        // 摆臂 + 圆盘 (铜盘)
        const arm = makeBox(0.05, ARM_L, 0.05, 0x94a3b8, 0.4, 0.4);
        arm.position.set(STAGE_CENTER_X, PIVOT_Y - ARM_L / 2, 0);
        group.add(arm);
        const disk = makeSphere(0.22, 0xb87333, { metalness: 0.6, roughness: 0.3 });
        disk.scale.set(1, 0.16, 1); // 扁盘
        disk.position.set(STAGE_CENTER_X, PIVOT_Y - ARM_L, 0);
        group.add(disk);

        // 磁极 (圆盘两侧)
        const magnetN = makeBox(0.3, 0.5, 0.3, 0xef4444, 0.4, 0.2);
        magnetN.position.set(STAGE_CENTER_X - 0.45, PIVOT_Y - ARM_L, 0);
        const magnetS = makeBox(0.3, 0.5, 0.3, 0x3b82f6, 0.4, 0.2);
        magnetS.position.set(STAGE_CENTER_X + 0.45, PIVOT_Y - ARM_L, 0);
        group.add(magnetN, magnetS);

        const label = makeTextSprite('', '#b45309', 24, { x: 3.6, y: 0.44 });
        label.position.set(STAGE_CENTER_X, PIVOT_Y + 0.6, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, PIVOT_Y + 1.1, 0.2);
        group.add(infoLabel);

        const handles: EmDampingHandles = {
            group,
            arm,
            disk,
            magnetN,
            magnetS,
            label,
            infoLabel,
            angle: 0.5,
            lastTime: 0
        };
        applyReadouts(handles, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as EmDampingHandles, params, result, 0);
    },

    onAnimate(handles, ctx) {
        const h = handles as EmDampingHandles;
        const dt = Math.max(0, Math.min(ctx.time - h.lastTime, 0.1));
        h.lastTime = ctx.time;
        const r = emDampingReadouts(ctx.params, ctx.result, ctx.time);
        // 摆角积分 (装饰)：ω 随时间衰减
        h.angle += r.omega * dt;
        // 摆臂绕支点旋转 (xz 平面摆动)
        const pivot = new THREE.Vector3(STAGE_CENTER_X, PIVOT_Y, 0);
        const swing = new THREE.Vector3(Math.sin(h.angle) * ARM_L, -Math.cos(h.angle) * ARM_L, 0);
        const end = pivot.clone().add(swing);
        h.disk.position.copy(end);
        h.arm.position.copy(pivot.clone().add(swing.clone().multiplyScalar(0.5)));
        h.arm.rotation.z = h.angle;
        applyReadouts(h, ctx.params, ctx.result, ctx.time);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, PIVOT_Y - ARM_L + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X, PIVOT_Y, 0);
    }
};

function applyReadouts(
    h: EmDampingHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): void {
    const r = emDampingReadouts(params, result, timeS);
    setLabel(h.label, `角速度 ω = ${r.omega.toFixed(2)} rad/s`, '#b45309');
    const tauText = Number.isFinite(r.tauC) ? `τ_c = ${(r.tauC * 1000).toFixed(2)} ms` : 'τ_c —';
    setLabel(
        h.infoLabel,
        `ω₀ = ${r.omega0.toFixed(0)} rad/s | ${tauText} | 磁阻尼使摆动迅速衰减 | 读数源自引擎 charts`,
        '#1e293b'
    );
    // 磁极随 ω 减弱而“变淡”，示意阻尼来源随转速下降
    const frac = Math.min(Math.abs(r.omega) / Math.max(r.omega0, 1e-9), 1);
    (h.magnetN.material as THREE.MeshStandardMaterial).opacity = 0.5 + 0.4 * frac;
    (h.magnetS.material as THREE.MeshStandardMaterial).opacity = 0.5 + 0.4 * frac;
}
