/**
 * 小球 x-t 图像 (简谐运动砂摆实验) 3D 实验 Rig
 * 包含：双立柱悬摆门架、漏斗形砂摆小球与细悬线、
 * 底部匀速平移的描迹白纸输送带、实时喷沙描绘出的标准正弦简谐波形、
 * 严格体现振动周期 T = 2π√(L/g) 与简谐位移 x(t) = A·cos(ωt + φ) 的时空转换。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeLine, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface BallXtHandles {
    rootGroup: THREE.Group;
    pendulumGroup: THREE.Group; // 绕顶部支点旋转的单摆总成
    cordLine: THREE.Line;
    sandBob: THREE.Mesh;
    conveyorPaper: THREE.Mesh;
    sineTraceLine: THREE.Line;
    statusLabel: THREE.Sprite;
    measureLabel: THREE.Sprite;
    length: number;
    angleDeg: number;
    g: number;
    damping: number;
    omega: number;
    amplitude: number;
}

export const ballXtRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 龙门式实验吊架 (双铝合金方管立柱 + 顶横梁, 高 2.4m, 跨度 1.6m)
        const frameMat = { roughness: 0.35, metalness: 0.65 };
        const baseL = makeBox(0.4, 0.05, 0.4, 0x1e293b, 0.5, 0.3);
        baseL.position.set(-0.8, 0.025, 0);
        baseL.receiveShadow = true;
        group.add(baseL);

        const baseR = makeBox(0.4, 0.05, 0.4, 0x1e293b, 0.5, 0.3);
        baseR.position.set(0.8, 0.025, 0);
        baseR.receiveShadow = true;
        group.add(baseR);

        const colL = makeBox(0.06, 2.3, 0.06, 0x475569, frameMat.roughness, frameMat.metalness);
        colL.position.set(-0.8, 1.15, 0);
        colL.castShadow = true;
        group.add(colL);

        const colR = makeBox(0.06, 2.3, 0.06, 0x475569, frameMat.roughness, frameMat.metalness);
        colR.position.set(0.8, 1.15, 0);
        colR.castShadow = true;
        group.add(colR);

        const topBeam = makeBox(1.68, 0.06, 0.08, 0x334155, 0.3, 0.7);
        topBeam.position.set(0, 2.3, 0);
        group.add(topBeam);

        // 中央悬挂夹具轴套
        const pivotSleeve = makeCylinder(0.025, 0.12, 0xd97706, 0.3, 0.85);
        pivotSleeve.rotation.z = Math.PI / 2;
        pivotSleeve.position.set(0, 2.27, 0);
        group.add(pivotSleeve);

        // 2. 底部白纸输送带台架 (长 3.2m, 宽 1.0m, 平铺在桌面上，纸带沿 X 轴匀速移动)
        const tableBed = makeBox(3.2, 0.04, 0.8, 0x1e293b, 0.5, 0.3);
        tableBed.position.set(0, 0.02, 0);
        group.add(tableBed);

        // 滚轴 (左右两端)
        [-1.58, 1.58].forEach(rx => {
            const roller = makeCylinder(0.04, 0.76, 0xd97706, 0.3, 0.8);
            roller.rotation.x = Math.PI / 2;
            roller.position.set(rx, 0.04, 0);
            group.add(roller);
        });

        // 描迹白纸带 (带时间轴中线与网格标尺)
        const paperGeo = new THREE.PlaneGeometry(3.1, 0.72);
        const paperMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.9,
            metalness: 0.02,
            side: THREE.DoubleSide
        });
        const conveyorPaper = new THREE.Mesh(paperGeo, paperMat);
        conveyorPaper.rotation.x = -Math.PI / 2;
        conveyorPaper.position.set(0, 0.042, 0);
        conveyorPaper.receiveShadow = true;
        group.add(conveyorPaper);

        // 纸带时间中心轴线 (红线)
        const axisLine = makeLine(
            [new THREE.Vector3(-1.55, 0.043, 0), new THREE.Vector3(1.55, 0.043, 0)],
            0xef4444,
            0.6
        );
        group.add(axisLine);

        // 3. 动态描画的正弦波形线条 (细蓝色喷砂线，画在纸带上)
        const initWavePts = Array.from({ length: 120 }, (_, i) => {
            const x = -1.5 + (i * 3.0) / 119;
            return new THREE.Vector3(x, 0.044, 0);
        });
        const traceGeo = new THREE.BufferGeometry().setFromPoints(initWavePts);
        const traceMat = new THREE.LineBasicMaterial({ color: 0x2563eb, linewidth: 2 });
        const sineTraceLine = new THREE.Line(traceGeo, traceMat);
        group.add(sineTraceLine);

        // 4. 砂摆摆动总成 (绕顶部支点 (0, 2.27, 0) 摆动，沿 Z 轴摆动以在 X 轴移动的纸带上描迹)
        const pendulumGroup = new THREE.Group();
        pendulumGroup.position.set(0, 2.27, 0);

        // 细悬挂双线 (V形吊线，确保摆动严格在单一垂直平面内)
        const cordMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 });
        const cordPts = [new THREE.Vector3(-0.06, 0, 0), new THREE.Vector3(0, -1.8, 0), new THREE.Vector3(0.06, 0, 0)];
        const cordLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cordPts), cordMat);
        pendulumGroup.add(cordLine);

        // 漏斗形黄铜砂摆小球 (锥筒 + 底部细漏嘴)
        const sandBobGroup = new THREE.Group();
        sandBobGroup.position.set(0, -1.8, 0);

        const bobBody = makeSphere(0.06, 0xd97706, { roughness: 0.25, metalness: 0.8 });
        sandBobGroup.add(bobBody);

        const bobFunnel = new THREE.Mesh(
            new THREE.ConeGeometry(0.04, 0.08, 24),
            new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3, metalness: 0.85 })
        );
        bobFunnel.rotation.x = Math.PI; // 尖端朝下喷嘴
        bobFunnel.position.set(0, -0.05, 0);
        sandBobGroup.add(bobFunnel);

        pendulumGroup.add(sandBobGroup);
        group.add(pendulumGroup);

        // 5. 原理与数据 HUD
        const statusLabel = makeTextSprite('砂摆实验：小球简谐运动 x-t 图像', '#0f172a', 24, { x: 1.6, y: 0.28 });
        statusLabel.position.set(0, 2.55, 0);
        group.add(statusLabel);

        const measureLabel = makeTextSprite('振动方程：x(t) = A cos(ωt)', '#2563eb', 20, { x: 1.8, y: 0.24 });
        measureLabel.position.set(0, 2.32, 0);
        group.add(measureLabel);

        scene.add(group);

        const handles: BallXtHandles = {
            rootGroup: group,
            pendulumGroup,
            cordLine,
            sandBob: sandBobGroup as unknown as THREE.Mesh,
            conveyorPaper,
            sineTraceLine,
            statusLabel,
            measureLabel,
            length: 1.0,
            angleDeg: 15,
            g: 9.8,
            damping: 0,
            omega: Math.sqrt(9.8 / 1.0),
            amplitude: 0.25
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as BallXtHandles;
        const length = num(params['length'], 1.0);
        const angleDeg = num(params['angle'], 15);
        const g = num(params['g'], 9.8);
        const damping = num(params['damping'], 0);

        h.length = length;
        h.angleDeg = angleDeg;
        h.g = g;
        h.damping = damping;

        // 固有圆频率与周期
        const omega = Math.sqrt(g / Math.max(0.1, length));
        const T = (2 * Math.PI) / omega;
        h.omega = omega;

        // 视觉摆长映射 (0.8m ~ 1.8m)
        const visualL = THREE.MathUtils.clamp(0.6 + length * 0.4, 0.8, 2.0);
        const rad0 = (angleDeg * Math.PI) / 180;
        const amp = visualL * Math.sin(rad0);
        h.amplitude = amp;

        // 更新摆线与摆球悬挂高度
        h.sandBob.position.set(0, -visualL, 0);

        const cordGeo = h.cordLine.geometry as THREE.BufferGeometry;
        const cordPos = cordGeo.getAttribute('position') as THREE.BufferAttribute;
        cordPos.setXYZ(0, -0.06, 0, 0);
        cordPos.setXYZ(1, 0, -visualL, 0);
        cordPos.setXYZ(2, 0.06, 0, 0);
        cordPos.needsUpdate = true;

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `砂摆简谐振动：摆长 L=${length.toFixed(2)}m | 初始角 θ₀=${angleDeg}° | 周期 T=${T.toFixed(2)}s`,
                '#0f172a',
                22
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as BallXtHandles;
        if (!h.pendulumGroup) return;

        const { time } = ctx;
        const omega = h.omega;
        const rad0 = (h.angleDeg * Math.PI) / 180;
        const decay = Math.exp(-h.damping * 0.2 * time);

        // 摆角随时间简谐振荡 (绕 X 轴旋转，即小球沿 Z 轴横向往复摆动)
        const currentAngle = rad0 * decay * Math.cos(omega * time);
        h.pendulumGroup.rotation.x = currentAngle;

        // 纸带匀速向右输送速度 v_paper
        const vPaper = 0.45; // m/s

        // 动态绘制纸带上留下的正弦波形：
        // 纸带上的点位置 x 对应历史时刻 t_past = time - (x + 1.5)/vPaper
        const traceGeo = h.sineTraceLine.geometry as THREE.BufferGeometry;
        const posAttr = traceGeo.getAttribute('position') as THREE.BufferAttribute;
        const numPts = 120;
        for (let i = 0; i < numPts; i++) {
            const x = -1.5 + (i * 3.0) / (numPts - 1);
            const dt = (1.5 - x) / vPaper;
            const pastTime = time - dt;
            if (pastTime >= 0) {
                const pastDecay = Math.exp(-h.damping * 0.2 * pastTime);
                const pastZ = h.amplitude * pastDecay * Math.cos(omega * pastTime);
                posAttr.setXYZ(i, x, 0.044, pastZ);
            } else {
                posAttr.setXYZ(i, x, 0.044, 0);
            }
        }
        posAttr.needsUpdate = true;

        const currentZ = h.amplitude * Math.cos(omega * time);
        if (h.measureLabel) {
            updateTextSprite(
                h.measureLabel,
                `瞬时位移 z(t) = ${(currentZ * 100).toFixed(1)}cm | 角频率 ω=${omega.toFixed(2)}rad/s | 匀速纸带展现标准正弦波`,
                '#2563eb',
                20
            );
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.6 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.6, 0);
    }
};
