/**
 * 能量转化 rig — 不同形式能量之间的转换
 * 输入装置 + 转换箱 + 输出装置(随效率缩小) + 箭头
 * 用于 energy-transformation
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface EtHandles {
    outBox: THREE.Mesh;
    label: THREE.Sprite;
}

const MODE_NAMES = ['机械→电', '电→热', '化学→电', '光→电'];

export const energyTransformationRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 输入装置
        const inBox = makeBox(0.5, 0.5, 0.5, 0x16a34a, 0.9, 0.0);
        inBox.position.set(-1.2, 1.0, 0);
        group.add(inBox);
        // 转换装置
        const conv = makeBox(0.7, 0.7, 0.7, 0x64748b, 0.9, 0.0);
        conv.position.set(0, 1.0, 0);
        group.add(conv);
        // 输出装置
        const outBox = makeBox(0.4, 0.4, 0.4, 0xf59e0b, 0.9, 0.0);
        outBox.position.set(1.2, 1.0, 0);
        group.add(outBox);
        // 箭头
        group.add(makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.9, 1.0, 0), 0.4, 0x334155, 0.12, 0.07));
        group.add(makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.4, 1.0, 0), 0.4, 0x334155, 0.12, 0.07));
        const label = makeTextSprite('能量转化', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 2.0, 0);
        group.add(label);
        scene.add(group);
        const handles: EtHandles = { outBox, label };
        updateET(handles, params);
        return { group, handles: { outBox, label } };
    },

    updateEquipment(handles, params) {
        updateET(handles as unknown as EtHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateET(h: EtHandles, params: Record<string, number>): void {
    const mode = Math.round(num(params['mode'], 0));
    const ein = num(params['inputEnergy'], 100);
    const eff = num(params['efficiency'], 0.8);
    const eout = ein * eff;
    h.outBox.scale.setScalar(Math.max(0.3, Math.sqrt(eff)));
    const mName = MODE_NAMES[mode] ?? '能量转化';
    setLabel(h.label, `${mName}: ${ein.toFixed(0)}→${eout.toFixed(0)} (η=${(eff * 100).toFixed(0)}%)`);
}
