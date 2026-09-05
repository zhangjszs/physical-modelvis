/**
 * 发射器 — 抛体运动专用
 * 底座 + 升降柱 + 发射筒 + 角度弧 + 发射箭头
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite, makeLine, makeArrow } from '../primitives';

export const BARREL_LENGTH = 0.7;
export const BALL_RADIUS = 0.22;
export const VISUAL_MUZZLE_HEIGHT = BALL_RADIUS;

export interface LauncherHandles {
    group: THREE.Group;
    barrel: THREE.Mesh;
    muzzle: THREE.Mesh;
    pivot: THREE.Mesh;
    liftColumn: THREE.Mesh;
    liftRail: THREE.Mesh;
    bench: THREE.Mesh;
    clamp: THREE.Mesh;
    angleArc: THREE.Line;
    angleLabel: THREE.Sprite;
    launchArrow: THREE.ArrowHelper;
}

export function createLauncher(): {
    group: THREE.Group;
    handles: LauncherHandles;
} {
    const group = new THREE.Group();

    const bench = makeBox(1.5, 0.08, 0.8, 0x475569);
    bench.position.set(-0.75, 0.04, 0);
    group.add(bench);

    const rearFoot = makeBox(0.36, 0.1, 0.6, 0x334155);
    rearFoot.position.set(-1.3, 0.13, 0);
    group.add(rearFoot);

    const liftRail = makeBox(0.08, 2.4, 0.08, 0x94a3b8, 0.36);
    liftRail.position.set(-1.05, 1.2, -0.28);
    group.add(liftRail);

    const liftColumn = makeBox(0.12, 0.9, 0.12, 0x64748b, 0.42);
    liftColumn.position.set(-0.55, 0.45, 0);
    group.add(liftColumn);

    const clamp = makeBox(0.32, 0.18, 0.28, 0x1f2937, 0.36);
    group.add(clamp);

    const pivot = makeCylinder(0.14, 0.22, 0x111827, 0.45, 0.3);
    pivot.rotation.x = Math.PI / 2;
    group.add(pivot);

    const barrel = makeCylinder(0.14, BARREL_LENGTH, 0x2563eb, 0.35);
    group.add(barrel);

    const muzzle = makeCylinder(0.17, 0.05, 0x0f172a, 0.25);
    group.add(muzzle);

    const angleArc = makeLine([], 0x2563eb, 0.74);
    group.add(angleArc);

    const angleLabel = makeTextSprite('45°', '#2563eb', 34, { x: 0.6, y: 0.22 });
    group.add(angleLabel);

    const launchArrow = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.85, 0x16a34a, 0.2, 0.1);
    group.add(launchArrow);

    return {
        group,
        handles: { group, barrel, muzzle, pivot, liftColumn, liftRail, bench, clamp, angleArc, angleLabel, launchArrow }
    };
}

/** 计算发射口 3D 坐标：严格对齐物理初始发射高度 */
export function getVisualLaunchPoint(_angleDeg: number, h0: number, worldScale: number): THREE.Vector3 {
    return new THREE.Vector3(0, BALL_RADIUS + h0 * worldScale, 0);
}

/** 更新发射器状态 */
export function updateLauncher(
    handles: LauncherHandles | undefined,
    angleDeg: number,
    h0: number,
    worldScale: number
): THREE.Vector3 {
    if (!handles || !handles.barrel) return new THREE.Vector3(0, 0, 0);
    const angleRad = (angleDeg * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.cos(angleRad), Math.sin(angleRad), 0).normalize();
    const launchPoint = getVisualLaunchPoint(angleDeg, h0, worldScale);
    const pivotPoint = launchPoint.clone().addScaledVector(dir, -BARREL_LENGTH);
    const barrelCenter = pivotPoint.clone().addScaledVector(dir, BARREL_LENGTH / 2);
    const columnHeight = Math.max(0.15, pivotPoint.y - 0.08);

    handles.pivot.position.copy(pivotPoint);
    handles.clamp.position.set(pivotPoint.x - 0.06, pivotPoint.y, 0);
    handles.barrel.position.copy(barrelCenter);
    handles.barrel.rotation.set(0, 0, angleRad - Math.PI / 2);
    handles.muzzle.position.copy(launchPoint.clone().addScaledVector(dir, -0.025));
    handles.muzzle.rotation.set(0, 0, angleRad - Math.PI / 2);

    handles.liftColumn.position.set(pivotPoint.x, 0.08 + columnHeight / 2, 0);
    handles.liftColumn.scale.y = columnHeight / 0.9;
    handles.liftRail.position.set(pivotPoint.x - 0.35, Math.max(1.0, pivotPoint.y + 0.4), -0.28);
    handles.liftRail.scale.y = Math.max(1.0, (pivotPoint.y + 0.8) / 2.0);

    // 角度弧
    const radius = 0.48;
    const arcPoints = Array.from({ length: 32 }, (_, i) => {
        const a = (i / 31) * angleRad;
        return pivotPoint.clone().add(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0.25));
    });
    handles.angleArc.geometry.dispose();
    handles.angleArc.geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);

    // 角度标签
    handles.angleLabel.position.copy(
        pivotPoint.clone().add(new THREE.Vector3(Math.cos(angleRad / 2) * 0.68, Math.sin(angleRad / 2) * 0.68, 0.3))
    );
    const mat = handles.angleLabel.material as THREE.SpriteMaterial;
    const canvas = mat.map?.image as HTMLCanvasElement;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '600 34px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#2563eb';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${angleDeg.toFixed(0)}°`, canvas.width / 2, canvas.height / 2);
        mat.map!.needsUpdate = true;
    }

    // 发射初速度箭头：从发射口延伸
    handles.launchArrow.position.copy(launchPoint);
    handles.launchArrow.setDirection(dir);
    handles.launchArrow.setLength(0.85, 0.2, 0.1);

    return launchPoint;
}
