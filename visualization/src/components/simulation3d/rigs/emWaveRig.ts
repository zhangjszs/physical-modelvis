/**
 * 电磁波与赫兹实验 3D Rig
 * 覆盖：
 * 1. em-wave-hertz: 赫兹经典实验（感应圈火花放电发射偶极子 + 远端环形谐振接收器火花感应）
 * 2. em-wave-communication: 电磁波调制发射与天线接收通讯
 * 3. em-spectrum: 电磁波谱（波速 c = λ·f = 3×10⁸ m/s）
 * 包含：双极发射天线与放电火花球、高压感应线圈、
 * 正交三维电磁场 (E 竖直振荡 / B 水平振荡 / 传播向右)、环形谐振接收器与波谱 HUD。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const WAVE_PTS = 64;

interface EmWaveHandles {
    rootGroup: THREE.Group;
    sparkEmitter: THREE.Mesh;
    sparkReceiver: THREE.Mesh;
    waveELine: THREE.Line;
    waveBLine: THREE.Line;
    statusLabel: THREE.Sprite;
    measureLabel: THREE.Sprite;
    frequencyMHz: number;
    wavelengthM: number;
}

export const emWaveRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 实木实验台架 (长 3.6m, 宽 1.0m, 厚 0.08m)
        const table = makeBox(3.6, 0.08, 1.0, 0x1e293b, 0.5, 0.3);
        table.position.set(0, 0.04, 0);
        table.receiveShadow = true;
        group.add(table);

        // 2. 赫兹偶极子发射装置 (左侧 x = -1.4)
        const txStand = makeCylinder(0.03, 0.8, 0x475569, 0.4, 0.5);
        txStand.position.set(-1.4, 0.44, 0);
        group.add(txStand);

        // 偶极振子天线两臂 (上下两根黄铜管)
        const antennaTop = makeCylinder(0.012, 0.45, 0xd97706, 0.3, 0.85);
        antennaTop.position.set(-1.4, 1.15, 0);
        group.add(antennaTop);

        const antennaBottom = makeCylinder(0.012, 0.45, 0xd97706, 0.3, 0.85);
        antennaBottom.position.set(-1.4, 0.65, 0);
        group.add(antennaBottom);

        // 发射端放电铜球
        const sphereT = makeSphere(0.04, 0xd97706, { roughness: 0.2, metalness: 0.85 });
        sphereT.position.set(-1.4, 0.92, 0);
        group.add(sphereT);

        const sphereB = makeSphere(0.04, 0xd97706, { roughness: 0.2, metalness: 0.85 });
        sphereB.position.set(-1.4, 0.86, 0);
        group.add(sphereB);

        // 发射端蓝色放电火花 (发光球)
        const sparkEmitter = makeSphere(0.025, 0x38bdf8, { emissive: 0x38bdf8, emissiveIntensity: 1.2 });
        sparkEmitter.position.set(-1.4, 0.89, 0);
        group.add(sparkEmitter);

        // 3. 赫兹环形谐振接收器 (右侧 x = 1.4)
        const rxStand = makeCylinder(0.03, 0.8, 0x475569, 0.4, 0.5);
        rxStand.position.set(1.4, 0.44, 0);
        group.add(rxStand);

        // 铜制开口圆环天线 (半径 0.28m)
        const ringGeo = new THREE.TorusGeometry(0.28, 0.012, 16, 48, Math.PI * 1.85);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
        const rxRing = new THREE.Mesh(ringGeo, ringMat);
        rxRing.position.set(1.4, 0.89, 0);
        group.add(rxRing);

        // 接收环微小火花放电隙
        const sparkReceiver = makeSphere(0.018, 0x38bdf8, { emissive: 0x38bdf8, emissiveIntensity: 1.0 });
        sparkReceiver.position.set(1.4 + 0.28, 0.89, 0);
        group.add(sparkReceiver);

        // 4. 三维正交空间电磁波动态传播线
        // 电场 E 曲线 (竖直面振荡，蓝色)
        const ptsE = Array.from({ length: WAVE_PTS }, (_, i) => {
            const x = -1.35 + (i / (WAVE_PTS - 1)) * 2.7;
            return new THREE.Vector3(x, 0.89, 0);
        });
        const waveEGeo = new THREE.BufferGeometry().setFromPoints(ptsE);
        const waveEMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
        const waveELine = new THREE.Line(waveEGeo, waveEMat);
        group.add(waveELine);

        // 磁场 B 曲线 (水平面振荡，红色，与 E 空间正交)
        const ptsB = Array.from({ length: WAVE_PTS }, (_, i) => {
            const x = -1.35 + (i / (WAVE_PTS - 1)) * 2.7;
            return new THREE.Vector3(x, 0.89, 0);
        });
        const waveBGeo = new THREE.BufferGeometry().setFromPoints(ptsB);
        const waveBMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
        const waveBLine = new THREE.Line(waveBGeo, waveBMat);
        group.add(waveBLine);

        // 5. 原理与数据 HUD
        const statusLabel = makeTextSprite('赫兹实验与电磁波传播', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 1.65, 0);
        group.add(statusLabel);

        const measureLabel = makeTextSprite('波速 c = λ·f = 3×10⁸ m/s (E ⊥ B ⊥ v)', '#2563eb', 20, { x: 1.8, y: 0.24 });
        measureLabel.position.set(0, 1.45, 0);
        group.add(measureLabel);

        scene.add(group);

        const handles: EmWaveHandles = {
            rootGroup: group,
            sparkEmitter,
            sparkReceiver,
            waveELine,
            waveBLine,
            statusLabel,
            measureLabel,
            frequencyMHz: 100,
            wavelengthM: 3.0
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as EmWaveHandles;
        const freq = num(params['frequency'] ?? params['freq'] ?? 100, 100); // MHz
        h.frequencyMHz = freq;

        // 波长 λ = c / f, c ≈ 3e8 m/s
        const lambda = 300 / Math.max(1, freq); // m
        h.wavelengthM = lambda;

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `电磁振荡频率 f=${freq.toFixed(1)}MHz | 波长 λ=${lambda.toFixed(2)}m | 光速 c=3.0×10⁸m/s`,
                '#0f172a',
                22
            );
        }

        if (h.measureLabel) {
            updateTextSprite(
                h.measureLabel,
                `麦克斯韦预言 ⇛ 赫兹实验证实：电场 E(蓝色竖直) 与 磁场 B(红色水平) 同相位且正交传播`,
                '#2563eb',
                19
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as EmWaveHandles;
        if (!h.waveELine) return;

        const { time } = ctx;

        // 1. 发射与接收火花隙间歇火花闪烁
        const sparkFlicker = Math.random() > 0.35;
        h.sparkEmitter.visible = sparkFlicker;
        h.sparkReceiver.visible = sparkFlicker;

        // 2. 动态更新正交 E 场与 B 场空间驻波/行波分布
        const posAttrE = (h.waveELine.geometry as THREE.BufferGeometry).getAttribute(
            'position'
        ) as THREE.BufferAttribute;
        const posAttrB = (h.waveBLine.geometry as THREE.BufferGeometry).getAttribute(
            'position'
        ) as THREE.BufferAttribute;

        const k = 2 * Math.PI * 1.5; // 空间波数展示
        const omega = 12; // 动态行波角速度
        const amp = 0.28;

        for (let i = 0; i < WAVE_PTS; i++) {
            const x = -1.35 + (i / (WAVE_PTS - 1)) * 2.7;
            const dist = x - -1.35;
            const phase = k * dist - omega * time;

            // 电场 E 沿 Y 轴振荡
            const ey = 0.89 + amp * Math.sin(phase);
            posAttrE.setXYZ(i, x, ey, 0);

            // 磁场 B 沿 Z 轴振荡 (与 E 空间正交、同相位)
            const bz = amp * Math.sin(phase);
            posAttrB.setXYZ(i, x, 0.89, bz);
        }

        posAttrE.needsUpdate = true;
        posAttrB.needsUpdate = true;
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.89 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.89, 0);
    }
};
