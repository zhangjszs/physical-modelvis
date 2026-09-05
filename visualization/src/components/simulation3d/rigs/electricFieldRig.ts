/**
 * 带电粒子在匀强电场中偏转 rig — 平行偏转极板 + 电子枪发射口 + 荧光接收屏
 * 验证类平抛规律：y = 1/2·(qU/(m·d))·(L/v₀)²
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createDeflectionPlates, DeflectionPlatesHandles } from '../equipment/deflectionPlates';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const FIELD_CENTER_Y = 1.5;

interface EFieldHandles {
    plateHandles: DeflectionPlatesHandles;
    fieldArrows: THREE.ArrowHelper[];
    infoLabel: THREE.Sprite;
}

export const electricFieldRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: false,

    buildEquipment(scene, params) {
        // 1. 偏转极板与电子枪腔体
        const { group, handles: plateHandles } = createDeflectionPlates(2.8, 1.1, 1.2, FIELD_CENTER_Y);
        scene.add(group);

        // 2. 极板间电场线箭头 (竖直从正极指向负极)
        const fieldArrows: THREE.ArrowHelper[] = [];
        for (let i = -2; i <= 2; i++) {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, -1, 0),
                new THREE.Vector3(i * 0.5, FIELD_CENTER_Y + 0.45, 0),
                0.9,
                0x3b82f6,
                0.14,
                0.09
            );
            group.add(arrow);
            fieldArrows.push(arrow);
        }

        // 3. 偏转量与电压标牌
        const U = num(params['U'] ?? params['voltage'], 100);
        const v0 = num(params['v0'], 20);
        const infoLabel = makeTextSprite(
            `偏转电压 U = ${U.toFixed(0)} V | 初速度 v₀ = ${v0.toFixed(0)} m/s (类平抛偏转)`,
            '#2563eb',
            24,
            { x: 1.4, y: 0.22 }
        );
        infoLabel.position.set(0, FIELD_CENTER_Y + 1.25, 0.2);
        group.add(infoLabel);

        return {
            group,
            handles: { plateHandles, fieldArrows, infoLabel }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as EFieldHandles;
        const U = num(params['U'] ?? params['voltage'], 100);
        const v0 = num(params['v0'], 20);

        setLabel(
            h.infoLabel,
            `偏转电压 U = ${U.toFixed(0)} V | 初速度 v₀ = ${v0.toFixed(0)} m/s (类平抛偏转)`,
            '#2563eb'
        );
    },

    getVisualPosition(pos, _params) {
        // 电子从电子枪注入 (-1.4), 在电场中发生竖直偏转
        return new THREE.Vector3(-1.4 + pos.x * WORLD_SCALE, FIELD_CENTER_Y + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-1.4, FIELD_CENTER_Y, 0);
    }
};
