import { describe, it, expect } from 'vitest';
import {
    buildPickStack,
    resolvePick,
    isSamePoint,
    movedPastThreshold,
    sourceDisplayName,
    PICK_POINT_TOLERANCE_PX,
    type PickHitInput,
    type PickCycleState,
    type ScreenPoint
} from '../../src/components/composition/picking';
import type { PlacedSource, SourceKind } from '../../src/store/compositionStore';
import type { FieldSource } from 'physics-core';

/** 组装测试用已放置器材 (id 与 store 顺序共同决定稳定序) */
function placedAt(id: string, kind: SourceKind, _distance: number): PlacedSource {
    return { id, source: makeSource(kind) };
}

function makeSource(kind: SourceKind): FieldSource {
    switch (kind) {
        case 'point-charge':
            return { kind, charge: 2e-6, position: { x: 0, y: 0, z: 0.15 } };
        case 'charged-plate':
            return { kind, sigma: 2e-6, center: { x: 0, y: 0, z: 0.4 }, normal: { x: 0, y: 1, z: 0 } };
        case 'straight-wire':
            return { kind, current: 10, point: { x: 0, y: 0, z: 0.2 }, direction: { x: 0, y: 1, z: 0 } };
        case 'circular-coil':
            return {
                kind,
                current: 5,
                turns: 20,
                radius: 0.15,
                center: { x: 0, y: 0, z: 0.15 },
                axis: { x: 0, y: 1, z: 0 }
            };
        case 'bar-magnet':
            return {
                kind,
                magneticMoment: 5,
                center: { x: 0, y: 0, z: 0.15 },
                direction: { x: 0, y: 1, z: 0 },
                length: 0.2
            };
        case 'uniform-field-zone':
            return {
                kind,
                field: { x: 0, y: 1e-3, z: 0 },
                center: { x: 0, y: 0, z: 0.15 },
                size: { x: 0.4, y: 0.3, z: 0.3 }
            };
    }
}

function hit(sourceId: string | null, distance: number, pickRole: 'source' | 'zone-volume' = 'source'): PickHitInput {
    return { sourceId, pickRole, distance };
}

const P = (x: number, y: number): ScreenPoint => ({ x, y });

describe('buildPickStack 拾取候选栈 (§3.3 实现契约)', () => {
    it('同一器材多面命中只保留最近一次; 距离近者优先', () => {
        const sources = [placedAt('q1', 'point-charge', 1), placedAt('q2', 'point-charge', 2)];
        const stack = buildPickStack([hit('q1', 5.2), hit('q2', 3.1), hit('q1', 4.0), hit(null, 0.5)], sources);
        expect(stack.map(c => c.id)).toEqual(['q2', 'q1']); // q1 双面命中取最近 4.0 > q2 的 3.1
        expect(stack[0]!.distance).toBeCloseTo(3.1, 10);
        expect(stack[1]!.distance).toBeCloseTo(4.0, 10);
    });

    it('容器 (zone-volume) 穿透: 排在所有非容器之后, 即使盒面距离更近', () => {
        const sources = [
            placedAt('z1', 'uniform-field-zone', 0),
            placedAt('q1', 'point-charge', 1),
            placedAt('w1', 'straight-wire', 2)
        ];
        // 盒面 2.0 最近, 但它是容器 → 降权排最后
        const stack = buildPickStack([hit('z1', 2.0, 'zone-volume'), hit('q1', 3.5), hit('w1', 6.0)], sources);
        expect(stack.map(c => c.id)).toEqual(['q1', 'w1', 'z1']);
        expect(stack.map(c => c.isContainer)).toEqual([false, false, true]);
    });

    it('容器的箭头命中不打标 (pickRole=source), 保持正常优先级', () => {
        const sources = [placedAt('z1', 'uniform-field-zone', 0), placedAt('q1', 'point-charge', 1)];
        const stack = buildPickStack([hit('z1', 1.0, 'source'), hit('q1', 3.0)], sources);
        expect(stack.map(c => c.id)).toEqual(['z1', 'q1']); // 箭头命中非容器, 距离近者优先
    });

    it('同距离按 store 顺序 (insertionIndex 升序), 保证循环顺序稳定', () => {
        const sources = [
            placedAt('q1', 'point-charge', 0),
            placedAt('q2', 'point-charge', 1),
            placedAt('q3', 'point-charge', 2)
        ];
        const stack = buildPickStack([hit('q3', 2.0), hit('q2', 2.0), hit('q1', 2.0)], sources);
        expect(stack.map(c => c.id)).toEqual(['q1', 'q2', 'q3']);
    });

    it('不在 store 中的 sourceId (器材已删除) 与 null 命中一并丢弃', () => {
        const sources = [placedAt('q1', 'point-charge', 0)];
        const stack = buildPickStack([hit('gone-1', 1.0), hit(null, 0.5), hit('q1', 2.0)], sources);
        expect(stack.map(c => c.id)).toEqual(['q1']);
    });

    it('候选携带 kind / insertionIndex, 供徽标与排序消费', () => {
        const sources = [placedAt('m1', 'bar-magnet', 0)];
        const stack = buildPickStack([hit('m1', 1.0)], sources);
        expect(stack[0]!.kind).toBe('bar-magnet');
        expect(stack[0]!.insertionIndex).toBe(0);
    });
});

describe('同点判定与拖拽阈值 (S-2 / S-5)', () => {
    it('isSamePoint: 欧氏距离 ≤4 px 判同点 (含正好 4px)', () => {
        expect(isSamePoint(P(100, 100), P(103, 100))).toBe(true); // 3px
        expect(isSamePoint(P(100, 100), P(100, 104))).toBe(true); // 正好 4px
        expect(isSamePoint(P(100, 100), P(102, 102))).toBe(true); // √8≈2.83px
        expect(isSamePoint(P(100, 100), P(103, 103))).toBe(false); // √18≈4.24px > 4
        expect(isSamePoint(P(100, 100), P(105, 100))).toBe(false); // 5px
        expect(PICK_POINT_TOLERANCE_PX).toBe(4);
    });

    it('movedPastThreshold: 严格超过阈值才进入拖拽 (≤4 px 视为纯点击)', () => {
        expect(movedPastThreshold(P(100, 100), P(102, 100))).toBe(false);
        expect(movedPastThreshold(P(100, 100), P(104, 100))).toBe(false); // 正好 4px 仍不算
        expect(movedPastThreshold(P(100, 100), P(105, 100))).toBe(true);
        expect(movedPastThreshold(P(100, 100), P(103, 103))).toBe(true); // ≈4.24
    });
});

describe('resolvePick 同点循环与粘性起点 (§3.4 / §3.3 第 5 条)', () => {
    const sources = [
        placedAt('q1', 'point-charge', 0),
        placedAt('q2', 'point-charge', 1),
        placedAt('q3', 'point-charge', 2)
    ];
    const stackOf = () => buildPickStack([hit('q1', 1), hit('q2', 2), hit('q3', 3)], sources);

    it('首次点击选中候选 1', () => {
        const res = resolvePick(stackOf(), P(100, 100), null, null);
        expect(res.picked!.id).toBe('q1');
        expect(res.cycle!.index).toBe(0);
    });

    it('同点连续点击依次循环 1→2→3→1', () => {
        const p = P(100, 100);
        let cycle: PickCycleState | null = null;
        let selected: string | null = null;
        const pick = () => {
            const res = resolvePick(stackOf(), p, cycle, selected);
            selected = res.picked!.id;
            cycle = res.cycle;
            return res.picked!.id;
        };
        expect(pick()).toBe('q1');
        expect(pick()).toBe('q2');
        expect(pick()).toBe('q3');
        expect(pick()).toBe('q1'); // 循环回候选 1
    });

    it('换点点击重置为候选 1', () => {
        const p = P(100, 100);
        const first = resolvePick(stackOf(), p, null, null);
        expect(first.picked!.id).toBe('q1');
        // 同点选到候选 2
        const second = resolvePick(stackOf(), p, first.cycle, 'q1');
        expect(second.picked!.id).toBe('q2');
        // 换点 (距 20px) → 重新从候选 1
        const elsewhere = resolvePick(stackOf(), P(120, 100), second.cycle, 'q2');
        expect(elsewhere.picked!.id).toBe('q1');
    });

    it('粘性起点: 当前选中项在候选集中时, 同点点击从其下一位开始 (而非跳回候选 1)', () => {
        // 用户通过列表选中了候选 3, 然后回到同一屏幕点点击
        const first = resolvePick(stackOf(), P(50, 50), null, null);
        const sticky = resolvePick(stackOf(), P(50, 50), first.cycle, 'q3');
        expect(sticky.picked!.id).toBe('q1'); // q3 (index 2) 的下一位 = index 0 (循环)
        // 选中候选 1 时同点点击 → 下一位候选 2
        const next = resolvePick(stackOf(), P(50, 50), sticky.cycle, 'q1');
        expect(next.picked!.id).toBe('q2');
    });

    it('同点但当前选中不在候选集中: 回到候选 1', () => {
        const first = resolvePick(stackOf(), P(50, 50), null, null);
        const res = resolvePick(stackOf(), P(50, 50), first.cycle, 'elsewhere-9');
        expect(res.picked!.id).toBe('q1');
    });

    it('候选集合变化 (器材增删): 同点点击以当前选中为起点重算, 不沿用旧 index', () => {
        const first = resolvePick(stackOf(), P(50, 50), null, null);
        // 删掉 q2 后的新 stack: [q1, q3]
        const shrunk = buildPickStack([hit('q1', 1), hit('q3', 3)], [sources[0]!, sources[2]!]);
        // 旧 cycle.index = 0 (q1) 不应被沿用; 当前选中 q1 → 下一位 = q3
        const res = resolvePick(shrunk, P(50, 50), first.cycle, 'q1');
        expect(res.picked!.id).toBe('q3');
    });

    it('空候选 (空白点击): 不选中且循环状态清空', () => {
        const res = resolvePick([], P(80, 80), { screenX: 80, screenY: 80, ids: ['q1'], index: 0 }, 'q1');
        expect(res.picked).toBeNull();
        expect(res.cycle).toBeNull();
    });

    it('容器候选排在循环末位: 点击盒内电荷再同点点击 → 下一位仍是实体', () => {
        const zoneSources = [placedAt('q1', 'point-charge', 0), placedAt('z1', 'uniform-field-zone', 1)];
        const stack = buildPickStack([hit('z1', 1.5, 'zone-volume'), hit('q1', 3.0)], zoneSources);
        expect(stack.map(c => c.id)).toEqual(['q1', 'z1']);
        const first = resolvePick(stack, P(70, 70), null, null);
        expect(first.picked!.id).toBe('q1');
        const second = resolvePick(stack, P(70, 70), first.cycle, 'q1');
        expect(second.picked!.id).toBe('z1'); // 循环到容器 (点盒边界空白也可选中盒)
    });
});

describe('sourceDisplayName 可读命名 (S-8)', () => {
    it('类型 + 序号, 不展示内部完整 id', () => {
        expect(sourceDisplayName({ id: 'point-charge-3', source: makeSource('point-charge') })).toBe('点电荷 #3');
        expect(sourceDisplayName({ id: 'uniform-field-zone-1', source: makeSource('uniform-field-zone') })).toBe(
            '匀强磁场区 #1'
        );
    });

    it('id 尾段非数字时只显示类型名', () => {
        expect(sourceDisplayName({ id: 'bar-magnet-custom', source: makeSource('bar-magnet') })).toBe('条形磁铁');
    });
});
