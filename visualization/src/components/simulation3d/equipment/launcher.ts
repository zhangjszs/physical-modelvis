/**
 * 发射器 — 抛体运动专用
 * 底座 + 升降柱 + 发射筒 + 角度弧 + 发射箭头
 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite, makeLine, makeArrow } from '../primitives';

export const BARREL_LENGTH = 1.45;
export const VISUAL_MUZZLE_HEIGHT = 0.36;

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

    const bench = makeBox(2.4, 0.16, 1.14, 0x475569);
    bench.position.set(-0.9, 0.08, 0);
    group.add(bench);

    const rearFoot = makeBox(0.52, 0.14, 0.88, 0x334155);
    rearFoot.position.set(-1.58, 0.23, 0);
    group.add(rearFoot);

    const liftRail = makeBox(0.12, 2.0, 0.12, 0x94a3b8, 0.36);
    liftRail.position.set(-1.2, 1.0, -0.42);
    group.add(liftRail);

    const liftColumn = makeBox(0.14, 0.9, 0.14, 0x64748b, 0.42);
    liftColumn.position.set(-0.94, 0.48, 0);
    group.add(liftColumn);

    const clamp = makeBox(0.42, 0.24, 0.34, 0x1f2937, 0.36);
    group.add(clamp);

    const pivot = makeCylinder(0.18, 0.24, 0x111827, 0.45, 0.3);
    pivot.rotation.x = Math.PI / 2;
    group.add(pivot);

    const barrel = makeCylinder(0.15, BARREL_LENGTH, 0x2563eb, 0.35);
    group.add(barrel);

    const muzzle = makeCylinder(0.19, 0.05, 0x0f172a, 0.25);
    group.add(muzzle);

    const angleArc = makeLine([], 0x2563eb, 0.74);
    group.add(angleArc);

    const angleLabel = makeTextSprite('45°', '#2563eb', 34, { x: 0.6, y: 0.22 });
    group.add(angleLabel);

    const launchArrow = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x16a34a, 0.24, 0.13);
    group.add(launchArrow);

    return {
        group,
        handles: { group, barrel, muzzle, pivot, liftColumn, liftRail, bench, clamp, angleArc, angleLabel, launchArrow }
    };
}

/** 计算发射口 3D 坐标 */
export function getVisualLaunchPoint(angleDeg: number, h0: number, worldScale: number): THREE.Vector3 {
    const angleRad = (angleDeg * Math.PI) / 180;
    const pivot = new THREE.Vector3(-0.75, VISUAL_MUZZLE_HEIGHT + h0 * worldScale, 0);
    return pivot.add(
        new THREE.Vector3(Math.cos(angleRad), Math.sin(angleRad), 0).normalize().multiplyScalar(BARREL_LENGTH)
    );
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
    const pivotPoint = new THREE.Vector3(-0.75, VISUAL_MUZZLE_HEIGHT + h0 * worldScale, 0);
    const launchPoint = getVisualLaunchPoint(angleDeg, h0, worldScale);
    const barrelCenter = pivotPoint.clone().addScaledVector(dir, BARREL_LENGTH / 2);
    const columnHeight = Math.max(0.58, pivotPoint.y - 0.16);

    handles.pivot.position.copy(pivotPoint);
    handles.clamp.position.set(pivotPoint.x - 0.13, pivotPoint.y, 0);
    handles.barrel.position.copy(barrelCenter);
    handles.barrel.rotation.set(0, 0, Math.PI / 2 - angleRad);
    handles.muzzle.position.copy(launchPoint.clone().addScaledVector(dir, 0.025));
    handles.muzzle.rotation.set(0, 0, Math.PI / 2 - angleRad);
    handles.liftColumn.position.set(pivotPoint.x - 0.2, columnHeight / 2 + 0.16, 0);
    handles.liftColumn.scale.y = columnHeight / 0.9;
    handles.liftRail.position.set(pivotPoint.x - 0.45, Math.max(1.0, pivotPoint.y / 2), -0.42);
    handles.liftRail.scale.y = Math.max(1, pivotPoint.y / 2);

    // 角度弧
    const radius = 0.72;
    const arcPoints = Array.from({ length: 32 }, (_, i) => {
        const a = (i / 31) * angleRad;
        return pivotPoint.clone().add(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0.43));
    });
    handles.angleArc.geometry.dispose();
    handles.angleArc.geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);

    // 角度标签
    handles.angleLabel.position.copy(
        pivotPoint.clone().add(new THREE.Vector3(Math.cos(angleRad / 2) * 0.92, Math.sin(angleRad / 2) * 0.92, 0.48))
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

    // 发射箭头
    handles.launchArrow.position.copy(launchPoint);
    handles.launchArrow.setDirection(dir);
    handles.launchArrow.setLength(1.05, 0.24, 0.13);

    return launchPoint;
}
