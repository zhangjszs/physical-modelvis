/**
 * 验电器与静电实验 3D Rig
 * 覆盖：
 * 1. electroscope: 验电器工作原理（带电量越大，金属箔片张角越大）
 * 2. electrostatic-induction: 静电感应（近端感应异种电荷，远端感应同种电荷）
 * 3. electrostatic-shielding: 静电屏蔽（法拉第金属网罩屏蔽外电场，箔片闭合）
 * 4. coulomb-force-explore: 库仑力与电荷作用
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface ElectroscopeHandles {
    rootGroup: THREE.Group;
    metalBall: THREE.Mesh;
    foilL: THREE.Mesh;
    foilR: THREE.Mesh;
    chargedRod: THREE.Group;
    faradayCage: THREE.Mesh;
    statusLabel: THREE.Sprite;
    dataLabel: THREE.Sprite;
    charge: number;
    shielded: boolean;
    targetAngle: number;
}

export const electroscopeRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 绝缘实木实验底座 (长 1.8m, 宽 1.0m, 高 0.08m)
        const base = makeBox(1.8, 0.08, 1.0, 0x334155, 0.5, 0.3);
        base.position.set(0, 0.04, 0);
        base.receiveShadow = true;
        group.add(base);

        // 2. 经典圆筒金属外壳 (带透明前后观测玻璃窗)
        const shellFrame = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.85, 32, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide })
        );
        shellFrame.position.set(0, 0.85, 0);
        group.add(shellFrame);

        // 前后两面圆形透明观测视窗
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.25,
            roughness: 0.05,
            transmission: 0.9,
            side: THREE.DoubleSide
        });
        const glassFront = new THREE.Mesh(new THREE.CircleGeometry(0.53, 32), glassMat);
        glassFront.position.set(0, 0.85, 0.01);
        group.add(glassFront);

        // 外壳金属支撑脚
        const shellFoot = makeCylinder(0.18, 0.35, 0x1e293b, 0.4, 0.4);
        shellFoot.position.set(0, 0.25, 0);
        group.add(shellFoot);

        // 3. 顶部绝缘塞与金属导电总成
        const insulatorPlug = makeCylinder(0.08, 0.16, 0xf8fafc, 0.2, 0.1);
        insulatorPlug.position.set(0, 1.34, 0);
        group.add(insulatorPlug);

        // 顶部导电金属球 (高反光铬黄铜，半径 0.12m)
        const metalBall = makeSphere(0.12, 0xd97706, { roughness: 0.2, metalness: 0.85 });
        metalBall.position.set(0, 1.55, 0);
        metalBall.castShadow = true;
        group.add(metalBall);

        // 贯穿绝缘套管的中央黄铜导体杆
        const centralRod = makeCylinder(0.016, 0.75, 0xd97706, 0.2, 0.85);
        centralRod.position.set(0, 0.98, 0);
        group.add(centralRod);

        // 4. 双片极轻金箔/铝箔片 (绕底端铰链点张开)
        // 左箔片
        const foilGeo = new THREE.BoxGeometry(0.003, 0.32, 0.08);
        const foilMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.7 });
        const foilL = new THREE.Mesh(foilGeo, foilMat);
        foilL.position.set(-0.02, 0.65, 0);
        foilL.castShadow = true;
        group.add(foilL);

        // 右箔片
        const foilR = new THREE.Mesh(foilGeo, foilMat);
        foilR.position.set(0.02, 0.65, 0);
        foilR.castShadow = true;
        group.add(foilR);

        // 5. 侧方带电摩擦棒 (橡胶棒/毛皮摩擦起电)
        const chargedRod = new THREE.Group();
        chargedRod.position.set(-0.75, 1.55, 0);

        const rodBody = makeCylinder(0.025, 0.65, 0x0f172a, 0.6, 0.1);
        rodBody.rotation.z = Math.PI / 3;
        chargedRod.add(rodBody);

        // 棒端发光带电光晕
        const rodGlow = makeSphere(0.06, 0x3b82f6, { emissive: 0x3b82f6, emissiveIntensity: 0.8 });
        rodGlow.position.set(0.24, 0.14, 0);
        chargedRod.add(rodGlow);

        group.add(chargedRod);

        // 6. 可拆卸金属网罩 (法拉第笼屏蔽罩)
        const cageGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.4, 32, 1, true);
        const cageMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
            roughness: 0.3
        });
        const faradayCage = new THREE.Mesh(cageGeo, cageMat);
        faradayCage.position.set(0, 1.05, 0);
        faradayCage.visible = false;
        group.add(faradayCage);

        // 7. 原理与数据 HUD
        const statusLabel = makeTextSprite('验电器静电实验', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 2.05, 0);
        group.add(statusLabel);

        const dataLabel = makeTextSprite('同种电荷相互排斥，箔片张角 θ ∝ |q|', '#2563eb', 20, { x: 1.8, y: 0.24 });
        dataLabel.position.set(0, 1.85, 0);
        group.add(dataLabel);

        scene.add(group);

        const handles: ElectroscopeHandles = {
            rootGroup: group,
            metalBall,
            foilL,
            foilR,
            chargedRod,
            faradayCage,
            statusLabel,
            dataLabel,
            charge: 5,
            shielded: false,
            targetAngle: 0.3
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as ElectroscopeHandles;
        const charge = num(params['charge'] ?? params['chargeC'] ?? params['q'], 5); // μC 或相对电荷
        const shielded = (params['shielded'] ?? params['shield'] ?? 0) === 1;

        h.charge = charge;
        h.shielded = shielded;

        // 法拉第笼屏蔽罩显隐
        h.faradayCage.visible = shielded;

        // 静电平衡箔片张角计算：
        // 若屏蔽罩开启，外电场被完全屏蔽，箔片闭合 (张角 = 0)
        // 否则张角 ∝ |charge| (小角度近似，物理范围 0 ~ 45°)
        const absQ = Math.abs(charge);
        const maxAngleRad = Math.PI / 4; // 45度
        const angleRad = shielded ? 0 : THREE.MathUtils.clamp((absQ / 15) * maxAngleRad, 0.05, maxAngleRad);
        h.targetAngle = angleRad;

        // 静态更新箔片旋转
        h.foilL.rotation.z = angleRad;
        h.foilR.rotation.z = -angleRad;

        if (h.statusLabel) {
            const shieldText = shielded
                ? '🛡️ 法拉第笼屏蔽生效：内部场强 E=0，箔片完全闭合'
                : '⚡ 静电排斥/感应起电进行中';
            updateTextSprite(h.statusLabel, shieldText, shielded ? '#059669' : '#0f172a', 22);
        }

        if (h.dataLabel) {
            const angleDeg = ((angleRad * 180) / Math.PI).toFixed(1);
            updateTextSprite(
                h.dataLabel,
                `带电量 Q=${charge.toFixed(1)}μC | 箔片张角 θ=${angleDeg}° (同种电荷库仑斥力排斥)`,
                '#2563eb',
                19
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as ElectroscopeHandles;
        if (!h.foilL || !h.foilR) return;

        const { time } = ctx;
        if (!h.shielded) {
            // 极轻金箔在空气中的微小微抖律动
            const flutter = Math.sin(time * 8) * 0.015;
            const currentAngle = Math.max(0.02, h.targetAngle + flutter);
            h.foilL.rotation.z = currentAngle;
            h.foilR.rotation.z = -currentAngle;

            // 带电棒微幅接近手抖律动
            const rodSway = Math.sin(time * 2) * 0.03;
            h.chargedRod.position.x = -0.75 + rodSway;
        } else {
            h.foilL.rotation.z = 0;
            h.foilR.rotation.z = 0;
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.85 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.85, 0);
    }
};
