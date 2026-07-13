/**
 * 电路 rig — 电源 + 电阻 + 导线 + 测量仪表
 * 用于 circuit、load-voltage、resistance-law、bulb-vi、ac-current、lc-oscillator、security-alarm
 *
 * 参数响应：
 * - emf：电源电动势 → 灯泡亮度（emissiveIntensity）+ 电流方向箭头长度
 *   （作为电流大小的直观代理；其余场景仅含 emf 时同样生效）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeLine, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

export const circuitRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 电路底座
        const board = makeBox(2.5, 0.04, 1.0, 0x1e293b, 0.5, 0.1);
        board.position.set(0, 0.02, 0);
        scene.add(board);

        // 导线（矩形回路）
        const wire = makeLine(
            [
                new THREE.Vector3(-1.0, 0.1, 0.3),
                new THREE.Vector3(1.0, 0.1, 0.3),
                new THREE.Vector3(1.0, 0.1, -0.3),
                new THREE.Vector3(-1.0, 0.1, -0.3),
                new THREE.Vector3(-1.0, 0.1, 0.3)
            ],
            0xf59e0b,
            0.8
        );
        scene.add(wire);

        // 电源（左）
        const battery = makeBox(0.2, 0.15, 0.1, 0xdc2626, 0.3, 0.2);
        battery.position.set(-1.0, 0.15, 0.3);
        scene.add(battery);

        // 电阻（上）
        const resistor = makeBox(0.3, 0.08, 0.06, 0x78716c, 0.5, 0.1);
        resistor.position.set(0, 0.12, 0.3);
        scene.add(resistor);

        // 灯泡（右）
        const bulb = makeCylinder(0.08, 0.12, 0xfbbf24, 0.2, 0.3);
        bulb.position.set(1.0, 0.14, -0.3);
        (bulb.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xfbbf24);
        (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
        scene.add(bulb);

        // 电流方向箭头
        const currentArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0.2, 0.3),
            0.3,
            0x16a34a,
            0.06,
            0.04
        );
        scene.add(currentArrow);

        const label = makeTextSprite('I', '#16a34a', 20, { x: 0.2, y: 0.15 });
        label.position.set(0, 0.3, 0.3);
        scene.add(label);

        return { group: new THREE.Group(), handles: { bulb, currentArrow } };
    },

    updateEquipment(handles, params) {
        const bulb = handles.bulb as THREE.Mesh;
        const currentArrow = handles.currentArrow as THREE.ArrowHelper;
        const emf = num(params['emf'], NaN);
        if (Number.isNaN(emf)) return;

        // 电动势越大 → 灯泡越亮（emissiveIntensity 随 emf 提升）
        const glow = THREE.MathUtils.clamp((emf / 12) * 0.8, 0.05, 2.0);
        (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;

        // 电流方向箭头长度随电动势变化（电流大小直观代理）
        const len = THREE.MathUtils.clamp(0.1 + (emf / 36) * 0.6, 0.1, 0.8);
        currentArrow.setLength(len, 0.06, 0.04);
    },

    getVisualPosition(pos, _params) {
        // 电荷在导线中流动 → 映射为水平运动
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.15, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.15, 0);
    }
};
