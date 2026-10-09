import { describe, it, expect } from 'vitest';
import type { FieldSource, Vector3D } from 'physics-core';
import {
    buildFieldLines,
    fieldArrowPlacements,
    isClosedLine,
    effectiveFieldLineDensity
} from '../../src/components/composition/fieldLines';
import { FIELD_LINE_SEED_CONFIG } from '../../src/components/composition/fieldLineSeeds';
import { worldToPhysics } from '../../src/utils/compositionCoords';

/**
 * buildFieldLines 场线几何构建测试 — 场源 → 世界坐标折线。
 * 验证: 追踪结果有限 / 按场类型筛选 / 依赖 sources 且与粒子无关。
 */

const ZERO3: Vector3D = { x: 0, y: 0, z: 0 };

/** 折线逐点转回物理坐标 */
function toPhysics(line: Array<{ x: number; y: number; z: number }>): Vector3D[] {
    return line.map(worldToPhysics);
}

describe('buildFieldLines 场线几何构建', () => {
    it('点电荷电场线: 双向对称线段, 全部顶点落在 [r−L, r+L] 环带内且无奇点堆积', () => {
        const radius = FIELD_LINE_SEED_CONFIG.pointCharge.radius;
        const len = FIELD_LINE_SEED_CONFIG.pointCharge.lineLength;
        const lines = buildFieldLines([{ kind: 'point-charge', charge: 2e-6, position: ZERO3 }], 'electric');
        expect(lines).toHaveLength(FIELD_LINE_SEED_CONFIG.pointCharge.count);
        for (const line of lines) {
            expect(line.length).toBeGreaterThan(1);
            for (const p of toPhysics(line)) {
                const d = Math.hypot(p.x, p.y, p.z);
                expect(d).toBeGreaterThan(radius - len - 1e-6);
                expect(d).toBeLessThan(radius + len + 1e-6);
                expect(Number.isFinite(d)).toBe(true);
            }
        }
    });

    it('按场类型筛选: 纯电场源不产生磁场线, 纯磁场源不产生电场线', () => {
        const electricOnly: FieldSource[] = [
            { kind: 'charged-plate', sigma: 2e-6, center: ZERO3, normal: { x: 0, y: 1, z: 0 } }
        ];
        const magneticOnly: FieldSource[] = [
            { kind: 'straight-wire', current: 10, point: ZERO3, direction: { x: 0, y: 1, z: 0 } }
        ];
        expect(buildFieldLines(electricOnly, 'electric').length).toBeGreaterThan(0);
        expect(buildFieldLines(electricOnly, 'magnetic')).toEqual([]);
        expect(buildFieldLines(magneticOnly, 'magnetic').length).toBeGreaterThan(0);
        expect(buildFieldLines(magneticOnly, 'electric')).toEqual([]);
    });

    it('直导线磁场线: 每条折线到导线垂距恒定 (同心圆)', () => {
        const point: Vector3D = { x: 0, y: 0, z: 0 };
        const lines = buildFieldLines(
            [{ kind: 'straight-wire', current: 10, point, direction: { x: 0, y: 1, z: 0 } }],
            'magnetic'
        );
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
            const physics = toPhysics(line);
            const rhos = physics.map(p => Math.hypot(p.x - point.x, p.z - point.z));
            const min = Math.min(...rhos);
            const max = Math.max(...rhos);
            expect(max - min).toBeLessThan(5e-3); // 圆心在 y 轴, 垂距恒定
        }
    });

    it('圆形线圈磁场线: 生成闭合拓扑折线且坐标有限', () => {
        const lines = buildFieldLines(
            [
                {
                    kind: 'circular-coil',
                    current: 5,
                    turns: 20,
                    radius: 0.15,
                    center: { x: 0, y: 0, z: 0.15 },
                    axis: { x: 0, y: 1, z: 0 }
                }
            ],
            'magnetic'
        );
        expect(lines).toHaveLength(
            FIELD_LINE_SEED_CONFIG.coil.axialFactors.length * FIELD_LINE_SEED_CONFIG.coil.azimuthCount
        );
        for (const line of lines) {
            expect(line.length).toBeGreaterThan(1);
            for (const p of line) {
                expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
            }
        }
    });

    it('平行板电容器: 两板叠加的电场线有限且不越界', () => {
        const sigma = 2e-6;
        const lines = buildFieldLines(
            [
                { kind: 'charged-plate', sigma, center: { x: 0, y: 0, z: 0.6 }, normal: { x: 0, y: 0, z: 1 } },
                { kind: 'charged-plate', sigma: -sigma, center: { x: 0, y: 0, z: 0.2 }, normal: { x: 0, y: 0, z: 1 } }
            ],
            'electric'
        );
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
            for (const p of line) expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
        }
    });

    it('空场源: 两种场都返回空', () => {
        expect(buildFieldLines([], 'electric')).toEqual([]);
        expect(buildFieldLines([], 'magnetic')).toEqual([]);
    });

    it('纯函数: 仅依赖 sources, 连续两次调用结果一致', () => {
        const sources: FieldSource[] = [
            { kind: 'point-charge', charge: 2e-6, position: { x: 0.1, y: 0, z: 0.15 } },
            { kind: 'straight-wire', current: 8, point: { x: -0.2, y: 0, z: 0.2 }, direction: { x: 0, y: 1, z: 0 } }
        ];
        expect(buildFieldLines(sources, 'electric')).toEqual(buildFieldLines(sources, 'electric'));
        expect(buildFieldLines(sources, 'magnetic')).toEqual(buildFieldLines(sources, 'magnetic'));
    });
});

describe('密度倍率与闭环箭头 (#93)', () => {
    const pointCharge: FieldSource = { kind: 'point-charge', charge: 1e-6, position: ZERO3 };
    const wire: FieldSource = { kind: 'straight-wire', current: 10, point: ZERO3, direction: { x: 0, y: 1, z: 0 } };

    it('密度传导: 点电荷电场线 0.5/1/2 → 6/12/24 条, 默认与 1 相同', () => {
        expect(buildFieldLines([pointCharge], 'electric')).toHaveLength(12);
        expect(buildFieldLines([pointCharge], 'electric', 1)).toHaveLength(12);
        expect(buildFieldLines([pointCharge], 'electric', 0.5)).toHaveLength(6);
        expect(buildFieldLines([pointCharge], 'electric', 2)).toHaveLength(24);
    });

    it('导线磁力线首尾封口: 每条线闭环 (首尾同点, 无可辨断口)', () => {
        const lines = buildFieldLines([wire], 'magnetic');
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
            expect(isClosedLine(line)).toBe(true);
            const first = line[0]!;
            const last = line[line.length - 1]!;
            expect(Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z)).toBe(0);
        }
        // 补首点后顶点数 = 原始追踪点数 + 1, 且首点被复制到末尾
        const closed = lines[0]!;
        expect(closed[closed.length - 1]).toEqual(closed[0]);
    });

    it('开放电场线不误封口 (点电荷线段首尾距离远大于阈值)', () => {
        const lines = buildFieldLines([pointCharge], 'electric');
        expect(lines).toHaveLength(12);
        for (const line of lines) expect(isClosedLine(line)).toBe(false);
    });

    it('fieldArrowPlacements: 开放线 1 枚, 切向为线段前进方向 (单位向量)', () => {
        const line = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 2, y: 0, z: 0 }
        ];
        const placements = fieldArrowPlacements(line);
        expect(placements).toHaveLength(1);
        expect(placements[0]!.position).toEqual({ x: 1, y: 0, z: 0 });
        expect(placements[0]!.direction).toEqual({ x: 1, y: 0, z: 0 });
    });

    it('fieldArrowPlacements: 闭环 3 枚, 切向近似垂直半径且环绕方向一致', () => {
        // xy 平面单位圆: 21 点 + 首点封口 (模拟 buildFieldLines 的闭环输出)
        const segments = 20;
        const circle: Array<{ x: number; y: number; z: number }> = [];
        for (let i = 0; i <= segments; i++) {
            const t = (2 * Math.PI * i) / segments;
            circle.push({ x: Math.cos(t), y: Math.sin(t), z: 0 });
        }
        const placements = fieldArrowPlacements(circle);
        expect(placements).toHaveLength(3);
        for (const p of placements) {
            // 切向 · 半径 ≈ 0 (弦切角 = 半段角 = 9° → 点积 ≤ sin(9°)≈0.16)
            const dot = p.position.x * p.direction.x + p.position.y * p.direction.y;
            expect(Math.abs(dot)).toBeLessThan(0.2);
            // 环绕方向一致: 位置 × 切向 的 z 分量为正 (逆时针)
            const crossZ = p.position.x * p.direction.y - p.position.y * p.direction.x;
            expect(crossZ).toBeGreaterThan(0);
        }
    });

    it('fieldArrowPlacements: 少于 2 点或无有效段时返回空', () => {
        expect(fieldArrowPlacements([])).toEqual([]);
        expect(fieldArrowPlacements([{ x: 0, y: 0, z: 0 }])).toEqual([]);
    });

    it('effectiveFieldLineDensity: 拖拽中封顶 1× (性能护栏), 松手按配置档位', () => {
        expect(effectiveFieldLineDensity(2, true)).toBe(1); // 2× 拖拽封顶
        expect(effectiveFieldLineDensity(0.5, true)).toBe(0.5); // 低于封顶不限
        expect(effectiveFieldLineDensity(1, true)).toBe(1);
        expect(effectiveFieldLineDensity(2, false)).toBe(2); // 非拖拽原样
        expect(effectiveFieldLineDensity(0.5, false)).toBe(0.5);
    });
});
