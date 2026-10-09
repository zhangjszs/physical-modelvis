import { traceFieldLine, type FieldSource } from 'physics-core';
import { physicsToWorld, type WorldPoint } from '../../utils/compositionCoords';
import { fieldLineSeeds, FIELD_LINE_TRACE, FIELD_LINE_DENSITY, type FieldKind } from './fieldLineSeeds';

/**
 * 场线几何构建 (L5) — 纯函数: 场源集合 → 世界坐标折线顶点数组。
 *
 * 追踪 (physics-core traceFieldLine) 在物理坐标下完成, 最后经 physicsToWorld
 * 转到 three.js 世界坐标。不依赖 three.js, 可单测; CompositionStage 只负责
 * 把结果包成 THREE.Line (单一真源: 场线完全由 sources 决定, 与粒子无关)。
 *
 * 闭环成型 (#93): 正/反向两段弧拼接后首尾常差一个步长内的数值残缝
 * (maxArcLength 截断), 端点距离 ≤ CLOSE_GAP 时补回首点把缝封死 —
 * 闭合磁感线 (导线/线圈) 不再有可辨断口。箭头放置由 fieldArrowPlacements
 * 统一给出: 闭环 3 枚沿线切向 (保持一致环绕方向), 开放线 1 枚。
 */

/**
 * 闭环残缝阈值: 首尾端点距离 ≤ 2×步长 视为近似闭合 (追踪截断的数值残差,
 * 真实开放线两端远大于此)。physicsToWorld 为等距轴重映射, 物理/世界同尺度。
 */
const CLOSE_GAP = FIELD_LINE_TRACE.stepLength * 2;

/** 首尾点视为同一位置的判定阈值 (封口后精确为 0; 容差防浮点重建) */
const CLOSED_EPS = 1e-9;

/** 闭环封口: 首尾残缝在 (0, CLOSE_GAP] 内时补回首点, 返回新数组; 否则原样返回 */
function closeNearlyClosedLoop(line: WorldPoint[]): WorldPoint[] {
    if (line.length < 3) return line;
    const first = line[0]!;
    const last = line[line.length - 1]!;
    const gap = Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z);
    if (gap > CLOSED_EPS && gap <= CLOSE_GAP) return [...line, first];
    return line;
}

/** 折线是否视觉闭环 (首尾同点) */
export function isClosedLine(line: readonly WorldPoint[]): boolean {
    if (line.length < 3) return false;
    const first = line[0]!;
    const last = line[line.length - 1]!;
    return Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z) <= CLOSED_EPS;
}

/**
 * 拖拽期有效密度 (#93 性能护栏): 拖拽中封顶 1×, 松手恢复配置档位。
 * 理由: 2× 档在重场景 (4 源) 全量重追踪约 260ms (Node 实测), 拖拽的连续
 * 指针事件会让 100ms 节流持续过载; 封顶后拖拽成本与 #93 之前的固定密度一致。
 */
export function effectiveFieldLineDensity(configured: number, dragging: boolean): number {
    return dragging ? Math.min(configured, FIELD_LINE_DENSITY.default) : configured;
}

/** 场线箭头摆放: 位置 + 单位切向 (沿折线前进方向 = 场方向) */
export interface FieldArrowPlacement {
    readonly position: WorldPoint;
    readonly direction: WorldPoint;
}

/** 闭环箭头采样比例 (多枚显示环绕方向, 切向由相邻点差分, 天然连续) */
const CLOSED_ARROW_FRACTIONS = [0.2, 0.5, 0.8] as const;
/** 开放线箭头采样比例 (维持既有单枚观感) */
const OPEN_ARROW_FRACTIONS = [0.35] as const;

/**
 * 为一条折线给出箭头摆放 (纯函数, 可单测):
 * 闭环沿环取 3 枚 (切向随折线前进方向, 环绕方向一致); 开放线取 1 枚。
 * 采样点取相邻两点差分作为切向, 跳过零长度段。
 */
export function fieldArrowPlacements(line: readonly WorldPoint[]): FieldArrowPlacement[] {
    if (line.length < 2) return [];
    const fractions = isClosedLine(line) ? CLOSED_ARROW_FRACTIONS : OPEN_ARROW_FRACTIONS;
    const placements: FieldArrowPlacement[] = [];
    for (const fraction of fractions) {
        const at = Math.min(line.length - 2, Math.max(0, Math.floor(line.length * fraction)));
        const from = line[at]!;
        const to = line[at + 1]!;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const mag = Math.hypot(dx, dy, dz);
        if (mag <= 0 || !Number.isFinite(mag)) continue;
        placements.push({
            position: from,
            direction: { x: dx / mag, y: dy / mag, z: dz / mag }
        });
    }
    return placements;
}

/**
 * 追踪指定场的全部场线, 返回世界坐标折线 (每条 ≥2 个顶点)。
 * density 为密度倍率 (#93): 转交 fieldLineSeeds 缩放种子数。
 */
export function buildFieldLines(
    sources: readonly FieldSource[],
    kind: FieldKind,
    density: number = FIELD_LINE_DENSITY.default
): WorldPoint[][] {
    const lines: WorldPoint[][] = [];
    for (const seed of fieldLineSeeds(sources, density)) {
        if (seed.kind !== kind) continue;
        const traced = traceFieldLine(sources, {
            start: seed.start,
            kind: seed.kind,
            bidirectional: seed.bidirectional,
            maxArcLength: seed.maxArcLength,
            stepLength: FIELD_LINE_TRACE.stepLength,
            maxSteps: FIELD_LINE_TRACE.maxSteps,
            boundRadius: FIELD_LINE_TRACE.boundRadius
        });
        // 种子恰在中性点等无法延伸的位置时只返回种子点 (长度 1), 无方向信息, 丢弃
        if (traced.length > 1) lines.push(closeNearlyClosedLoop(traced.map(physicsToWorld)));
    }
    return lines;
}
