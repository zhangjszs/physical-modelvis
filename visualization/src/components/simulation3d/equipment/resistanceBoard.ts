/**
 * 电阻定律实验板 3D 器材组件
 * 适用于探究导体电阻与材料、长度、横截面积的关系 (R = ρ·L/S)
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeLabelSprite } from '../primitives';
import { setLabel } from '../rigs/params';

/** 读数标牌字高 (世界单位) */
const LABEL_GLYPH_HEIGHT = 0.09;

export interface ResistanceBoardHandles {
    group: THREE.Group;
    clip: THREE.Mesh;
    clipLead: THREE.Line;
    readoutLabel: THREE.Sprite;
    /** 材料对比标牌 (对应引擎 R_material 曲线) */
    compareLabel: THREE.Sprite;
}

export function createResistanceBoard(
    boardLength = 3.2,
    boardWidth = 1.4,
    /**
     * 四根电阻丝的标签。默认写死「镍铬 / 康铜」与场景参数 (铜/铁/镍铬) 对不上,
     * 调用方按当前材料传入 —— 见 resistanceLawRig.resistanceWireLabels。
     */
    wireLabels: string[] = ['1. 镍铬 (L, S)', '2. 镍铬 (L/2, S)', '3. 镍铬 (L, 2S)', '4. 康铜 (L, S)'],
    /** 标尺标签 —— 滑夹位置按接入长度线性映射, 标尺量程须与之一致 */
    rulerText = '标尺 0 ~ 100 cm'
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

    const rulerLabel = makeLabelSprite(rulerText, '#713f12', 20, LABEL_GLYPH_HEIGHT * 0.8);
    rulerLabel.position.set(0, 0.14, boardWidth / 2 - 0.12);
    group.add(rulerLabel);

    // 3. 四根对比合金电阻丝与接线柱
    // 线 1: 场景材料 L, S
    // 线 2: 场景材料 L/2, S (对折/双倍长)
    // 线 3: 场景材料 L, 2S (双倍粗)
    // 线 4: 对比材料 L, S (对比不同材料 ρ)
    const wireZ = [-0.35, -0.12, 0.12, 0.35];
    const wireColors = [0x94a3b8, 0x94a3b8, 0x94a3b8, 0xd97706];
    const wireRadii = [0.006, 0.006, 0.012, 0.006];

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
        const lbl = makeLabelSprite(wireLabels[i] ?? `导线 ${i + 1}`, '#e2e8f0', 20, LABEL_GLYPH_HEIGHT * 0.72);
        lbl.position.set(-boardLength / 2 + 0.9, 0.16, z);
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
    //    字高固定 (世界单位): 长读数 (R + L + ρ) 不会被压成一条线;
    //    抬高到板面之上, 避免被滑夹引线与丝线标签穿过。
    const readoutLabel = makeLabelSprite('R = 5.00 Ω | L = 0.50 m', '#16a34a', 26, LABEL_GLYPH_HEIGHT);
    readoutLabel.position.set(0, 0.74, 0);
    group.add(readoutLabel);

    // 6. 材料对比标牌 (对应引擎 R_material 曲线)
    const compareLabel = makeLabelSprite('铜 — | 铁 — | 镍铬 —', '#0891b2', 20, LABEL_GLYPH_HEIGHT * 0.85);
    compareLabel.position.set(0, 1.04, 0);
    group.add(compareLabel);

    const handles: ResistanceBoardHandles = {
        group,
        clip,
        clipLead,
        readoutLabel,
        compareLabel
    };

    return { group, handles };
}

/**
 * 更新滑夹位置与两块读数标牌。
 *
 * @param lengthRatio 滑夹归一化位置 (0~1)
 * @param readoutText 主读数 (R / L / ρ)
 * @param compareText 材料对比读数 (铜 / 铁 / 镍铬)
 */
export function updateResistanceBoard(
    handles: ResistanceBoardHandles,
    lengthRatio: number,
    readoutText: string,
    compareText: string,
    boardLength = 3.2
): void {
    const usableLength = boardLength - 0.6;
    const xPos = -usableLength / 2 + lengthRatio * usableLength;
    handles.clip.position.x = xPos;

    handles.clipLead.geometry.dispose();
    handles.clipLead.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xPos, 0.09, -0.35),
        new THREE.Vector3(xPos * 0.5, 0.25, -0.5),
        new THREE.Vector3(boardLength / 2 - 0.2, 0.15, -0.6)
    ]);

    handles.readoutLabel.position.x = xPos;
    setLabel(handles.readoutLabel, readoutText, '#16a34a');
    handles.compareLabel.position.x = xPos;
    setLabel(handles.compareLabel, compareText, '#0891b2');
}
