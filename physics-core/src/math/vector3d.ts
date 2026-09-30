import type { Vector3D } from '../types/common.js';

/**
 * 三维向量不可变运算工具 — API 与 Vec2 对齐。
 *
 * 供 3D 场源层 (fields3d) 与 3D 数值积分器 (boris3d) 消费；
 * 与 three.js 的 Vector3 分属两层：本层是零依赖物理坐标，可视化层自行换算。
 */
export const Vec3 = {
    /** 创建向量 */
    create(x: number, y: number, z: number): Vector3D {
        return { x, y, z };
    },

    /** 零向量 */
    zero(): Vector3D {
        return { x: 0, y: 0, z: 0 };
    },

    /** 向量加法 */
    add(a: Vector3D, b: Vector3D): Vector3D {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    },

    /** 向量减法 */
    sub(a: Vector3D, b: Vector3D): Vector3D {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },

    /** 标量乘法 */
    scale(v: Vector3D, s: number): Vector3D {
        return { x: v.x * s, y: v.y * s, z: v.z * s };
    },

    /** 点积 */
    dot(a: Vector3D, b: Vector3D): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    },

    /** 叉积 (a × b, 右手系) */
    cross(a: Vector3D, b: Vector3D): Vector3D {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    },

    /** 模长平方 (比 magnitude 少一次开方, 内积/距离比较优先用) */
    magnitudeSq(v: Vector3D): number {
        return v.x * v.x + v.y * v.y + v.z * v.z;
    },

    /** 向量模长 */
    magnitude(v: Vector3D): number {
        return Math.sqrt(Vec3.magnitudeSq(v));
    },

    /**
     * 单位向量 (零向量无单位方向, 抛错)
     *
     * 与 Vec2.normalize 同一约定: 静默返回零向量会把"退化几何"
     * (如粒子恰在导线/线圈轴上) 伪装成"指向某处", 污染下游场方向。
     * 故显式抛错, 由调用方决定降级策略。
     */
    normalize(v: Vector3D): Vector3D {
        const mag = Vec3.magnitude(v);
        if (mag === 0) throw new Error('Cannot normalize a zero vector');
        return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
    },

    /** 两点距离 */
    distance(a: Vector3D, b: Vector3D): number {
        return Vec3.magnitude(Vec3.sub(a, b));
    },

    /** 向量取反 */
    negate(v: Vector3D): Vector3D {
        return { x: -v.x, y: -v.y, z: -v.z };
    }
};
