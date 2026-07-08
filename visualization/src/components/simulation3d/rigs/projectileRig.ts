/**
 * 抛体运动 rig — 验证 EquipmentStage 抽象
 * 发射器 + 地面卷尺 + 高度尺 + 落点垫
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import {
    createLauncher,
    updateLauncher,
    getVisualLaunchPoint
} from '../equipment';
import { createRangeTape } from '../equipment/rangeTape';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';
import { makeBox, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

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

        // 地面卷尺
        const { group: rangeTape } = createRangeTape(8.0, 40);
        rangeTape.position.set(0.05, 0.035, 1.35);
        scene.add(rangeTape);

        // 水平距离标签
        const xLabel = makeTextSprite('水平距离 x / m', '#2563eb', 36, { x: 1.05, y: 0.36 });
        xLabel.position.set(8.5, 0.2, 1.35);
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
        const angle = params['angle'] ?? 45;
        const h0 = params['h0'] ?? 0;

        const launchPoint = updateLauncher(h.launcher, angle, h0, WORLD_SCALE);
        h.rangeTape.position.set(launchPoint.x, 0.035, 1.35);
        h.xLabel.position.set(launchPoint.x + 8.4, 0.2, 1.35);
        updateHeightRuler(h.heightRuler, launchPoint.x - 0.55, -0.72, Math.max(0.22, launchPoint.y), `h0 = ${h0.toFixed(1)} m`);
    },

    getVisualPosition(pos, params) {
        const h0 = params['h0'] ?? 0;
        const origin = this.getOrigin(params);
        return new THREE.Vector3(
            origin.x + pos.x * WORLD_SCALE,
            origin.y + (pos.y - h0) * WORLD_SCALE,
            0
        );
    },

    getOrigin(params) {
        const angle = params['angle'] ?? 45;
        const h0 = params['h0'] ?? 0;
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
