/**
 * 牛顿第一定律 3D 实验 Rig
 * 真实精密气垫导轨 + 气动滑块 + 双光电门计时系统 + 动平衡受力分析 (ΣF=0 ⇛ a=0 ⇛ v=const)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface NewtonFirstLawHandles {
    rootGroup: THREE.Group;
    gliderGroup: THREE.Group;
    arrowV: THREE.ArrowHelper;
    arrowN: THREE.ArrowHelper;
    arrowG: THREE.ArrowHelper;
    photogate1Led: THREE.Mesh;
    photogate2Led: THREE.Mesh;
    statusLabel: THREE.Sprite;
    lawLabel: THREE.Sprite;
    v0: number;
    mass: number;
}

export const newtonFirstLawRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 阳极氧化铝合金精密气垫导轨主体 (长 3.6m)
        const trackLen = 3.6;
        const railTop = makeBox(trackLen, 0.08, 0.18, 0x94a3b8, 0.3, 0.7);
        railTop.position.set(0, 0.45, 0);
        railTop.receiveShadow = true;
        group.add(railTop);

        // 导轨三角截面下沿
        const railBase = makeBox(trackLen, 0.06, 0.22, 0x64748b, 0.4, 0.6);
        railBase.position.set(0, 0.38, 0);
        group.add(railBase);

        // 两排精密出气微孔
        for (let i = 0; i < 24; i++) {
            const x = -trackLen / 2 + 0.15 + (i * (trackLen - 0.3)) / 23;
            const hole1 = makeCylinder(0.008, 0.01, 0x1e293b, 0.2, 0.2);
            hole1.position.set(x, 0.495, 0.04);
            group.add(hole1);

            const hole2 = makeCylinder(0.008, 0.01, 0x1e293b, 0.2, 0.2);
            hole2.position.set(x, 0.495, -0.04);
            group.add(hole2);
        }

        // 毫米刻度标尺带 (导轨侧面)
        const scaleStrip = makeBox(trackLen, 0.025, 0.002, 0xf8fafc, 0.8, 0.1);
        scaleStrip.position.set(0, 0.42, 0.111);
        group.add(scaleStrip);

        // 导轨重型可调平支脚 (两端)
        [-1.5, 1.5].forEach(x => {
            const footLeg = makeBox(0.06, 0.35, 0.25, 0x334155, 0.4, 0.5);
            footLeg.position.set(x, 0.175, 0);
            footLeg.castShadow = true;
            group.add(footLeg);

            // 调平旋钮
            const knob = makeCylinder(0.05, 0.04, 0xd97706, 0.4, 0.8);
            knob.position.set(x, 0.02, 0.1);
            group.add(knob);
        });

        // 2. 充气风机机箱与气管
        const blower = makeBox(0.35, 0.25, 0.28, 0x1e293b, 0.5, 0.3);
        blower.position.set(-trackLen / 2 - 0.35, 0.125, 0);
        blower.castShadow = true;
        group.add(blower);

        const hose = makeCylinder(0.04, 0.35, 0x3b82f6, 0.4, 0.1);
        hose.rotation.z = Math.PI / 2;
        hose.position.set(-trackLen / 2 - 0.12, 0.42, 0);
        group.add(hose);

        // 3. 气动滑块 (带双遮光条与双向缓冲弹簧)
        const gliderGroup = new THREE.Group();
        gliderGroup.position.set(0, 0.52, 0);

        // 滑块主体
        const gliderBody = makeBox(0.28, 0.07, 0.2, 0x2563eb, 0.3, 0.5);
        gliderBody.castShadow = true;
        gliderGroup.add(gliderBody);

        // 顶部双遮光条 (供光电门精确计时)
        const flag1 = makeBox(0.01, 0.08, 0.04, 0x0f172a, 0.5, 0.2);
        flag1.position.set(-0.08, 0.075, 0);
        gliderGroup.add(flag1);

        const flag2 = makeBox(0.01, 0.08, 0.04, 0x0f172a, 0.5, 0.2);
        flag2.position.set(0.08, 0.075, 0);
        gliderGroup.add(flag2);

        // 两端缓冲弹簧圈
        [-0.15, 0.15].forEach(bx => {
            const bumper = makeCylinder(0.025, 0.025, 0xd97706, 0.4, 0.8);
            bumper.rotation.z = Math.PI / 2;
            bumper.position.set(bx, 0, 0);
            gliderGroup.add(bumper);
        });

        group.add(gliderGroup);

        // 4. 双光电门门架 (位于 x = -0.6 和 x = 0.8)
        const makePhotogate = (xPos: number) => {
            const pgGroup = new THREE.Group();
            pgGroup.position.set(xPos, 0.45, 0);

            // 门形支架 (U 型)
            const postBack = makeBox(0.04, 0.3, 0.03, 0x1e293b, 0.4, 0.4);
            postBack.position.set(0, 0.15, -0.14);
            pgGroup.add(postBack);

            const postFront = makeBox(0.04, 0.3, 0.03, 0x1e293b, 0.4, 0.4);
            postFront.position.set(0, 0.15, 0.14);
            pgGroup.add(postFront);

            const beamTop = makeBox(0.04, 0.04, 0.31, 0x1e293b, 0.4, 0.4);
            beamTop.position.set(0, 0.28, 0);
            pgGroup.add(beamTop);

            // 红外光电检测指示灯
            const led = makeCylinder(0.012, 0.02, 0x22c55e, 0.2, 0.8);
            led.position.set(0, 0.31, 0);
            pgGroup.add(led);

            // 红外光束 (红线)
            const ray = makeCylinder(0.003, 0.25, 0xef4444, 0.1, 0.1);
            ray.rotation.x = Math.PI / 2;
            ray.position.set(0, 0.15, 0);
            pgGroup.add(ray);

            return { pgGroup, led };
        };

        const gate1 = makePhotogate(-0.7);
        group.add(gate1.pgGroup);

        const gate2 = makePhotogate(0.9);
        group.add(gate2.pgGroup);

        // 5. 动态受力与速度矢量
        // 速度矢量 (水平向右绿色)
        const arrowV = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.55, 0), 0.6, 0x10b981, 0.14, 0.07);
        group.add(arrowV);

        // 支持力与重力动平衡 (竖直正反向)
        const arrowN = makeArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.55, 0), 0.35, 0x3b82f6, 0.09, 0.05);
        const arrowG = makeArrow(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0.55, 0),
            0.35,
            0xef4444,
            0.09,
            0.05
        );
        group.add(arrowN);
        group.add(arrowG);

        // 6. 物理定理与状态 HUD 标牌
        const lawLabel = makeTextSprite('牛顿第一定律 (惯性定律)', '#0f172a', 24, { x: 1.5, y: 0.28 });
        lawLabel.position.set(0, 1.25, 0);
        group.add(lawLabel);

        const statusLabel = makeTextSprite('受力平衡 ΣF=0 ⇛ a=0 ⇛ 匀速直线运动', '#2563eb', 20, { x: 1.8, y: 0.24 });
        statusLabel.position.set(0, 1.05, 0);
        group.add(statusLabel);

        scene.add(group);

        const handles: NewtonFirstLawHandles = {
            rootGroup: group,
            gliderGroup,
            arrowV,
            arrowN,
            arrowG,
            photogate1Led: gate1.led,
            photogate2Led: gate2.led,
            statusLabel,
            lawLabel,
            v0: 2,
            mass: 0.5
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as NewtonFirstLawHandles;
        const v0 = num(params['v0'], 2);
        const mass = num(params['mass'], 0.5);

        h.v0 = v0;
        h.mass = mass;

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `初速度 v₀=${v0.toFixed(1)}m/s | 质量 m=${mass}kg | 合外力 ΣF=0N (a=0)`,
                '#2563eb',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as NewtonFirstLawHandles;
        if (!h.gliderGroup) return;

        // 滑块跟随质点 X 坐标
        const posX = ctx.ballPos.x;
        const posY = 0.52;
        const posZ = 0;

        h.gliderGroup.position.set(posX, posY, posZ);

        // 速度矢量跟随滑块
        const vLen = Math.max(0.15, Math.abs(h.v0) * 0.25);
        const vDir = h.v0 >= 0 ? 1 : -1;
        h.arrowV.position.set(posX, posY + 0.08, posZ);
        h.arrowV.setDirection(new THREE.Vector3(vDir, 0, 0));
        h.arrowV.setLength(vLen, 0.12, 0.06);

        // 竖直支持力与重力动平衡跟随
        h.arrowN.position.set(posX, posY + 0.04, posZ);
        h.arrowG.position.set(posX, posY - 0.04, posZ);

        // 光电门感应触发高亮
        // 门1位于 x = -0.7，门2位于 x = 0.9，滑块宽度 0.28
        const inGate1 = Math.abs(posX - -0.7) < 0.15;
        const inGate2 = Math.abs(posX - 0.9) < 0.15;

        const led1Mat = h.photogate1Led.material as THREE.MeshStandardMaterial;
        if (led1Mat) {
            led1Mat.color.setHex(inGate1 ? 0xef4444 : 0x22c55e);
            led1Mat.emissive.setHex(inGate1 ? 0xff0000 : 0x000000);
        }

        const led2Mat = h.photogate2Led.material as THREE.MeshStandardMaterial;
        if (led2Mat) {
            led2Mat.color.setHex(inGate2 ? 0xef4444 : 0x22c55e);
            led2Mat.emissive.setHex(inGate2 ? 0xff0000 : 0x000000);
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.52, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.52, 0);
    }
};
