/**
 * 斜面 — 可调角度的斜面板 + 支架
 * 用于伽利略斜面、牛顿第二定律、滑动摩擦等
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite, makeLine } from '../primitives';

export interface InclinedPlaneHandles {
    panel: THREE.Mesh;
    support: THREE.Mesh;
    angleArc: THREE.Line;
    angleLabel: THREE.Sprite;
    group: THREE.Group;
}

export function createInclinedPlane(angleDeg = 30): {
    group: THREE.Group;
    handles: InclinedPlaneHandles;
} {
    const group = new THREE.Group();
    const angleRad = (angleDeg * Math.PI) / 180;
    const panelLen = 3.2;
    const panelThickness = 0.08;

    // 斜面板
    const panel = makeBox(panelLen, panelThickness, 1.0, 0x78716c, 0.6, 0.05);
    panel.position.set(0, 0, 0);
    group.add(panel);

    // 可调节支架
    const support = makeCylinder(0.04, 1.2, 0x64748b, 0.3, 0.4);
    support.position.set(-panelLen * 0.3, 0.3, 0);
    group.add(support);

    // 角度标注弧
    const arcRadius = 0.7;
    const arcPoints = Array.from({ length: 24 }, (_, i) => {
        const a = (i / 23) * angleRad;
        return new THREE.Vector3(Math.cos(a) * arcRadius, Math.sin(a) * arcRadius + 0.05, 0.55);
    });
    const angleArc = makeLine(arcPoints, 0x2563eb, 0.7);
    group.add(angleArc);

    // 角度标签
    const angleLabel = makeTextSprite(`${angleDeg}°`, '#2563eb', 28, { x: 0.6, y: 0.22 });
    angleLabel.position.set(Math.cos(angleRad / 2) * 0.95, Math.sin(angleRad / 2) * 0.95 + 0.05, 0.55);
    group.add(angleLabel);

    return { group, handles: { panel, support, angleArc, angleLabel, group } };
}

/** 更新斜面角度 */
export function updateInclinedPlane(
    handles: InclinedPlaneHandles,
    angleDeg: number
): void {
    const angleRad = (angleDeg * Math.PI) / 180;
    const panelLen = 3.2;

    // 旋转面板绕低端
    handles.panel.rotation.z = -angleRad;
    handles.panel.position.set(
        panelLen * 0.5 * (1 - Math.cos(angleRad)),
        panelLen * 0.5 * Math.sin(angleRad),
        0
    );

    // 更新角度弧
    const arcRadius = 0.7;
    const arcPoints = Array.from({ length: 24 }, (_, i) => {
        const a = (i / 23) * angleRad;
        return new THREE.Vector3(
            Math.cos(a) * arcRadius + panelLen * 0.0,
            Math.sin(a) * arcRadius + 0.05,
            0.55
        );
    });
    handles.angleArc.geometry.dispose();
    handles.angleArc.geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);

    // 更新标签
    handles.angleLabel.position.set(
        Math.cos(angleRad / 2) * 0.95,
        Math.sin(angleRad / 2) * 0.95 + 0.1,
        0.55
    );
    const mat = handles.angleLabel.material as THREE.SpriteMaterial;
    const canvas = mat.map?.image as HTMLCanvasElement;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '600 28px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#2563eb';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${angleDeg.toFixed(0)}°`, canvas.width / 2, canvas.height / 2);
        mat.map!.needsUpdate = true;
    }
}
