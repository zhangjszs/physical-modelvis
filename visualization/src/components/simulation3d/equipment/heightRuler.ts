/**
 * 高度尺 — 竖直尺寸标注
 * 用于标注发射高度、下落高度等
 */
import * as THREE from 'three';
import { makeBox, makeLine, makeTextSprite, clearGroup } from '../primitives';

export interface HeightRulerHandles {
    group: THREE.Group;
    label: THREE.Sprite;
}

export function createHeightRuler(): {
    group: THREE.Group;
    handles: HeightRulerHandles;
} {
    const group = new THREE.Group();
    const label = makeTextSprite('h = 0.0 m', '#0f766e', 28, { x: 0.8, y: 0.26 });
    group.add(label);

    return { group, handles: { group, label } };
}

/** 更新高度尺的位置和标注 */
export function updateHeightRuler(
    handles: HeightRulerHandles | undefined,
    x: number,
    z: number,
    topY: number,
    text: string
): void {
    if (!handles || !handles.group) return;
    clearGroup(handles.group);
    handles.group.add(handles.label);

    const line = makeLine([new THREE.Vector3(x, 0.03, z), new THREE.Vector3(x, topY, z)], 0x0f766e, 0.78);
    handles.group.add(line);

    // 两端刻度
    const tickB = makeBox(0.42, 0.018, 0.018, 0x0f766e, 0.5);
    tickB.position.set(x, 0.04, z);
    handles.group.add(tickB);

    const tickT = makeBox(0.42, 0.018, 0.018, 0x0f766e, 0.5);
    tickT.position.set(x, topY, z);
    handles.group.add(tickT);

    // 更新标签
    handles.label.position.set(x - 0.3, topY / 2, z - 0.06);
    const mat = handles.label.material as THREE.SpriteMaterial;
    const canvas = mat.map?.image as HTMLCanvasElement;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '600 28px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#0f766e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        mat.map!.needsUpdate = true;
    }
}
