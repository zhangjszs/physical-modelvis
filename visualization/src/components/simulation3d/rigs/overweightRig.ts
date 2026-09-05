/**
 * 超重与失重 3D 实验 Rig
 * 包含：透明全景升降电梯轿厢、外侧导轨立柱与吊缆系统、
 * 轿厢内重型铁架台、数显精密弹簧测力计、悬挂标准钩码组、
 * 视重动平衡分析 (N = m(g ± a)) 与超重/失重/完全失重动态判定。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface OverweightHandles {
    rootGroup: THREE.Group;
    elevatorCabin: THREE.Group; // 可随升降机垂直平移的电梯轿厢总成
    springMesh: THREE.Mesh;
    weightMesh: THREE.Mesh;
    pointer: THREE.Mesh;
    arrowN: THREE.ArrowHelper;
    arrowG: THREE.ArrowHelper;
    arrowA: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    formulaLabel: THREE.Sprite;
    mode: number;
    mass: number;
    a: number;
    g: number;
    N: number;
}

export const overweightRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 电梯井道外部构架与地基 (高 3.6m, 底面 2.0m x 1.6m)
        const pitBase = makeBox(2.2, 0.08, 1.8, 0x1e293b, 0.4, 0.3);
        pitBase.position.set(0, 0.04, 0);
        pitBase.receiveShadow = true;
        group.add(pitBase);

        // 井道4根钢结构立柱导轨
        [
            [-0.9, -0.7],
            [-0.9, 0.7],
            [0.9, -0.7],
            [0.9, 0.7]
        ].forEach(([cx, cz]) => {
            const col = makeBox(0.06, 3.4, 0.06, 0x475569, 0.3, 0.6);
            col.position.set(cx ?? 0, 1.74, cz ?? 0);
            group.add(col);
        });

        // 顶部机房与吊索滑轮架
        const roofBeam = makeBox(2.2, 0.08, 1.8, 0x334155, 0.4, 0.4);
        roofBeam.position.set(0, 3.48, 0);
        group.add(roofBeam);

        const pulley = makeCylinder(0.2, 0.06, 0xd97706, 0.3, 0.8);
        pulley.rotation.z = Math.PI / 2;
        pulley.position.set(0, 3.32, 0);
        group.add(pulley);

        // 吊缆 (钢丝绳)
        const cable = makeCylinder(0.012, 1.2, 0x94a3b8, 0.2, 0.8);
        cable.position.set(0, 2.7, 0);
        group.add(cable);

        // 2. 透明全景电梯轿厢总成 (elevatorCabin)
        const elevatorCabin = new THREE.Group();
        elevatorCabin.position.set(0, 0.4, 0);

        // 轿厢底板与天花板
        const cabinFloor = makeBox(1.6, 0.08, 1.2, 0x334155, 0.5, 0.3);
        cabinFloor.position.set(0, 0.04, 0);
        elevatorCabin.add(cabinFloor);

        const cabinCeil = makeBox(1.6, 0.06, 1.2, 0x334155, 0.5, 0.3);
        cabinCeil.position.set(0, 1.95, 0);
        elevatorCabin.add(cabinCeil);

        // 轿厢透明安全玻璃围壁 (左/右/背/前)
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xe2e8f0,
            transparent: true,
            opacity: 0.25,
            transmission: 0.88,
            roughness: 0.08,
            metalness: 0.1
        });
        const glassWallL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.85, 1.16), glassMat);
        glassWallL.position.set(-0.78, 0.98, 0);
        elevatorCabin.add(glassWallL);

        const glassWallR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.85, 1.16), glassMat);
        glassWallR.position.set(0.78, 0.98, 0);
        elevatorCabin.add(glassWallR);

        const glassWallBack = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.85, 0.02), glassMat);
        glassWallBack.position.set(0, 0.98, -0.58);
        elevatorCabin.add(glassWallBack);

        // 3. 轿厢内部实验器材：铁架台 + 测力计 + 钩码
        // 铁架台大理石底座与立柱
        const standBase = makeBox(0.45, 0.03, 0.35, 0x1e293b, 0.6, 0.2);
        standBase.position.set(0, 0.09, 0);
        elevatorCabin.add(standBase);

        const standRod = makeCylinder(0.015, 1.55, 0xd97706, 0.3, 0.85);
        standRod.position.set(-0.16, 0.86, 0);
        elevatorCabin.add(standRod);

        // 测力计横梁伸臂
        const standArm = makeBox(0.3, 0.025, 0.025, 0x475569, 0.3, 0.5);
        standArm.position.set(0, 1.55, 0);
        elevatorCabin.add(standArm);

        // 精密弹簧测力计筒壳 (带透明视窗与分度盘)
        const scaleHousing = makeCylinder(0.045, 0.36, 0x2563eb, 0.35, 0.4);
        scaleHousing.position.set(0.12, 1.34, 0);
        elevatorCabin.add(scaleHousing);

        // 测力计刻度视窗面板
        const dialPanel = makeBox(0.06, 0.28, 0.01, 0xf8fafc, 0.8, 0.1);
        dialPanel.position.set(0.12, 1.34, 0.042);
        elevatorCabin.add(dialPanel);

        // 红色指示指针
        const pointer = makeBox(0.04, 0.008, 0.015, 0xef4444, 0.3, 0.2);
        pointer.position.set(0.12, 1.38, 0.048);
        elevatorCabin.add(pointer);

        // 可拉伸螺旋弹簧 (初始高度 0.2m)
        const springGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 16);
        const springMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
        const springMesh = new THREE.Mesh(springGeo, springMat);
        springMesh.position.set(0.12, 1.1, 0);
        elevatorCabin.add(springMesh);

        // 悬挂钩码 (重金属砝码片叠放)
        const weightMesh = makeCylinder(0.065, 0.12, 0x475569, 0.2, 0.8);
        weightMesh.position.set(0.12, 0.94, 0);
        weightMesh.castShadow = true;
        elevatorCabin.add(weightMesh);

        group.add(elevatorCabin);

        // 4. 受力矢量与加速度矢量 (动态箭头)
        // 支持力/拉力 N (竖直向上，青蓝色)
        const arrowN = makeArrow(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0.12, 0.94, 0),
            0.5,
            0x0ea5e9,
            0.12,
            0.06
        );
        // 重力 G (竖直向下，红色)
        const arrowG = makeArrow(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0.12, 0.94, 0),
            0.5,
            0xef4444,
            0.12,
            0.06
        );
        // 电梯加速度 a (电梯外侧展示，绿色)
        const arrowA = makeArrow(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(-1.2, 1.5, 0),
            0.6,
            0x22c55e,
            0.14,
            0.07
        );
        group.add(arrowN);
        group.add(arrowG);
        group.add(arrowA);

        // 5. 状态与计算 HUD 标牌
        const statusLabel = makeTextSprite('超重与失重演示', '#0f172a', 24, { x: 1.4, y: 0.28 });
        statusLabel.position.set(0, 3.65, 0);
        group.add(statusLabel);

        const formulaLabel = makeTextSprite('视重 N = m(g ± a)', '#2563eb', 20, { x: 1.8, y: 0.24 });
        formulaLabel.position.set(0, 3.35, 0);
        group.add(formulaLabel);

        scene.add(group);

        const handles: OverweightHandles = {
            rootGroup: group,
            elevatorCabin,
            springMesh,
            weightMesh,
            pointer,
            arrowN,
            arrowG,
            arrowA,
            statusLabel,
            formulaLabel,
            mode: 0,
            mass: 1,
            a: 2,
            g: 9.8,
            N: 11.8
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as OverweightHandles;
        const mode = Math.round(num(params['mode'], 0));
        const mass = num(params['mass'], 1);
        const a = num(params['accMagnitude'], 2);
        const g = num(params['gravity'], 9.8);

        h.mode = mode;
        h.mass = mass;
        h.a = a;
        h.g = g;

        // 视重 N 计算：
        // mode: 0=向上加速(+a, 超重), 1=向上减速(-a, 失重), 2=向下加速(-a, 失重), 3=向下减速(+a, 超重)
        const sign = mode === 0 || mode === 3 ? 1 : -1;
        const N = Math.max(0, mass * (g + sign * a));
        h.N = N;

        const G_val = mass * g;
        let stateText = '静止平衡';
        let stateColor = '#2563eb';

        if (N > G_val + 1e-4) {
            stateText = `🚨 超重状态 (N > G, 视重大于实重)`;
            stateColor = '#dc2626';
        } else if (N < 1e-4) {
            stateText = `🌟 完全失重状态 (N = 0, 自由漂浮)`;
            stateColor = '#f59e0b';
        } else if (N < G_val - 1e-4) {
            stateText = `💧 失重状态 (N < G, 视重小于实重)`;
            stateColor = '#0ea5e9';
        }

        // 电梯加速度矢量方向：向上加速/向下减速为向上；向上减速/向下加速为向下
        const aDirY = sign > 0 ? 1 : -1;
        h.arrowA.setDirection(new THREE.Vector3(0, aDirY, 0));
        h.arrowA.setLength(Math.max(0.15, a * 0.15), 0.12, 0.06);

        // 箭头长度随受力大小动态比例变化
        const lenN = Math.max(0.1, (N / Math.max(1e-3, G_val)) * 0.45);
        const lenG = 0.45;
        h.arrowN.setLength(lenN, 0.1, 0.05);
        h.arrowG.setLength(lenG, 0.1, 0.05);

        // 弹簧伸长量与指针偏移
        const deltaL = THREE.MathUtils.clamp((N - G_val) * 0.015, -0.1, 0.1);
        h.springMesh.scale.set(1, 1 + deltaL * 5, 1);
        h.weightMesh.position.y = 0.94 - deltaL;
        h.pointer.position.y = 1.34 - deltaL * 1.5;

        if (h.statusLabel) {
            updateTextSprite(h.statusLabel, stateText, stateColor, 24);
        }

        if (h.formulaLabel) {
            const modeNames = ['向上加速', '向上减速', '向下加速', '向下减速'];
            updateTextSprite(
                h.formulaLabel,
                `运动: ${modeNames[mode]} | a=${a.toFixed(1)}m/s² | 实重 G=${G_val.toFixed(1)}N | 视重 N=${N.toFixed(1)}N`,
                '#334155',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as OverweightHandles;
        if (!h.elevatorCabin) return;

        const { time } = ctx;
        const mode = h.mode;

        // 模拟电梯往复升降运动
        // 向上运动模式从低位升向高位，向下模式从高位降向低位
        let elevY = 0.4;
        if (mode === 0 || mode === 1) {
            // 向上运动
            elevY = 0.3 + Math.min(0.9, (time % 4) * 0.3);
        } else {
            // 向下运动
            elevY = 1.2 - Math.min(0.9, (time % 4) * 0.3);
        }
        h.elevatorCabin.position.y = elevY;

        // 箭头随轿厢一同平移
        const weightPos = new THREE.Vector3(0.12, elevY + h.weightMesh.position.y, 0);
        h.arrowN.position.copy(weightPos);
        h.arrowG.position.copy(weightPos);
        h.arrowA.position.set(-1.2, elevY + 1.0, 0);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(0.12, 1.3 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.12, 1.3, 0);
    }
};
