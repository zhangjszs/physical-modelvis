/**
 * 牛顿第二定律 rig — 实验长木板 + 滑轮 + 牵引重物 + 实时加速度标牌
 * 探究 a 与 F、m 的关系 F=ma
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createBench } from '../equipment/bench';
import { createPulley } from '../equipment/pulley';
import { createWeight } from '../equipment/weight';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const BENCH_Y = 0.1;
const PULLEY_X = 2.1; // 定滑轮横坐标
const CART_START_X = -1.8; // 小车起始横坐标
const HANG_TOP_Y = BENCH_Y + BALL_RADIUS; // 水平段高度
const WEIGHT_INIT_Y = -0.4; // 砝码初始悬挂高度

interface NSLHandles {
    bench: THREE.Group;
    pulley: THREE.Group;
    string: THREE.Line;
    weightGroup: THREE.Group;
    infoLabel: THREE.Sprite;
}

export const newtonSecondLawRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        // 1. 实验长木板
        const { group: bench } = createBench(4.2, 0.1);
        bench.position.set(0, 0, 0);
        scene.add(bench);

        // 2. 右端轻质定滑轮
        const { group: pulley } = createPulley();
        pulley.position.set(2.1, BENCH_Y + 0.05, 0);
        scene.add(pulley);

        // 3. 牵引细线 (从小车起点 → 滑轮 → 悬挂砝码)
        const string = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(CART_START_X, HANG_TOP_Y, 0),
                new THREE.Vector3(PULLEY_X, HANG_TOP_Y, 0),
                new THREE.Vector3(PULLEY_X, WEIGHT_INIT_Y, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0x475569, linewidth: 2 })
        );
        scene.add(string);

        // 4. 悬挂砝码盘
        const { group: weightGroup } = createWeight(0.06, 0xd97706);
        weightGroup.position.set(PULLEY_X, WEIGHT_INIT_Y, 0);
        scene.add(weightGroup);

        // 5. 加速度与合外力标牌
        const force = num(params['force'], 10);
        const mass = num(params['mass'], 2);
        const a = mass > 0 ? force / mass : 0;
        const infoLabel = makeTextSprite(
            `F = ${force.toFixed(1)} N, m = ${mass.toFixed(1)} kg → a = ${a.toFixed(2)} m/s²`,
            '#2563eb',
            24,
            { x: 1.4, y: 0.22 }
        );
        infoLabel.position.set(0, BENCH_Y + 0.65, 0.35);
        scene.add(infoLabel);

        const group = new THREE.Group();
        return {
            group,
            handles: { bench, pulley, string, weightGroup, infoLabel }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as NSLHandles;
        const force = num(params['force'], 10);
        const mass = num(params['mass'], 2);
        const a = mass > 0 ? force / mass : 0;

        setLabel(
            h.infoLabel,
            `F = ${force.toFixed(1)} N, m = ${mass.toFixed(1)} kg → a = ${a.toFixed(2)} m/s²`,
            '#2563eb'
        );
    },

    getVisualPosition(pos, _params) {
        // 小车在木板上水平加速滑动
        return new THREE.Vector3(CART_START_X + pos.x * WORLD_SCALE, HANG_TOP_Y, 0);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as NSLHandles;
        // 小车前进时：细线小车端随主球 x 移动，水平段缩短，跨过滑轮后悬挂段等量变长 → 砝码下降。
        // 复用 BufferAttribute 就地改顶点，杜绝每帧 GC 分配 (同 pendulumRig)。
        const startX = THREE.MathUtils.clamp(ctx.ballPos.x, CART_START_X, PULLEY_X - 0.15);
        const advance = Math.max(0, startX - CART_START_X);
        const hangBottom = WEIGHT_INIT_Y - advance;
        const attr = h.string.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
        if (attr && attr.count >= 3) {
            attr.setXYZ(0, startX, HANG_TOP_Y, 0);
            attr.setXYZ(1, PULLEY_X, HANG_TOP_Y, 0);
            attr.setXYZ(2, PULLEY_X, hangBottom, 0);
            attr.needsUpdate = true;
        }
        h.weightGroup.position.set(PULLEY_X, hangBottom, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(CART_START_X, HANG_TOP_Y, 0);
    }
};
