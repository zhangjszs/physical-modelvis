import { traceFieldLine, type FieldSource } from 'physics-core';
import { physicsToWorld, type WorldPoint } from '../../utils/compositionCoords';
import { fieldLineSeeds, FIELD_LINE_TRACE, type FieldKind } from './fieldLineSeeds';

/**
 * 场线几何构建 (L5) — 纯函数: 场源集合 → 世界坐标折线顶点数组。
 *
 * 追踪 (physics-core traceFieldLine) 在物理坐标下完成, 最后经 physicsToWorld
 * 转到 three.js 世界坐标。不依赖 three.js, 可单测; CompositionStage 只负责
 * 把结果包成 THREE.Line (单一真源: 场线完全由 sources 决定, 与粒子无关)。
 */

/** 追踪指定场的全部场线, 返回世界坐标折线 (每条 ≥2 个顶点) */
export function buildFieldLines(sources: readonly FieldSource[], kind: FieldKind): WorldPoint[][] {
    const lines: WorldPoint[][] = [];
    for (const seed of fieldLineSeeds(sources)) {
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
        if (traced.length > 1) lines.push(traced.map(physicsToWorld));
    }
    return lines;
}
