/**
 * 双单摆步调比较 3D 实验 Rig
 * 包含：双悬挂独立支架与公用横梁、
 * 左侧单摆 1 (L₁, θ₁, 蓝球) 与 右侧单摆 2 (L₂, θ₂, 红球)、
 * 悬线随动与小角度简谐摆动、相位差与周期比 T₁/T₂ = √(L₁/L₂) 实时对比 HUD。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface DoublePendulumHandles {
    rootGroup: THREE.Group;
    pendGroup1: THREE.Group;
    pendGroup2: THREE.Group;
    string1: THREE.Line;
    string2: THREE.Line;
    bob1: THREE.Mesh;
    bob2: THREE.Mesh;
    statusLabel: THREE.Sprite;
    dataLabel: THREE.Sprite;
    length1: number;
    length2: number;
    angle1: number;
    angle2: number;
    phaseDiff: number;
    g: number;
}

export const doublePendulumRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 龙门式实验吊架 (高 2.4m, 跨度 2.2m)
        const baseL = makeBox(0.4, 0.05, 0.4, 0x1e293b, 0.5, 0.3);
        baseL.position.set(-1.1, 0.025, 0);
        baseL.receiveShadow = true;
        group.add(baseL);

        const baseR = makeBox(0.4, 0.05, 0.4, 0x1e293b, 0.5, 0.3);
        baseR.position.set(1.1, 0.025, 0);
        baseR.receiveShadow = true;
        group.add(baseR);

        const colL = makeBox(0.06, 2.3, 0.06, 0x475569, 0.35, 0.65);
        colL.position.set(-1.1, 1.15, 0);
        colL.castShadow = true;
        group.add(colL);

        const colR = makeBox(0.06, 2.3, 0.06, 0x475569, 0.35, 0.65);
        colR.position.set(1.1, 1.15, 0);
        colR.castShadow = true;
        group.add(colR);

        const topBeam = makeBox(2.28, 0.06, 0.08, 0x334155, 0.3, 0.7);
        topBeam.position.set(0, 2.3, 0);
        group.add(topBeam);

        // 2 个支点悬挂夹头 (位于 x = -0.55 和 x = 0.55)
        [-0.55, 0.55].forEach(cx => {
            const clamp = makeCylinder(0.025, 0.08, 0xd97706, 0.3, 0.85);
            clamp.rotation.z = Math.PI / 2;
            clamp.position.set(cx, 2.27, 0);
            group.add(clamp);
        });

        // 2. 摆 1 摆动组 (左侧，原点 (-0.55, 2.27, 0))
        const pendGroup1 = new THREE.Group();
        pendGroup1.position.set(-0.55, 2.27, 0);

        const strMat1 = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 });
        const string1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1.2, 0)]),
            strMat1
        );
        pendGroup1.add(string1);

        const bob1 = makeSphere(0.06, 0x2563eb, { roughness: 0.25, metalness: 0.8 });
        bob1.position.set(0, -1.2, 0);
        pendGroup1.add(bob1);
        group.add(pendGroup1);

        // 3. 摆 2 摆动组 (右侧，原点 (0.55, 2.27, 0))
        const pendGroup2 = new THREE.Group();
        pendGroup2.position.set(0.55, 2.27, 0);

        const strMat2 = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 });
        const string2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.8, 0)]),
            strMat2
        );
        pendGroup2.add(string2);

        const bob2 = makeSphere(0.06, 0xef4444, { roughness: 0.25, metalness: 0.8 });
        bob2.position.set(0, -0.8, 0);
        pendGroup2.add(bob2);
        group.add(pendGroup2);

        // 4. 原理与数据 HUD
        const statusLabel = makeTextSprite('双单摆步调与周期对比', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 2.55, 0);
        group.add(statusLabel);

        const dataLabel = makeTextSprite('周期公式 T = 2π√(L/g)', '#2563eb', 20, { x: 1.8, y: 0.24 });
        dataLabel.position.set(0, 2.32, 0);
        group.add(dataLabel);

        scene.add(group);

        const handles: DoublePendulumHandles = {
            rootGroup: group,
            pendGroup1,
            pendGroup2,
            string1,
            string2,
            bob1,
            bob2,
            statusLabel,
            dataLabel,
            length1: 1.0,
            length2: 0.5,
            angle1: 10,
            angle2: 10,
            phaseDiff: 0,
            g: 9.8
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as DoublePendulumHandles;
        const length1 = num(params['length1'], 1.0);
        const length2 = num(params['length2'], 0.5);
        const angle1 = num(params['angle1'], 10);
        const angle2 = num(params['angle2'], 10);
        const phaseDiff = num(params['phaseDiff'], 0);
        const g = num(params['g'], 9.8);

        h.length1 = length1;
        h.length2 = length2;
        h.angle1 = angle1;
        h.angle2 = angle2;
        h.phaseDiff = phaseDiff;
        h.g = g;

        // 视觉摆长映射 (0.5m ~ 1.8m)
        const visL1 = THREE.MathUtils.clamp(0.4 + length1 * 0.4, 0.5, 1.8);
        const visL2 = THREE.MathUtils.clamp(0.4 + length2 * 0.4, 0.5, 1.8);

        // 更新摆 1 几何体
        h.bob1.position.set(0, -visL1, 0);
        const s1Pos = (h.string1.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
        s1Pos.setXYZ(1, 0, -visL1, 0);
        s1Pos.needsUpdate = true;

        // 更新摆 2 几何体
        h.bob2.position.set(0, -visL2, 0);
        const s2Pos = (h.string2.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
        s2Pos.setXYZ(1, 0, -visL2, 0);
        s2Pos.needsUpdate = true;

        // 周期计算
        const T1 = 2 * Math.PI * Math.sqrt(length1 / g);
        const T2 = 2 * Math.PI * Math.sqrt(length2 / g);

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `双单摆对比：摆1 (L₁=${length1.toFixed(2)}m) vs 摆2 (L₂=${length2.toFixed(2)}m)`,
                '#0f172a',
                22
            );
        }

        if (h.dataLabel) {
            const ratio = (T1 / T2).toFixed(2);
            updateTextSprite(
                h.dataLabel,
                `周期 T₁=${T1.toFixed(2)}s | 周期 T₂=${T2.toFixed(2)}s | 周期比 T₁/T₂ = ${ratio} (符合 √(L₁/L₂))`,
                '#2563eb',
                19
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as DoublePendulumHandles;
        if (!h.pendGroup1 || !h.pendGroup2) return;

        const { time } = ctx;
        const g = h.g;
        const omega1 = Math.sqrt(g / Math.max(0.05, h.length1));
        const omega2 = Math.sqrt(g / Math.max(0.05, h.length2));

        const rad1 = (h.angle1 * Math.PI) / 180;
        const rad2 = (h.angle2 * Math.PI) / 180;
        const phi = (h.phaseDiff * Math.PI) / 180;

        // 简谐摆动：θ(t) = θ₀ * cos(ωt + φ)
        const theta1 = rad1 * Math.cos(omega1 * time);
        const theta2 = rad2 * Math.cos(omega2 * time + phi);

        h.pendGroup1.rotation.z = theta1;
        h.pendGroup2.rotation.z = theta2;
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.2 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.2, 0);
    }
};
