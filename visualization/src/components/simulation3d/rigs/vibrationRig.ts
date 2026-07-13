/**
 * 振动 rig — 受迫振动/共振/双摆
 * 用于 forced-vibration-freq、resonance-curve、double-pendulum-sync
 * 参数响应：摆长 length → 摆线长度；驱动频率 drivingFreq/frequency → 驱动力箭头长度
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createPendulum } from '../equipment/pendulum';
import { makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const PIVOT_Y = 2.4;

export const vibrationRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        // 单摆
        const L = num(params.length, num(params.L, 1.2)) * WORLD_SCALE;
        const { group: pendGroup, handles: pendHandles } = createPendulum(L);
        pendGroup.position.set(0, 0, 0);
        scene.add(pendGroup);

        // 驱动力箭头
        const driveArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 1.5, 0),
            0.3,
            0xef4444,
            0.06,
            0.04
        );
        scene.add(driveArrow);

        const label = makeTextSprite('受迫振动', '#475569', 24, { x: 0.7, y: 0.2 });
        label.position.set(0, 2.6, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: { pendHandles, driveArrow } };
    },

    updateEquipment(handles, params) {
        const ph = handles.pendHandles as { string: THREE.Line; bob: THREE.Mesh } | undefined;
        const drive = handles.driveArrow as THREE.ArrowHelper;
        if (ph) {
            const L = num(params.length, num(params.L, 1.2)) * WORLD_SCALE;
            const top = new THREE.Vector3(0, PIVOT_Y, 0);
            const bottom = new THREE.Vector3(0, PIVOT_Y - L, 0);
            ph.string.geometry.setFromPoints([top, bottom]);
            ph.bob.position.copy(bottom);
        }
        // 驱动频率 → 驱动力箭头长度
        const f = num(params.drivingFreq, num(params.frequency, 1));
        const fl = THREE.MathUtils.clamp(f * 0.1, 0.1, 0.6);
        drive.setLength(fl, fl * 0.2, fl * 0.15);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 2.0 - Math.abs(pos.y) * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 2.0, 0);
    }
};
