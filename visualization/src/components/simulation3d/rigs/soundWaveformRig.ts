/**
 * 声音波形与声学 3D 实验 Rig
 * 包含：标准木质共鸣箱、合金测音音叉与击槌、
 * 声学拾音高灵敏麦克风、台式数字存储示波器机箱与荧光显示屏、
 * 空气中向外扩散的三维声压疏密波阵面、示波器屏幕实时扫描正弦/复合/噪声波形。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeLine, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const SCREEN_PTS = 80;

interface SoundWaveformHandles {
    rootGroup: THREE.Group;
    forkTineL: THREE.Mesh;
    forkTineR: THREE.Mesh;
    soundWaveRings: THREE.Group;
    oscilloscopeScreen: THREE.Line;
    statusLabel: THREE.Sprite;
    measureLabel: THREE.Sprite;
    frequency: number;
    amplitude: number;
    waveType: number;
    harmonic1: number;
    harmonic2: number;
}

export const soundWaveformRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 实木实验桌台
        const table = makeBox(3.2, 0.08, 1.2, 0x334155, 0.5, 0.3);
        table.position.set(0, 0.04, 0);
        table.receiveShadow = true;
        group.add(table);

        // 2. 音叉共鸣箱 (长 0.5m, 宽 0.25m, 高 0.18m, 桐木质感，一端开口)
        const soundBox = makeBox(0.5, 0.16, 0.26, 0xb45309, 0.6, 0.1);
        soundBox.position.set(-0.8, 0.16, 0);
        soundBox.castShadow = true;
        group.add(soundBox);

        // 共鸣箱开口暗腔 (侧面开口强化空气共鸣)
        const cavity = makeBox(0.02, 0.12, 0.22, 0x1e293b, 0.8, 0.1);
        cavity.position.set(-0.55, 0.16, 0);
        group.add(cavity);

        // 音叉金属插座底座
        const forkSocket = makeCylinder(0.04, 0.06, 0xd97706, 0.3, 0.85);
        forkSocket.position.set(-0.8, 0.27, 0);
        group.add(forkSocket);

        // 音叉柄杆
        const forkStem = makeCylinder(0.015, 0.14, 0x94a3b8, 0.2, 0.9);
        forkStem.position.set(-0.8, 0.37, 0);
        group.add(forkStem);

        // 音叉 U 形两臂 (合金钢叉齿)
        const forkUBase = makeBox(0.12, 0.025, 0.025, 0x94a3b8, 0.2, 0.9);
        forkUBase.position.set(-0.8, 0.45, 0);
        group.add(forkUBase);

        const forkTineL = makeBox(0.02, 0.42, 0.025, 0xd1d5db, 0.2, 0.9);
        forkTineL.position.set(-0.85, 0.67, 0);
        forkTineL.castShadow = true;
        group.add(forkTineL);

        const forkTineR = makeBox(0.02, 0.42, 0.025, 0xd1d5db, 0.2, 0.9);
        forkTineR.position.set(-0.75, 0.67, 0);
        forkTineR.castShadow = true;
        group.add(forkTineR);

        // 橡胶击槌
        const malletStem = makeCylinder(0.008, 0.35, 0xca8a04, 0.5, 0.2);
        malletStem.rotation.z = Math.PI / 4;
        malletStem.position.set(-1.2, 0.4, 0.15);
        group.add(malletStem);

        const malletHead = makeSphere(0.035, 0x1e293b, { roughness: 0.8, metalness: 0.1 });
        malletHead.position.set(-1.08, 0.52, 0.15);
        group.add(malletHead);

        // 3. 空气中向外扩散的三维声波同心环
        const soundWaveRings = new THREE.Group();
        soundWaveRings.position.set(-0.8, 0.67, 0);
        for (let i = 0; i < 4; i++) {
            const r = 0.25 + i * 0.22;
            const ringGeo = new THREE.RingGeometry(r - 0.008, r + 0.008, 36);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.4 - i * 0.08,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.y = Math.PI / 2;
            soundWaveRings.add(ring);
        }
        group.add(soundWaveRings);

        // 4. 声学拾音麦克风 (指向音叉)
        const micStand = makeCylinder(0.02, 0.6, 0x1e293b, 0.4, 0.5);
        micStand.position.set(-0.35, 0.38, 0);
        group.add(micStand);

        const micCapsule = makeCylinder(0.03, 0.12, 0x64748b, 0.3, 0.7);
        micCapsule.rotation.z = Math.PI / 2;
        micCapsule.position.set(-0.4, 0.68, 0);
        group.add(micCapsule);

        // 麦克风连接线通往示波器
        const cablePts = [
            new THREE.Vector3(-0.35, 0.68, 0),
            new THREE.Vector3(-0.1, 0.12, 0),
            new THREE.Vector3(0.35, 0.12, 0)
        ];
        const micCable = makeLine(cablePts, 0x0f172a, 0.9);
        group.add(micCable);

        // 5. 数字存储示波器机箱 (DSO) 与荧光波形显示屏 (位于右侧 x = 0.8)
        const oscBody = makeBox(0.9, 0.65, 0.5, 0x1e293b, 0.4, 0.3);
        oscBody.position.set(0.8, 0.4, 0);
        oscBody.castShadow = true;
        group.add(oscBody);

        // 屏幕边框凹槽
        const screenBezel = makeBox(0.64, 0.46, 0.02, 0x0f172a, 0.6, 0.2);
        screenBezel.position.set(0.68, 0.44, 0.255);
        group.add(screenBezel);

        // 示波器深绿发光底屏
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x052e16 });
        const screenBg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), screenMat);
        screenBg.position.set(0.68, 0.44, 0.268);
        group.add(screenBg);

        // 旋钮与按键控制面板 (右侧)
        [
            [1.12, 0.55],
            [1.12, 0.42],
            [1.12, 0.3],
            [1.12, 0.18]
        ].forEach(([kx, ky]) => {
            const knob = makeCylinder(0.025, 0.03, 0x94a3b8, 0.3, 0.8);
            knob.rotation.x = Math.PI / 2;
            knob.position.set(kx ?? 0, ky ?? 0, 0.265);
            group.add(knob);
        });

        // 荧光绿色动态示波器扫描曲线
        const screenPts = Array.from({ length: SCREEN_PTS }, (_, i) => {
            const x = 0.39 + (i / (SCREEN_PTS - 1)) * 0.58;
            return new THREE.Vector3(x, 0.44, 0.272);
        });
        const oscGeo = new THREE.BufferGeometry().setFromPoints(screenPts);
        const oscMat = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 });
        const oscilloscopeScreen = new THREE.Line(oscGeo, oscMat);
        group.add(oscilloscopeScreen);

        // 6. 原理与数据 HUD
        const statusLabel = makeTextSprite('声波与示波器波形', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 1.25, 0);
        group.add(statusLabel);

        const measureLabel = makeTextSprite('声频基频 f | 振幅 A | 波形种类', '#2563eb', 20, { x: 1.8, y: 0.24 });
        measureLabel.position.set(0, 1.05, 0);
        group.add(measureLabel);

        scene.add(group);

        const handles: SoundWaveformHandles = {
            rootGroup: group,
            forkTineL,
            forkTineR,
            soundWaveRings,
            oscilloscopeScreen,
            statusLabel,
            measureLabel,
            frequency: 440,
            amplitude: 0.8,
            waveType: 0,
            harmonic1: 0.3,
            harmonic2: 0.2
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as SoundWaveformHandles;
        const frequency = num(params['frequency'], 440);
        const amplitude = num(params['amplitude'], 0.8);
        const waveType = Math.round(num(params['waveType'], 0));
        const harmonic1 = num(params['harmonic1'], 0.3);
        const harmonic2 = num(params['harmonic2'], 0.2);

        h.frequency = frequency;
        h.amplitude = amplitude;
        h.waveType = waveType;
        h.harmonic1 = harmonic1;
        h.harmonic2 = harmonic2;

        const typeNames = ['纯音 (单频正弦波)', '复合音 (基频+高次谐波)', '噪声 (无规则杂乱波形)'];
        const periodMs = (1000 / frequency).toFixed(2);

        if (h.statusLabel) {
            updateTextSprite(h.statusLabel, `示波器检测：${typeNames[waveType]}`, '#0f172a', 24);
        }

        if (h.measureLabel) {
            updateTextSprite(
                h.measureLabel,
                `基频 f=${frequency}Hz | 周期 T=${periodMs}ms | 相对振幅 A=${amplitude.toFixed(2)}`,
                '#2563eb',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as SoundWaveformHandles;
        if (!h.oscilloscopeScreen) return;

        const { time } = ctx;
        const f = h.frequency;
        const A = h.amplitude * 0.15; // 屏幕垂直振幅
        const type = h.waveType;
        const h1 = h.harmonic1;
        const h2 = h.harmonic2;

        // 1. 音叉叉齿微观微频高振动
        const tineVibe = Math.sin(f * 0.1 * time) * 0.008 * h.amplitude;
        h.forkTineL.position.x = -0.85 - tineVibe;
        h.forkTineR.position.x = -0.75 + tineVibe;

        // 2. 声波环向外周期性脉动膨胀
        const ringScale = 1.0 + ((time * 2) % 1) * 0.6;
        h.soundWaveRings.scale.set(ringScale, ringScale, ringScale);

        // 3. 示波器荧光波形实时动态重绘
        const posAttr = h.oscilloscopeScreen.geometry.attributes['position'] as THREE.BufferAttribute;
        const numPts = SCREEN_PTS;
        // 扫场显示约 3 个完整周期
        const sweepPeriod = 3.0;

        for (let i = 0; i < numPts; i++) {
            const phase = (i / (numPts - 1)) * (2 * Math.PI * sweepPeriod) - time * 12;
            let yVal = 0;
            if (type === 0) {
                // 纯音：纯正弦波
                yVal = A * Math.sin(phase);
            } else if (type === 1) {
                // 复合音：基频 + 2倍频 + 3倍频
                yVal = A * (Math.sin(phase) + h1 * Math.sin(2 * phase) + h2 * Math.sin(3 * phase));
            } else {
                // 噪声：混合伪随机高频分量
                yVal = A * (Math.sin(phase * 1.7) * 0.5 + Math.sin(phase * 3.3) * 0.3 + Math.cos(phase * 7.1) * 0.2);
            }

            const clampedY = THREE.MathUtils.clamp(0.44 + yVal, 0.26, 0.62);
            posAttr.setY(i, clampedY);
        }
        posAttr.needsUpdate = true;
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.44 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.44, 0);
    }
};
