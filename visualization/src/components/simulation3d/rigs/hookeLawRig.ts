/**
 * 胡克定律 rig — 铁架台 + 真实螺旋弹簧 + 钩码 + 毫米刻度标尺
 * 探究弹簧弹力与形变量关系 F=kx
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createHelicalSpring, updateHelicalSpring, HelicalSpringHandles } from '../equipment/helicalSpring';
import { createWeight } from '../equipment/weight';
import { makeCylinder, makeTextSprite } from '../primitives';
import { findFrameIndex, interpolateFrame } from '../../../utils/frameUtils';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const ANCHOR_Y = 2.2;

/**
 * 刻度尺口径 (与 `createPrecisionScale` 同源):
 *   每 0.11 世界单位 = 2 cm  →  1 世界单位 = 2/0.11 cm = 18.18 cm = 0.1818 m
 *   → RULER_UNITS_PER_M = 1/0.1818 = 5.5 世界单位/米
 *
 * 旧实现把弹簧形变画成 `Δx × WORLD_SCALE × 4` (= 0.64 单位/米) —— 与刻度尺的
 * 5.5 单位/米 差 **8.6 倍**: 标尺读数与弹簧实际拉伸完全对不上 (#159 逐节审计·问题二)。
 */
const RULER_UNITS_PER_M = 5.5;
/** 刻度尺量程: 0.11 × 15 = 1.65 单位 = 30 cm */
const RULER_RANGE_M = 0.3;
/** 弹簧原长 (m) —— 与场景 buildProblem 的 constraints.spring.naturalLength 同源 */
const NATURAL_LENGTH_M = 0.1;
/** 弹簧原长 (世界单位) —— 与刻度尺同口径 */
const NATURAL_LENGTH_WORLD = NATURAL_LENGTH_M * RULER_UNITS_PER_M;

export interface HookeHandles {
    standGroup: THREE.Group;
    springHandles: HelicalSpringHandles;
    weightGroup: THREE.Group;
    scaleGroup: THREE.Group;
    readoutLabel: THREE.Sprite;
}

/**
 * 胡克定律读数 — **单一真源: 引擎 maxValues** (#159 逐节审计)
 *
 * 旧实现读 `params['m']` —— 场景里**根本没有这个参数** (场景给的是
 * `massPerWeight` g 与 `weightCount` 个), 于是 `num(params['m'], 0.5)` 静默回退到
 * 0.5 kg, 标牌显示「F = 4.90 N | Δx = 24.5 cm」, 而真实值是 4×50 g = 0.2 kg →
 * 「F = 1.96 N | Δx = 9.8 cm」: 力与伸长量都错了 **2.5 倍**。
 *
 * 现在: 钩码质量由场景真实参数合成, 平衡伸长量读引擎
 * `maxValues.equilibriumDisplacement` (= mg/k, 由引擎按重力沿轴分量算出)。
 */
export interface HookeLawReadouts {
    /** 钩码总质量 (kg) */
    mass: number;
    /** 劲度系数 (N/m) */
    k: number;
    /** 重力 (N) */
    weight: number;
    /** 平衡伸长量 Δx = mg/k (m) */
    deltaX: number;
    /** 读数来源 */
    source: 'engine' | 'fallback';
}

export function hookeLawReadouts(params: Record<string, number>, result?: SimulationResult | null): HookeLawReadouts {
    const k = num(params['k'], 20);
    const massPerWeight = num(params['massPerWeight'], 50) / 1000;
    const weightCount = Math.max(1, num(params['weightCount'], 4));
    const g = num(params['g'], 9.8);
    const mass = massPerWeight * weightCount;
    const weight = mass * g;
    const mv = result?.diagnostics?.maxValues;
    const engineDelta = mv ? mv['equilibriumDisplacement'] : undefined;
    const useEngine = typeof engineDelta === 'number';
    return {
        mass,
        k,
        weight,
        deltaX: useEngine ? engineDelta : k > 0 ? weight / k : 0,
        source: useEngine ? 'engine' : 'fallback'
    };
}

/** 引擎位置 → 弹簧伸长量 (m): 锚点 (0,0), 轴向 (0,−1), 原长 L0 */
export function hookeLawExtension(position: { x: number; y: number }): number {
    return Math.max(0, -position.y - NATURAL_LENGTH_M);
}

export const hookeLawRig: SceneRig = {
    worldScale: WORLD_SCALE,
    // 钩码由 rig 自绘 (重量盘 + 钩码), 不再叠加舞台默认小球
    ownParticles: true,

    /**
     * 自定义取景 (#159 逐节审计·问题二):
     * 舞台通用自动取景按轨迹包围盒算距离, 而本场景的轨迹是一根**竖直短线**
     * (伸长量 ≤ 0.2 m → 0.03 世界单位), 自动取景会把相机拉到 5.5 单位以外,
     * 铁架台/弹簧/刻度尺挤成一小团。这里显式把镜头对准器材本身。
     */
    framing() {
        const target: [number, number, number] = [0, 1.35, 0];
        const distance = 4.0;
        return {
            target,
            position: [target[0] + distance * 0.42, target[1] + distance * 0.22, distance * 0.88],
            distance
        };
    },

    buildEquipment(scene, params, result) {
        // 1. 铁架台
        const { group: standGroup } = createIronStand(2.6);
        standGroup.position.set(-0.6, 0, 0);
        scene.add(standGroup);

        // 横杆固定夹
        const crossClamp = makeCylinder(0.04, 0.7, 0x475569, 0.4, 0.6);
        crossClamp.rotation.z = Math.PI / 2;
        crossClamp.position.set(-0.25, ANCHOR_Y + 0.05, 0);
        scene.add(crossClamp);

        // 2. 真实螺旋弹簧 (顶端固定在 ANCHOR_Y)
        const { group: springGroup, handles: springHandles } = createHelicalSpring(
            NATURAL_LENGTH_WORLD,
            0.055,
            12,
            0.008,
            0x94a3b8
        );
        springGroup.position.set(0, 0, 0);
        scene.add(springGroup);

        // 3. 悬挂钩码托盘
        const { group: weightGroup } = createWeight(0.06, 0xd97706);
        weightGroup.position.set(0, ANCHOR_Y - NATURAL_LENGTH_WORLD, 0);
        scene.add(weightGroup);

        // 4. 侧边平行刻度尺 (零点对齐弹簧原长端, 刻度向下 = 伸长方向)
        const scaleGroup = createPrecisionScale();
        scaleGroup.position.set(0.35, ANCHOR_Y - NATURAL_LENGTH_WORLD, 0);
        scene.add(scaleGroup);

        // 5. 测量标牌 (读引擎, 不再读场景不存在的 params['m'])
        const read = hookeLawReadouts(params, result);
        const readoutLabel = makeTextSprite(hookeLawLabel(read), '#16a34a', 24, { x: 1.3, y: 0.22 });
        readoutLabel.position.set(0, ANCHOR_Y + 0.35, 0.2);
        scene.add(readoutLabel);

        const group = new THREE.Group();
        const handles: HookeHandles = {
            standGroup,
            springHandles,
            weightGroup,
            scaleGroup,
            readoutLabel
        };

        // 初始几何: 以平衡伸长量摆放
        updateHooke(handles, read.deltaX, read);

        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as HookeHandles;
        const read = hookeLawReadouts(params, result);
        // 参数变化后引擎尚未重算时, 先按平衡伸长量摆位 (下一帧动画会接管)
        updateHooke(h, read.deltaX, read);
    },

    getVisualPosition(pos, _params, _result) {
        // 形变按刻度尺口径绘制 (5.5 单位/米), 与右侧刻度尺读数一一对应
        const extension = hookeLawExtension(pos);
        return new THREE.Vector3(0, ANCHOR_Y - NATURAL_LENGTH_WORLD - extension * RULER_UNITS_PER_M, 0);
    },

    getOrigin(_params, _result) {
        return new THREE.Vector3(0, ANCHOR_Y - NATURAL_LENGTH_WORLD, 0);
    },

    /** 每帧按引擎位置更新弹簧形变与钩码位置 (ownParticles 模式下舞台不画默认球) */
    onAnimate(handles, { time, params, result }) {
        if (!result) return;
        const h = handles as HookeHandles;
        const traj = result.trajectories[0] ?? [];
        if (traj.length === 0) return;
        const idx = findFrameIndex(result.trajectories, time);
        const p0 = traj[idx];
        const p1 = traj[Math.min(idx + 1, traj.length - 1)];
        if (!p0) return;
        const frame = p1 ? interpolateFrame(p0, p1, time) : p0;
        const extension = hookeLawExtension(frame.position);
        updateHooke(h, extension, hookeLawReadouts(params, result));
    }
};

/** 标牌文案: 伸长量超出刻度尺量程时显式标注, 不让标尺静默读错 */
function hookeLawLabel(read: HookeLawReadouts): string {
    const over = read.deltaX > RULER_RANGE_M + 1e-9;
    return (
        `F = ${read.weight.toFixed(2)} N | Δx_eq = ${(read.deltaX * 100).toFixed(1)} cm ` +
        `(k=${read.k.toFixed(0)} N/m${over ? ', 超量程' : ''})`
    );
}

function updateHooke(h: HookeHandles, extension: number, read: HookeLawReadouts): void {
    // 形变按刻度尺口径绘制 (5.5 单位/米), 与右侧毫米刻度尺读数一一对应
    const visualLen = NATURAL_LENGTH_WORLD + Math.min(RULER_RANGE_M, extension) * RULER_UNITS_PER_M;
    const start = new THREE.Vector3(0, ANCHOR_Y, 0);
    const end = new THREE.Vector3(0, ANCHOR_Y - visualLen, 0);

    updateHelicalSpring(h.springHandles, start, end);
    h.weightGroup.position.set(0, ANCHOR_Y - visualLen, 0);

    setLabel(h.readoutLabel, hookeLawLabel(read), '#16a34a');
}

/**
 * 毫米刻度尺: 零点 (原长端) 在 group 原点, 刻度**向下**排列 —— 与弹簧伸长方向一致。
 * 每 0.11 世界单位 = 2 cm, 共 15 格 = 30 cm。
 */
function createPrecisionScale(): THREE.Group {
    const group = new THREE.Group();
    const rod = makeCylinder(0.018, 1.8, 0x334155, 0.4, 0.3);
    rod.position.set(0, -0.9, 0);
    group.add(rod);

    for (let i = 0; i <= 15; i++) {
        const tick = makeCylinder(0.006, i % 5 === 0 ? 0.09 : 0.05, 0x94a3b8, 0.4, 0.3);
        tick.rotation.z = Math.PI / 2;
        tick.position.set(0.03, -i * 0.11, 0);
        group.add(tick);

        if (i % 5 === 0) {
            const label = makeTextSprite(`${i * 2}`, '#334155', 18, { x: 0.22, y: 0.12 });
            label.position.set(0.12, -i * 0.11, 0);
            group.add(label);
        }
    }

    const unit = makeTextSprite('cm', '#334155', 20, { x: 0.25, y: 0.14 });
    unit.position.set(0.12, -1.8, 0);
    group.add(unit);

    return group;
}
