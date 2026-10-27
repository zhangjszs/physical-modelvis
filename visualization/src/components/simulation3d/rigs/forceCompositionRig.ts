/**
 * 力的平行四边形定则 rig — 实验木板 + 白纸图钉 + 橡皮条 + 双弹簧测力计拉绳
 * 探究合力与分力的矢量合成法则
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import { SceneRig } from '../EquipmentStage';
import { createSpringScale } from '../equipment/springScale';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { findFrameIndex, interpolateFrame } from '../../../utils/frameUtils';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BOARD_Y = 1.3;

export interface ForceCompositionHandles {
    boardGroup: THREE.Group;
    nodeO: THREE.Mesh;
    rubberBand: THREE.Line;
    cord1: THREE.Line;
    cord2: THREE.Line;
    scale1: THREE.Group;
    scale2: THREE.Group;
    arrow1: THREE.ArrowHelper;
    arrow2: THREE.ArrowHelper;
    arrowResult: THREE.ArrowHelper;
    parallelogram: THREE.Line;
    locus: THREE.Line;
    infoLabel: THREE.Sprite;
}

export const forceCompositionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,
    /**
     * 力矢量不是物体 (#159 逐节审计·问题三)
     *
     * 旧实现让舞台默认小球沿「合力矢量」扫动 —— 等于把一根力箭头当成质体在
     * 空间里运动。现在由 rig 自绘合力端点轨迹 (引擎伪轨迹), 舞台不再叠加小球。
     */
    ownParticles: true,

    /**
     * 自定义取景: 白纸木板在 XY 平面, 默认斜视镜头把平行四边形压扁,
     * 读不出对边是否闭合 —— 这里改成正对木板。
     */
    framing() {
        const target: [number, number, number] = [0, BOARD_Y, 0];
        const distance = 4.6;
        return {
            target,
            position: [target[0], target[1] + distance * 0.06, distance],
            distance
        };
    },

    buildEquipment(scene, params) {
        const boardGroup = new THREE.Group();

        // 1. 实验木板与白纸衬底
        const woodBoard = makeBox(3.4, 2.6, 0.04, 0x78350f, 0.7, 0.1);
        woodBoard.position.set(0, BOARD_Y, -0.03);
        boardGroup.add(woodBoard);

        const whitePaper = makeBox(3.1, 2.3, 0.005, 0xf8fafc, 0.9, 0);
        whitePaper.position.set(0, BOARD_Y, -0.008);
        boardGroup.add(whitePaper);

        // 图钉 (固定橡皮条顶端 G)
        const pinG = makeCylinder(0.04, 0.03, 0xdc2626, 0.3, 0.8);
        pinG.rotation.x = Math.PI / 2;
        pinG.position.set(0, BOARD_Y + 0.95, 0.01);
        boardGroup.add(pinG);

        // 结点 O
        const nodeO = makeCylinder(0.045, 0.03, 0x1e293b, 0.3, 0.8);
        nodeO.rotation.x = Math.PI / 2;
        nodeO.position.set(0, BOARD_Y, 0.01);
        boardGroup.add(nodeO);

        // 橡皮条 G-O
        const rubberBand = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, BOARD_Y + 0.95, 0.01),
                new THREE.Vector3(0, BOARD_Y, 0.01)
            ]),
            new THREE.LineBasicMaterial({ color: 0xb45309, linewidth: 4 })
        );
        boardGroup.add(rubberBand);

        // 细绳套 1 与 2
        const cord1 = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0x475569, linewidth: 2 })
        );
        const cord2 = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0x475569, linewidth: 2 })
        );
        boardGroup.add(cord1);
        boardGroup.add(cord2);

        // 两个弹簧测力计
        const s1 = createSpringScale();
        const s2 = createSpringScale();
        boardGroup.add(s1.group);
        boardGroup.add(s2.group);

        // 力的矢量箭头 (F1 红, F2 蓝, 合力 F 绿)
        const arrow1 = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, BOARD_Y, 0.02),
            0.6,
            0xef4444,
            0.12,
            0.08
        );
        const arrow2 = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, BOARD_Y, 0.02),
            0.6,
            0x3b82f6,
            0.12,
            0.08
        );
        const arrowResult = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, BOARD_Y, 0.02),
            0.8,
            0x16a34a,
            0.14,
            0.09
        );
        boardGroup.add(arrow1);
        boardGroup.add(arrow2);
        boardGroup.add(arrowResult);

        // 平行四边形辅助虚线 (四点闭合)
        const pLines = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.04, gapSize: 0.03 })
        );
        boardGroup.add(pLines);

        // 合力端点轨迹 (引擎伪轨迹 = 合力矢量随夹角的变化)
        const locus = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0.45 })
        );
        boardGroup.add(locus);

        // 测量说明标牌
        const infoLabel = makeTextSprite('验证力的平行四边形定则', '#0f172a', 24, { x: 1.3, y: 0.22 });
        infoLabel.position.set(0, BOARD_Y + 0.95, 0.1);
        boardGroup.add(infoLabel);

        scene.add(boardGroup);

        const handles: ForceCompositionHandles = {
            boardGroup,
            nodeO,
            rubberBand,
            cord1,
            cord2,
            scale1: s1.group,
            scale2: s2.group,
            arrow1,
            arrow2,
            arrowResult,
            parallelogram: pLines,
            locus,
            infoLabel
        };

        updateForceComp(handles, params, null, 0);

        return {
            group: new THREE.Group(),
            handles
        };
    },

    updateEquipment(handles, params, result) {
        updateForceComp(handles as ForceCompositionHandles, params, result ?? null, null);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, BOARD_Y + pos.y * WORLD_SCALE, 0.01);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, BOARD_Y, 0.01);
    },

    /** 合力矢量随扫掠夹角实时变化 (引擎伪轨迹) */
    onAnimate(handles, { time, params, result }) {
        if (!result) return;
        updateForceComp(handles as ForceCompositionHandles, params, result, time);
    }
};

function updateForceComp(
    h: ForceCompositionHandles,
    params: Record<string, number>,
    result: SimulationResult | null,
    currentTime: number | null
): void {
    const f1 = num(params['f1'], 3);
    const f2 = num(params['f2'], 4);
    const angleDeg = num(params['angleDeg'], 90);

    // 比例尺: 1 N = 0.18 世界单位
    const scale = 0.18;

    // —— 引擎当前帧 (权威数据) ——
    let sweepDeg = angleDeg;
    let resMag = 0;
    let resDirRad = 0;
    let engineFrame: { position: { x: number; y: number }; velocity: { x: number; y: number } } | null = null;
    if (result && currentTime !== null) {
        const traj = result.trajectories[0] ?? [];
        if (traj.length > 0) {
            const idx = findFrameIndex(result.trajectories, currentTime);
            const p0 = traj[idx];
            const p1 = traj[Math.min(idx + 1, traj.length - 1)];
            if (p0) {
                engineFrame = p1 ? interpolateFrame(p0, p1, currentTime) : p0;
                sweepDeg = engineFrame.velocity.x; // 引擎: velocity.x = 当前扫掠夹角(°)
                resMag = engineFrame.velocity.y; // 引擎: velocity.y = 合力大小(N)
                resDirRad = Math.atan2(engineFrame.position.y, engineFrame.position.x);
            }
        }
    }
    if (!engineFrame) {
        // 无引擎结果: 按指定夹角静态求解
        const rad = (angleDeg * Math.PI) / 180;
        const v1 = new THREE.Vector3(f1, 0, 0);
        const v2 = new THREE.Vector3(f2 * Math.cos(rad), f2 * Math.sin(rad), 0);
        const v = v1.clone().add(v2);
        resMag = v.length();
        resDirRad = Math.atan2(v.y, v.x);
    }

    const half = (sweepDeg * Math.PI) / 360;
    // 装置约定: 两个测力计在结点下方左右拉开, 橡皮条竖直向上拉结点 O
    const dir1 = new THREE.Vector3(-Math.sin(half), -Math.cos(half), 0).normalize();
    const dir2 = new THREE.Vector3(Math.sin(half), -Math.cos(half), 0).normalize();

    const len1 = Math.max(0.1, f1 * scale);
    const len2 = Math.max(0.1, f2 * scale);

    h.arrow1.setDirection(dir1);
    h.arrow1.setLength(len1, 0.12, 0.08);

    h.arrow2.setDirection(dir2);
    h.arrow2.setLength(len2, 0.12, 0.08);

    // 合力方向 = 引擎方向旋转到装置坐标系 (引擎 F1 沿 +x → 装置 F1 指向 -90°−θ/2)
    const rotation = -Math.PI / 2 - half;
    const dirRes = new THREE.Vector3(Math.cos(resDirRad + rotation), Math.sin(resDirRad + rotation), 0).normalize();

    h.arrowResult.setDirection(dirRes);
    h.arrowResult.setLength(Math.max(0.1, resMag * scale), 0.14, 0.09);

    // 测力计位置与拉绳连线
    const pos1 = new THREE.Vector3(dir1.x * (len1 + 0.6), BOARD_Y + dir1.y * (len1 + 0.6), 0.01);
    const pos2 = new THREE.Vector3(dir2.x * (len2 + 0.6), BOARD_Y + dir2.y * (len2 + 0.6), 0.01);

    h.scale1.position.copy(pos1);
    h.scale1.rotation.z = Math.atan2(dir1.y, dir1.x) - Math.PI / 2;

    h.scale2.position.copy(pos2);
    h.scale2.rotation.z = Math.atan2(dir2.y, dir2.x) - Math.PI / 2;

    h.cord1.geometry.dispose();
    h.cord1.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, BOARD_Y, 0.01), pos1]);

    h.cord2.geometry.dispose();
    h.cord2.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, BOARD_Y, 0.01), pos2]);

    // 平行四边形对边虚线: O → v1 → vRes → v2 → O (四点闭合)
    const ptO = new THREE.Vector3(0, BOARD_Y, 0.015);
    const pt1 = ptO.clone().addScaledVector(dir1, len1);
    const pt2 = ptO.clone().addScaledVector(dir2, len2);
    const ptRes = ptO.clone().addScaledVector(dirRes, Math.max(0.1, resMag * scale));

    h.parallelogram.geometry.dispose();
    h.parallelogram.geometry = new THREE.BufferGeometry().setFromPoints([ptO, pt1, ptRes, pt2, ptO]);
    h.parallelogram.computeLineDistances();

    // 合力端点轨迹 (引擎伪轨迹) —— 说明「合力矢量随夹角变化」
    const traj = result?.trajectories?.[0] ?? [];
    if (traj.length > 1) {
        const pts = traj.map(p => {
            const rot = -Math.PI / 2 - (p.velocity.x * Math.PI) / 360;
            const v = new THREE.Vector3(p.position.x, p.position.y, 0);
            v.applyAxisAngle(new THREE.Vector3(0, 0, 1), rot);
            return new THREE.Vector3(v.x * scale, BOARD_Y + v.y * scale, 0.012);
        });
        h.locus.geometry.dispose();
        h.locus.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    }

    setLabel(
        h.infoLabel,
        `F₁=${f1.toFixed(1)}N, F₂=${f2.toFixed(1)}N, θ=${sweepDeg.toFixed(0)}° → F_合=${resMag.toFixed(2)}N`,
        '#0f172a'
    );
}
