/**
 * 自由落体 rig — 小球从高度 h0 自由释放
 * 智能升降铁架台 + 电磁吸附释放头 + 阻尼接料垫 + 侧边高度标尺
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.22;

export interface FreeFallHandles {
    standGroup: THREE.Group;
    standHandles: ReturnType<typeof createIronStand>['handles'];
    standInitialH: number;
    magnetHead: THREE.Group;
    landingPad: THREE.Group;
    heightHandles: ReturnType<typeof createHeightRuler>['handles'];
    releaseLabel: THREE.Sprite;
}

export const freeFallRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const h0 = num(params['h0'] ?? params['height'], 10);
        const visualH = Math.max(0.6, h0 * WORLD_SCALE);
        const standInitialH = visualH + 0.8;

        // 1. 铁架台 (立柱高度随 h0 动态匹配)
        const { group: standGroup, handles: standHandles } = createIronStand(standInitialH);
        standGroup.position.set(-0.85, 0, 0);
        scene.add(standGroup);

        // 2. 电磁铁吸附释放头
        const magnetHead = new THREE.Group();
        const magnetBody = makeCylinder(0.08, 0.12, 0xd97706, 0.4, 0.7);
        magnetHead.add(magnetBody);
        const magnetClamp = makeBox(0.85, 0.04, 0.06, 0x475569, 0.5, 0.4);
        magnetClamp.position.set(-0.425, 0, 0);
        magnetHead.add(magnetClamp);
        magnetHead.position.set(0, visualH + BALL_RADIUS + 0.06, 0);
        scene.add(magnetHead);

        // 3. 释放点标记
        const releaseLabel = makeTextSprite(`释放点 h₀ = ${h0.toFixed(1)} m`, '#0f766e', 26, { x: 0.9, y: 0.22 });
        releaseLabel.position.set(0.65, visualH + BALL_RADIUS, 0);
        scene.add(releaseLabel);

        // 4. 地面阻尼接料垫 (吸收落地冲击)
        const landingPad = new THREE.Group();
        const padBase = makeBox(0.9, 0.04, 0.9, 0x1e293b, 0.8, 0.1);
        padBase.position.set(0, 0.02, 0);
        landingPad.add(padBase);
        const padFoam = makeBox(0.82, 0.02, 0.82, 0x2563eb, 0.9, 0.0);
        padFoam.position.set(0, 0.05, 0);
        landingPad.add(padFoam);
        scene.add(landingPad);

        // 5. 高度尺
        const { group: heightGroup, handles: heightHandles } = createHeightRuler();
        scene.add(heightGroup);

        // 6. 旧实现的「地面卷尺」已删除 (#159 逐节审计):
        //    自由落体是**纯竖直**运动, 水平位移恒为 0 —— 地面上的水平卷尺既测不到东西,
        //    又与本 rig 的 worldScale 口径打架 (5 m/单位 vs 实际 6.25 m/单位)。
        //    真正需要读的量是「下落高度」, 已由左侧高度尺 + 释放点标牌承担。

        const group = new THREE.Group();
        return {
            group,
            handles: {
                standGroup,
                standHandles,
                standInitialH,
                magnetHead,
                landingPad,
                heightHandles,
                releaseLabel
            }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as FreeFallHandles;
        const h0 = num(params['h0'] ?? params['height'], 10);
        const visualH = Math.max(0.6, h0 * WORLD_SCALE);
        const targetStandH = visualH + 0.8;

        // 铁架台立柱高度动态缩放
        const scaleY = targetStandH / Math.max(0.1, h.standInitialH);
        h.standHandles.rod.scale.y = scaleY;
        h.standHandles.rod.position.y = targetStandH / 2 + 0.06;
        h.standHandles.clamp.position.y = visualH + BALL_RADIUS;

        // 电磁释放头高度对齐
        h.magnetHead.position.set(0, visualH + BALL_RADIUS + 0.06, 0);
        h.releaseLabel.position.set(0.65, visualH + BALL_RADIUS, 0);
        setLabel(h.releaseLabel, `释放点 h₀ = ${h0.toFixed(1)} m`, '#0f766e');

        // 高度尺对齐地面到释放点
        updateHeightRuler(h.heightHandles, -0.35, 0.05, visualH + BALL_RADIUS, `h0 = ${h0.toFixed(1)} m`);
    },

    getVisualPosition(pos, _params) {
        // 落地时小球表面接触接料垫停稳
        const visualY = BALL_RADIUS + Math.max(0, pos.y) * WORLD_SCALE;
        return new THREE.Vector3(pos.x * WORLD_SCALE, visualY, 0);
    },

    getOrigin(params) {
        const h0 = num(params['h0'] ?? params['height'], 10);
        return new THREE.Vector3(0, BALL_RADIUS + h0 * WORLD_SCALE, 0);
    }
};
