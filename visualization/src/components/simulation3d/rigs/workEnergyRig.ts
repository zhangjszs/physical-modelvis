/**
 * 动能定理 W = ΔEk 3D 实验 Rig
 * 包含：长铝合金导轨与刻度尺、带挡光片的实验滑车与增重块、
 * 导轨末端轻质定滑轮与悬挂重物拉索、双光电门测速门架、
 * 实时功与动能增量验证 HUD (W = F·s 与 ΔEk = ½mv² - ½mv₀² 实时严格等值)。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface WorkEnergyHandles {
    rootGroup: THREE.Group;
    cartGroup: THREE.Group;
    pulleyGroup: THREE.Group;
    hangingWeight: THREE.Mesh;
    stringHoriz: THREE.Line;
    stringVert: THREE.Line;
    arrowF: THREE.ArrowHelper;
    arrowV: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    dataLabel: THREE.Sprite;
    mass: number;
    force: number;
    v0: number;
}

export const workEnergyRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 阳极氧化铝合金实验长导轨 (长 3.6m, 宽 0.35m, 导轨面 y=0.38)
        const trackLen = 3.6;
        const trackTop = makeBox(trackLen, 0.06, 0.28, 0x94a3b8, 0.3, 0.7);
        trackTop.position.set(0, 0.38, 0);
        trackTop.receiveShadow = true;
        group.add(trackTop);

        // 导轨侧面精密毫米刻度条
        const scaleStrip = makeBox(trackLen, 0.02, 0.002, 0xf8fafc, 0.8, 0.1);
        scaleStrip.position.set(0, 0.38, 0.141);
        group.add(scaleStrip);

        // 支撑脚架 (两端)
        [-1.5, 1.5].forEach(sx => {
            const stand = makeBox(0.06, 0.35, 0.32, 0x334155, 0.4, 0.4);
            stand.position.set(sx, 0.175, 0);
            stand.castShadow = true;
            group.add(stand);
        });

        // 2. 右端转向定滑轮与悬挂重物
        const pulleyGroup = new THREE.Group();
        pulleyGroup.position.set(trackLen / 2 + 0.06, 0.42, 0);

        const pulleyBracket = makeBox(0.12, 0.1, 0.08, 0x1e293b, 0.4, 0.5);
        pulleyBracket.position.set(0, -0.04, 0);
        pulleyGroup.add(pulleyBracket);

        const pulleyWheel = makeCylinder(0.06, 0.02, 0xd97706, 0.3, 0.85);
        pulleyWheel.rotation.x = Math.PI / 2;
        pulleyWheel.position.set(0.04, 0, 0);
        pulleyGroup.add(pulleyWheel);

        group.add(pulleyGroup);

        // 细尼龙牵引线 (水平段与下垂段)
        const lineMat = new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 2 });
        const stringHoriz = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-1.2, 0.42, 0),
                new THREE.Vector3(1.86, 0.42, 0)
            ]),
            lineMat
        );
        group.add(stringHoriz);

        const stringVert = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(1.9, 0.42, 0),
                new THREE.Vector3(1.9, 0.08, 0)
            ]),
            lineMat
        );
        group.add(stringVert);

        // 悬挂小砝码桶 (重力提供恒定拉力 F)
        const hangingWeight = makeCylinder(0.04, 0.08, 0x475569, 0.3, 0.7);
        hangingWeight.position.set(1.9, 0.08, 0);
        hangingWeight.castShadow = true;
        group.add(hangingWeight);

        // 3. 实验动力滑车 (带顶部挡光片与挂钩)
        const cartGroup = new THREE.Group();
        cartGroup.position.set(-1.2, 0.45, 0);

        const cartBody = makeBox(0.35, 0.07, 0.22, 0x2563eb, 0.35, 0.3);
        cartBody.castShadow = true;
        cartGroup.add(cartBody);

        // 4 个精密低摩擦滚轮
        [
            [-0.12, -0.12],
            [-0.12, 0.12],
            [0.12, -0.12],
            [0.12, 0.12]
        ].forEach(([wx, wz]) => {
            const wheel = makeCylinder(0.035, 0.02, 0x0f172a, 0.3, 0.3);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(wx ?? 0, -0.035, wz ?? 0);
            cartGroup.add(wheel);
        });

        // 顶部挡光片 (宽 0.02m)
        const flag = makeBox(0.02, 0.08, 0.04, 0x0f172a, 0.5, 0.2);
        flag.position.set(0, 0.075, 0);
        cartGroup.add(flag);

        // 前端拉力挂钩
        const cartHook = makeCylinder(0.008, 0.03, 0xd97706, 0.3, 0.8);
        cartHook.rotation.z = Math.PI / 2;
        cartHook.position.set(0.18, 0, 0);
        cartGroup.add(cartHook);

        group.add(cartGroup);

        // 4. 双光电门测速门架 (位于 x = -0.4 和 x = 0.8)
        [-0.4, 0.8].forEach(gx => {
            const gate = new THREE.Group();
            gate.position.set(gx, 0.38, 0);

            const postBack = makeBox(0.03, 0.26, 0.03, 0x1e293b, 0.4, 0.4);
            postBack.position.set(0, 0.13, -0.15);
            gate.add(postBack);

            const postFront = makeBox(0.03, 0.26, 0.03, 0x1e293b, 0.4, 0.4);
            postFront.position.set(0, 0.13, 0.15);
            gate.add(postFront);

            const topBeam = makeBox(0.03, 0.03, 0.33, 0x1e293b, 0.4, 0.4);
            topBeam.position.set(0, 0.25, 0);
            gate.add(topBeam);

            const led = makeCylinder(0.01, 0.015, 0x22c55e, 0.2, 0.8);
            led.position.set(0, 0.27, 0);
            gate.add(led);

            group.add(gate);
        });

        // 5. 动态受力与速度矢量
        // 牵引力矢量 F (向右蓝色)
        const arrowF = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1.0, 0.48, 0),
            0.5,
            0x3b82f6,
            0.12,
            0.06
        );
        // 瞬时速度矢量 v (向右绿色)
        const arrowV = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1.0, 0.55, 0),
            0.5,
            0x10b981,
            0.12,
            0.06
        );
        group.add(arrowF);
        group.add(arrowV);

        // 6. 原理与数据 HUD
        const statusLabel = makeTextSprite('动能定理探究：W = ΔEk', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 1.25, 0);
        group.add(statusLabel);

        const dataLabel = makeTextSprite('合外力做功等于动能变化量', '#2563eb', 20, { x: 1.8, y: 0.24 });
        dataLabel.position.set(0, 1.05, 0);
        group.add(dataLabel);

        scene.add(group);

        const handles: WorkEnergyHandles = {
            rootGroup: group,
            cartGroup,
            pulleyGroup,
            hangingWeight,
            stringHoriz,
            stringVert,
            arrowF,
            arrowV,
            statusLabel,
            dataLabel,
            mass: 1,
            force: 5,
            v0: 0
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as WorkEnergyHandles;
        const mass = num(params['mass'], 1);
        const force = num(params['force'], 5);
        const v0 = num(params['v0'], 0);

        h.mass = mass;
        h.force = force;
        h.v0 = v0;

        const a = force / Math.max(1e-4, mass);
        const arrowFLen = Math.max(0.15, Math.min(0.8, (force / 30) * 0.7));
        h.arrowF.setLength(arrowFLen, 0.12, 0.06);

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `滑车质量 m=${mass}kg | 恒定拉力 F=${force}N | 加速度 a=F/m=${a.toFixed(2)}m/s²`,
                '#0f172a',
                22
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as WorkEnergyHandles;
        if (!h.cartGroup) return;

        const { time } = ctx;
        const m = h.mass;
        const F = h.force;
        const v0 = h.v0;
        const a = F / Math.max(1e-4, m);

        // 运动学与动力学量：
        // 沿导轨从 x = -1.2 处启动
        const startX = -1.2;
        const s = v0 * time + 0.5 * a * time * time;
        const currentX = Math.min(1.5, startX + s * 0.3);
        const v = v0 + a * time;

        h.cartGroup.position.x = currentX;

        // 牵引绳更新 (滑车前端连接到定滑轮)
        const hookX = currentX + 0.18;
        const pulleyX = 1.86;
        const hLineGeo = h.stringHoriz.geometry as THREE.BufferGeometry;
        const hLinePos = hLineGeo.getAttribute('position') as THREE.BufferAttribute;
        hLinePos.setXYZ(0, hookX, 0.42, 0);
        hLinePos.setXYZ(1, pulleyX, 0.42, 0);
        hLinePos.needsUpdate = true;

        // 下垂砝码随滑车前进而下降
        const dropY = Math.max(0.04, 0.35 - s * 0.3);
        h.hangingWeight.position.y = dropY;

        const vLineGeo = h.stringVert.geometry as THREE.BufferGeometry;
        const vLinePos = vLineGeo.getAttribute('position') as THREE.BufferAttribute;
        vLinePos.setXYZ(0, 1.9, 0.42, 0);
        vLinePos.setXYZ(1, 1.9, dropY + 0.04, 0);
        vLinePos.needsUpdate = true;

        // 速度矢量与拉力矢量跟随
        const vLen = Math.max(0.15, Math.min(0.85, v * 0.15));
        h.arrowV.position.set(currentX, 0.56, 0);
        h.arrowV.setLength(vLen, 0.12, 0.06);

        h.arrowF.position.set(hookX, 0.48, 0);

        // 严格功与动能定理计算：
        const W = F * s;
        const Ek0 = 0.5 * m * v0 * v0;
        const Ek = 0.5 * m * v * v;
        const deltaEk = Ek - Ek0;

        if (h.dataLabel) {
            updateTextSprite(
                h.dataLabel,
                `功 W=F·s=${W.toFixed(2)}J | ΔEk=½mv²-½mv₀²=${deltaEk.toFixed(2)}J (W ≡ ΔEk 严格守恒成立)`,
                '#2563eb',
                20
            );
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(-1.2 + pos.x * WORLD_SCALE, 0.45, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-1.2, 0.45, 0);
    }
};
