import type { Vector3D } from 'physics-core';

/**
 * 组合实验台器材朝向 / 旋转工具函数。
 *
 * 物理坐标系（右手系）：
 * - +x: 水平向右
 * - +y: 水平前向（器材默认朝向）
 * - +z: 竖直向上（高度轴）
 *
 * 预设轴与旋转约定：
 * - 'z': 绕竖直 Z 轴旋转（水平面内偏转，XY 平面）
 *   - 0° = +y（默认前向）
 *   - 90° = +x（水平向右）
 *   - 180° = -y（水平后向）
 *   - -90° = -x（水平向左）
 * - 'x': 绕水平 X 轴旋转（竖直俯仰，YZ 平面）
 *   - 0° = +y（默认前向）
 *   - 90° = +z（竖直向上）
 *   - 180° = -y（水平后向）
 *   - -90° = -z（竖直向下）
 * - 'y': 绕水平 Y 轴旋转（侧立面倾斜，ZX 平面）
 *   - 0° = +z（竖直向上）
 *   - 90° = +x（水平向右）
 *   - 180° = -z（竖直向下）
 *   - -90° = -x（水平向左）
 */

export type RotationAxis = 'z' | 'x' | 'y';

export interface AxisAngle {
    readonly axis: RotationAxis;
    readonly angle: number;
}

export interface PresetDirection {
    readonly id: string;
    readonly label: string;
    readonly axis: RotationAxis;
    readonly angle: number;
    readonly vector: Vector3D;
}

export const PRESET_DIRECTIONS: readonly PresetDirection[] = [
    { id: '+y', label: '+Y (默认前)', axis: 'z', angle: 0, vector: { x: 0, y: 1, z: 0 } },
    { id: '+x', label: '+X (水平右)', axis: 'z', angle: 90, vector: { x: 1, y: 0, z: 0 } },
    { id: '+z', label: '+Z (竖直上)', axis: 'x', angle: 90, vector: { x: 0, y: 0, z: 1 } },
    { id: '-y', label: '-Y (水平后)', axis: 'z', angle: 180, vector: { x: 0, y: -1, z: 0 } },
    { id: '-x', label: '-X (水平左)', axis: 'z', angle: -90, vector: { x: -1, y: 0, z: 0 } },
    { id: '-z', label: '-Z (竖直下)', axis: 'x', angle: -90, vector: { x: 0, y: 0, z: -1 } }
];

export const ROTATION_AXIS_OPTIONS: readonly { readonly value: RotationAxis; readonly label: string }[] = [
    { value: 'z', label: '绕 Z 轴 (水平面旋转 · 偏转角)' },
    { value: 'x', label: '绕 X 轴 (正立面旋转 · 俯仰角)' },
    { value: 'y', label: '绕 Y 轴 (侧立面旋转 · 倾斜角)' }
];

function cleanNumber(n: number): number {
    const fixed = Number(n.toFixed(6));
    return Object.is(fixed, -0) ? 0 : fixed;
}

/** 角度 + 轴向 → 归一化单位向量 */
export function axisAngleToVector(axis: RotationAxis, angleDeg: number): Vector3D {
    const rad = (angleDeg * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);

    switch (axis) {
        case 'z':
            return { x: cleanNumber(sin), y: cleanNumber(cos), z: 0 };
        case 'x':
            return { x: 0, y: cleanNumber(cos), z: cleanNumber(sin) };
        case 'y':
            return { x: cleanNumber(sin), y: 0, z: cleanNumber(cos) };
    }
}

/** 向量 → 最近匹配的预设轴与绕轴角度 */
export function vectorToAxisAngle(v: Vector3D): AxisAngle {
    const mag = Math.hypot(v.x, v.y, v.z);
    if (!Number.isFinite(mag) || mag < 1e-9) {
        return { axis: 'z', angle: 0 };
    }
    const x = v.x / mag;
    const y = v.y / mag;
    const z = v.z / mag;

    // 若在 XY 平面（z 近零）
    if (Math.abs(z) < 1e-4) {
        const angle = Math.round((Math.atan2(x, y) * 180) / Math.PI);
        return { axis: 'z', angle: angle === -180 ? 180 : angle };
    }
    // 若在 YZ 平面（x 近零）
    if (Math.abs(x) < 1e-4) {
        const angle = Math.round((Math.atan2(z, y) * 180) / Math.PI);
        return { axis: 'x', angle: angle === -180 ? 180 : angle };
    }
    // 若在 ZX 平面（y 近零）
    if (Math.abs(y) < 1e-4) {
        const angle = Math.round((Math.atan2(x, z) * 180) / Math.PI);
        return { axis: 'y', angle: angle === -180 ? 180 : angle };
    }

    // 任意空间向量：按投影最大的平面判定
    const xy = Math.hypot(x, y);
    const yz = Math.hypot(y, z);
    const zx = Math.hypot(z, x);

    if (xy >= yz && xy >= zx) {
        const angle = Math.round((Math.atan2(x, y) * 180) / Math.PI);
        return { axis: 'z', angle };
    }
    if (yz >= zx) {
        const angle = Math.round((Math.atan2(z, y) * 180) / Math.PI);
        return { axis: 'x', angle };
    }
    const angle = Math.round((Math.atan2(x, z) * 180) / Math.PI);
    return { axis: 'y', angle };
}

/** 格式化向量为简短字符串，如 "(0.00, 1.00, 0.00)" */
export function formatVector(v: Vector3D): string {
    const mag = Math.hypot(v.x, v.y, v.z);
    if (mag === 0) return '(0.00, 0.00, 0.00)';
    const x = (v.x / mag).toFixed(2);
    const y = (v.y / mag).toFixed(2);
    const z = (v.z / mag).toFixed(2);
    return `(${x}, ${y}, ${z})`;
}
