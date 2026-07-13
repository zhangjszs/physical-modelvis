/**
 * 热方向 rig — 热量自发从高温物体传向低温物体
 * 左热块(红) + 右冷块(蓝) 接触 + 中间热量箭头(左→右)
 * 用于 heat-direction
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface HdHandles {
    qArrow: THREE.ArrowHelper;
    label: THREE.Sprite;
}

export const heatDirectionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const hot = makeBox(0.7, 0.7, 0.7, 0xdc2626, 0.9, 0.0);
        hot.position.set(-0.6, 0.9, 0);
        group.add(hot);
        const cold = makeBox(0.7, 0.7, 0.7, 0x2563eb, 0.9, 0.0);
        cold.position.set(0.6, 0.9, 0);
        group.add(cold);
        // 热量箭头（热→冷）
        const qArrow = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.1, 0.9, 0), 1.0, 0xf59e0b, 0.2, 0.12);
        group.add(qArrow);
        const label = makeTextSprite('热传递方向', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 2.0, 0);
        group.add(label);
        scene.add(group);
        const handles: HdHandles = { qArrow, label };
        updateHD(handles, params);
        return { group, handles: { qArrow, label } };
    },

    updateEquipment(handles, params) {
        updateHD(handles as unknown as HdHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.9 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.9, 0);
    }
};

function updateHD(h: HdHandles, params: Record<string, number>): void {
    const Th = num(params['hotTemp'], 80);
    const Tc = num(params['coldTemp'], 20);
    const k = num(params['thermalConductivity'], 0.5);
    const rate = Math.max(0.2, Math.min(1, (Th - Tc) * k * 0.02));
    h.qArrow.scale.set(rate * 1.2, 1, 1);
    setLabel(h.label, `Q: ${Th.toFixed(0)}°C → ${Tc.toFixed(0)}°C (热自发高温→低温)`);
}
