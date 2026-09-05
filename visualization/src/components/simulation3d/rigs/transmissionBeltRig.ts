/**
 * 传动装置 3D 实验 Rig（皮带/齿轮/摩擦轮/同轴传动）
 * 金属立柱轴承 + 双金属带轮/齿轮 + 辐条动态旋转 + 传动物理关系实时标牌
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeBox, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const WX1 = -0.7;
const WX2 = 0.9;
const WY = 1.2;

interface TransmissionHandles {
    wheel1Group: THREE.Group;
    wheel2Group: THREE.Group;
    belt: THREE.Line;
    stand1: THREE.Mesh;
    stand2: THREE.Mesh;
    label: THREE.Sprite;
    r1: number;
    r2: number;
    mode: number;
}

export const transmissionBeltRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: 0.001, // 机构传动装置，隐藏默认小球

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 支撑机架与底座
        const basePlate = makeBox(2.6, 0.05, 0.8, 0x1e293b, 0.4, 0.3);
        basePlate.position.set((WX1 + WX2) / 2, 0.025, 0);
        basePlate.receiveShadow = true;
        group.add(basePlate);

        // 立柱支架 1 (后置支撑)
        const stand1 = makeCylinder(0.04, WY + 0.1, 0x475569, 0.4, 0.6);
        stand1.position.set(WX1, (WY + 0.1) / 2, -0.12);
        group.add(stand1);

        // 立柱支架 2 (后置支撑)
        const stand2 = makeCylinder(0.04, WY + 0.1, 0x475569, 0.4, 0.6);
        stand2.position.set(WX2, (WY + 0.1) / 2, -0.12);
        group.add(stand2);

        // 2. 主动轮系统 (Wheel 1: 蓝色铝合金轮 + 十字辐条，轴线沿 Z 轴)
        const wheel1Group = new THREE.Group();
        wheel1Group.position.set(WX1, WY, 0);

        const wheel1Rim = makeCylinder(0.3, 0.08, 0x2563eb, 0.3, 0.6);
        wheel1Rim.rotation.x = Math.PI / 2; // 圆柱轴线沿 Z 轴，轮面处于 X-Y 投影面
        wheel1Rim.castShadow = true;
        wheel1Group.add(wheel1Rim);

        // 十字辐条 (在 X-Y 平面内呈现旋转指示)
        const spoke1 = makeBox(0.56, 0.025, 0.082, 0xe2e8f0, 0.3, 0.8);
        wheel1Group.add(spoke1);
        const spoke2 = makeBox(0.025, 0.56, 0.082, 0xe2e8f0, 0.3, 0.8);
        wheel1Group.add(spoke2);

        // 轴心轴承
        const shaft1 = makeCylinder(0.05, 0.18, 0xd97706, 0.3, 0.8);
        shaft1.rotation.x = Math.PI / 2;
        wheel1Group.add(shaft1);

        group.add(wheel1Group);

        // 3. 从动轮系统 (Wheel 2: 红色铝合金轮 + 十字辐条，轴线沿 Z 轴)
        const wheel2Group = new THREE.Group();
        wheel2Group.position.set(WX2, WY, 0);

        const wheel2Rim = makeCylinder(0.45, 0.08, 0xdc2626, 0.3, 0.6);
        wheel2Rim.rotation.x = Math.PI / 2;
        wheel2Rim.castShadow = true;
        wheel2Group.add(wheel2Rim);

        const spoke3 = makeBox(0.86, 0.025, 0.082, 0xe2e8f0, 0.3, 0.8);
        wheel2Group.add(spoke3);
        const spoke4 = makeBox(0.025, 0.86, 0.082, 0xe2e8f0, 0.3, 0.8);
        wheel2Group.add(spoke4);

        const shaft2 = makeCylinder(0.05, 0.18, 0xd97706, 0.3, 0.8);
        shaft2.rotation.x = Math.PI / 2;
        wheel2Group.add(shaft2);

        group.add(wheel2Group);

        // 4. 传动皮带 (深灰柔性橡胶带环，与两轮 X-Y 轮缘紧密贴合)
        const beltMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 3 });
        const belt = new THREE.Line(new THREE.BufferGeometry(), beltMat);
        group.add(belt);

        // 5. 传动物理关系标牌
        const label = makeTextSprite('皮带传动: v₁ = v₂', '#0f172a', 24, { x: 1.1, y: 0.24 });
        label.position.set((WX1 + WX2) / 2, WY + 0.85, 0);
        group.add(label);

        scene.add(group);

        const handles: TransmissionHandles = {
            wheel1Group,
            wheel2Group,
            belt,
            stand1,
            stand2,
            label,
            r1: 0.1,
            r2: 0.2,
            mode: 0
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as TransmissionHandles;
        const r1 = num(params['r1'], 0.1);
        const r2 = num(params['r2'], 0.2);
        const mode = Math.round(num(params['mode'], 0));
        h.r1 = r1;
        h.r2 = r2;
        h.mode = mode;

        // 缩放主动轮与从动轮几何体
        const s1 = THREE.MathUtils.clamp(r1 / 0.1, 0.3, 2.5);
        const s2 = THREE.MathUtils.clamp(r2 / 0.2, 0.3, 2.5);

        // 轮盘在 X-Y 面缩放
        h.wheel1Group.scale.set(s1, s1, 1);
        h.wheel2Group.scale.set(s2, s2, 1);

        const visR1 = 0.3 * s1;
        const visR2 = 0.45 * s2;

        if (mode === 3) {
            // 同轴传动：两轮同轴并排安装
            h.wheel2Group.position.set(WX1, WY, 0.14);
            h.stand2.visible = false;
        } else if (mode === 1 || mode === 2) {
            // 齿轮/摩擦轮：紧密接触相切
            const tangentDist = visR1 + visR2;
            h.wheel2Group.position.set(WX1 + tangentDist, WY, 0);
            h.stand2.visible = true;
            h.stand2.position.x = WX1 + tangentDist;
        } else {
            // 皮带传动
            h.wheel2Group.position.set(WX2, WY, 0);
            h.stand2.visible = true;
            h.stand2.position.x = WX2;
        }

        // 皮带仅在 mode=0 (皮带传动) 时显示
        h.belt.visible = mode === 0;
        if (h.belt.visible) {
            const points = [
                new THREE.Vector3(WX1, WY + visR1, 0),
                new THREE.Vector3(WX2, WY + visR2, 0),
                new THREE.Vector3(WX2, WY - visR2, 0),
                new THREE.Vector3(WX1, WY - visR1, 0),
                new THREE.Vector3(WX1, WY + visR1, 0)
            ];
            h.belt.geometry.dispose();
            h.belt.geometry = new THREE.BufferGeometry().setFromPoints(points);
        }

        // 标牌提示与物理关系
        if (h.label) {
            if (mode === 0) {
                updateTextSprite(h.label, '皮带传动: 线速度相等 v₁ = v₂ | 同向转动', '#2563eb', 24);
            } else if (mode === 1) {
                updateTextSprite(h.label, '齿轮传动: 啮合线速度 v₁ = v₂ | 反向啮合', '#d97706', 24);
            } else if (mode === 2) {
                updateTextSprite(h.label, '摩擦轮传动: 接触线速度 v₁ = v₂ | 反向转动', '#059669', 24);
            } else {
                updateTextSprite(h.label, '同轴传动: 角速度相等 ω₁ = ω₂ | 同向同轴', '#7c3aed', 24);
            }
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as TransmissionHandles;
        if (!h.wheel1Group || !h.wheel2Group) return;

        const omega1 = num(ctx.params['omega1'], 10);
        const r1 = Math.max(1e-3, h.r1);
        const r2 = Math.max(1e-3, h.r2);
        const t = ctx.time;
        const mode = h.mode;

        // 主动轮旋转角 (绕 Z 轴旋转)
        const angle1 = (omega1 * t) % (Math.PI * 2);
        h.wheel1Group.rotation.z = -angle1;

        // 从动轮旋转角
        let angle2 = 0;
        let omega2 = omega1;
        if (mode === 0) {
            // 皮带：线速度相等，角速度 ω2 = ω1 * (r1 / r2)，同向转动
            omega2 = omega1 * (r1 / r2);
            angle2 = -((omega2 * t) % (Math.PI * 2));
        } else if (mode === 1 || mode === 2) {
            // 齿轮 / 摩擦轮：线速度相等，但反向啮合转动
            omega2 = omega1 * (r1 / r2);
            angle2 = (omega2 * t) % (Math.PI * 2);
        } else {
            // 同轴：角速度完全相等，同轴同向同步转动
            omega2 = omega1;
            angle2 = -angle1;
        }

        h.wheel2Group.rotation.z = angle2;

        // 动态 HUD 随动更新线速度与角速度读数
        if (h.label) {
            const v1 = omega1 * r1;
            const v2 = omega2 * r2;
            const modeText = mode === 0 ? '皮带' : mode === 1 ? '齿轮' : mode === 2 ? '摩擦轮' : '同轴';
            updateTextSprite(
                h.label,
                `[${modeText}] v₁=${v1.toFixed(2)}m/s, v₂=${v2.toFixed(2)}m/s | ω₁=${omega1.toFixed(1)}rad/s, ω₂=${omega2.toFixed(1)}rad/s`,
                '#0f172a',
                22
            );
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, WY + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(WX1, WY, 0);
    }
};
