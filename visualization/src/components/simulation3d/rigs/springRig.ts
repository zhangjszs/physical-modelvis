/**
 * 弹簧振子简谐振动 rig — 固定端墙壁 + 水平螺旋弹簧 + 平衡位置标线 + 振幅标尺
 * 演示简谐运动 x = A·cos(ωt + φ)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createHelicalSpring, updateHelicalSpring, HelicalSpringHandles } from '../equipment/helicalSpring';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const OSCILLATOR_Y = 0.25;
const WALL_X = -1.6;

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

export const springRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 左侧固定端墙壁
        const wall = makeBox(0.18, 0.7, 0.7, 0x475569, 0.6, 0.2);
        wall.position.set(WALL_X, 0.35, 0);
        group.add(wall);

        // 2. 水平真实螺旋弹簧 (从墙面 WALL_X 延伸至平衡位置 0)
        const springLen = Math.abs(WALL_X);
        const { group: springGroup, handles: springHandles } = createHelicalSpring(
            springLen,
            0.065,
            14,
            0.009,
            0x94a3b8
        );
        springGroup.position.set(0, 0, 0);
        group.add(springGroup);

        // 初始将弹簧水平对齐
        updateHelicalSpring(
            springHandles,
            new THREE.Vector3(WALL_X, OSCILLATOR_Y, 0),
            new THREE.Vector3(0, OSCILLATOR_Y, 0)
        );

        // 3. 光滑实验水平底座
        const floor = makeBox(4.0, 0.05, 0.7, 0xe2e8f0, 0.4, 0.1);
        floor.position.set(0, 0.025, 0);
        group.add(floor);

        // 4. 平衡位置 O 标记线 (黄色醒目垂线)
        const eqPts = [new THREE.Vector3(0, 0.05, -0.32), new THREE.Vector3(0, 0.05, 0.32)];
        const equilibriumLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(eqPts),
            new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 3 })
        );
        group.add(equilibriumLine);

        const eqLabel = makeTextSprite('平衡位置 O (x=0)', '#ca8a04', 20, { x: 0.8, y: 0.16 });
        eqLabel.position.set(0, 0.1, 0.4);
        group.add(eqLabel);

        // 5. 简谐运动状态标牌
        const m = num(params.m, 1);
        const k = num(params.k, 20);
        const A = num(params.A, 0.5);
        const omega = Math.sqrt(k / Math.max(0.01, m));
        const T = (2 * Math.PI) / omega;

        const infoLabel = makeTextSprite(
            `A=${A.toFixed(2)}m, T=${T.toFixed(2)}s (k=${k}N/m, m=${m}kg) | 简谐振动`,
            '#2563eb',
            24,
            { x: 1.4, y: 0.22 }
        );
        infoLabel.position.set(0, 0.75, 0.3);
        group.add(infoLabel);

        scene.add(group);

        const handles: SpringHandles = {
            wall,
            springHandles,
            floor,
            equilibriumLine,
            infoLabel,
            lastEndX: 0
        };

        return { group, handles };
    },

    updateEquipment(handles, params) {
        const h = handles as SpringHandles;
        const m = num(params.m, 1);
        const k = num(params.k, 20);
        const A = num(params.A, 0.5);
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

    getVisualPosition(pos, _params) {
        // 振子沿水平方向做简谐振动
        return new THREE.Vector3(pos.x * WORLD_SCALE, OSCILLATOR_Y, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, OSCILLATOR_Y, 0);
    }
};
