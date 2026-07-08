/**
 * 竖直运动 rig — 从 y=0 开始的竖直上抛/下抛/自由落体
 * 用于 uniform-accelerated、energy-conservation、work-energy
 * 球从固定高度释放，可向上或向下运动
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createRangeTape } from '../equipment/rangeTape';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';
import { makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;
const ORIGIN_Y = 3.0; // 释放点高度（米）

export const verticalMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 铁架台
        const { group: standGroup } = createIronStand(2.6);
        standGroup.position.set(-1.0, 0, 0);
        scene.add(standGroup);

        // 释放点标记
        const releaseLabel = makeTextSprite('释放点', '#0f766e', 26, { x: 0.6, y: 0.2 });
        releaseLabel.position.set(-0.3, ORIGIN_Y * WORLD_SCALE + 0.2, 0);
        scene.add(releaseLabel);

        // 高度尺
        const { group: heightGroup, handles: heightHandles } = createHeightRuler();
        scene.add(heightGroup);

        // 地面卷尺
        const { group: rangeTape } = createRangeTape(5.0, 25);
        rangeTape.position.set(0, 0.035, 1.2);
        scene.add(rangeTape);

        const group = new THREE.Group();
        return { group, handles: { standGroup, heightHandles, rangeTape, releaseLabel } };
    },

    updateEquipment(handles, _params) {
        const h = handles as { heightHandles: ReturnType<typeof createHeightRuler>['handles'] };
        updateHeightRuler(h.heightHandles, -0.2, -0.6, ORIGIN_Y * WORLD_SCALE, `h = ${ORIGIN_Y.toFixed(1)} m`);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, Math.max(0, ORIGIN_Y * WORLD_SCALE), 0);
    }
};
