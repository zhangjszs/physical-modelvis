import type { FieldSource, Vector3D } from 'physics-core';

/**
 * 3D 场线种子点生成器 (L5) — 纯函数, 不依赖 three.js (可单测)。
 *
 * 场线只由场源几何决定、与粒子无关。每种器材按其特征线度撒一组种子点,
 * 交给 physics-core 的 traceFieldLine 追踪成折线。种子点刻意偏离源的
 * 特征线度 (点电荷球面 / 极板离面偏移 / 导线半径 / 线圈环内外), 避免落在
 * 源奇点 — 那里场无定义 (fields3d 返回零场), 追踪会立即终止。
 */

export type FieldKind = 'electric' | 'magnetic';

/** 一条待追踪场线: 追踪哪种场 + 种子点 + 每线追踪参数 */
export interface FieldLineSeed {
    readonly kind: FieldKind;
    /** 种子点 (物理坐标, m) */
    readonly start: Vector3D;
    /** 是否从种子点向 ±场方向各追一条 (点电荷电场线 / 磁力线闭合环取 true) */
    readonly bidirectional: boolean;
    /** 单向最大弧长 (m) — 导线磁力线取半周长以封成整圈, 避免多圈重叠 */
    readonly maxArcLength: number;
}

/**
 * 各类器材的种子布置参数 — 集中常量 (避免 magic number), 同时作为
 * 单测断言的几何基准 (半径 / 网格 / 偏移)。
 */
export const FIELD_LINE_SEED_CONFIG = {
    /**
     * 点电荷: 球面均布种子。单向弧长须 < 种子半径 — 电场线本应终止于电荷,
     * 但引擎只在 r≈1e-9 判零; 若向内追过电荷中心, 方向反转会让折线在奇点
     * 附近来回震荡堆积。截短后每条线是穿过种子的对称径向线段, 清爽且无奇点。
     */
    pointCharge: { radius: 0.22, count: 12, lineLength: 0.18 },
    /** 极板: 板面网格取样, 两侧各偏移离面距离 (板面上 E=0 无唯一方向) */
    plate: { divisions: 3, halfU: 0.3, halfV: 0.22, sideOffset: 0.03, lineLength: 2.4 },
    /** 导线: 垂直平面内多个半径的圆周种子, 沿轴向多个截面 */
    wire: { radii: [0.08, 0.18], axialOffsets: [-0.35, 0, 0.35] },
    /** 线圈: 近轴面多个轴向位置的环向种子 (捕捉穿过线圈的闭合磁力线) */
    coil: { radialFactor: 0.6, axialFactors: [-0.5, 0, 0.5], azimuthCount: 4, lineLength: 2 }
} as const;

/** 所有场线共用的追踪参数 (有界, 兼顾拖拽帧率与曲线平滑) */
export const FIELD_LINE_TRACE = {
    stepLength: 0.03,
    maxSteps: 120,
    boundRadius: 3
} as const;

function addScaled(base: Vector3D, dir: Vector3D, scale: number): Vector3D {
    return { x: base.x + dir.x * scale, y: base.y + dir.y * scale, z: base.z + dir.z * scale };
}

function scaleVec(v: Vector3D, scale: number): Vector3D {
    return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
}

/** 归一化向量; 零向量或非有限返回 null */
function normalizeVector(v: Vector3D): Vector3D | null {
    const mag = Math.hypot(v.x, v.y, v.z);
    if (mag === 0 || !Number.isFinite(mag)) return null;
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

/** 构造与给定轴正交的单位向量对 (u, v); 零轴返回 null */
function orthonormalBasis(axis: Vector3D): { u: Vector3D; v: Vector3D } | null {
    const a = normalizeVector(axis);
    if (!a) return null;
    const helper: Vector3D = Math.abs(a.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const u = normalizeVector({
        x: a.y * helper.z - a.z * helper.y,
        y: a.z * helper.x - a.x * helper.z,
        z: a.x * helper.y - a.y * helper.x
    });
    if (!u) return null;
    const v: Vector3D = {
        x: a.y * u.z - a.z * u.y,
        y: a.z * u.x - a.x * u.z,
        z: a.x * u.y - a.y * u.x
    };
    return { u, v };
}

/** 球面近似均布方向 (Fibonacci 格点) — 用于点电荷径向场线 */
function fibonacciSphereDirections(count: number): Vector3D[] {
    const dirs: Vector3D[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
        const y = count > 1 ? 1 - (2 * i) / (count - 1) : 0;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * i;
        dirs.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }
    return dirs;
}

/** 点电荷: 以电荷为心、固定半径的球面种子 (双向追踪 → 正电荷外射/负电荷内聚) */
function pointChargeSeeds(center: Vector3D): FieldLineSeed[] {
    const { radius, count, lineLength } = FIELD_LINE_SEED_CONFIG.pointCharge;
    return fibonacciSphereDirections(count).map(dir => ({
        kind: 'electric' as const,
        start: addScaled(center, dir, radius),
        bidirectional: true,
        maxArcLength: lineLength
    }));
}

/** 极板: 板面网格 + 两侧离面偏移; 单向追踪, 避免在板面 (E=0) 反复折返 */
function chargedPlateSeeds(center: Vector3D, normal: Vector3D): FieldLineSeed[] {
    const basis = orthonormalBasis(normal);
    const n = normalizeVector(normal);
    if (!basis || !n) return [];
    const { divisions, halfU, halfV, sideOffset, lineLength } = FIELD_LINE_SEED_CONFIG.plate;
    const seeds: FieldLineSeed[] = [];
    for (const side of [1, -1] as const) {
        for (let i = 0; i < divisions; i++) {
            for (let j = 0; j < divisions; j++) {
                const tu = divisions > 1 ? (i / (divisions - 1) - 0.5) * 2 : 0;
                const tv = divisions > 1 ? (j / (divisions - 1) - 0.5) * 2 : 0;
                const inPlane = addScaled(addScaled(center, basis.u, tu * halfU), basis.v, tv * halfV);
                seeds.push({
                    kind: 'electric',
                    start: addScaled(inPlane, n, side * sideOffset),
                    bidirectional: false,
                    maxArcLength: lineLength
                });
            }
        }
    }
    return seeds;
}

/** 导线: 垂直平面内多个半径的圆周种子 (每向半周长, 双向拼成整圈) */
function straightWireSeeds(point: Vector3D, direction: Vector3D): FieldLineSeed[] {
    const basis = orthonormalBasis(direction);
    const axis = normalizeVector(direction);
    if (!basis || !axis) return [];
    const { radii, axialOffsets } = FIELD_LINE_SEED_CONFIG.wire;
    const seeds: FieldLineSeed[] = [];
    for (const axial of axialOffsets) {
        const origin = addScaled(point, axis, axial);
        for (const radius of radii) {
            seeds.push({
                kind: 'magnetic',
                start: addScaled(origin, basis.u, radius),
                bidirectional: true,
                maxArcLength: Math.PI * radius
            });
        }
    }
    return seeds;
}

/** 线圈: 近轴面多个轴向 × 环向位置的种子 */
function circularCoilSeeds(center: Vector3D, axis: Vector3D, radius: number): FieldLineSeed[] {
    const basis = orthonormalBasis(axis);
    const a = normalizeVector(axis);
    if (!basis || !a || !(radius > 0) || !Number.isFinite(radius)) return [];
    const { radialFactor, axialFactors, azimuthCount, lineLength } = FIELD_LINE_SEED_CONFIG.coil;
    const radial = radialFactor * radius;
    const seeds: FieldLineSeed[] = [];
    for (const axialFactor of axialFactors) {
        const origin = addScaled(center, a, axialFactor * radius);
        for (let k = 0; k < azimuthCount; k++) {
            const theta = (2 * Math.PI * k) / azimuthCount;
            const ringDir = addScaled(scaleVec(basis.u, Math.cos(theta)), basis.v, Math.sin(theta));
            seeds.push({
                kind: 'magnetic',
                start: addScaled(origin, ringDir, radial),
                bidirectional: true,
                maxArcLength: lineLength
            });
        }
    }
    return seeds;
}

/**
 * 按场源集合生成全部场线种子。
 * 电场源只产 electric 种子、磁场源只产 magnetic 种子; 方向退化的源跳过 (校验层负责报错)。
 */
export function fieldLineSeeds(sources: readonly FieldSource[]): FieldLineSeed[] {
    const seeds: FieldLineSeed[] = [];
    for (const s of sources) {
        if (s.kind === 'point-charge') {
            seeds.push(...pointChargeSeeds(s.position));
        } else if (s.kind === 'charged-plate') {
            seeds.push(...chargedPlateSeeds(s.center, s.normal));
        } else if (s.kind === 'straight-wire') {
            seeds.push(...straightWireSeeds(s.point, s.direction));
        } else {
            seeds.push(...circularCoilSeeds(s.center, s.axis, s.radius));
        }
    }
    return seeds;
}
