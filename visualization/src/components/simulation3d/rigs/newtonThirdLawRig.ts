/**
 * 牛顿第三定律 3D 实验 Rig
 * 包含：双数字化力传感器（对拉互锁挂钩）、低摩擦精密导轨、
 * 传感器机身液晶实时示数屏、手持牵引把手、
 * 严格对称的作用力与反作用力矢量对 (F_AB = -F_BA) 及动态反冲加速。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface NewtonThirdLawHandles {
    rootGroup: THREE.Group;
    sensorA: THREE.Group;
    sensorB: THREE.Group;
    arrowAB: THREE.ArrowHelper;
    arrowBA: THREE.ArrowHelper;
    lcdA: THREE.Sprite;
    lcdB: THREE.Sprite;
    statusLabel: THREE.Sprite;
    lawLabel: THREE.Sprite;
    forceAB: number;
    massA: number;
    massB: number;
    allowMotion: boolean;
}

export const newtonThirdLawRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 低摩擦实验导轨基座 (长 3.2m, 宽 0.4m)
        const track = makeBox(3.2, 0.06, 0.4, 0x334155, 0.4, 0.5);
        track.position.set(0, 0.03, 0);
        track.receiveShadow = true;
        group.add(track);

        // 导轨中央滑道凹槽
        const groove = makeBox(3.1, 0.015, 0.08, 0x0f172a, 0.5, 0.2);
        groove.position.set(0, 0.062, 0);
        group.add(groove);

        // 两端安全缓冲橡胶挡块
        [-1.55, 1.55].forEach(bx => {
            const bumper = makeBox(0.06, 0.1, 0.25, 0xd97706, 0.4, 0.4);
            bumper.position.set(bx, 0.09, 0);
            group.add(bumper);
        });

        // 2. 数字化力传感器 A (蓝色外壳，位于左侧 x = -0.55)
        const sensorA = new THREE.Group();
        sensorA.position.set(-0.55, 0.14, 0);

        const bodyA = makeBox(0.45, 0.12, 0.18, 0x2563eb, 0.35, 0.3);
        bodyA.castShadow = true;
        sensorA.add(bodyA);

        // 滑轮底脚
        [-0.15, 0.15].forEach(wx => {
            const wheel = makeCylinder(0.03, 0.015, 0x0f172a, 0.3, 0.3);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(wx, -0.05, 0);
            sensorA.add(wheel);
        });

        // 右端受力测量金属挂钩
        const hookA = makeCylinder(0.01, 0.1, 0xd97706, 0.3, 0.8);
        hookA.rotation.z = Math.PI / 2;
        hookA.position.set(0.26, 0, 0);
        sensorA.add(hookA);

        // 左端手持拉手把
        const handleA = makeBox(0.04, 0.14, 0.16, 0x1e293b, 0.5, 0.2);
        handleA.position.set(-0.25, 0, 0);
        sensorA.add(handleA);

        // 机身液晶示数屏 (显示 F_A)
        const lcdA = makeTextSprite('F_A: +5.0N', '#38bdf8', 26, { x: 0.6, y: 0.2 });
        lcdA.position.set(0, 0.12, 0);
        sensorA.add(lcdA);

        group.add(sensorA);

        // 3. 数字化力传感器 B (红色外壳，位于右侧 x = 0.55)
        const sensorB = new THREE.Group();
        sensorB.position.set(0.55, 0.14, 0);

        const bodyB = makeBox(0.45, 0.12, 0.18, 0xef4444, 0.35, 0.3);
        bodyB.castShadow = true;
        sensorB.add(bodyB);

        // 滑轮底脚
        [-0.15, 0.15].forEach(wx => {
            const wheel = makeCylinder(0.03, 0.015, 0x0f172a, 0.3, 0.3);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(wx, -0.05, 0);
            sensorB.add(wheel);
        });

        // 左端受力测量金属挂钩 (与 A 的挂钩相扣)
        const hookB = makeCylinder(0.01, 0.1, 0xd97706, 0.3, 0.8);
        hookB.rotation.z = Math.PI / 2;
        hookB.position.set(-0.26, 0, 0);
        sensorB.add(hookB);

        // 右端手持拉手把
        const handleB = makeBox(0.04, 0.14, 0.16, 0x1e293b, 0.5, 0.2);
        handleB.position.set(0.25, 0, 0);
        sensorB.add(handleB);

        // 机身液晶示数屏 (显示 F_B)
        const lcdB = makeTextSprite('F_B: -5.0N', '#f87171', 26, { x: 0.6, y: 0.2 });
        lcdB.position.set(0, 0.12, 0);
        sensorB.add(lcdB);

        group.add(sensorB);

        // 4. 严格对称的作用力与反作用力矢量箭头
        // F_AB: A 对 B 的作用力 (向右蓝色)
        const arrowAB = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.26, 0), 0.5, 0x2563eb, 0.12, 0.06);
        // F_BA: B 对 A 的反作用力 (向左红色)
        const arrowBA = makeArrow(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0.26, 0),
            0.5,
            0xef4444,
            0.12,
            0.06
        );
        group.add(arrowAB);
        group.add(arrowBA);

        // 5. 定律标牌与状态 HUD
        const lawLabel = makeTextSprite('牛顿第三定律：F_AB = - F_BA', '#0f172a', 24, { x: 1.6, y: 0.28 });
        lawLabel.position.set(0, 1.35, 0);
        group.add(lawLabel);

        const statusLabel = makeTextSprite('大小相等、方向相反、同时产生、同时消失', '#2563eb', 20, {
            x: 1.8,
            y: 0.24
        });
        statusLabel.position.set(0, 1.12, 0);
        group.add(statusLabel);

        scene.add(group);

        const handles: NewtonThirdLawHandles = {
            rootGroup: group,
            sensorA,
            sensorB,
            arrowAB,
            arrowBA,
            lcdA,
            lcdB,
            statusLabel,
            lawLabel,
            forceAB: 5,
            massA: 1,
            massB: 2,
            allowMotion: false
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as NewtonThirdLawHandles;
        const forceAB = num(params['forceAB'], 5);
        const massA = num(params['massA'], 1);
        const massB = num(params['massB'], 2);
        const allowMotion = (params['allowMotion'] ?? 0) === 1;

        h.forceAB = forceAB;
        h.massA = massA;
        h.massB = massB;
        h.allowMotion = allowMotion;

        const absF = Math.abs(forceAB);
        const sign = forceAB >= 0 ? 1 : -1;

        // 作用力与反作用力矢量长度等长动态变化
        const arrowLen = Math.max(0.15, Math.min(0.85, (absF / 20) * 0.75));
        h.arrowAB.setDirection(new THREE.Vector3(sign, 0, 0));
        h.arrowAB.setLength(arrowLen, 0.12, 0.06);

        h.arrowBA.setDirection(new THREE.Vector3(-sign, 0, 0));
        h.arrowBA.setLength(arrowLen, 0.12, 0.06);

        // 传感器机载数字液晶屏示数实时刷新
        if (h.lcdA) {
            updateTextSprite(h.lcdA, `F_A: ${forceAB.toFixed(1)}N`, '#38bdf8', 26);
        }
        if (h.lcdB) {
            updateTextSprite(h.lcdB, `F_B: ${(-forceAB).toFixed(1)}N`, '#f87171', 26);
        }

        if (h.statusLabel) {
            const motionDesc = allowMotion
                ? `加速模式: a_A=${(absF / massA).toFixed(2)}m/s² | a_B=${(absF / massB).toFixed(2)}m/s² (质量不同但作用力绝对恒等)`
                : `静止对拉平衡: 传感器 A 与传感器 B 示数恒定相反互抵`;
            updateTextSprite(h.statusLabel, motionDesc, '#2563eb', 18);
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as NewtonThirdLawHandles;
        if (!h.sensorA || !h.sensorB) return;

        const { time } = ctx;
        const absF = Math.abs(h.forceAB);

        if (h.allowMotion && absF > 1e-4) {
            // 加速分离模式：根据牛顿第二定律反冲
            const aA = absF / h.massA;
            const aB = absF / h.massB;
            const sepA = Math.min(0.8, 0.5 * aA * time * time * 0.1);
            const sepB = Math.min(0.8, 0.5 * aB * time * time * 0.1);

            h.sensorA.position.x = -0.55 - sepA;
            h.sensorB.position.x = 0.55 + sepB;
        } else {
            // 静止或对拉轻微手抖呼吸律动（两者同步微移）
            const sway = Math.sin(time * 2.5) * 0.04;
            h.sensorA.position.x = -0.55 + sway;
            h.sensorB.position.x = 0.55 + sway;
            h.arrowAB.position.set(sway, 0.26, 0);
            h.arrowBA.position.set(sway, 0.26, 0);
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.14, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.14, 0);
    }
};
