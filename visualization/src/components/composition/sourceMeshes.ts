import * as THREE from 'three';
import { makeBox, makeCylinder, makeSphere } from '../simulation3d/primitives';
import { physicsToWorld, type WorldPoint } from '../../utils/compositionCoords';
import type { PlacedSource } from '../../store/compositionStore';

/** 圆环网格 (线圈) — TorusGeometry 默认在 XY 平面、轴沿世界 z */
function makeTorus(radius: number, tube: number, color: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 16, 48),
        new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.3 })
    );
    mesh.castShadow = true;
    return mesh;
}

/**
 * 组合实验台器材网格 — 把 fields3d 的场源描述渲染成可拾取的 three.js 物体。
 *
 * 每个 Group.userData.sourceId 记录所属器材 id, 舞台用 raycast 命中后
 * 沿 parent 链上溯读取。方向类字段 (法线/导线方向/线圈轴) 由四元数对齐:
 * - 极板: 盒体 depth 轴 (世界 z) 对齐法线
 * - 导线: 圆柱轴 (世界 y) 对齐方向
 * - 线圈: 圆环轴 (世界 z) 对齐轴向
 */

const COLOR_POSITIVE = 0xef4444;
const COLOR_NEGATIVE = 0x3b82f6;
const COLOR_PLATE = 0x10b981;
const COLOR_WIRE = 0xf59e0b;
const COLOR_COIL = 0x8b5cf6;

/** 单位向量 → 世界坐标 (自动归一化; 零向量抛错, 由调用方兜底) */
function toWorldDirection(v: { x: number; y: number; z: number }): WorldPoint {
    const mag = Math.hypot(v.x, v.y, v.z);
    if (mag === 0) throw new Error('direction vector is zero');
    const w = physicsToWorld({ x: v.x / mag, y: v.y / mag, z: v.z / mag });
    return w;
}

function setAxisAlignment(group: THREE.Group, fromAxis: THREE.Vector3, toDir: WorldPoint): void {
    const target = new THREE.Vector3(toDir.x, toDir.y, toDir.z).normalize();
    group.quaternion.setFromUnitVectors(fromAxis, target);
}

function setHighlight(group: THREE.Group, on: boolean): void {
    group.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!('material' in mesh) || !mesh.material) return;
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (!('emissive' in material)) return;
        material.emissive.setHex(on ? 0xffffff : 0x000000);
        material.emissiveIntensity = on ? 0.35 : 0;
    });
}

/** 构建器材网格 (含子几何), userData.sourceId 用于拾取定位 */
export function makeSourceMesh(placed: PlacedSource): THREE.Group {
    const group = new THREE.Group();
    group.userData.sourceId = placed.id;
    const s = placed.source;

    if (s.kind === 'point-charge') {
        const color = s.charge >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
        group.add(makeSphere(0.1, color, { emissive: 0x000000 }));
    } else if (s.kind === 'charged-plate') {
        group.add(makeBox(1.0, 0.7, 0.02, COLOR_PLATE));
    } else if (s.kind === 'straight-wire') {
        group.add(makeCylinder(0.025, 1.6, COLOR_WIRE));
    } else {
        group.add(makeTorus(Math.max(0.05, s.radius), 0.018, COLOR_COIL));
    }

    applyTransform(group, placed);
    return group;
}

/** 参数/位置/选中态变化时原位更新网格 (不重建, 避免拖拽中闪断) */
export function updateSourceMesh(group: THREE.Group, placed: PlacedSource, selected: boolean): void {
    const s = placed.source;

    // 点电荷电号变化 → 颜色随符号切换
    if (s.kind === 'point-charge') {
        const mesh = group.children[0] as THREE.Mesh | undefined;
        if (mesh) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.color.setHex(s.charge >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE);
        }
    }
    // 线圈半径变化 → 重建几何 (低频操作, 仅参数面板触发)
    if (s.kind === 'circular-coil') {
        const mesh = group.children[0] as THREE.Mesh | undefined;
        if (mesh && (mesh.geometry as THREE.TorusGeometry).parameters?.radius !== Math.max(0.05, s.radius)) {
            const replacement = makeTorus(Math.max(0.05, s.radius), 0.018, COLOR_COIL);
            mesh.geometry.dispose();
            mesh.geometry = replacement.geometry;
        }
    }

    applyTransform(group, placed);
    setHighlight(group, selected);
}

function applyTransform(group: THREE.Group, placed: PlacedSource): void {
    const s = placed.source;
    try {
        if (s.kind === 'charged-plate') {
            const w = physicsToWorld(s.center);
            group.position.set(w.x, w.y, w.z);
            setAxisAlignment(group, new THREE.Vector3(0, 0, 1), toWorldDirection(s.normal));
        } else if (s.kind === 'straight-wire') {
            const w = physicsToWorld(s.point);
            group.position.set(w.x, w.y, w.z);
            setAxisAlignment(group, new THREE.Vector3(0, 1, 0), toWorldDirection(s.direction));
        } else if (s.kind === 'circular-coil') {
            const w = physicsToWorld(s.center);
            group.position.set(w.x, w.y, w.z);
            setAxisAlignment(group, new THREE.Vector3(0, 0, 1), toWorldDirection(s.axis));
        } else {
            const w = physicsToWorld(s.position);
            group.position.set(w.x, w.y, w.z);
        }
    } catch {
        // 零方向向量: 保留当前姿态 (校验层会红牌提示)
    }
}
