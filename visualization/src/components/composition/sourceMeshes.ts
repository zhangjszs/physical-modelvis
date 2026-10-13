import * as THREE from 'three';
import { makeArrow, makeBox, makeCylinder, makeSphere } from '../simulation3d/primitives';
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
 * 匀强磁场区盒体 — 半透明区域盒 (物理轴对齐: 世界宽/高/深 = 物理 x/z/y)。
 * 退化尺寸钳制到 0.05 (校验层负责红牌, 网格层不崩)。
 */
function makeZoneBox(sx: number, sy: number, sz: number): THREE.Mesh {
    const mesh = makeBox(Math.max(0.05, sx), Math.max(0.05, sz), Math.max(0.05, sy), COLOR_ZONE);
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.transparent = true;
    mat.opacity = ZONE_OPACITY;
    mat.depthWrite = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
}

/** 场方向箭头摆位 (世界坐标): 沿 field 世界方向居中, 长度取场向盒内弦 70% */
function zoneArrowProps(
    field: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number }
): { dir: THREE.Vector3; origin: THREE.Vector3; length: number; headLength: number; headWidth: number } {
    const w = toWorldDirection(field); // 零向量抛错, 由调用方兜底
    const mag = Math.hypot(field.x, field.y, field.z);
    const chord = (Math.abs(field.x) * size.x + Math.abs(field.y) * size.y + Math.abs(field.z) * size.z) / mag;
    const length = Math.max(0.05, chord * 0.7);
    const dir = new THREE.Vector3(w.x, w.y, w.z);
    const origin = dir.clone().multiplyScalar(-length / 2);
    return { dir, origin, length, headLength: length * 0.25, headWidth: length * 0.12 };
}

function makeZoneArrow(
    field: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number }
): THREE.ArrowHelper {
    const p = zoneArrowProps(field, size);
    return makeArrow(p.dir, p.origin, p.length, COLOR_ZONE_ARROW, p.headLength, p.headWidth);
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
const COLOR_ZONE = 0x06b6d4;
const COLOR_ZONE_ARROW = 0x0e7490;
/** 区域盒不透明度: 看穿内部场线与粒子轨迹, 同时保持盒边界可辨 */
const ZONE_OPACITY = 0.18;

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
    } else if (s.kind === 'circular-coil') {
        group.add(makeTorus(Math.max(0.05, s.radius), 0.018, COLOR_COIL));
    } else if (s.kind === 'bar-magnet') {
        const len = Math.max(0.08, s.length ?? 0.2);
        const halfLen = len / 2;
        const width = 0.05;
        const depth = 0.04;
        const nMesh = makeBox(width, halfLen, depth, COLOR_POSITIVE);
        nMesh.position.set(0, halfLen / 2, 0);
        const sMesh = makeBox(width, halfLen, depth, COLOR_NEGATIVE);
        sMesh.position.set(0, -halfLen / 2, 0);
        group.add(nMesh);
        group.add(sMesh);
    } else if (s.kind === 'uniform-field-zone') {
        group.add(makeZoneBox(s.size.x, s.size.y, s.size.z));
        try {
            group.add(makeZoneArrow(s.field, s.size));
        } catch {
            // 零场强: 箭头无方向, 只留区域盒 (校验层会红牌提示)
        }
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
    // 条形磁铁长度变化 → 重建两半几何
    if (s.kind === 'bar-magnet') {
        const len = Math.max(0.08, s.length ?? 0.2);
        const halfLen = len / 2;
        const nMesh = group.children[0] as THREE.Mesh | undefined;
        const sMesh = group.children[1] as THREE.Mesh | undefined;
        if (nMesh && (nMesh.geometry as THREE.BoxGeometry).parameters?.height !== halfLen) {
            const width = 0.05;
            const depth = 0.04;
            const newN = makeBox(width, halfLen, depth, COLOR_POSITIVE);
            nMesh.geometry.dispose();
            nMesh.geometry = newN.geometry;
            nMesh.position.set(0, halfLen / 2, 0);

            if (sMesh) {
                const newS = makeBox(width, halfLen, depth, COLOR_NEGATIVE);
                sMesh.geometry.dispose();
                sMesh.geometry = newS.geometry;
                sMesh.position.set(0, -halfLen / 2, 0);
            }
        }
    }

    // 匀强磁场区尺寸变化 → 重建盒体几何 + 箭头摆位 (低频操作, 仅参数面板触发)
    if (s.kind === 'uniform-field-zone') {
        const box = group.children[0] as THREE.Mesh | undefined;
        const wantW = Math.max(0.05, s.size.x);
        const wantH = Math.max(0.05, s.size.z);
        const wantD = Math.max(0.05, s.size.y);
        const params = box ? (box.geometry as THREE.BoxGeometry).parameters : undefined;
        if (box && params && (params.width !== wantW || params.height !== wantH || params.depth !== wantD)) {
            box.geometry.dispose();
            box.geometry = new THREE.BoxGeometry(wantW, wantH, wantD);
        }
        const arrow = group.children[1] as THREE.ArrowHelper | undefined;
        if (arrow) {
            try {
                const p = zoneArrowProps(s.field, s.size);
                arrow.setDirection(p.dir);
                arrow.setLength(p.length, p.headLength, p.headWidth);
                arrow.position.copy(p.origin);
            } catch {
                // 零场强: 保留旧箭头姿态 (校验层会红牌提示)
            }
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
        } else if (s.kind === 'bar-magnet') {
            const w = physicsToWorld(s.center);
            group.position.set(w.x, w.y, w.z);
            setAxisAlignment(group, new THREE.Vector3(0, 1, 0), toWorldDirection(s.direction));
        } else if (s.kind === 'uniform-field-zone') {
            // 轴对齐盒: 只平移不旋转 (旋转随 #100 解锁); 箭头自带世界方向
            const w = physicsToWorld(s.center);
            group.position.set(w.x, w.y, w.z);
        } else {
            const w = physicsToWorld(s.position);
            group.position.set(w.x, w.y, w.z);
        }
    } catch {
        // 零方向向量: 保留当前姿态 (校验层会红牌提示)
    }
}
