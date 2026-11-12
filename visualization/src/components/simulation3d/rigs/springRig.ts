/**
 * 弹簧振子简谐振动 rig — 固定端墙壁 + 水平螺旋弹簧 + 平衡位置标线 + 振幅标尺
 * 演示简谐运动 x = A·cos(ωt + φ)
 *
 * 口径修正 (#159 逐节审计·问题二):
 *   旧实现把固定端放在 world x = −1.6 (= 10 m, 因为 WORLD_SCALE=0.16),
 *   而引擎的弹簧原长是 0 → 画出来的弹簧长度与引擎的伸长量毫无关系;
 *   振子世界行程只有 ±0.08 单位 (±0.5 m × 0.16), 几乎看不出在振动。
 *   现在: 固定端 = 引擎锚点 (world x=0), 弹簧长度 = 引擎弹簧长度,
 *   世界比例由振幅推导 (世界跨度固定), 振动清晰可见。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createHelicalSpring, updateHelicalSpring, HelicalSpringHandles } from '../equipment/helicalSpring';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

/** 弹簧在世界里的最大跨度 (世界单位) */
const SPRING_WORLD_SPAN = 2.4;
const BALL_RADIUS = 0.18;
const OSCILLATOR_Y = 0.25;
const WALL_X = 0;

// 模块级 scratch vector，避免 onAnimate 每帧分配新对象 (#16)
const _springAnchor = new THREE.Vector3(WALL_X, OSCILLATOR_Y, 0);
const _springEnd = new THREE.Vector3();

interface SpringHandles {
    wall: THREE.Mesh;
    springHandles: HelicalSpringHandles;
    floor: THREE.Mesh;
    equilibriumLine: THREE.Line;
    infoLabel: THREE.Sprite;
    /** onAnimate 上一帧弹簧自由端 x；位移阈值内跳过几何重建以省开销 */
    lastEndX: number;
}

/** 引擎弹簧原长 (m) —— 与场景 buildProblem 同源 (A + 0.25) */
export function springNaturalLength(A: number): number {
    return A + 0.25;
}

/** 米 → 世界单位: 由振幅推导, 保证振幅在世界里始终清晰可见 */
export function springUnitsPerMeter(params: Record<string, number>): number {
    const A = Math.max(0, num(params['A'], 0.5));
    const maxLength = springNaturalLength(A) + A; // 弹簧最���长度
    return SPRING_WORLD_SPAN / Math.max(0.1, maxLength);
}

export const springRig: SceneRig = {
    worldScale: 1,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    /** 自定义取景: 器材摆在 x≈0 (舞台中心在 3.6), 通用取景会看偏 */
    framing() {
        const target: [number, number, number] = [SPRING_WORLD_SPAN * 0.45, OSCILLATOR_Y, 0];
        const distance = 4.0;
        return {
            target,
            position: [target[0] + distance * 0.32, target[1] + distance * 0.28, distance * 0.9],
            distance
        };
    },

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const A = Math.max(0, num(params['A'], 0.5));
        const k = springUnitsPerMeter(params);
        const naturalLength = springNaturalLength(A);

        // 1. 左侧固定端墙壁 (= 引擎锚点 world x=0)
        const wall = makeBox(0.18, 0.7, 0.7, 0x475569, 0.6, 0.2);
        wall.position.set(WALL_X - 0.09, 0.35, 0);
        group.add(wall);

        // 2. 水平真实螺旋弹簧 (从墙面延伸到振子)
        const { group: springGroup, handles: springHandles } = createHelicalSpring(
            naturalLength * k,
            0.065,
            14,
            0.009,
            0x94a3b8
        );
        springGroup.position.set(0, 0, 0);
        group.add(springGroup);

        // 初始将弹簧水平对齐 (静止在平衡位置)
        updateHelicalSpring(
            springHandles,
            new THREE.Vector3(WALL_X, OSCILLATOR_Y, 0),
            new THREE.Vector3(naturalLength * k, OSCILLATOR_Y, 0)
        );

        // 3. 光滑实验水平底座
        const floor = makeBox(SPRING_WORLD_SPAN + 0.6, 0.05, 0.7, 0xe2e8f0, 0.4, 0.1);
        floor.position.set(SPRING_WORLD_SPAN / 2, 0.025, 0);
        group.add(floor);

        // 4. 平衡位置 O 标记线 (黄色醒目垂线) —— 弹簧原长处
        const eqX = naturalLength * k;
        const eqPts = [new THREE.Vector3(eqX, 0.05, -0.32), new THREE.Vector3(eqX, 0.05, 0.32)];
        const equilibriumLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(eqPts),
            new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 3 })
        );
        group.add(equilibriumLine);

        const eqLabel = makeTextSprite('平衡位置 O (x=0)', '#ca8a04', 20, { x: 0.8, y: 0.16 });
        eqLabel.position.set(eqX, 0.1, 0.4);
        group.add(eqLabel);

        // 5. 简谐运动状态标牌
        const m = num(params['m'], 1);
        const kSpring = num(params['k'], 10);
        const omega = Math.sqrt(kSpring / Math.max(0.01, m));
        const T = (2 * Math.PI) / omega;

        const infoLabel = makeTextSprite(
            `A=${A.toFixed(2)}m, T=${T.toFixed(2)}s (k=${kSpring}N/m, m=${m}kg) | 简谐振动`,
            '#2563eb',
            26,
            { x: 1.5, y: 0.23 }
        );
        infoLabel.position.set(SPRING_WORLD_SPAN * 0.45, 0.8, 0.3);
        group.add(infoLabel);

        scene.add(group);

        const handles: SpringHandles = {
            wall,
            springHandles,
            floor,
            equilibriumLine,
            infoLabel,
            lastEndX: eqX
        };

        return { group, handles };
    },

    updateEquipment(handles, params) {
        const h = handles as SpringHandles;
        const m = num(params['m'], 1);
        const k = num(params['k'], 10);
        const A = Math.max(0, num(params['A'], 0.5));
        const omega = Math.sqrt(k / Math.max(0.01, m));
        const T = (2 * Math.PI) / omega;

        setLabel(h.infoLabel, `A=${A.toFixed(2)}m, T=${T.toFixed(2)}s (k=${k}N/m, m=${m}kg) | 简谐振动`, '#2563eb');
    },

    onAnimate(handles, ctx) {
        const h = handles as SpringHandles;
        // 水平弹簧振子：自由端每帧随动接到振子球心 X，使弹簧实时拉伸/压缩与小球贴合。
        // 位移阈值内跳过 updateHelicalSpring (内部会重建 TubeGeometry)，避免静止/暂停时无谓开销。
        const endX = Math.max(WALL_X + 0.2, ctx.ballPos.x);
        if (Math.abs(endX - h.lastEndX) < 1e-4) return;
        h.lastEndX = endX;
        _springEnd.set(endX, OSCILLATOR_Y, 0);
        updateHelicalSpring(h.springHandles, _springAnchor, _springEnd);
    },

    getVisualPosition(pos, params) {
        // 振子沿水平方向做简谐振动; 世界比例由振幅推导 (弹簧长度 = 引擎弹簧长度)
        const k = springUnitsPerMeter(params);
        return new THREE.Vector3(pos.x * k, OSCILLATOR_Y, 0);
    },

    getOrigin(params) {
        const A = Math.max(0, num(params['A'], 0.5));
        return new THREE.Vector3(springNaturalLength(A) * springUnitsPerMeter(params), OSCILLATOR_Y, 0);
    }
};
