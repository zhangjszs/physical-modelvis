/**
 * 电阻定律实验板 3D 器材组件
 * 适用于探究导体电阻与材料、长度、横截面积的关系 (R = ρ·L/S)
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { setLabel } from '../rigs/params';

export interface ResistanceBoardHandles {
    group: THREE.Group;
    clip: THREE.Mesh;
    clipLead: THREE.Line;
    readoutLabel: THREE.Sprite;
}

export function createResistanceBoard(
    boardLength = 3.2,
    boardWidth = 1.4
): { group: THREE.Group; handles: ResistanceBoardHandles } {
    const group = new THREE.Group();

    // 1. 胶木实验底板 (深棕色绝缘板)
    const board = makeBox(boardLength, 0.05, boardWidth, 0x451a03, 0.7, 0.1);
    board.position.set(0, 0.025, 0);
    group.add(board);

    // 2. 标尺刻度槽
    const ruler = makeBox(boardLength - 0.4, 0.008, 0.08, 0xfef08a, 0.8, 0);
    ruler.position.set(0, 0.055, boardWidth / 2 - 0.12);
    group.add(ruler);

    const rulerLabel = makeTextSprite('标尺 0 ~ 100 cm', '#713f12', 20, { x: 0.6, y: 0.15 });
    rulerLabel.position.set(0, 0.12, boardWidth / 2 - 0.12);
    group.add(rulerLabel);

    // 3. 四根对比合金电阻丝与接线柱
    // 线 1: 镍铬丝 L, S (粗细标称)
    // 线 2: 镍铬丝 2L, S (对折/双倍长)
    // 线 3: 镍铬丝 L, 2S (双倍粗)
    // 线 4: 康铜丝 L, S (对比不同材料 ρ)
    const wireZ = [-0.35, -0.12, 0.12, 0.35];
    const wireColors = [0x94a3b8, 0x94a3b8, 0x94a3b8, 0xd97706];
    const wireRadii = [0.006, 0.006, 0.012, 0.006];
    const wireLabels = ['1. 镍铬 (L, S)', '2. 镍铬 (L/2, S)', '3. 镍铬 (L, 2S)', '4. 康铜 (L, S)'];

    wireZ.forEach((z, i) => {
        // 两端纯铜镀镍接线柱
        const postL = makeCylinder(0.028, 0.08, 0xeab308, 0.3, 0.85);
        postL.position.set(-boardLength / 2 + 0.3, 0.08, z);
        group.add(postL);

        const postR = makeCylinder(0.028, 0.08, 0xeab308, 0.3, 0.85);
        postR.position.set(boardLength / 2 - 0.3, 0.08, z);
        group.add(postR);

        // 电阻合金丝
        const wireGeo = new THREE.CylinderGeometry(wireRadii[i], wireRadii[i], boardLength - 0.6, 16);
        const wireMat = new THREE.MeshStandardMaterial({
            color: wireColors[i],
            metalness: 0.85,
            roughness: 0.3
        });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.rotation.z = Math.PI / 2;
        wire.position.set(0, 0.075, z);
        group.add(wire);

        // 丝线名称标签
        const lbl = makeTextSprite(wireLabels[i]!, '#e2e8f0', 20, { x: 0.7, y: 0.15 });
        lbl.position.set(-boardLength / 2 + 0.9, 0.15, z);
        group.add(lbl);
    });

    // 4. 鳄鱼滑动夹子 (带红色引线连接到测量电表)
    const clip = makeBox(0.06, 0.05, 0.04, 0xdc2626, 0.4, 0.4);
    clip.position.set(0, 0.09, wireZ[0]!);
    group.add(clip);

    const clipLead = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0.09, wireZ[0]!),
            new THREE.Vector3(0, 0.25, wireZ[0]! - 0.3),
            new THREE.Vector3(boardLength / 2 - 0.2, 0.15, -boardWidth / 2 + 0.1)
        ]),
        new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 })
    );
    group.add(clipLead);

    // 5. 测量读数标牌
    const readoutLabel = makeTextSprite('R = 5.00 Ω | L = 0.50 m', '#16a34a', 26, { x: 1.0, y: 0.22 });
    readoutLabel.position.set(0, 0.38, 0);
    group.add(readoutLabel);

    const handles: ResistanceBoardHandles = {
        group,
        clip,
        clipLead,
        readoutLabel
    };

    return { group, handles };
}

export function updateResistanceBoard(
    handles: ResistanceBoardHandles,
    lengthM: number,
    rTotal: number,
    boardLength = 3.2
): void {
    const usableLength = boardLength - 0.6;
    const xPos = -usableLength / 2 + lengthM * usableLength;
    handles.clip.position.x = xPos;

    handles.clipLead.geometry.dispose();
    handles.clipLead.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xPos, 0.09, -0.35),
        new THREE.Vector3(xPos * 0.5, 0.25, -0.5),
        new THREE.Vector3(boardLength / 2 - 0.2, 0.15, -0.6)
    ]);

    handles.readoutLabel.position.x = xPos;
    setLabel(handles.readoutLabel, `R = ${rTotal.toFixed(2)} Ω | L = ${lengthM.toFixed(2)} m`, '#16a34a');
}
