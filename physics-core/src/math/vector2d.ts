import type { Vector2D } from '../types/common.js';

/** 二维向量不可变运算工具 */
export const Vec2 = {
    /** 创建向量 */
    create(x: number, y: number): Vector2D {
        return { x, y };
    },

    /** 零向量 */
    zero(): Vector2D {
        return { x: 0, y: 0 };
    },

    /** 向量加法 */
    add(a: Vector2D, b: Vector2D): Vector2D {
        return { x: a.x + b.x, y: a.y + b.y };
    },

    /** 向量减法 */
    sub(a: Vector2D, b: Vector2D): Vector2D {
        return { x: a.x - b.x, y: a.y - b.y };
    },

    /** 标量乘法 */
    scale(v: Vector2D, s: number): Vector2D {
        return { x: v.x * s, y: v.y * s };
    },

    /** 点积 */
    dot(a: Vector2D, b: Vector2D): number {
        return a.x * b.x + a.y * b.y;
    },

    /** 向量模长 */
    magnitude(v: Vector2D): number {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    },

    /** 单位向量 (零向量返回零向量) */
    normalize(v: Vector2D): Vector2D {
        const mag = Vec2.magnitude(v);
        if (mag === 0) throw new Error('Cannot normalize a zero vector');
        return { x: v.x / mag, y: v.y / mag };
    },

    /** 两点距离 */
    distance(a: Vector2D, b: Vector2D): number {
        return Vec2.magnitude(Vec2.sub(a, b));
    },

    /** 向量取反 */
    negate(v: Vector2D): Vector2D {
        return { x: -v.x, y: -v.y };
    },

    /** 向量旋转 (弧度) */
    rotate(v: Vector2D, angle: number): Vector2D {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: v.x * cos - v.y * sin,
            y: v.x * sin + v.y * cos
        };
    }
};
