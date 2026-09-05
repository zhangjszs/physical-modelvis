/**
 * 焦耳电功实验 rig — 双层电热量热器 + 螺旋发热电阻丝 + 数字稳压电源 + 水温上升
 * 验证电流热效应与焦耳定律 Q = I²·R·t = (U²/R)·t = c·M·ΔT
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface JouleElecHandles {
    coil: THREE.Mesh;
    water: THREE.Mesh;
    psuLabel: THREE.Sprite;
    thermometerMercury: THREE.Mesh;
    label: THREE.Sprite;
}

export const jouleElectricalRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 0.55;

        // ==================== 1. 双层绝热电热量热器 ====================
        const outerVessel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.95, 36, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.28,
                roughness: 0.08,
                transmission: 0.88,
                side: THREE.DoubleSide
            })
        );
        outerVessel.position.set(-0.6, cy, 0);
        group.add(outerVessel);

        const vesselBase = makeCylinder(0.68, 0.08, 0x1e293b, 0.5, 0.2);
        vesselBase.position.set(-0.6, 0.04, 0);
        group.add(vesselBase);

        // 量热器内水体
        const water = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.72, 32),
            new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.65,
                roughness: 0.2
            })
        );
        water.position.set(-0.6, cy - 0.06, 0);
        group.add(water);

        // 绝缘盖板与接线柱
        const lid = makeCylinder(0.56, 0.04, 0x334155, 0.4, 0.4);
        lid.position.set(-0.6, cy + 0.48, 0);
        group.add(lid);

        // 红/黑双色接线端子
        const postRed = makeCylinder(0.024, 0.08, 0xdc2626, 0.2, 0.8);
        postRed.position.set(-0.75, cy + 0.53, 0);
        group.add(postRed);
        const postBlack = makeCylinder(0.024, 0.08, 0x09090b, 0.2, 0.8);
        postBlack.position.set(-0.45, cy + 0.53, 0);
        group.add(postBlack);

        // 温度计
        const thermometerStem = makeCylinder(0.015, 0.85, 0xd4d4d8, 0.1, 0.9);
        thermometerStem.position.set(-0.6, cy + 0.55, 0.18);
        group.add(thermometerStem);
        const thermometerMercury = makeCylinder(0.012, 0.45, 0xdc2626, 0.2, 0.7);
        thermometerMercury.position.set(-0.6, cy + 0.35, 0.18);
        group.add(thermometerMercury);

        // 螺旋发热电阻丝 (紫铜/镍铬发热圈)
        const coil = new THREE.Mesh(
            new THREE.TorusGeometry(0.24, 0.035, 12, 36),
            new THREE.MeshStandardMaterial({
                color: 0xb45309,
                emissive: 0xd97706,
                emissiveIntensity: 0.6,
                roughness: 0.3,
                metalness: 0.7
            })
        );
        coil.position.set(-0.6, cy - 0.1, 0);
        group.add(coil);

        // ==================== 2. 数字稳压直流电源 ====================
        const psu = new THREE.Group();
        const psuBox = makeBox(1.1, 0.8, 0.8, 0x1e293b, 0.4, 0.3);
        psuBox.position.set(0.9, 0.44, 0);
        psu.add(psuBox);

        // 电源前面板双荧光显示屏
        const displayScreen = makeBox(0.8, 0.25, 0.02, 0x09090b, 0.2, 0.8);
        displayScreen.position.set(0.9, 0.62, 0.41);
        psu.add(displayScreen);

        const psuLabel = makeTextSprite('12.0 V  1.20 A', '#22c55e', 28, { x: 1.0, y: 0.25 });
        psuLabel.position.set(0.9, 0.62, 0.43);
        psu.add(psuLabel);

        // 旋钮与输出孔
        const vKnob = makeCylinder(0.05, 0.03, 0xd4d4d8, 0.2, 0.9);
        vKnob.rotation.x = Math.PI / 2;
        vKnob.position.set(0.65, 0.35, 0.41);
        psu.add(vKnob);
        const iKnob = makeCylinder(0.05, 0.03, 0xd4d4d8, 0.2, 0.9);
        iKnob.rotation.x = Math.PI / 2;
        iKnob.position.set(1.15, 0.35, 0.41);
        psu.add(iKnob);

        group.add(psu);

        // 状态 HUD
        const label = makeTextSprite('焦耳电功实验 (Q = I²Rt)', '#0f172a', 26, { x: 2.4, y: 0.36 });
        label.position.set(0, cy + 1.45, 0);
        group.add(label);

        const handles: JouleElecHandles = {
            coil,
            water,
            psuLabel,
            thermometerMercury,
            label
        };
        updateJE(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateJE(handles as unknown as JouleElecHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as JouleElecHandles;
        if (!h.coil) return;

        // 电热丝发热辉光轻微脉动
        const pulse = 0.5 + Math.sin(ctx.time * 8.0) * 0.15;
        (h.coil.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;

        // 温度随通电微弱升高模拟
        const cycle = (ctx.time % 6.0) / 6.0;
        const cy = 0.55;
        const tHeight = 0.25 + cycle * 0.45;
        h.thermometerMercury.scale.y = tHeight / 0.45;
        h.thermometerMercury.position.y = cy + 0.12 + tHeight / 2;
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.55 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.7, 0);
    }
};

function updateJE(h: JouleElecHandles, params: Record<string, number>): void {
    const U = num(params['voltage'], 12); // V
    const R = num(params['resistance'], 10); // Ω
    const t_s = num(params['time'], 300); // s
    const M = num(params['waterMass'], 0.5); // kg
    const c = 4184; // J/(kg*K)

    const I = U / Math.max(0.1, R);
    const P = U * I; // W
    const Q = P * t_s; // J
    const deltaT = Q / (c * M);

    setLabel(h.psuLabel, `${U.toFixed(1)}V  ${I.toFixed(2)}A`, '#22c55e');

    setLabel(
        h.label,
        `U=${U.toFixed(1)}V  R=${R.toFixed(1)}Ω (I=${I.toFixed(2)}A, P=${P.toFixed(1)}W) | 通电 t=${t_s.toFixed(0)}s | 电热 Q=${Q.toFixed(0)}J  ΔT=${deltaT.toFixed(2)}°C`,
        '#0f172a'
    );
}
