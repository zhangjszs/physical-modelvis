/**
 * 反应时间 rig — 竖直刻度尺 + 下落小球
 * 通过下落距离 h 计算反应时间 t=√(2h/g)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeBox, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const reactionTimeRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 竖直刻度尺
        const ruler = makeCylinder(0.04, 3.0, 0xfbbf24, 0.2, 0.3);
        ruler.position.set(0, 1.5, 0);
        scene.add(ruler);

        // 刻度线
        for (let i = 0; i <= 30; i++) {
            const tickLen = i % 5 === 0 ? 0.12 : 0.06;
            const tick = makeBox(tickLen, 0.006, 0.006, 0x475569, 0.5);
            tick.position.set(0.08, i * 0.1, 0);
            scene.add(tick);

            if (i % 5 === 0 && i > 0) {
                const label = makeTextSprite(`${i}`, '#475569', 18, { x: 0.2, y: 0.1 });
                label.position.set(0.22, i * 0.1, 0);
                scene.add(label);
            }
        }

        // 单位
        const unit = makeTextSprite('cm', '#475569', 20, { x: 0.2, y: 0.12 });
        unit.position.set(0.2, 3.15, 0);
        scene.add(unit);

        const group = new THREE.Group();
        return { group, handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        // physics y-up: pos.y = height above ground. Ball tracks height directly (top=high, ground=0).
        return new THREE.Vector3(0.5, pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.5, 3.0, 0);
    }
};
