/**
 * 闭合电路欧姆定律与电路元器件 3D 实验 Rig
 * 覆盖：
 * 1. circuit: 闭合电路欧姆定律 I = E / (R + r)
 * 2. load-voltage: 路端电压随外电阻增大而增大 U = E - Ir
 * 3. bulb-vi: 小灯泡伏安特性（灯丝温度升高，非线性阻值增大）
 * 4. ac-current / security-alarm / light-control-switch: 交流回路与传感器控制电路
 * 包含：标准电路实验箱台面、数显稳压电源、陶瓷线绕滑动变阻器、
 * 发光白炽小灯泡、双数字多用电表（电压表 U / 电流表 I）与闭合回路导线。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface CircuitHandles {
    rootGroup: THREE.Group;
    bulbMesh: THREE.Mesh;
    bulbGlow: THREE.PointLight;
    sliderMesh: THREE.Mesh;
    lcdVoltage: THREE.Sprite;
    lcdCurrent: THREE.Sprite;
    statusLabel: THREE.Sprite;
    formulaLabel: THREE.Sprite;
    emf: number;
    internalR: number;
    loadR: number;
    currentI: number;
    voltageU: number;
}

export const circuitRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 标准电学实验箱台面 (长 2.8m, 宽 1.6m, 厚 0.08m)
        const board = makeBox(2.8, 0.08, 1.6, 0x1e293b, 0.5, 0.3);
        board.position.set(0, 0.04, 0);
        board.receiveShadow = true;
        group.add(board);

        // 台面防静电绝缘面板
        const matPlate = makeBox(2.68, 0.008, 1.48, 0x334155, 0.6, 0.1);
        matPlate.position.set(0, 0.084, 0);
        group.add(matPlate);

        // 2. 直流稳压电源模块 (位于左后方 (-0.9, 0.28, -0.4))
        const psuBox = makeBox(0.65, 0.36, 0.45, 0x0f172a, 0.4, 0.4);
        psuBox.position.set(-0.9, 0.26, -0.4);
        psuBox.castShadow = true;
        group.add(psuBox);

        // 电源前面板红色/黑色接线柱
        const termRed = makeCylinder(0.02, 0.05, 0xef4444, 0.3, 0.8);
        termRed.rotation.x = Math.PI / 2;
        termRed.position.set(-0.75, 0.22, -0.17);
        group.add(termRed);

        const termBlack = makeCylinder(0.02, 0.05, 0x1e293b, 0.3, 0.8);
        termBlack.rotation.x = Math.PI / 2;
        termBlack.position.set(-0.65, 0.22, -0.17);
        group.add(termBlack);

        // 3. 线绕式滑动变阻器 (位于后中央 (0.1, 0.2, -0.4))
        const rheoBase = makeBox(0.9, 0.05, 0.28, 0x475569, 0.4, 0.3);
        rheoBase.position.set(0.1, 0.11, -0.4);
        group.add(rheoBase);

        // 陶瓷绝缘管身
        const coilTube = makeCylinder(0.065, 0.75, 0xca8a04, 0.35, 0.6);
        coilTube.rotation.z = Math.PI / 2;
        coilTube.position.set(0.1, 0.2, -0.4);
        group.add(coilTube);

        // 金属滑杆与滑动触头
        const slideRod = makeCylinder(0.012, 0.78, 0xd1d5db, 0.2, 0.9);
        slideRod.rotation.z = Math.PI / 2;
        slideRod.position.set(0.1, 0.3, -0.4);
        group.add(slideRod);

        const sliderMesh = makeBox(0.08, 0.14, 0.14, 0x1e293b, 0.4, 0.5);
        sliderMesh.position.set(0.1, 0.25, -0.4);
        sliderMesh.castShadow = true;
        group.add(sliderMesh);

        // 4. 标准小灯泡座与发光小灯泡 (位于右前 (0.85, 0.18, 0.3))
        const socket = makeCylinder(0.12, 0.08, 0x475569, 0.4, 0.4);
        socket.position.set(0.85, 0.12, 0.3);
        group.add(socket);

        // 透明玻璃泡壳
        const bulbGeo = new THREE.SphereGeometry(0.12, 32, 32);
        const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            roughness: 0.1,
            metalness: 0.1,
            emissive: new THREE.Color(0xfacc15),
            emissiveIntensity: 0.8
        });
        const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
        bulbMesh.position.set(0.85, 0.26, 0.3);
        group.add(bulbMesh);

        // 小灯泡发散点光源
        const bulbGlow = new THREE.PointLight(0xfef08a, 4, 3.5);
        bulbGlow.position.set(0.85, 0.3, 0.3);
        group.add(bulbGlow);

        // 5. 闸刀开关 (位于左前 (-0.9, 0.14, 0.3))
        const switchBase = makeBox(0.35, 0.04, 0.2, 0x475569, 0.5, 0.2);
        switchBase.position.set(-0.9, 0.1, 0.3);
        group.add(switchBase);

        const switchBlade = makeBox(0.02, 0.03, 0.25, 0xd97706, 0.3, 0.85);
        switchBlade.position.set(-0.9, 0.14, 0.3);
        group.add(switchBlade);

        // 6. 双数字多用电表：电压表 U (前中偏左) 与 电流表 I (前中偏右)
        const makeMeter = (xPos: number, title: string, initVal: string, color: string) => {
            const meterBody = makeBox(0.42, 0.12, 0.35, 0x0f172a, 0.4, 0.4);
            meterBody.position.set(xPos, 0.14, 0.3);
            meterBody.castShadow = true;
            group.add(meterBody);

            const titleSprite = makeTextSprite(title, '#94a3b8', 22, { x: 0.35, y: 0.16 });
            titleSprite.position.set(xPos, 0.22, 0.2);
            group.add(titleSprite);

            const valSprite = makeTextSprite(initVal, color, 28, { x: 0.42, y: 0.18 });
            valSprite.position.set(xPos, 0.22, 0.36);
            group.add(valSprite);

            return valSprite;
        };

        const lcdVoltage = makeMeter(-0.35, '电压表 U', '12.0 V', '#38bdf8');
        const lcdCurrent = makeMeter(0.25, '电流表 I', '1.50 A', '#4ade80');

        // 7. 连接导线 (红/黑闭合回路导线)
        const wireMatRed = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
        const wireMatBlack = new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 2 });

        const ptsRed = [
            new THREE.Vector3(-0.75, 0.22, -0.17),
            new THREE.Vector3(-0.35, 0.1, -0.4),
            new THREE.Vector3(0.45, 0.1, -0.4),
            new THREE.Vector3(0.85, 0.12, 0.2)
        ];
        const wireRed = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsRed), wireMatRed);
        group.add(wireRed);

        const ptsBlack = [
            new THREE.Vector3(0.85, 0.12, 0.4),
            new THREE.Vector3(0.45, 0.1, 0.3),
            new THREE.Vector3(-0.15, 0.1, 0.3),
            new THREE.Vector3(-0.75, 0.1, 0.3),
            new THREE.Vector3(-0.65, 0.22, -0.17)
        ];
        const wireBlack = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsBlack), wireMatBlack);
        group.add(wireBlack);

        // 8. 原理与数据 HUD
        const statusLabel = makeTextSprite('闭合电路欧姆定律', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 1.45, 0);
        group.add(statusLabel);

        const formulaLabel = makeTextSprite('I = E / (R + r) | U = E - Ir', '#2563eb', 20, { x: 1.8, y: 0.24 });
        formulaLabel.position.set(0, 1.25, 0);
        group.add(formulaLabel);

        scene.add(group);

        const handles: CircuitHandles = {
            rootGroup: group,
            bulbMesh,
            bulbGlow,
            sliderMesh,
            lcdVoltage,
            lcdCurrent,
            statusLabel,
            formulaLabel,
            emf: 12,
            internalR: 1,
            loadR: 10,
            currentI: 1.09,
            voltageU: 10.91
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CircuitHandles;
        const emf = num(params['emf'] ?? params['voltage'] ?? 12, 12); // V
        const r = num(params['internalR'] ?? params['r'] ?? 1.0, 1.0); // Ω
        const R = num(params['loadR'] ?? params['R'] ?? params['resistance'] ?? 10.0, 10.0); // Ω

        h.emf = emf;
        h.internalR = r;
        h.loadR = R;

        // 闭合电路欧姆定律计算：
        // I = E / (R + r)
        // U = I * R = E - I * r
        const I = emf / Math.max(0.01, R + r);
        const U = I * R;
        h.currentI = I;
        h.voltageU = U;

        // 滑动变阻器滑头位置随 R 变化 (-0.25 到 0.45)
        const sliderX = THREE.MathUtils.clamp(-0.25 + (R / 30) * 0.7, -0.25, 0.45);
        h.sliderMesh.position.x = sliderX;

        // 小灯泡亮度 ∝ P = I * U
        const power = I * U;
        const glowFactor = THREE.MathUtils.clamp(power / 30, 0.05, 1.8);
        (h.bulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = glowFactor;
        h.bulbGlow.intensity = glowFactor * 5.0;

        // 数字表屏幕刷新
        if (h.lcdVoltage) {
            updateTextSprite(h.lcdVoltage, `${U.toFixed(2)} V`, '#38bdf8', 28);
        }
        if (h.lcdCurrent) {
            updateTextSprite(h.lcdCurrent, `${I.toFixed(2)} A`, '#4ade80', 28);
        }

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `电源电动势 E=${emf.toFixed(1)}V | 内阻 r=${r.toFixed(1)}Ω | 负载电阻 R=${R.toFixed(1)}Ω`,
                '#0f172a',
                22
            );
        }

        if (h.formulaLabel) {
            updateTextSprite(
                h.formulaLabel,
                `电流 I=E/(R+r)=${I.toFixed(2)}A | 路端电压 U=E-Ir=${U.toFixed(2)}V (小灯泡电功率 P=${power.toFixed(1)}W)`,
                '#2563eb',
                19
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CircuitHandles;
        if (!h.bulbMesh) return;

        const { time } = ctx;
        // 电流流动微脉冲律动
        const pulse = 1.0 + Math.sin(time * 5) * 0.03;
        (h.bulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity *= pulse;
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.2 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.2, 0);
    }
};
