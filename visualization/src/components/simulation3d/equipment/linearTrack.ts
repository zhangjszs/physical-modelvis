/**
 * 精密直线导轨实验台 3D 器材组件
 * 适用于匀变速直线运动、牛顿第二定律、动量碰撞等场景
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { createPhotogate } from './photogate';

export interface LinearTrackHandles {
    track: THREE.Group;
    scaleLabel: THREE.Sprite;
    photogates: THREE.Group[];
    length: number;
}

export function createLinearTrack(
    length = 4.0,
    width = 0.28,
    height = 0.12,
    photogatePositions: number[] = [0.8, 2.6]
): { group: THREE.Group; handles: LinearTrackHandles } {
    const group = new THREE.Group();

    // 1. 主导轨 (阳极氧化铝合金质感)
    const rail = makeBox(length, height, width, 0x94a3b8, 0.35, 0.8);
    rail.position.set(0, height / 2 + 0.05, 0);
    group.add(rail);

    // 导轨中央滑槽 (略深色凹槽)
    const groove = makeBox(length, 0.015, width * 0.35, 0x334155, 0.6, 0.5);
    groove.position.set(0, height + 0.045, 0);
    group.add(groove);

    // 2. 两端支承脚座与水平微调螺母
    const footOffsets = [-length / 2 + 0.25, length / 2 - 0.25];
    footOffsets.forEach(x => {
        const foot = makeBox(0.12, 0.05, width + 0.08, 0x475569, 0.6, 0.4);
        foot.position.set(x, 0.025, 0);
        group.add(foot);

        // 微调旋钮
        const knob = makeCylinder(0.025, 0.03, 0xd97706, 0.4, 0.6);
        knob.position.set(x, 0.05, (width + 0.08) / 2);
        group.add(knob);
    });

    // 3. 两端防撞缓冲挡块
    const bumperL = makeBox(0.04, 0.08, width * 0.8, 0xdc2626, 0.4, 0.2);
    bumperL.position.set(-length / 2 + 0.02, height + 0.04, 0);
    group.add(bumperL);

    const bumperR = makeBox(0.04, 0.08, width * 0.8, 0xdc2626, 0.4, 0.2);
    bumperR.position.set(length / 2 - 0.02, height + 0.04, 0);
    group.add(bumperR);

    // 4. 导轨侧边毫米标尺印线与刻度标注
    const tape = makeBox(length - 0.2, 0.025, 0.005, 0xf8fafc, 0.8, 0);
    tape.position.set(0, height / 2 + 0.05, width / 2 + 0.003);
    group.add(tape);

    const scaleLabel = makeTextSprite('导轨标尺 x / m', '#475569', 24, { x: 0.8, y: 0.2 });
    scaleLabel.position.set(0, height + 0.2, width / 2 + 0.15);
    group.add(scaleLabel);

    // 5. 光电门组
    const photogates: THREE.Group[] = [];
    photogatePositions.forEach(xPos => {
        const pg = createPhotogate();
        pg.group.position.set(xPos - length / 2, height + 0.05, 0);
        group.add(pg.group);
        photogates.push(pg.group);
    });

    const handles: LinearTrackHandles = {
        track: group,
        scaleLabel,
        photogates,
        length
    };

    return { group, handles };
}

export function updateLinearTrack(handles: LinearTrackHandles, photogateOffsets: number[]): void {
    photogateOffsets.forEach((pos, idx) => {
        const pg = handles.photogates[idx];
        if (pg) {
            pg.position.x = pos - handles.length / 2;
        }
    });
}
