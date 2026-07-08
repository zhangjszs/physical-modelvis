/**
 * 测量工具展示 rig — 游标卡尺 / 螺旋测微器 / 多用电表
 * 以 3D 方式展示测量工具本身，被测物体居中
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

/** 游标卡尺 */
export const vernierCaliperRig: SceneRig = {
    worldScale: WORLD_SCALE,
    buildEquipment(scene, _params) {
        // 外测量爪
        const jaw1 = makeBox(0.6, 0.06, 0.15, 0x94a3b8, 0.3, 0.3);
        jaw1.position.set(0.3, 0.1, 0);
        scene.add(jaw1);

        const jaw2 = makeBox(0.6, 0.06, 0.15, 0x94a3b8, 0.3, 0.3);
        jaw2.position.set(0.3, -0.1, 0);
        scene.add(jaw2);

        // 主尺
        const mainScale = makeBox(1.2, 0.04, 0.08, 0xe2e8f0, 0.5, 0.1);
        mainScale.position.set(0.2, 0, 0);
        scene.add(mainScale);

        // 游标
        const vernier = makeBox(0.25, 0.045, 0.085, 0x3b82f6, 0.3, 0.2);
        vernier.position.set(0.55, 0, 0);
        scene.add(vernier);

        // 被测圆柱
        const target = makeCylinder(0.08, 0.3, 0xfbbf24, 0.3, 0.2);
        target.rotation.x = Math.PI / 2;
        target.position.set(0.5, 0, 0);
        scene.add(target);

        const label = makeTextSprite('游标卡尺', '#475569', 28, { x: 0.8, y: 0.26 });
        label.position.set(0.3, 0.3, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },
    updateEquipment() {},
    getVisualPosition(pos) { return new THREE.Vector3(pos.x * WORLD_SCALE, 0, 0); },
    getOrigin() { return new THREE.Vector3(0, 0, 0); }
};

/** 螺旋测微器 */
export const micrometerRig: SceneRig = {
    worldScale: WORLD_SCALE,
    buildEquipment(scene, _params) {
        // 尺架（U 形）
        const frame = makeBox(0.08, 0.6, 0.15, 0x64748b, 0.4, 0.2);
        frame.position.set(-0.2, 0, 0);
        scene.add(frame);

        // 测砧
        const anvil = makeCylinder(0.04, 0.06, 0x475569, 0.4, 0.3);
        anvil.rotation.z = Math.PI / 2;
        anvil.position.set(-0.1, 0, 0);
        scene.add(anvil);

        // 测微螺杆
        const screw = makeCylinder(0.03, 0.5, 0x94a3b8, 0.4, 0.2);
        screw.rotation.z = Math.PI / 2;
        screw.position.set(0.2, 0, 0);
        scene.add(screw);

        // 微分筒
        const thimble = makeCylinder(0.06, 0.2, 0x334155, 0.3, 0.3);
        thimble.rotation.z = Math.PI / 2;
        thimble.position.set(0.5, 0, 0);
        scene.add(thimble);

        // 被测物
        const target = makeCylinder(0.04, 0.15, 0xfbbf24, 0.3, 0.2);
        target.rotation.x = Math.PI / 2;
        target.position.set(0.05, 0, 0);
        scene.add(target);

        const label = makeTextSprite('螺旋测微器', '#475569', 28, { x: 0.9, y: 0.26 });
        label.position.set(0.2, 0.45, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },
    updateEquipment() {},
    getVisualPosition(pos) { return new THREE.Vector3(pos.x * WORLD_SCALE, 0, 0); },
    getOrigin() { return new THREE.Vector3(0, 0, 0); }
};

/** 多用电表 */
export const multimeterRig: SceneRig = {
    worldScale: WORLD_SCALE,
    buildEquipment(scene, _params) {
        // 表身
        const body = makeBox(0.6, 0.8, 0.15, 0xfbbf24, 0.4, 0.15);
        body.position.set(0, 0.1, 0);
        scene.add(body);

        // 显示屏
        const screen = makeBox(0.4, 0.2, 0.02, 0x1e293b, 0.2, 0.1);
        screen.position.set(0, 0.4, 0.08);
        scene.add(screen);

        // 旋钮
        const knob = makeCylinder(0.08, 0.04, 0x334155, 0.3, 0.3);
        knob.position.set(0, 0.05, 0.09);
        scene.add(knob);

        // 表笔
        const probe1 = makeCylinder(0.01, 0.5, 0xdc2626, 0.3, 0.3);
        probe1.position.set(-0.15, -0.3, 0.1);
        scene.add(probe1);

        const probe2 = makeCylinder(0.01, 0.5, 0x1e293b, 0.3, 0.3);
        probe2.position.set(0.15, -0.3, 0.1);
        scene.add(probe2);

        const label = makeTextSprite('多用电表', '#475569', 28, { x: 0.7, y: 0.26 });
        label.position.set(0, -0.35, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },
    updateEquipment() {},
    getVisualPosition(pos) { return new THREE.Vector3(pos.x * WORLD_SCALE, 0, 0); },
    getOrigin() { return new THREE.Vector3(0, 0, 0); }
};
