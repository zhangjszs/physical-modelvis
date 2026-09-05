/**
 * 抛体运动 rig — 验证 EquipmentStage 抽象
 * 发射器 + 地面卷尺 + 高度尺 + 落点垫
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createLauncher, updateLauncher, getVisualLaunchPoint } from '../equipment';
import { createRangeTape } from '../equipment/rangeTape';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';
import { makeBox, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.22;

interface ProjectileHandles {
    launcher: ReturnType<typeof createLauncher>['handles'];
    rangeTape: THREE.Group;
    heightRuler: ReturnType<typeof createHeightRuler>['handles'];
    landingPad: THREE.Group;
    xLabel: THREE.Sprite;
}

export const projectileRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, _params) {
        // 发射器
        const { group: launcherGroup, handles: launcherHandles } = createLauncher();
        scene.add(launcherGroup);

        // 地面卷尺 (从发射口下方 x=0 铺展到落点后方)
        const { group: rangeTape } = createRangeTape(14.0, 70);
        rangeTape.position.set(0, 0.035, 0.55);
        scene.add(rangeTape);

        // 水平距离标签
        const xLabel = makeTextSprite('水平距离 x / m', '#2563eb', 36, { x: 1.05, y: 0.36 });
        xLabel.position.set(8.5, 0.2, 0.55);
        scene.add(xLabel);

        // 高度尺
        const { group: heightGroup, handles: heightHandles } = createHeightRuler();
        scene.add(heightGroup);

        // 落点垫
        const landingPad = createLandingPad();
        landingPad.position.set(6, 0, 0);
        scene.add(landingPad);

        const group = new THREE.Group(); // 虚拟根（器材已直接挂 scene）

        return {
            group,
            handles: {
                launcher: launcherHandles,
                rangeTape,
                heightRuler: heightHandles,
                landingPad,
                xLabel
            }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as ProjectileHandles;
        const angle = num(params['angle'], 45);
        const h0 = num(params['h0'], 2);
        const v0 = num(params['v0'], 20);
        const g = num(params['g'], 9.8);

        const launchPoint = updateLauncher(h.launcher, angle, h0, WORLD_SCALE);

        // 动态计算理论落地点 (物理坐标)
        // y(t) = h0 + v0y*t - 0.5*g*t^2 = 0
        const angleRad = (angle * Math.PI) / 180;
        const v0x = v0 * Math.cos(angleRad);
        const v0y = v0 * Math.sin(angleRad);
        const discriminant = Math.max(0, v0y * v0y + 2 * g * h0);
        const tLand = g > 0 ? (v0y + Math.sqrt(discriminant)) / g : 0;
        const xLand = v0x * tLand;

        // 3D 世界落地点 (严格对应 xLand * WORLD_SCALE)
        const landingX = xLand * WORLD_SCALE;
        h.landingPad.position.set(landingX, 0, 0);

        // 地面卷尺从 0 延伸，距离标注对齐落点
        h.rangeTape.position.set(0, 0.035, 0.55);
        h.xLabel.position.set(landingX, 0.2, 0.55);

        // 高度尺放在发射器左侧，测量地面到发射口实际高度
        updateHeightRuler(h.heightRuler, -0.35, 0.08, Math.max(0.22, launchPoint.y), `h0 = ${h0.toFixed(1)} m`);
    },

    getVisualPosition(pos, params) {
        // 单一真源：空中抛物线 + 落地后贴地减速滚动
        const angle = num(params['angle'], 45);
        const h0 = num(params['h0'], 2);
        const v0 = num(params['v0'], 20);
        const g = num(params['g'], 9.8);
        const angleRad = (angle * Math.PI) / 180;
        const v0x = v0 * Math.cos(angleRad);
        const v0y = v0 * Math.sin(angleRad);
        const discriminant = Math.max(0, v0y * v0y + 2 * g * h0);
        const tLand = g > 0 ? (v0y + Math.sqrt(discriminant)) / g : 0;
        const xLand = v0x * tLand;

        let visualX: number;
        let visualY: number;

        if (pos.x <= xLand || v0x <= 0) {
            // 阶段 1: 空中自由飞行抛物线
            visualX = pos.x * WORLD_SCALE;
            visualY = BALL_RADIUS + Math.max(0, pos.y) * WORLD_SCALE;
        } else {
            // 阶段 2: 击中地面后具有水平初速度，贴地减速滑行/滚动
            const mu = 0.22;
            const deltaT = (pos.x - xLand) / Math.max(0.1, v0x);
            const tStop = v0x / (mu * g);
            let xGround: number;
            if (deltaT <= tStop) {
                xGround = xLand + v0x * deltaT - 0.5 * mu * g * deltaT * deltaT;
            } else {
                xGround = xLand + (v0x * v0x) / (2 * mu * g);
            }
            visualX = xGround * WORLD_SCALE;
            visualY = BALL_RADIUS;
        }

        return new THREE.Vector3(visualX, visualY, 0);
    },

    getOrigin(params) {
        const angle = num(params['angle'], 45);
        const h0 = num(params['h0'], 2);
        return getVisualLaunchPoint(angle, h0, WORLD_SCALE);
    }
};

function createLandingPad(): THREE.Group {
    const group = new THREE.Group();
    const pad = makeBox(0.78, 0.028, 0.52, 0xf97316, 0.5);
    pad.position.set(0, 0.03, 0);
    group.add(pad);

    const centerLine = makeBox(0.7, 0.012, 0.035, 0xffffff, 0.4);
    centerLine.position.set(0, 0.055, 0);
    group.add(centerLine);

    const crossLine = makeBox(0.035, 0.012, 0.46, 0xffffff, 0.4);
    crossLine.position.set(0, 0.058, 0);
    group.add(crossLine);

    const label = makeTextSprite('预计落点', '#ea580c', 34, { x: 0.86, y: 0.29 });
    label.position.set(0, 0.22, -0.48);
    group.add(label);

    return group;
}
