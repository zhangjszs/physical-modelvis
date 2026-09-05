/**
 * 惯性实验 3D Rig
 * 支持人教版高中物理 3 大经典惯性演示：
 * 0: 击打叠放棋子 (下层飞出，上层因惯性垂直落定)
 * 1: 小车运动急停 (撞障急停，上放物块因惯性前冲倾倒)
 * 2: 抽拉纸板落杯 (飞速抽拉卡片，重球/鸡蛋因惯性落入水杯)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface InertiaHandles {
    rootGroup: THREE.Group;
    mode0Group: THREE.Group; // 棋子组
    mode1Group: THREE.Group; // 小车急停组
    mode2Group: THREE.Group; // 水杯抽纸板组
    cartMesh: THREE.Group;
    blockOnCart: THREE.Mesh;
    bumper: THREE.Mesh;
    beakerMesh: THREE.Mesh;
    cardMesh: THREE.Mesh;
    bottomChecker: THREE.Mesh;
    topCheckers: THREE.Group;
    arrowVTop: THREE.ArrowHelper;
    arrowVBottom: THREE.ArrowHelper;
    modeLabel: THREE.Sprite;
    explainLabel: THREE.Sprite;
    mode: number;
    initialSpeed: number;
}

export const inertiaRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 0. 通用实验工作台 (长 3.2m, 宽 1.0m, 高 0.1m)
        const tableTop = makeBox(3.2, 0.08, 1.0, 0x334155, 0.5, 0.3);
        tableTop.position.set(0, 0.04, 0);
        tableTop.receiveShadow = true;
        group.add(tableTop);

        // 桌腿
        [
            [-1.5, -0.4],
            [-1.5, 0.4],
            [1.5, -0.4],
            [1.5, 0.4]
        ].forEach(([x, z]) => {
            const leg = makeBox(0.08, 0.08, 0.08, 0x1e293b, 0.6, 0.2);
            leg.position.set(x ?? 0, 0, z ?? 0);
            group.add(leg);
        });

        // ==========================================
        // Mode 0: 击打叠放棋子
        // ==========================================
        const mode0Group = new THREE.Group();
        mode0Group.position.set(0, 0.08, 0);

        // 底座小圆台
        const basePad = makeCylinder(0.25, 0.02, 0x0f172a, 0.4, 0.2);
        basePad.position.set(0, 0.01, 0);
        mode0Group.add(basePad);

        // 最底下一枚待击打棋子 (红色木质圆片)
        const bottomChecker = makeCylinder(0.12, 0.04, 0xef4444, 0.4, 0.1);
        bottomChecker.position.set(0, 0.04, 0);
        bottomChecker.castShadow = true;
        mode0Group.add(bottomChecker);

        // 上方叠放的多枚棋子 (黄色/深色交替)
        const topCheckers = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const chk = makeCylinder(0.12, 0.04, i % 2 === 0 ? 0xf59e0b : 0x3b82f6, 0.4, 0.1);
            chk.position.set(0, 0.08 + i * 0.045, 0);
            chk.castShadow = true;
            topCheckers.add(chk);
        }
        mode0Group.add(topCheckers);

        // 击打钢尺 / 弹片
        const ruler = makeBox(0.8, 0.015, 0.05, 0x94a3b8, 0.2, 0.85);
        ruler.position.set(-0.45, 0.04, 0);
        mode0Group.add(ruler);

        group.add(mode0Group);

        // ==========================================
        // Mode 1: 小车运动急停
        // ==========================================
        const mode1Group = new THREE.Group();
        mode1Group.position.set(0, 0.08, 0);

        // 水平轻合金导轨
        const track = makeBox(2.8, 0.03, 0.25, 0x64748b, 0.3, 0.6);
        track.position.set(0, 0.015, 0);
        mode1Group.add(track);

        // 前端急停橡胶缓冲挡块 (位于 x = 0.8)
        const bumper = makeBox(0.08, 0.18, 0.25, 0xd97706, 0.3, 0.4);
        bumper.position.set(0.8, 0.1, 0);
        bumper.castShadow = true;
        mode1Group.add(bumper);

        // 运动小车组
        const cartMesh = new THREE.Group();
        const cartBody = makeBox(0.35, 0.05, 0.2, 0x2563eb, 0.4, 0.3);
        cartBody.position.set(0, 0.06, 0);
        cartMesh.add(cartBody);

        // 4 个小车滚轮
        [
            [-0.12, -0.11],
            [-0.12, 0.11],
            [0.12, -0.11],
            [0.12, 0.11]
        ].forEach(([wx, wz]) => {
            const wheel = makeCylinder(0.035, 0.02, 0x0f172a, 0.3, 0.2);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(wx ?? 0, 0.035, wz ?? 0);
            cartMesh.add(wheel);
        });

        // 小车上立放的高圆柱木块 (极易因急停惯性向前倾倒)
        const blockOnCart = makeCylinder(0.04, 0.26, 0xca8a04, 0.4, 0.1);
        blockOnCart.position.set(0, 0.21, 0);
        blockOnCart.castShadow = true;
        cartMesh.add(blockOnCart);

        mode1Group.add(cartMesh);
        group.add(mode1Group);

        // ==========================================
        // Mode 2: 纸板抽拉鸡蛋/钢球落杯
        // ==========================================
        const mode2Group = new THREE.Group();
        mode2Group.position.set(0, 0.08, 0);

        // 烧杯 (厚壁透明圆筒)
        const beakerGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.42, 32, 1, true);
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.35,
            transmission: 0.85,
            roughness: 0.1,
            metalness: 0.05
        });
        const beakerMesh = new THREE.Mesh(beakerGeo, glassMat);
        beakerMesh.position.set(0, 0.21, 0);
        mode2Group.add(beakerMesh);

        // 水位 (烧杯内半满水)
        const water = makeCylinder(0.165, 0.24, 0x38bdf8, 0.1, 0.1);
        water.position.set(0, 0.12, 0);
        mode2Group.add(water);

        // 杯口塑料卡片 / 纸板
        const cardMesh = makeBox(0.45, 0.008, 0.35, 0xf8fafc, 0.8, 0.1);
        cardMesh.position.set(0, 0.425, 0);
        cardMesh.castShadow = true;
        mode2Group.add(cardMesh);

        // 纸板拉力牵引绳
        const pullString = makeCylinder(0.004, 0.4, 0xef4444, 0.4, 0.2);
        pullString.rotation.z = Math.PI / 2;
        pullString.position.set(0.4, 0.425, 0);
        mode2Group.add(pullString);

        group.add(mode2Group);

        // ==========================================
        // 动态矢量与 HUD 状态
        // ==========================================
        const arrowVTop = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.6, 0), 0.4, 0x10b981, 0.1, 0.05);
        const arrowVBottom = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0.3, 0),
            0.4,
            0x3b82f6,
            0.1,
            0.05
        );
        group.add(arrowVTop);
        group.add(arrowVBottom);

        const modeLabel = makeTextSprite('惯性实验', '#0f172a', 24, { x: 1.4, y: 0.28 });
        modeLabel.position.set(0, 1.25, 0);
        group.add(modeLabel);

        const explainLabel = makeTextSprite('保持原有运动状态的固有属性', '#2563eb', 20, { x: 1.8, y: 0.24 });
        explainLabel.position.set(0, 1.05, 0);
        group.add(explainLabel);

        scene.add(group);

        const handles: InertiaHandles = {
            rootGroup: group,
            mode0Group,
            mode1Group,
            mode2Group,
            cartMesh,
            blockOnCart,
            bumper,
            beakerMesh,
            cardMesh,
            bottomChecker,
            topCheckers,
            arrowVTop,
            arrowVBottom,
            modeLabel,
            explainLabel,
            mode: 0,
            initialSpeed: 2
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as InertiaHandles;
        const mode = Math.round(num(params['mode'], 0));
        const initialSpeed = num(params['initialSpeed'], 2);

        h.mode = mode;
        h.initialSpeed = initialSpeed;

        // 根据模式切换实验器材的可见性
        h.mode0Group.visible = mode === 0;
        h.mode1Group.visible = mode === 1;
        h.mode2Group.visible = mode === 2;

        if (h.modeLabel) {
            const titles = ['惯性演示：击打叠放棋子', '惯性演示：小车急停倾倒', '惯性演示：抽拉卡片重球入杯'];
            updateTextSprite(h.modeLabel, titles[mode] ?? '惯性实验', '#0f172a', 24);
        }

        if (h.explainLabel) {
            const sub = [
                `打击下层棋子 ⇛ 下层飞出，上层因惯性保持静止而竖直落定`,
                `小车遇障急停 ⇛ 车体受阻静止，上方物块因惯性保持前冲倾倒`,
                `快速抽拉纸板 ⇛ 作用时间极短，重球由于惯性几乎未移动并落入水杯`
            ];
            updateTextSprite(h.explainLabel, sub[mode] ?? '', '#2563eb', 20);
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as InertiaHandles;
        if (!h.rootGroup) return;

        const { time } = ctx;
        const mode = h.mode;
        const v0 = h.initialSpeed;

        if (mode === 0) {
            // 模式 0: 下层棋子被击飞，上层棋子平稳落定
            // t < 0.2: 击打瞬间；t >= 0.2: 下层飞出，上层下落
            if (time > 0.05) {
                h.bottomChecker.position.x = (time - 0.05) * v0 * 2;
                // 上层棋子因重力下落填补空缺 (下移 0.04m)
                const dropDelta = Math.min(0.04, (time - 0.05) * 0.5);
                h.topCheckers.position.y = -dropDelta;
            } else {
                h.bottomChecker.position.x = 0;
                h.topCheckers.position.y = 0;
            }
        } else if (mode === 1) {
            // 模式 1: 小车运动并在 x=0.6 处急停，物块向前倾倒
            const stopX = 0.55;
            const startX = -1.0;
            const cartX = Math.min(stopX, startX + v0 * time * 0.4);
            h.cartMesh.position.x = cartX;

            if (cartX >= stopX) {
                // 急停瞬间：物块向前倾倒 (绕底边向前翻转)
                const overTime = time - (stopX - startX) / (v0 * 0.4);
                const tiltAngle = Math.min(Math.PI / 2.2, Math.max(0, overTime * 6));
                h.blockOnCart.rotation.z = -tiltAngle;
                h.blockOnCart.position.x = Math.sin(tiltAngle) * 0.12;
            } else {
                h.blockOnCart.rotation.z = 0;
                h.blockOnCart.position.x = 0;
            }
        } else if (mode === 2) {
            // 模式 2: 卡片被快速抽出
            if (time > 0.1) {
                h.cardMesh.position.x = (time - 0.1) * v0 * 3;
            } else {
                h.cardMesh.position.x = 0;
            }
        }

        // 矢量箭头跟随
        h.arrowVTop.position.set(ctx.ballPos.x, 0.55, 0);
        h.arrowVBottom.position.set(ctx.ballPos.x, 0.25, 0);
    },

    getVisualPosition(pos, params) {
        const mode = Math.round(num(params['mode'], 0));
        const baseY = mode === 2 ? 0.52 : mode === 1 ? 0.35 : 0.25;
        return new THREE.Vector3(pos.x * WORLD_SCALE, baseY + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(params) {
        const mode = Math.round(num(params['mode'], 0));
        const baseY = mode === 2 ? 0.52 : mode === 1 ? 0.35 : 0.25;
        return new THREE.Vector3(0, baseY, 0);
    }
};
