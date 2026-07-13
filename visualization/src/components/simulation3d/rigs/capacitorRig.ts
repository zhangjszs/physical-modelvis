/**
 * 平行板电容器 rig — 两块平行极板 + 电场线
 * 用于 capacitor-charge、parallel-plate-capacitor
 * 参数响应：
 *   parallel-plate 场景 — 极板间距 distance(mm) → 板间距；极板面积 area → 板大小
 *   capacitor-charge 场景 — 电动势 emf → 电场线强度
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const CENTER_Y = 1.4;

export const capacitorRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 上极板（正极）
        const plateTop = makeBox(1.2, 0.04, 0.6, 0xdc2626, 0.3, 0.3);
        plateTop.position.set(0, 1.8, 0);
        scene.add(plateTop);

        // 下极板（负极）
        const plateBottom = makeBox(1.2, 0.04, 0.6, 0x3b82f6, 0.3, 0.3);
        plateBottom.position.set(0, 1.0, 0);
        scene.add(plateBottom);

        // 电场线箭头
        const fieldArrows: THREE.ArrowHelper[] = [];
        for (let i = 0; i < 5; i++) {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, -1, 0),
                new THREE.Vector3(-0.4 + i * 0.2, 1.5, 0),
                0.2,
                0x3b82f6,
                0.05,
                0.03
            );
            scene.add(arrow);
            fieldArrows.push(arrow);
        }

        // 支架
        const stand = makeBox(0.04, 1.0, 0.04, 0x64748b, 0.4, 0.3);
        stand.position.set(-0.6, 1.4, 0);
        scene.add(stand);

        const labelPos = makeTextSprite('+', '#dc2626', 28, { x: 0.3, y: 0.2 });
        labelPos.position.set(0.7, 1.8, 0);
        scene.add(labelPos);

        const labelNeg = makeTextSprite('−', '#3b82f6', 28, { x: 0.3, y: 0.2 });
        labelNeg.position.set(0.7, 1.0, 0);
        scene.add(labelNeg);

        return { group: new THREE.Group(), handles: { plateTop, plateBottom, fieldArrows } };
    },

    updateEquipment(handles, params) {
        const top = handles.plateTop as THREE.Mesh;
        const bot = handles.plateBottom as THREE.Mesh;
        const arrows = handles.fieldArrows as THREE.ArrowHelper[];
        // 平行板场景：极板距离 d (mm)
        const d_mm = num(params.distance, NaN);
        const gap = !Number.isNaN(d_mm) ? THREE.MathUtils.clamp(d_mm * 0.08, 0.06, 0.9) : 0.8;
        top.position.y = CENTER_Y + gap / 2;
        bot.position.y = CENTER_Y - gap / 2;
        // 极板面积 S → 极板大小
        const area = num(params.area, NaN);
        if (!Number.isNaN(area)) {
            const s = THREE.MathUtils.clamp(Math.cbrt(area * 1000), 0.4, 2.4);
            top.scale.set(s, 1, s);
            bot.scale.set(s, 1, s);
        }
        // 电容充放电场景：电动势 E → 电场线强度
        const emf = num(params.emf, NaN);
        const len = !Number.isNaN(emf) ? THREE.MathUtils.clamp(emf * 0.02, 0.1, 0.7) : gap;
        arrows.forEach((a, i) => {
            a.position.set(-0.4 + i * 0.2, top.position.y - 0.05, 0);
            a.setLength(len, len * 0.25, len * 0.18);
        });
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.4, 0);
    }
};
