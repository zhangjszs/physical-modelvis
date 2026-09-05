/**
 * 力的平行四边形定则 rig — 实验木板 + 白纸图钉 + 橡皮条 + 双弹簧测力计拉绳
 * 探究合力与分力的矢量合成法则
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createSpringScale } from '../equipment/springScale';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BOARD_Y = 1.3;

interface ForceCompHandles {
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
    infoLabel: THREE.Sprite;
}

export const forceCompositionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

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

        // 平行四边形辅助虚线
        const pLines = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.04, gapSize: 0.03 })
        );
        boardGroup.add(pLines);

        // 测量说明标牌
        const infoLabel = makeTextSprite('验证力的平行四边形定则', '#0f172a', 24, { x: 1.3, y: 0.22 });
        infoLabel.position.set(0, BOARD_Y + 1.25, 0.1);
        boardGroup.add(infoLabel);

        scene.add(boardGroup);

        const handles: ForceCompHandles = {
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
            infoLabel
        };

        updateForceComp(handles, params);

        return {
            group: new THREE.Group(),
            handles: handles as unknown as Record<string, unknown>
        };
    },

    updateEquipment(handles, params) {
        updateForceComp(handles as unknown as ForceCompHandles, params);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, BOARD_Y + pos.y * WORLD_SCALE, 0.01);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, BOARD_Y, 0.01);
    }
};

function updateForceComp(h: ForceCompHandles, params: Record<string, number>): void {
    const f1 = num(params['f1'], 3);
    const f2 = num(params['f2'], 4);
    const angleDeg = num(params['angleDeg'], 90);
    const rad = (angleDeg * Math.PI) / 180;

    // F1 沿 -x 偏下，F2 沿 +x 偏下，两者夹角为 rad
    const half = rad / 2;
    const dir1 = new THREE.Vector3(-Math.sin(half), -Math.cos(half), 0).normalize();
    const dir2 = new THREE.Vector3(Math.sin(half), -Math.cos(half), 0).normalize();

    // 比例尺: 1 N = 0.18 世界单位
    const scale = 0.18;
    const len1 = Math.max(0.1, f1 * scale);
    const len2 = Math.max(0.1, f2 * scale);

    h.arrow1.setDirection(dir1);
    h.arrow1.setLength(len1, 0.12, 0.08);

    h.arrow2.setDirection(dir2);
    h.arrow2.setLength(len2, 0.12, 0.08);

    // 合力 F = F1 + F2
    const v1 = dir1.clone().multiplyScalar(len1);
    const v2 = dir2.clone().multiplyScalar(len2);
    const vRes = new THREE.Vector3().addVectors(v1, v2);
    const lenRes = vRes.length();
    const dirRes = vRes.clone().normalize();

    h.arrowResult.setDirection(dirRes);
    h.arrowResult.setLength(Math.max(0.1, lenRes), 0.14, 0.09);

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

    // 平行四边形对边虚线: O->v1->vRes->v2->O
    const ptO = new THREE.Vector3(0, BOARD_Y, 0.015);
    const pt1 = ptO.clone().add(v1);
    const ptRes = ptO.clone().add(vRes);
    const pt2 = ptO.clone().add(v2);

    h.parallelogram.geometry.dispose();
    h.parallelogram.geometry = new THREE.BufferGeometry().setFromPoints([pt1, ptRes, pt2]);

    const fResN = (lenRes / scale).toFixed(2);
    setLabel(
        h.infoLabel,
        `F₁=${f1.toFixed(1)}N, F₂=${f2.toFixed(1)}N, θ=${angleDeg.toFixed(0)}° → F_合=${fResN}N`,
        '#0f172a'
    );
}
