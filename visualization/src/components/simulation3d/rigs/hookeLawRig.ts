/**
 * 胡克定律 rig — 铁架台 + 弹簧 + 钩码 + 刻度尺
 * 探究弹簧弹力与形变量关系 F=kx
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createWeight } from '../equipment/weight';
import { makeCylinder, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

interface HookeHandles {
    standGroup: THREE.Group;
    spring: THREE.Mesh;
    weightGroup: THREE.Group;
    scale: THREE.Group;
}

export const hookeLawRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 铁架台
        const { group: standGroup } = createIronStand(2.2);
        standGroup.position.set(0, 0, 0);
        scene.add(standGroup);

        // 弹簧（顶端固定）
        const spring = makeCylinder(0.05, 0.6, 0x94a3b8, 0.5, 0.2);
        spring.position.set(0, 1.6, 0);
        scene.add(spring);

        // 钩码
        const { group: weightGroup } = createWeight(0.05, 0x64748b);
        weightGroup.position.set(0, 1.2, 0);
        scene.add(weightGroup);

        // 刻度尺
        const scale = createScale();
        scale.position.set(0.4, 0.5, 0);
        scene.add(scale);

        const group = new THREE.Group();
        return { group, handles: { standGroup, spring, weightGroup, scale } };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as HookeHandles;
        const m = params['m'] ?? 0.5;
        const k = params['k'] ?? 20;
        const g = params['g'] ?? 9.8;
        // 形变量 x = mg/k
        const x = (m * g) / k;
        // 弹簧伸长
        h.spring.scale.y = 1 + x * 2;
        h.spring.position.y = 1.6 + x * 0.5;
        // 钩码下移
        h.weightGroup.position.y = 1.2 - x * WORLD_SCALE * 3;
    },

    getVisualPosition(pos, _params) {
        // 竖直振动
        return new THREE.Vector3(0.5, 1.6 - pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.5, 1.6, 0);
    }
};

function createScale(): THREE.Group {
    const group = new THREE.Group();
    const rod = makeCylinder(0.02, 1.5, 0x475569, 0.4, 0.3);
    rod.position.set(0, 0.75, 0);
    group.add(rod);

    for (let i = 0; i <= 10; i++) {
        const tick = makeCylinder(0.008, i % 2 === 0 ? 0.08 : 0.05, 0x64748b, 0.4, 0.3);
        tick.rotation.z = Math.PI / 2;
        tick.position.set(0.03, i * 0.15, 0);
        group.add(tick);

        if (i % 2 === 0) {
            const label = makeTextSprite(`${i}`, '#475569', 18, { x: 0.2, y: 0.12 });
            label.position.set(0.12, i * 0.15, 0);
            group.add(label);
        }
    }

    const unitLabel = makeTextSprite('cm', '#475569', 20, { x: 0.25, y: 0.14 });
    unitLabel.position.set(0, 1.6, 0);
    group.add(unitLabel);

    return group;
}
