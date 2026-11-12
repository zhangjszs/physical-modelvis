import { describe, it, expect } from 'vitest';
import {
    axisAngleToVector,
    vectorToAxisAngle,
    formatVector,
    PRESET_DIRECTIONS,
    type RotationAxis
} from '../../src/utils/directionUtils';

describe('directionUtils 朝向与旋转工具函数', () => {
    describe('axisAngleToVector 角度与轴向转换', () => {
        it('Z 轴 (水平面旋转): 0° 为 +Y, 90° 为 +X, 180° 为 -Y, -90° 为 -X', () => {
            const v0 = axisAngleToVector('z', 0);
            expect(v0).toEqual({ x: 0, y: 1, z: 0 });

            const v90 = axisAngleToVector('z', 90);
            expect(v90).toEqual({ x: 1, y: 0, z: 0 });

            const v180 = axisAngleToVector('z', 180);
            expect(v180).toEqual({ x: 0, y: -1, z: 0 });

            const vNeg90 = axisAngleToVector('z', -90);
            expect(vNeg90).toEqual({ x: -1, y: 0, z: 0 });

            const v45 = axisAngleToVector('z', 45);
            expect(v45.x).toBeCloseTo(Math.SQRT1_2, 5);
            expect(v45.y).toBeCloseTo(Math.SQRT1_2, 5);
            expect(v45.z).toBe(0);
        });

        it('X 轴 (正立面俯仰): 0° 为 +Y, 90° 为 +Z (竖直上), -90° 为 -Z (竖直下)', () => {
            const v0 = axisAngleToVector('x', 0);
            expect(v0).toEqual({ x: 0, y: 1, z: 0 });

            const v90 = axisAngleToVector('x', 90);
            expect(v90).toEqual({ x: 0, y: 0, z: 1 });

            const v180 = axisAngleToVector('x', 180);
            expect(v180).toEqual({ x: 0, y: -1, z: 0 });

            const vNeg90 = axisAngleToVector('x', -90);
            expect(vNeg90).toEqual({ x: 0, y: 0, z: -1 });

            const v30 = axisAngleToVector('x', 30);
            expect(v30.x).toBe(0);
            expect(v30.y).toBeCloseTo(Math.cos((30 * Math.PI) / 180), 5);
            expect(v30.z).toBeCloseTo(Math.sin((30 * Math.PI) / 180), 5);
        });

        it('Y 轴 (侧立面旋转): 0° 为 +Z, 90° 为 +X, 180° 为 -Z, -90° 为 -X', () => {
            const v0 = axisAngleToVector('y', 0);
            expect(v0).toEqual({ x: 0, y: 0, z: 1 });

            const v90 = axisAngleToVector('y', 90);
            expect(v90).toEqual({ x: 1, y: 0, z: 0 });

            const v180 = axisAngleToVector('y', 180);
            expect(v180).toEqual({ x: 0, y: 0, z: -1 });

            const vNeg90 = axisAngleToVector('y', -90);
            expect(vNeg90).toEqual({ x: -1, y: 0, z: 0 });
        });
    });

    describe('vectorToAxisAngle 向量反算轴向与角度', () => {
        it('水平面向量反算为 Z 轴对应角度', () => {
            expect(vectorToAxisAngle({ x: 0, y: 1, z: 0 })).toEqual({ axis: 'z', angle: 0 });
            expect(vectorToAxisAngle({ x: 1, y: 0, z: 0 })).toEqual({ axis: 'z', angle: 90 });
            expect(vectorToAxisAngle({ x: 0, y: -1, z: 0 })).toEqual({ axis: 'z', angle: 180 });
            expect(vectorToAxisAngle({ x: -1, y: 0, z: 0 })).toEqual({ axis: 'z', angle: -90 });
            expect(vectorToAxisAngle({ x: 0.5, y: 0.866025, z: 0 })).toEqual({ axis: 'z', angle: 30 });
        });

        it('正立面 (YZ) 向量反算为 X 轴对应角度', () => {
            expect(vectorToAxisAngle({ x: 0, y: 0, z: 1 })).toEqual({ axis: 'x', angle: 90 });
            expect(vectorToAxisAngle({ x: 0, y: 0, z: -1 })).toEqual({ axis: 'x', angle: -90 });
            expect(vectorToAxisAngle({ x: 0, y: 0.866025, z: 0.5 })).toEqual({ axis: 'x', angle: 30 });
        });

        it('侧立面 (ZX) 向量反算为 Y 轴对应角度', () => {
            expect(vectorToAxisAngle({ x: 0.5, y: 0, z: 0.866025 })).toEqual({ axis: 'y', angle: 30 });
            expect(vectorToAxisAngle({ x: -0.5, y: 0, z: 0.866025 })).toEqual({ axis: 'y', angle: -30 });
        });

        it('往返单射测试: axisAngleToVector -> vectorToAxisAngle 保真', () => {
            const axes: RotationAxis[] = ['z', 'x', 'y'];
            const angles = [-150, -90, -45, -30, 0, 30, 45, 60, 90, 120, 150, 180];
            for (const axis of axes) {
                for (const angle of angles) {
                    const vec = axisAngleToVector(axis, angle);
                    const back = vectorToAxisAngle(vec);
                    const vec2 = axisAngleToVector(back.axis, back.angle);
                    expect(vec2.x).toBeCloseTo(vec.x, 4);
                    expect(vec2.y).toBeCloseTo(vec.y, 4);
                    expect(vec2.z).toBeCloseTo(vec.z, 4);
                }
            }
        });

        it('零向量与异常输入安全兜底', () => {
            expect(vectorToAxisAngle({ x: 0, y: 0, z: 0 })).toEqual({ axis: 'z', angle: 0 });
            expect(vectorToAxisAngle({ x: NaN, y: 0, z: 0 })).toEqual({ axis: 'z', angle: 0 });
        });
    });

    describe('PRESET_DIRECTIONS 预设表与 formatVector', () => {
        it('六向预设表齐全且单位化', () => {
            expect(PRESET_DIRECTIONS).toHaveLength(6);
            for (const p of PRESET_DIRECTIONS) {
                const mag = Math.hypot(p.vector.x, p.vector.y, p.vector.z);
                expect(mag).toBeCloseTo(1, 6);
            }
        });

        it('formatVector 格式化输出 (x, y, z)', () => {
            expect(formatVector({ x: 0, y: 1, z: 0 })).toBe('(0.00, 1.00, 0.00)');
            expect(formatVector({ x: 0.707106, y: 0.707106, z: 0 })).toBe('(0.71, 0.71, 0.00)');
            expect(formatVector({ x: 0, y: 0, z: 0 })).toBe('(0.00, 0.00, 0.00)');
        });
    });
});
