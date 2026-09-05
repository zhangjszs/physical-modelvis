/**
 * 滑动摩擦力 3D 实验 Rig
 * 包含：长条摩擦实验台、4 种可切换接触面材质（特氟龙/光滑木板/帆布/粗砂纸）、
 * 标准木质滑块、可堆叠金属增重砝码组、卧式弹簧测力计与恒速牵引手柄、
 * 严格体现四力正交平衡受力分析 (F_拉, f_摩=μN, N=mg, G=mg)。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface FrictionHandles {
    rootGroup: THREE.Group;
    bench: THREE.Mesh;
    surfaceMatMesh: THREE.Mesh;
    blockGroup: THREE.Group;
    weightsGroup: THREE.Group;
    scaleGroup: THREE.Group;
    scaleSpring: THREE.Mesh;
    scalePointer: THREE.Mesh;
    arrowPull: THREE.ArrowHelper;
    arrowFriction: THREE.ArrowHelper;
    arrowN: THREE.ArrowHelper;
    arrowG: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    measureLabel: THREE.Sprite;
    mu: number;
    mass: number;
    g: number;
    f: number;
}

export const slidingFrictionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 实验长台 (长 3.6m, 宽 0.8m, 高 0.12m)
        const bench = makeBox(3.6, 0.08, 0.8, 0x334155, 0.4, 0.3);
        bench.position.set(0, 0.04, 0);
        bench.receiveShadow = true;
        group.add(bench);

        // 台侧毫米标尺带
        const rulerStrip = makeBox(3.6, 0.025, 0.002, 0xf8fafc, 0.8, 0.1);
        rulerStrip.position.set(0, 0.04, 0.401);
        group.add(rulerStrip);

        // 2. 可更换接触面衬板 (长 3.4m, 宽 0.6m, 厚 0.008m)
        const surfaceGeo = new THREE.BoxGeometry(3.4, 0.008, 0.6);
        const surfaceMat = new THREE.MeshStandardMaterial({
            color: 0xa8a29e,
            roughness: 0.5,
            metalness: 0.05
        });
        const surfaceMatMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
        surfaceMatMesh.position.set(0, 0.084, 0);
        surfaceMatMesh.receiveShadow = true;
        group.add(surfaceMatMesh);

        // 3. 滑块总成 (包含标准木块 + 顶部增重砝码)
        const blockGroup = new THREE.Group();
        blockGroup.position.set(-1.0, 0.088, 0);

        // 标准方形木质滑块 (0.35m x 0.12m x 0.25m)
        const blockWood = makeBox(0.35, 0.12, 0.25, 0xca8a04, 0.6, 0.1);
        blockWood.position.set(0, 0.06, 0);
        blockWood.castShadow = true;
        blockGroup.add(blockWood);

        // 前端拉力金属挂钩
        const hook = makeCylinder(0.012, 0.04, 0xd97706, 0.3, 0.8);
        hook.rotation.z = Math.PI / 2;
        hook.position.set(0.18, 0.06, 0);
        blockGroup.add(hook);

        // 顶部金属堆叠砝码组 (最多叠放 4 块)
        const weightsGroup = new THREE.Group();
        weightsGroup.position.set(0, 0.12, 0);
        for (let i = 0; i < 4; i++) {
            const wt = makeCylinder(0.08, 0.035, 0x64748b, 0.3, 0.8);
            wt.position.set(0, 0.02 + i * 0.038, 0);
            wt.castShadow = true;
            weightsGroup.add(wt);
        }
        blockGroup.add(weightsGroup);
        group.add(blockGroup);

        // 4. 水平弹簧测力计总成 (卧式牵引)
        const scaleGroup = new THREE.Group();
        scaleGroup.position.set(-0.35, 0.148, 0);

        // 测力计透明圆柱外壳 (长 0.5m)
        const scaleCase = makeCylinder(0.035, 0.45, 0x2563eb, 0.2, 0.4);
        scaleCase.rotation.z = Math.PI / 2;
        scaleCase.position.set(0.25, 0, 0);
        scaleGroup.add(scaleCase);

        // 刻度显示窗口
        const scaleDial = makeBox(0.38, 0.02, 0.045, 0xf8fafc, 0.8, 0.1);
        scaleDial.position.set(0.25, 0.028, 0);
        scaleGroup.add(scaleDial);

        // 内部螺旋拉伸弹簧
        const scaleSpringGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 16);
        const scaleSpringMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
        const scaleSpring = new THREE.Mesh(scaleSpringGeo, scaleSpringMat);
        scaleSpring.rotation.z = Math.PI / 2;
        scaleSpring.position.set(0.18, 0, 0);
        scaleGroup.add(scaleSpring);

        // 红色指示指针环
        const pointerGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.012, 24);
        const pointerMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4, roughness: 0.3 });
        const scalePointer = new THREE.Mesh(pointerGeo, pointerMat);
        scalePointer.rotation.z = Math.PI / 2;
        scalePointer.position.set(0.18, 0, 0);
        scaleGroup.add(scalePointer);

        // 牵引手柄拉环
        const pullRing = makeCylinder(0.045, 0.015, 0x0f172a, 0.4, 0.5);
        pullRing.rotation.x = Math.PI / 2;
        pullRing.position.set(0.52, 0, 0);
        scaleGroup.add(pullRing);

        // 测力计与木块之间的细牵引线
        const stringLine = makeCylinder(0.003, 0.35, 0x1e293b, 0.2, 0.2);
        stringLine.rotation.z = Math.PI / 2;
        stringLine.position.set(-0.15, 0, 0);
        scaleGroup.add(stringLine);

        group.add(scaleGroup);

        // 5. 受力分析 4 大动态矢量箭头
        // 拉力 F_拉 (向右绿色)
        const arrowPull = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1.0, 0.15, 0),
            0.5,
            0x10b981,
            0.12,
            0.06
        );
        // 滑动摩擦力 f (向左蓝色)
        const arrowFriction = makeArrow(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(-1.0, 0.09, 0),
            0.5,
            0x3b82f6,
            0.12,
            0.06
        );
        // 支持力 N (向上青色)
        const arrowN = makeArrow(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(-1.0, 0.15, 0),
            0.5,
            0x0ea5e9,
            0.12,
            0.06
        );
        // 重力 G (向下红色)
        const arrowG = makeArrow(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(-1.0, 0.15, 0),
            0.5,
            0xef4444,
            0.12,
            0.06
        );
        group.add(arrowPull);
        group.add(arrowFriction);
        group.add(arrowN);
        group.add(arrowG);

        // 6. 原理与数据 HUD
        const statusLabel = makeTextSprite('滑动摩擦力规律 f = μN', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 1.35, 0);
        group.add(statusLabel);

        const measureLabel = makeTextSprite('动摩擦因数 μ 与正压力 N', '#2563eb', 20, { x: 1.8, y: 0.24 });
        measureLabel.position.set(0, 1.15, 0);
        group.add(measureLabel);

        scene.add(group);

        const handles: FrictionHandles = {
            rootGroup: group,
            bench,
            surfaceMatMesh,
            blockGroup,
            weightsGroup,
            scaleGroup,
            scaleSpring,
            scalePointer,
            arrowPull,
            arrowFriction,
            arrowN,
            arrowG,
            statusLabel,
            measureLabel,
            mu: 0.3,
            mass: 1,
            g: 9.8,
            f: 2.94
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as FrictionHandles;
        const mu = num(params['mu'], 0.3);
        const mass = num(params['mass'], 1);
        const g = num(params['g'], 9.8);
        const uniformMotion = (params['uniformMotion'] ?? 1) === 1;

        h.mu = mu;
        h.mass = mass;
        h.g = g;

        // 计算滑动摩擦力 f = μ * N = μ * m * g
        const N = mass * g;
        const f = mu * N;
        h.f = f;

        // 根据 μ 动态切换台面材质外观
        const surfMat = h.surfaceMatMesh.material as THREE.MeshStandardMaterial;
        let surfaceName = '光滑木板';
        if (mu < 0.15) {
            // 特氟龙 / 冰面
            surfMat.color.setHex(0xe0f2fe);
            surfMat.roughness = 0.08;
            surfaceName = '特氟龙超低摩擦面';
        } else if (mu < 0.45) {
            // 标准木板
            surfMat.color.setHex(0xd4d4d8);
            surfMat.roughness = 0.4;
            surfaceName = '标准木板接触面';
        } else if (mu < 0.75) {
            // 粗布面
            surfMat.color.setHex(0x78716c);
            surfMat.roughness = 0.7;
            surfaceName = '粗糙毛布接触面';
        } else {
            // 砂纸面
            surfMat.color.setHex(0x292524);
            surfMat.roughness = 0.95;
            surfaceName = '粗粒刚玉砂纸面';
        }

        // 堆叠砝码数量随 mass 动态显隐 (每 2kg 多显示一个砝码)
        const visibleWeights = Math.min(4, Math.max(0, Math.floor(mass / 2)));
        h.weightsGroup.children.forEach((child, idx) => {
            child.visible = idx < visibleWeights;
        });

        // 测力计弹簧拉伸量与指针位移 (拉力 F = f)
        const pullForce = uniformMotion ? f : f * 1.35;
        const pointerShift = THREE.MathUtils.clamp((pullForce / 30) * 0.18, 0, 0.18);
        h.scalePointer.position.x = 0.18 + pointerShift;
        h.scaleSpring.scale.set(1 + pointerShift * 4, 1, 1);

        // 矢量箭头长度与大小按力动态调整
        const lenF = Math.max(0.15, Math.min(0.8, pullForce * 0.04));
        const lenN = Math.max(0.2, Math.min(0.75, N * 0.035));
        h.arrowPull.setLength(lenF, 0.12, 0.06);
        h.arrowFriction.setLength(lenF, 0.12, 0.06);
        h.arrowN.setLength(lenN, 0.12, 0.06);
        h.arrowG.setLength(lenN, 0.12, 0.06);

        if (h.statusLabel) {
            updateTextSprite(h.statusLabel, `滑动摩擦实验：${surfaceName} (μ=${mu.toFixed(2)})`, '#0f172a', 24);
        }

        if (h.measureLabel) {
            updateTextSprite(
                h.measureLabel,
                `正压力 N=mg=${N.toFixed(1)}N | 滑动摩擦力 f=μN=${f.toFixed(2)}N | 测力计拉力 F=${pullForce.toFixed(2)}N`,
                '#2563eb',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as FrictionHandles;
        if (!h.blockGroup) return;

        // 滑块跟随物理仿真 X 坐标
        const posX = ctx.ballPos.x;
        h.blockGroup.position.x = posX;
        // 测力计始终位于滑块右侧保持牵引
        h.scaleGroup.position.x = posX + 0.65;

        // 箭头随滑块平移
        h.arrowPull.position.set(posX + 0.18, 0.15, 0);
        h.arrowFriction.position.set(posX - 0.18, 0.09, 0);
        h.arrowN.position.set(posX, 0.15, 0);
        h.arrowG.position.set(posX, 0.15, 0);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(-1.0 + pos.x * WORLD_SCALE, 0.15, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-1.0, 0.15, 0);
    }
};
