/**
 * 气垫导轨 — 4 个实验（测速度、加速度、验证牛顿第二定律等）
 * 倾斜/水平面板 + 气孔标记 + 支架
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';

export interface AirTrackHandles {
    track: THREE.Mesh;
    group: THREE.Group;
}

export function createAirTrack(length = 3.0): {
    group: THREE.Group;
    handles: AirTrackHandles;
} {
    const group = new THREE.Group();

    // 导轨主体（三角形截面近似为长条）
    const track = makeBox(length, 0.12, 0.2, 0x94a3b8, 0.35, 0.25);
    track.position.set(0, 0.4, 0);
    group.add(track);

    // 气孔标记（一排小点）
    for (let i = 0; i < 12; i++) {
        const hole = makeCylinder(0.012, 0.02, 0x3b82f6, 0.3, 0.3);
        hole.rotation.x = Math.PI / 2;
        hole.position.set(-length / 2 + 0.15 + (i * (length - 0.3)) / 11, 0.46, 0);
        group.add(hole);
    }

    // 支架（两端）
    const supportL = makeBox(0.08, 0.4, 0.16, 0x64748b, 0.4, 0.3);
    supportL.position.set(-length / 2 + 0.1, 0.2, 0);
    group.add(supportL);

    const supportR = makeBox(0.08, 0.4, 0.16, 0x64748b, 0.4, 0.3);
    supportR.position.set(length / 2 - 0.1, 0.2, 0);
    group.add(supportR);

    // 气源接口
    const airInlet = makeCylinder(0.04, 0.1, 0x475569, 0.3, 0.3);
    airInlet.rotation.z = Math.PI / 2;
    airInlet.position.set(-length / 2 - 0.02, 0.4, 0);
    group.add(airInlet);

    // 标签
    const label = makeTextSprite('气垫导轨', '#475569', 28, { x: 1.0, y: 0.36 });
    label.position.set(0, 0.62, 0);
    group.add(label);

    return { group, handles: { track, group } };
}
