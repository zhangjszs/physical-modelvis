/**
 * 超重失重 rig — 电梯中弹簧测力计 + 钩码
 * 演示加速上升（超重）/ 加速下降（失重）时示数变化（overweight）
 *
 * 参数响应：
 * - mode：运动阶段 0=向上加速 1=向上减速 2=向下加速 3=向下减速
 * - mass / accMagnitude / gravity：计算视重 N = m(g±a)
 *   → 台秤状态标签（超重/失重/静止 + 示数）与钩码位置（弹簧拉伸）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createSpringScale } from '../equipment/springScale';
import { createWeight } from '../equipment/weight';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const WEIGHT_BASE_Y = 1.3;

export const overweightRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 电梯厢（线框）
        const elevator = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 2.0, 1.0),
            new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true, transparent: true, opacity: 0.3 })
        );
        elevator.position.set(0, 1.0, -0.5);
        scene.add(elevator);

        // 铁架台（电梯内）
        const { group: standGroup } = createIronStand(1.8);
        standGroup.position.set(0, 0, 0);
        scene.add(standGroup);

        // 弹簧测力计（悬挂）
        const { group: scaleGroup } = createSpringScale();
        scaleGroup.position.set(0, 1.8, 0);
        scene.add(scaleGroup);

        // 钩码
        const { group: weightGroup } = createWeight(0.05, 0x64748b);
        weightGroup.position.set(0, WEIGHT_BASE_Y, 0);
        scene.add(weightGroup);

        // 状态标签
        const statusLabel = makeTextSprite('静止  N=9.8N', '#2563eb', 28, { x: 0.9, y: 0.22 });
        statusLabel.position.set(0.9, 2.0, 0);
        scene.add(statusLabel);

        const group = new THREE.Group();
        return { group, handles: { elevator, scaleGroup, weightGroup, statusLabel } };
    },

    updateEquipment(handles, params) {
        const weightGroup = handles.weightGroup as THREE.Group;
        const statusLabel = handles.statusLabel as THREE.Sprite;

        const mode = Math.round(num(params['mode'], 0));
        const mass = num(params['mass'], 1);
        const a = num(params['accMagnitude'], 2);
        const g = num(params['gravity'], 9.8);

        // 视重 N = m(g ± a)，向上加速/向下减速为超重(+a)，其余为失重(-a)
        const sign = mode === 0 || mode === 3 ? 1 : -1;
        const N = mass * (g + sign * a);

        let status = '静止';
        let color = '#2563eb';
        if (N > mass * g + 1e-6) {
            status = '超重';
            color = '#dc2626';
        } else if (N < mass * g - 1e-6) {
            status = '失重';
            color = '#0ea5e9';
        }
        setLabel(statusLabel, `${status}  N=${N.toFixed(1)}N`, color);

        // 弹簧拉伸：视重 > 静止重力时钩码下移，失重时上移
        const delta = THREE.MathUtils.clamp((N - mass * g) * 0.02, -0.18, 0.18);
        weightGroup.position.y = WEIGHT_BASE_Y + delta;
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(0.5, 1.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.5, 1.5, 0);
    }
};
