/** 可调斜面：面板、支架和物理坐标映射共享同一几何定义。 */
import * as THREE from 'three';
import { makeBox, makeCylinder, makeTextSprite, makeLine, updateTextSprite } from '../primitives';

export const INCLINED_PLANE_THICKNESS = 0.08;
const MIN_LENGTH = 3.2;
const END_MARGIN = 0.3;
const GROUND_CLEARANCE = 0.06;

export interface InclinedPlaneGeometry {
    angleRad: number;
    length: number;
    centerY: number;
    origin: THREE.Vector3;
}

/** min/max 是真实采样投影到向下切线后的世界长度，允许负位移。 */
export function inclinedPlaneGeometry(angleDeg: number, minAlong = 0, maxAlong = 0): InclinedPlaneGeometry {
    const angleRad = (angleDeg * Math.PI) / 180;
    const length = Math.max(MIN_LENGTH, maxAlong - minAlong + 2 * END_MARGIN);
    const middle = (minAlong + maxAlong) / 2;
    const centerY =
        (length / 2) * Math.sin(angleRad) + (INCLINED_PLANE_THICKNESS / 2) * Math.cos(angleRad) + GROUND_CLEARANCE;
    return {
        angleRad,
        length,
        centerY,
        origin: new THREE.Vector3(-middle * Math.cos(angleRad), centerY + middle * Math.sin(angleRad), 0)
    };
}

export interface InclinedPlaneHandles {
    panel: THREE.Mesh;
    support: THREE.Mesh;
    angleArc: THREE.Line;
    angleLabel: THREE.Sprite;
    group: THREE.Group;
}

/** build 与 update 使用同一布局；板端无引擎未定义的碰撞挡板。 */
export function createInclinedPlane(geometry: InclinedPlaneGeometry): {
    group: THREE.Group;
    handles: InclinedPlaneHandles;
} {
    const group = new THREE.Group();
    const panel = makeBox(1, INCLINED_PLANE_THICKNESS, 1, 0x78716c, 0.6, 0.05);
    const support = makeCylinder(0.04, 1, 0x64748b, 0.3, 0.4);
    const angleArc = makeLine([], 0x2563eb, 0.7);
    const angleLabel = makeTextSprite('', '#2563eb', 28, { x: 0.6, y: 0.22 });
    group.add(panel, support, angleArc, angleLabel);
    const handles = { panel, support, angleArc, angleLabel, group };
    updateInclinedPlane(handles, geometry);
    return { group, handles };
}

/** 统一更新板长、板角、支架及低端角度标记。 */
export function updateInclinedPlane(handles: InclinedPlaneHandles, geometry: InclinedPlaneGeometry): void {
    const { angleRad, length, centerY } = geometry;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    handles.panel.scale.x = length;
    handles.panel.rotation.z = -angleRad;
    handles.panel.position.set(0, centerY, 0);

    const supportX = -length * 0.3 * cos;
    const supportHeight = centerY + length * 0.3 * sin - INCLINED_PLANE_THICKNESS / (2 * cos);
    handles.support.scale.y = supportHeight;
    handles.support.position.set(supportX, supportHeight / 2, 0);

    const lowX = length * 0.5 * cos;
    const lowY = centerY - length * 0.5 * sin;
    const arcPoints = Array.from({ length: 24 }, (_, i) => {
        const a = (i / 23) * angleRad;
        return new THREE.Vector3(lowX - Math.cos(a) * 0.7, lowY + Math.sin(a) * 0.7, 0.55);
    });
    handles.angleArc.geometry.dispose();
    handles.angleArc.geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    handles.angleLabel.position.set(lowX - Math.cos(angleRad / 2) * 0.95, lowY + Math.sin(angleRad / 2) * 0.95, 0.55);
    updateTextSprite(handles.angleLabel, `${((angleRad * 180) / Math.PI).toFixed(0)}°`, '#2563eb', 28);
}
