/**
 * 传动装置 rig — 皮带/齿轮/摩擦轮传动
 * 用于 transmission-belt
 *
 * 参数响应：
 * - r1 / r2：主动轮/从动轮半径 → 轮几何半径 + 皮带轮廓
 * - mode：0=皮带（显示皮带） 1/2/3=齿轮/摩擦轮/同轴（隐藏皮带，直接接触）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const ORIG_R1 = 0.25;
const ORIG_R2 = 0.4;
const WX1 = -0.6;
const WX2 = 0.8;
const WY = 1.0;

export const transmissionBeltRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 主动轮
        const wheel1 = makeCylinder(ORIG_R1, 0.08, 0x3b82f6, 0.3, 0.25);
        wheel1.rotation.z = Math.PI / 2;
        wheel1.position.set(WX1, WY, 0);
        scene.add(wheel1);

        // 从动轮
        const wheel2 = makeCylinder(ORIG_R2, 0.08, 0xdc2626, 0.3, 0.25);
        wheel2.rotation.z = Math.PI / 2;
        wheel2.position.set(WX2, WY, 0);
        scene.add(wheel2);

        // 皮带（连接两轮的线段）
        const belt = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(WX1, WY + ORIG_R1, 0),
                new THREE.Vector3(WX2, WY + ORIG_R2, 0),
                new THREE.Vector3(WX2, WY - ORIG_R2, 0),
                new THREE.Vector3(WX1, WY - ORIG_R1, 0),
                new THREE.Vector3(WX1, WY + ORIG_R1, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.5 })
        );
        scene.add(belt);

        const label = makeTextSprite('皮带传动', '#475569', 24, { x: 0.7, y: 0.2 });
        label.position.set(0.1, 1.8, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: { wheel1, wheel2, belt } };
    },

    updateEquipment(handles, params) {
        const wheel1 = handles.wheel1 as THREE.Mesh;
        const wheel2 = handles.wheel2 as THREE.Mesh;
        const belt = handles.belt as THREE.Line;

        const r1 = num(params['r1'], 0.1);
        const r2 = num(params['r2'], 0.2);
        const mode = Math.round(num(params['mode'], 0));

        const visR1 = THREE.MathUtils.clamp(2.5 * r1, 0.08, 1.0);
        const visR2 = THREE.MathUtils.clamp(2.5 * r2, 0.08, 1.0);
        const s1 = visR1 / ORIG_R1;
        const s2 = visR2 / ORIG_R2;
        wheel1.scale.y = s1;
        wheel1.scale.z = s1;
        wheel2.scale.y = s2;
        wheel2.scale.z = s2;

        const newR1 = ORIG_R1 * s1;
        const newR2 = ORIG_R2 * s2;

        // 齿轮/摩擦轮/同轴为直接接触，不画皮带
        belt.visible = mode === 0;
        if (belt.visible) {
            belt.geometry.setFromPoints([
                new THREE.Vector3(WX1, WY + newR1, 0),
                new THREE.Vector3(WX2, WY + newR2, 0),
                new THREE.Vector3(WX2, WY - newR2, 0),
                new THREE.Vector3(WX1, WY - newR1, 0),
                new THREE.Vector3(WX1, WY + newR1, 0)
            ]);
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, WY + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, WY, 0);
    }
};
