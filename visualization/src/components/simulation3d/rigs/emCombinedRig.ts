/**
 * 电磁复合场与速度选择器 rig — 正交电磁场腔室 + 速度选择狭缝
 * 验证速度选择平衡条件 qE = qvB → v = E/B
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createDeflectionPlates } from '../equipment/deflectionPlates';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const FIELD_CENTER_Y = 1.5;

interface CombinedHandles {
    platesGroup: THREE.Group;
    exitSlit: THREE.Group;
    infoLabel: THREE.Sprite;
}

export const emCombinedRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: false,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 正交电场偏转板
        const { group: platesGroup } = createDeflectionPlates(2.6, 1.0, 1.1, FIELD_CENTER_Y);
        group.add(platesGroup);

        // 2. 出射速度选择狭缝 (右端仅允许直行通过)
        const exitSlit = new THREE.Group();
        const slitUpper = makeBox(0.04, 0.45, 0.9, 0x1e293b, 0.5, 0.3);
        slitUpper.position.set(1.4, FIELD_CENTER_Y + 0.32, 0);
        exitSlit.add(slitUpper);

        const slitLower = makeBox(0.04, 0.45, 0.9, 0x1e293b, 0.5, 0.3);
        slitLower.position.set(1.4, FIELD_CENTER_Y - 0.32, 0);
        exitSlit.add(slitLower);
        group.add(exitSlit);

        // 3. 磁感线垂直标示 ⊗
        [-0.8, -0.4, 0, 0.4, 0.8].forEach(x => {
            const cross = makeTextSprite('⊗', '#059669', 22, { x: 0.2, y: 0.2 });
            cross.position.set(x, FIELD_CENTER_Y, 0.02);
            group.add(cross);
        });

        // 4. 速度选择条件标牌
        const E = num(params['Ey'] ?? params['E'], 1e4);
        const B = num(params['Bz'] ?? params['B'], 0.1);
        const vSelect = B > 0 ? E / B : 0;

        const infoLabel = makeTextSprite(
            `速度选择条件: v = E/B = ${vSelect.toExponential(2)} m/s (qE = qvB 无偏转通过)`,
            '#059669',
            24,
            { x: 1.5, y: 0.22 }
        );
        infoLabel.position.set(0, FIELD_CENTER_Y + 1.25, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: CombinedHandles = {
            platesGroup,
            exitSlit,
            infoLabel
        };

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CombinedHandles;
        const E = num(params['Ey'] ?? params['E'], 1e4);
        const B = num(params['Bz'] ?? params['B'], 0.1);
        const vSelect = B > 0 ? E / B : 0;

        setLabel(
            h.infoLabel,
            `速度选择条件: v = E/B = ${vSelect.toExponential(2)} m/s (qE = qvB 无偏转通过)`,
            '#059669'
        );
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(-1.3 + pos.x * WORLD_SCALE, FIELD_CENTER_Y + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-1.3, FIELD_CENTER_Y, 0);
    }
};
