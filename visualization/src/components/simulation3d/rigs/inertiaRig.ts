/**
 * 惯性实验 rig — 长桌面 + 双运动球
 * 引擎输出双轨迹 [上方物体, 下方物体], 运动由 Stage 按轨迹渲染,
 * 此处不放置静态小车/木块 — 静止装饰与"倾倒"教学意图相悖且从不运动。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createBench } from '../equipment/bench';

const WORLD_SCALE = 0.16;

export const inertiaRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 长木板/桌面
        const { group: bench } = createBench(3.0, 0.05);
        bench.position.set(0, 0, 0);
        scene.add(bench);

        return { group: new THREE.Group(), handles: { bench } };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.11, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.11, 0);
    }
};
