/**
 * 自由落体 rig — 小球从高度 h0 自由释放
 * 铁架台 + 释放点 + 高度尺 + 地面卷尺
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createRangeTape } from '../equipment/rangeTape';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';
import { makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const freeFallRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const h0 = params['h0'] ?? params['height'] ?? 10;

        // 铁架台
        const { group: standGroup } = createIronStand(2.4);
        standGroup.position.set(-1.2, 0, 0);
        scene.add(standGroup);

        // 释放点标记
        const releaseLabel = makeTextSprite('释放点', '#0f766e', 28, { x: 0.6, y: 0.22 });
        releaseLabel.position.set(-0.5, h0 * WORLD_SCALE + 0.3, 0);
        scene.add(releaseLabel);

        // 高度尺
        const { group: heightGroup, handles: heightHandles } = createHeightRuler();
        scene.add(heightGroup);

        // 地面卷尺
        const { group: rangeTape } = createRangeTape(6.0, 30);
        rangeTape.position.set(0, 0.035, 1.2);
        scene.add(rangeTape);

        const group = new THREE.Group();
        return {
            group,
            handles: { standGroup, heightHandles, rangeTape, releaseLabel }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as { heightHandles: ReturnType<typeof createHeightRuler>['handles']; releaseLabel: THREE.Sprite; h0: number };
        const h0 = params['h0'] ?? params['height'] ?? 10;
        h.releaseLabel.position.set(-0.5, h0 * WORLD_SCALE + 0.3, 0);
        updateHeightRuler(h.heightHandles, -0.3, -0.6, Math.max(0.3, h0 * WORLD_SCALE), `h0 = ${h0.toFixed(1)} m`);
    },

    getVisualPosition(pos, _params) {
        // 物理引擎 y 轴向上，pos.y 即离地高度（米），直接缩放即可
        return new THREE.Vector3(
            pos.x * WORLD_SCALE,
            Math.max(0, pos.y * WORLD_SCALE),
            0
        );
    },

    getOrigin(params) {
        const h0 = params['h0'] ?? params['height'] ?? 10;
        return new THREE.Vector3(0, h0 * WORLD_SCALE, 0);
    }
};
