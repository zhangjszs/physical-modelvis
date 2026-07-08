/**
 * 牛顿管（羽钱管）rig — 演示真空中的自由落体
 * 竖直玻璃管 + 内置硬币和羽毛 + 支架
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createNewtonTube } from '../equipment/newtonTube';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';

const WORLD_SCALE = 0.16;

export const newtonTubeRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        const { group: tubeGroup, handles: tubeHandles } = createNewtonTube();
        scene.add(tubeGroup);

        const { group: heightGroup, handles: heightHandles } = createHeightRuler();
        scene.add(heightGroup);

        const group = new THREE.Group();
        return { group, handles: { tubeHandles, heightHandles } };
    },

    updateEquipment(handles, _params) {
        const h = handles as { heightHandles: ReturnType<typeof createHeightRuler>['handles'] };
        updateHeightRuler(h.heightHandles, 0.3, -0.3, 1.8 * WORLD_SCALE, '真空下落');
    },

    getVisualPosition(pos, _params) {
        // 物理引擎 y 轴向上，pos.y 即离地高度（米），直接缩放即可
        return new THREE.Vector3(pos.x * WORLD_SCALE, Math.max(0, pos.y * WORLD_SCALE), 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.7 * WORLD_SCALE, 0);
    }
};
