/**
 * 受迫振动与共振 3D 实验 Rig
 * 覆盖：
 * 1. forced-vibration-freq: 受迫振动（电磁激振器 + 弹簧振子 + 阻尼油杯 + 驱动频率扫描）
 * 2. resonance-curve: 共振曲线（固有频率 f₀ 与驱动频率 f_d 接近时振幅急剧达到峰值）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface VibrationHandles {
    rootGroup: THREE.Group;
    exciterPiston: THREE.Mesh;
    springMesh: THREE.Mesh;
    oscillatorMass: THREE.Mesh;
    damperCup: THREE.Mesh;
    arrowDrive: THREE.ArrowHelper;
    arrowVelocity: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    measureLabel: THREE.Sprite;
    mass: number;
    k: number;
    beta: number;
    forceAmp: number;
    driveFreq: number;
    f0: number; // 固有频率
    resAmp: number; // 理论稳态振幅
}

export const vibrationRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 重型铸铁减震基座与竖立支架 (高 2.4m)
        const base = makeBox(1.8, 0.08, 1.2, 0x1e293b, 0.4, 0.4);
        base.position.set(0, 0.04, 0);
        base.receiveShadow = true;
        group.add(base);

        // 立柱
        const pillar = makeBox(0.08, 2.3, 0.08, 0x475569, 0.3, 0.7);
        pillar.position.set(-0.55, 1.15, 0);
        pillar.castShadow = true;
        group.add(pillar);

        // 顶部悬臂
        const topArm = makeBox(0.8, 0.06, 0.08, 0x334155, 0.3, 0.7);
        topArm.position.set(-0.2, 2.27, 0);
        group.add(topArm);

        // 2. 顶部电动/电磁激振器机箱与往复驱动活塞
        const exciterHousing = makeCylinder(0.12, 0.22, 0x0f172a, 0.3, 0.6);
        exciterHousing.position.set(0.12, 2.16, 0);
        group.add(exciterHousing);

        // 激振驱动活塞杆 (沿 Y 轴往复振动)
        const exciterPiston = makeCylinder(0.02, 0.18, 0xd97706, 0.3, 0.85);
        exciterPiston.position.set(0.12, 1.98, 0);
        group.add(exciterPiston);

        // 3. 可伸缩螺旋弹簧
        const springGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 24);
        const springMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
        const springMesh = new THREE.Mesh(springGeo, springMat);
        springMesh.position.set(0.12, 1.55, 0);
        group.add(springMesh);

        // 4. 振动质块与阻尼叶片
        const oscillatorMass = makeCylinder(0.08, 0.14, 0x2563eb, 0.35, 0.3);
        oscillatorMass.position.set(0.12, 1.18, 0);
        oscillatorMass.castShadow = true;
        group.add(oscillatorMass);

        // 阻尼细杆与下端阻尼板
        const damperRod = makeCylinder(0.008, 0.35, 0x64748b, 0.3, 0.6);
        damperRod.position.set(0.12, 0.95, 0);
        group.add(damperRod);

        const damperVane = makeCylinder(0.06, 0.015, 0x1e293b, 0.4, 0.3);
        damperVane.position.set(0.12, 0.78, 0);
        group.add(damperVane);

        // 底部透明阻尼油杯 (半透明装油圆杯)
        const cupGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.35, 32, 1, true);
        const cupMat = new THREE.MeshPhysicalMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.35,
            transmission: 0.85,
            roughness: 0.1
        });
        const damperCup = new THREE.Mesh(cupGeo, cupMat);
        damperCup.position.set(0.12, 0.72, 0);
        group.add(damperCup);

        // 阻尼油液面
        const oil = makeCylinder(0.108, 0.24, 0xfbbf24, 0.1, 0.1);
        oil.position.set(0.12, 0.66, 0);
        group.add(oil);

        // 5. 振幅刻度背板 (竖直毫米刻度)
        const scaleBacking = makeBox(0.02, 1.4, 0.35, 0xf8fafc, 0.8, 0.1);
        scaleBacking.position.set(-0.15, 1.25, 0);
        group.add(scaleBacking);

        // 平衡零刻度线
        const zeroLine = makeBox(0.03, 0.008, 0.32, 0xef4444, 0.3, 0.2);
        zeroLine.position.set(-0.15, 1.18, 0);
        group.add(zeroLine);

        // 6. 动态驱动力与振子速度矢量
        // 驱动力矢量 (垂直红色)
        const arrowDrive = makeArrow(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0.35, 2.0, 0),
            0.4,
            0xef4444,
            0.1,
            0.05
        );
        // 振子速度矢量 (垂直绿色)
        const arrowVelocity = makeArrow(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0.35, 1.18, 0),
            0.4,
            0x10b981,
            0.1,
            0.05
        );
        group.add(arrowDrive);
        group.add(arrowVelocity);

        // 7. 原理与数据 HUD
        const statusLabel = makeTextSprite('受迫振动与共振现象', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 2.55, 0);
        group.add(statusLabel);

        const measureLabel = makeTextSprite('驱动频率靠近固有频率时发生共振', '#2563eb', 20, { x: 1.8, y: 0.24 });
        measureLabel.position.set(0, 2.32, 0);
        group.add(measureLabel);

        scene.add(group);

        const handles: VibrationHandles = {
            rootGroup: group,
            exciterPiston,
            springMesh,
            oscillatorMass,
            damperCup,
            arrowDrive,
            arrowVelocity,
            statusLabel,
            measureLabel,
            mass: 1,
            k: 100,
            beta: 0.3,
            forceAmp: 1,
            driveFreq: 2,
            f0: 1.59,
            resAmp: 0.2
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as VibrationHandles;
        const mass = num(params['mass'], 1);
        const k = num(params['k'], 100);
        const beta = num(params['beta'], 0.3);
        const forceAmp = num(params['forceAmp'], 1);
        const driveFreq = num(params['driveFreq'] ?? params['drivingFreq'] ?? params['frequency'], 2);

        h.mass = mass;
        h.k = k;
        h.beta = beta;
        h.forceAmp = forceAmp;
        h.driveFreq = driveFreq;

        // 物理固有圆频率与频率：ω₀ = √(k/m), f₀ = ω₀ / 2π
        const omega0 = Math.sqrt(k / Math.max(1e-4, mass));
        const f0 = omega0 / (2 * Math.PI);
        h.f0 = f0;

        // 驱动圆频率：ω_d = 2π f_d
        const omegaD = 2 * Math.PI * driveFreq;

        // 稳态受迫振动振幅公式：
        // A(ω) = (F₀ / m) / √((ω₀² - ω_d²)² + 4 β² ω_d²)
        const denom = Math.sqrt(Math.pow(omega0 * omega0 - omegaD * omegaD, 2) + 4 * beta * beta * omegaD * omegaD);
        const trueAmp = forceAmp / mass / Math.max(1e-6, denom);
        // 视觉映射振幅 (0.05m ~ 0.35m)
        const visAmp = THREE.MathUtils.clamp(trueAmp * 8, 0.04, 0.35);
        h.resAmp = visAmp;

        // 共振判定：|f_d - f₀| / f₀ < 0.08
        const freqDiffRel = Math.abs(driveFreq - f0) / f0;
        const isResonance = freqDiffRel < 0.08;

        if (h.statusLabel) {
            const title = isResonance
                ? `🚨 发生强烈共振！(驱动频率 f_d ≈ 固有频率 f₀)`
                : `受迫振动：驱动频率 f_d=${driveFreq.toFixed(2)}Hz | 固有频率 f₀=${f0.toFixed(2)}Hz`;
            const color = isResonance ? '#dc2626' : '#0f172a';
            updateTextSprite(h.statusLabel, title, color, 22);
        }

        if (h.measureLabel) {
            updateTextSprite(
                h.measureLabel,
                `稳态振幅 A=${(trueAmp * 100).toFixed(1)}cm | 阻尼 β=${beta.toFixed(2)} | 驱动力 F₀=${forceAmp.toFixed(1)}N`,
                '#2563eb',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as VibrationHandles;
        if (!h.oscillatorMass) return;

        const { time } = ctx;
        const omegaD = 2 * Math.PI * h.driveFreq;
        const amp = h.resAmp;

        // 1. 激振活塞周期起伏
        const pistonY = 1.98 + Math.sin(omegaD * time) * 0.04;
        h.exciterPiston.position.y = pistonY;

        // 2. 振子受迫振动位移 (滞后一定相位 φ)
        const yDisp = amp * Math.cos(omegaD * time);
        const oscY = 1.18 + yDisp;
        h.oscillatorMass.position.y = oscY;

        // 3. 弹簧伸缩随动 (长度为 pistonY 到 oscY)
        const springLen = Math.max(0.2, pistonY - oscY);
        h.springMesh.position.y = (pistonY + oscY) / 2;
        h.springMesh.scale.set(1, springLen / 0.6, 1);

        // 4. 驱动力矢量与速度矢量随动
        const fVal = Math.sin(omegaD * time);
        h.arrowDrive.position.set(0.35, pistonY, 0);
        h.arrowDrive.setDirection(new THREE.Vector3(0, fVal >= 0 ? 1 : -1, 0));
        h.arrowDrive.setLength(Math.max(0.1, Math.abs(fVal) * 0.35), 0.08, 0.04);

        const vVal = -omegaD * amp * Math.sin(omegaD * time);
        h.arrowVelocity.position.set(0.35, oscY, 0);
        h.arrowVelocity.setDirection(new THREE.Vector3(0, vVal >= 0 ? 1 : -1, 0));
        h.arrowVelocity.setLength(Math.max(0.1, Math.min(0.6, Math.abs(vVal) * 0.2)), 0.08, 0.04);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.18 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.18, 0);
    }
};
