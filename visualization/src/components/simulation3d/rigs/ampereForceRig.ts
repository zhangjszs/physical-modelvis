/**
 * 安培力与电磁相互作用 3D 实验 Rig
 * 覆盖：
 * 1. ampere-force: 通电导线在磁场中受安培力（左手定则 F = BIL·sinθ）
 * 2. em-induction: 导体切割磁感线产生感应电流
 * 3. current-balance: 电流天平测磁感应强度
 * 4. em-damping / eddy-current: 铝板在磁场中摆动的电磁阻尼
 * 包含：大型红蓝双色强磁蹄形磁铁、悬挂式水平纯铜导电棒、直流供电回路、
 * 磁场-电流-安培力三维正交矢量系与安培力摆动平衡角动态随动。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface AmpereForceHandles {
    rootGroup: THREE.Group;
    conductorGroup: THREE.Group; // 悬挂可摆动的通电铜导体总成
    conductorRod: THREE.Mesh;
    wireL: THREE.Line;
    wireR: THREE.Line;
    bFieldArrows: THREE.ArrowHelper[];
    arrowB: THREE.ArrowHelper;
    arrowI: THREE.ArrowHelper;
    arrowF: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    formulaLabel: THREE.Sprite;
    B: number;
    I: number;
    L: number;
    angleDeg: number;
    forceF: number;
    equilibriumSwingAngle: number;
}

export const ampereForceRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 实木绝缘实验工作台 (长 2.8m, 宽 1.2m, 高 0.08m)
        const table = makeBox(2.8, 0.08, 1.2, 0x334155, 0.5, 0.3);
        table.position.set(0, 0.04, 0);
        table.receiveShadow = true;
        group.add(table);

        // 2. 重型大号蹄形永磁铁 (U 形结构，N 极红色，S 极蓝色)
        const magnetYoke = makeBox(0.8, 0.14, 0.5, 0x475569, 0.3, 0.6);
        magnetYoke.position.set(0, 0.15, 0);
        group.add(magnetYoke);

        // N 极 (红色支柱，左侧或上侧)
        const nPole = makeBox(0.22, 0.9, 0.5, 0xdc2626, 0.3, 0.5);
        nPole.position.set(-0.35, 0.67, 0);
        nPole.castShadow = true;
        group.add(nPole);

        const nMark = makeTextSprite('N', '#ffffff', 40, { x: 0.3, y: 0.3 });
        nMark.position.set(-0.35, 1.05, 0.26);
        group.add(nMark);

        // S 极 (蓝色支柱，右侧)
        const sPole = makeBox(0.22, 0.9, 0.5, 0x2563eb, 0.3, 0.5);
        sPole.position.set(0.35, 0.67, 0);
        sPole.castShadow = true;
        group.add(sPole);

        const sMark = makeTextSprite('S', '#ffffff', 40, { x: 0.3, y: 0.3 });
        sMark.position.set(0.35, 1.05, 0.26);
        group.add(sMark);

        // 3. 悬挂吊架 (龙门悬挂横梁，高 1.8m)
        [-0.7, 0.7].forEach(hx => {
            const standCol = makeCylinder(0.016, 1.4, 0x94a3b8, 0.2, 0.8);
            standCol.position.set(hx, 0.78, 0);
            group.add(standCol);
        });

        const topCrossbar = makeBox(1.5, 0.03, 0.03, 0x475569, 0.3, 0.7);
        topCrossbar.position.set(0, 1.48, 0);
        group.add(topCrossbar);

        // 4. 悬挂通电纯铜导体棒总成 (绕顶部悬轴旋转摆动)
        const conductorGroup = new THREE.Group();
        conductorGroup.position.set(0, 1.48, 0);

        // 双导电细柔性悬挂线 (左悬线与右悬线)
        const lineMat = new THREE.LineBasicMaterial({ color: 0xd97706, linewidth: 2 });
        const wireL = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, -0.22),
                new THREE.Vector3(0, -0.68, -0.22)
            ]),
            lineMat
        );
        conductorGroup.add(wireL);

        const wireR = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0.22),
                new THREE.Vector3(0, -0.68, 0.22)
            ]),
            lineMat
        );
        conductorGroup.add(wireR);

        // 纯铜导体棒 (亮黄铜质感，长 0.55m，横卧于磁场中心)
        const conductorRod = makeCylinder(0.016, 0.55, 0xd97706, 0.25, 0.85);
        conductorRod.rotation.x = Math.PI / 2;
        conductorRod.position.set(0, -0.68, 0);
        conductorRod.castShadow = true;
        conductorGroup.add(conductorRod);

        group.add(conductorGroup);

        // 5. 磁感应线背景阵列 (从 N 极指向 S 极，沿 X 轴水平)
        const bFieldArrows: THREE.ArrowHelper[] = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const bArr = new THREE.ArrowHelper(
                    new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(-0.24, 0.65 + row * 0.15, -0.16 + col * 0.16),
                    0.48,
                    0xf59e0b,
                    0.08,
                    0.04
                );
                group.add(bArr);
                bFieldArrows.push(bArr);
            }
        }

        // 6. 核心物理矢量：磁场 B、电流 I、安培力 F 三维正交系
        // 磁场矢量 B (水平向右黄色)
        const arrowB = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.8, 0), 0.45, 0xf59e0b, 0.1, 0.05);
        // 电流矢量 I (沿导线方向绿色)
        const arrowI = makeArrow(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.8, 0), 0.45, 0x22c55e, 0.1, 0.05);
        // 安培力矢量 F (垂直红色，沿 Y 轴或向外)
        const arrowF = makeArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.8, 0), 0.45, 0xef4444, 0.12, 0.06);
        group.add(arrowB);
        group.add(arrowI);
        group.add(arrowF);

        // 7. 原理与数据 HUD
        const statusLabel = makeTextSprite('安培力与左手定则', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 2.15, 0);
        group.add(statusLabel);

        const formulaLabel = makeTextSprite('安培力大小：F = B·I·L·sinθ', '#2563eb', 20, { x: 1.8, y: 0.24 });
        formulaLabel.position.set(0, 1.9, 0);
        group.add(formulaLabel);

        scene.add(group);

        const handles: AmpereForceHandles = {
            rootGroup: group,
            conductorGroup,
            conductorRod,
            wireL,
            wireR,
            bFieldArrows,
            arrowB,
            arrowI,
            arrowF,
            statusLabel,
            formulaLabel,
            B: 0.5,
            I: 2.0,
            L: 0.5,
            angleDeg: 90,
            forceF: 0.5,
            equilibriumSwingAngle: 0.2
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as AmpereForceHandles;
        const B = num(params['B'] ?? params['bField'] ?? 0.5, 0.5); // T
        const I = num(params['I'] ?? params['current'] ?? 2.0, 2.0); // A
        const L = num(params['L'] ?? params['length'] ?? 0.5, 0.5); // m
        const angleDeg = num(params['angle'] ?? params['theta'] ?? 90, 90);

        h.B = B;
        h.I = I;
        h.L = L;
        h.angleDeg = angleDeg;

        const rad = (angleDeg * Math.PI) / 180;
        // 安培力公式：F = B * I * L * sinθ
        const F = B * I * L * Math.sin(rad);
        h.forceF = F;

        // 摆动偏角平衡：tan(φ) = F / (m·g)，取导线质量 m ≈ 0.05kg, mg ≈ 0.5N
        const mg = 0.5;
        const tanPhi = F / mg;
        const swingAngle = Math.atan(tanPhi);
        h.equilibriumSwingAngle = THREE.MathUtils.clamp(swingAngle, -Math.PI / 3, Math.PI / 3);

        // 安培力箭头更新
        const fLen = Math.max(0.12, Math.min(0.75, (Math.abs(F) / 1.5) * 0.65));
        const fSign = F >= 0 ? 1 : -1;
        h.arrowF.setDirection(new THREE.Vector3(0, 0, -fSign));
        h.arrowF.setLength(fLen, 0.1, 0.05);

        // 电流箭头长度 ∝ I
        const iLen = Math.max(0.12, Math.min(0.65, (Math.abs(I) / 5) * 0.55));
        h.arrowI.setLength(iLen, 0.1, 0.05);

        // 磁场箭头长度 ∝ B
        const bLen = Math.max(0.15, Math.min(0.6, (B / 1.5) * 0.5));
        h.arrowB.setLength(bLen, 0.1, 0.05);

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `磁感应强度 B=${B.toFixed(2)}T | 电流 I=${I.toFixed(2)}A | 导线长 L=${L.toFixed(2)}m`,
                '#0f172a',
                22
            );
        }

        if (h.formulaLabel) {
            const anglePhiDeg = ((h.equilibriumSwingAngle * 180) / Math.PI).toFixed(1);
            updateTextSprite(
                h.formulaLabel,
                `安培力 F = BIL·sinθ = ${F.toFixed(3)}N | 导线受力平衡偏角 φ=${anglePhiDeg}° (左手定则严格判定)`,
                '#2563eb',
                19
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as AmpereForceHandles;
        if (!h.conductorGroup) return;

        const { time } = ctx;
        // 通电瞬间微摆动阻尼衰减趋于平衡偏转角
        const target = h.equilibriumSwingAngle;
        const dampingSway = 0.2 * Math.exp(-0.8 * time) * Math.cos(4 * time);
        const currentSwing = target + dampingSway;

        // 导体棒绕 Z 轴或 X 轴摆出磁场
        h.conductorGroup.rotation.x = currentSwing;

        // 动态矢量位置随导体棒平移
        const rodY = 1.48 - 0.68 * Math.cos(currentSwing);
        const rodZ = 0.68 * Math.sin(currentSwing);
        h.arrowF.position.set(0, rodY, rodZ);
        h.arrowI.position.set(0, rodY, rodZ);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.8 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.8, 0);
    }
};
