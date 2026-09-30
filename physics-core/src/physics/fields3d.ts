import type { Vector3D } from '../types/common.js';
import { Vec3 } from '../math/vector3d.js';
import { PHYSICS_CONSTANTS } from '../units/constants.js';

/**
 * 可组合场源层 — "拖拽自由组合电磁实验"的物理地基。
 *
 * 每种器材 (点电荷 / 极板 / 导线 / 线圈) 实现为一个场源描述,
 * 任意布置的场源集合通过 total*Field 在空间任意点解析求和 (叠加原理)。
 * 上层的组合实验只需维护"场景里放了哪些源", 不再为每种布置写专用模型。
 *
 * 单位约定: 全 SI — 电荷 C, 电流 A, 面电荷密度 C/m², 长度 m,
 * E 的单位 N/C, B 的单位 T。
 */

/** 场源自遮蔽半径: 场点距源特征线度小于此值时跳过该源贡献。
 *
 * 点电荷的 1/r² 与导线/线圈的 1/r³ 均在源处奇异; 拖拽场景中场点
 * (粒子初始位置 / 场线种子点) 可能恰好落在源上, 此时贡献无定义。
 * 跳过仅影响源点自身邻域, 对整体场分布无影响。
 */
const FIELD_SOURCE_EPS = 1e-9;

/** 电场源 (对 E 有贡献) */
export type ElectricFieldSource =
    /** 点电荷: 库仑场 E = k·q·r̂/r² */
    | { readonly kind: 'point-charge'; readonly charge: number; readonly position: Vector3D }
    /**
     * 无限大带电平面 (理想化): E = σ/(2ε₀), 两侧对称、垂直于平面。
     * 平行板电容器内部场可用两块等量异号极板叠加得到 (板间加强、板外相消)。
     */
    | {
          readonly kind: 'charged-plate';
          /** 面电荷密度 (C/m²), 正 = 沿 normal 正侧带正电 */
          readonly sigma: number;
          /** 平面上一点 */
          readonly center: Vector3D;
          /** 平面法线方向 (内部归一化, 不必预先单位化) */
          readonly normal: Vector3D;
      };

/** 磁场源 (对 B 有贡献) */
export type MagneticFieldSource =
    /**
     * 无限长直导线: B = μ₀I/(2πρ), 方向沿 d̂ × ρ̂ (右手螺旋)。
     * ρ 为场点到导线的垂直距离。
     */
    | {
          readonly kind: 'straight-wire';
          /** 电流 (A), 正 = 沿 direction 方向 */
          readonly current: number;
          /** 导线上任一点 */
          readonly point: Vector3D;
          /** 导线方向 (内部归一化, 不必预先单位化) */
          readonly direction: Vector3D;
      }
    /**
     * 圆形线圈 (可带匝数): 毕奥-萨伐尔定律对圆环分段精确求和,
     * 轴上与轴外均有效 (轴上解析值 μ₀NIR²/(2(R²+z²)^{3/2}) 用于差分验证)。
     */
    | {
          readonly kind: 'circular-coil';
          /** 单匝电流 (A) */
          readonly current: number;
          /** 匝数 */
          readonly turns: number;
          /** 环半径 (m) */
          readonly radius: number;
          /** 圆心 */
          readonly center: Vector3D;
          /** 线圈轴向 (右手定则: 正电流沿轴正向, 内部归一化) */
          readonly axis: Vector3D;
          /** 圆环分段数 (毕奥-萨伐尔求和精度), 默认 96 */
          readonly segments?: number;
      };

/** 任意场源 */
export type FieldSource = ElectricFieldSource | MagneticFieldSource;

/** 点电荷库仑场 (N/C)。场点与源重合时返回零场 (见 FIELD_SOURCE_EPS)。 */
export function pointChargeElectricField(charge: number, sourcePosition: Vector3D, at: Vector3D): Vector3D {
    const r = Vec3.sub(at, sourcePosition);
    const r2 = Vec3.magnitudeSq(r);
    if (r2 < FIELD_SOURCE_EPS * FIELD_SOURCE_EPS) return Vec3.zero();
    // E = k·q·r⃗/r³ = (k·q/r²)·r̂
    return Vec3.scale(r, (PHYSICS_CONSTANTS.k.value * charge) / (r2 * Math.sqrt(r2)));
}

/** 无限大带电平面场 (N/C)。场点恰在平面上时约定返回零场 (两侧极限跳变, 无唯一值)。 */
export function chargedPlateElectricField(sigma: number, center: Vector3D, normal: Vector3D, at: Vector3D): Vector3D {
    const n = Vec3.normalize(normal);
    const side = Vec3.dot(Vec3.sub(at, center), n);
    // E = σ/(2ε₀) · sign(s) · n̂
    return Vec3.scale(n, (sigma / (2 * PHYSICS_CONSTANTS.epsilon0.value)) * Math.sign(side));
}

/** 无限长直导线磁场 (T)。场点到导线垂距趋于 0 时返回零场 (见 FIELD_SOURCE_EPS)。 */
export function straightWireMagneticField(
    current: number,
    wirePoint: Vector3D,
    wireDirection: Vector3D,
    at: Vector3D
): Vector3D {
    const d = Vec3.normalize(wireDirection);
    const rho = Vec3.sub(at, wirePoint);
    // 去掉轴向分量, 得垂直距离矢量 ρ⃗
    const rhoPerp = Vec3.sub(rho, Vec3.scale(d, Vec3.dot(rho, d)));
    const rho2 = Vec3.magnitudeSq(rhoPerp);
    if (rho2 < FIELD_SOURCE_EPS * FIELD_SOURCE_EPS) return Vec3.zero();
    // B = μ₀I/(2πρ²) · (d̂ × ρ⃗⊥)
    return Vec3.scale(Vec3.cross(d, rhoPerp), (PHYSICS_CONSTANTS.mu0.value * current) / (2 * Math.PI * rho2));
}

/** 圆形线圈磁场 (T, 毕奥-萨伐尔分段求和)。场点恰在导线环上时跳过该段贡献。 */
export function circularCoilMagneticField(
    current: number,
    turns: number,
    radius: number,
    center: Vector3D,
    axis: Vector3D,
    at: Vector3D,
    segments = 96
): Vector3D {
    const a = Vec3.normalize(axis);
    // 构造与轴正交的单位基 u, v: 选一个与 a 不平行的辅助向量
    const helper: Vector3D = Math.abs(a.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const u = Vec3.normalize(Vec3.cross(a, helper));
    const v = Vec3.cross(a, u);

    let bx = 0;
    let by = 0;
    let bz = 0;
    const prefactor = (PHYSICS_CONSTANTS.mu0.value * current * turns) / (4 * Math.PI);
    for (let k = 0; k < segments; k++) {
        const th1 = (2 * Math.PI * k) / segments;
        const th2 = (2 * Math.PI * (k + 1)) / segments;
        const p1 = Vec3.add(
            center,
            Vec3.add(Vec3.scale(u, radius * Math.cos(th1)), Vec3.scale(v, radius * Math.sin(th1)))
        );
        const p2 = Vec3.add(
            center,
            Vec3.add(Vec3.scale(u, radius * Math.cos(th2)), Vec3.scale(v, radius * Math.sin(th2)))
        );
        const dl = Vec3.sub(p2, p1);
        const r = Vec3.sub(at, p1);
        const r2 = Vec3.magnitudeSq(r);
        if (r2 < FIELD_SOURCE_EPS * FIELD_SOURCE_EPS) continue;
        // dB = μ₀I·N/(4π) · dl⃗ × r⃗ / r³
        const contrib = Vec3.scale(Vec3.cross(dl, r), prefactor / (r2 * Math.sqrt(r2)));
        bx += contrib.x;
        by += contrib.y;
        bz += contrib.z;
    }
    return { x: bx, y: by, z: bz };
}

/** 叠加全部场源的合电场 (N/C)。磁场源自动忽略。 */
export function totalElectricField(sources: readonly FieldSource[], at: Vector3D): Vector3D {
    let ex = 0;
    let ey = 0;
    let ez = 0;
    for (const s of sources) {
        if (s.kind === 'point-charge') {
            const e = pointChargeElectricField(s.charge, s.position, at);
            ex += e.x;
            ey += e.y;
            ez += e.z;
        } else if (s.kind === 'charged-plate') {
            const e = chargedPlateElectricField(s.sigma, s.center, s.normal, at);
            ex += e.x;
            ey += e.y;
            ez += e.z;
        }
    }
    return { x: ex, y: ey, z: ez };
}

/** 叠加全部场源的合磁场 (T)。电场源自动忽略。 */
export function totalMagneticField(sources: readonly FieldSource[], at: Vector3D): Vector3D {
    let bx = 0;
    let by = 0;
    let bz = 0;
    for (const s of sources) {
        if (s.kind === 'straight-wire') {
            const b = straightWireMagneticField(s.current, s.point, s.direction, at);
            bx += b.x;
            by += b.y;
            bz += b.z;
        } else if (s.kind === 'circular-coil') {
            const b = circularCoilMagneticField(s.current, s.turns, s.radius, s.center, s.axis, at, s.segments);
            bx += b.x;
            by += b.y;
            bz += b.z;
        }
    }
    return { x: bx, y: by, z: bz };
}
