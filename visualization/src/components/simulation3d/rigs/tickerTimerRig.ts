/**
 * 打点计时器 rig — 长木板 + 打点计时器 + 小车 + 纸带
 * 用于 ticker-timer（测速度/加速度）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createBench } from '../equipment/bench';
import { createTickerTimer } from '../equipment/tickerTimer';
import { makeBox, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const tickerTimerRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 长木板
        const { group: bench } = createBench(3.5, 0.1);
        bench.position.set(0, 0, 0);
        scene.add(bench);

        // 打点计时器（固定在木板左端）
        const { group: ticker } = createTickerTimer();
        ticker.position.set(-1.5, 0.1, 0);
        scene.add(ticker);

        // 纸带（穿过计时器）
        const tape = makeBox(3.0, 0.008, 0.06, 0xfef3c7, 0.8, 0);
        tape.position.set(0.2, 0.16, 0.12);
        scene.add(tape);

        // 标签
        const label = makeTextSprite('纸带', '#92400e', 22, { x: 0.4, y: 0.18 });
        label.position.set(1.0, 0.28, 0.12);
        scene.add(label);

        const group = new THREE.Group();
        return { group, handles: { bench, ticker, tape } };
    },

    updateEquipment(_handles, _params) {
        // 打点计时器场景参数变化少，暂无需更新的器材状态
    },

    getVisualPosition(pos, _params) {
        // 小车沿木板水平运动
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.26, 0.4);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.26, 0.4);
    }
};
