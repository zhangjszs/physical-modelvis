import type { PlacedSource, SourceKind } from '../../store/compositionStore';

/**
 * 组合实验台拾取纯逻辑 (#166 P0) — 不依赖 three.js 场景状态, 便于单测。
 *
 * 规格: docs/composition-selection-placement-spec.md §3.3/§3.6
 * - 一次射线命中的所有器材去重成有序候选集合 (而不是只取 hits[0])
 * - 同点 (≤4 px) 重复点击依次循环选中候选 1→2→3→1; 换点重置为候选 1
 * - 容器 (匀强磁场区盒面) 穿透: 候选栈中排在所有非容器之后; 箭头保持正常优先级
 */

/** 命中对象的拾取角色 (userData.pickRole, 缺省 'source') */
export type PickRole = 'source' | 'zone-volume';

/** 射线命中投影到纯数据层后的最小信息 (three.js Intersection 的子集) */
export interface PickHitInput {
    /** 命中对象沿父链解析出的器材 id; null = 背景命中 (忽略) */
    readonly sourceId: string | null;
    readonly pickRole: PickRole;
    /** 射线命中距离 (排序键, 升序) */
    readonly distance: number;
}

/** 有序候选 — 排序规则见 buildPickStack 的 JSDoc */
export interface PickCandidate {
    readonly id: string;
    readonly kind: SourceKind;
    readonly distance: number;
    /** 器材在 store.sources 中的顺序 (同距离稳定序) */
    readonly insertionIndex: number;
    /** 容器候选 (zone 盒面) — 永远排在非容器之后 */
    readonly isContainer: boolean;
}

/**
 * 构建拾取候选栈 (规格 §3.3 实现契约):
 * 1. 实体优先于容器: zone-volume 盒面排在所有非容器候选之后 (箭头不打标, 保持正常优先级)
 * 2. 可见面距离近者优先 (同一优先级内按 distance 升序)
 * 3. 同距离按器材在 store 中的顺序 (insertionIndex 升序) — 保证循环顺序稳定、可测试
 * 4. 同一器材多面命中只保留最近一次 (按 sourceId 去重)
 * 已删除/不在 store 中的 sourceId 直接丢弃。
 */
export function buildPickStack(hits: readonly PickHitInput[], sources: readonly PlacedSource[]): PickCandidate[] {
    // sourceId → 最小距离 (多面命中只留最近, 契约第 4 条)
    const nearest = new Map<string, { distance: number; isContainer: boolean }>();
    for (const hit of hits) {
        if (hit.sourceId === null) continue;
        const prev = nearest.get(hit.sourceId);
        if (prev === undefined || hit.distance < prev.distance) {
            nearest.set(hit.sourceId, { distance: hit.distance, isContainer: hit.pickRole === 'zone-volume' });
        }
    }
    const stack: PickCandidate[] = [];
    for (let i = 0; i < sources.length; i++) {
        const placed = sources[i]!;
        const info = nearest.get(placed.id);
        if (info === undefined) continue;
        stack.push({
            id: placed.id,
            kind: placed.source.kind,
            distance: info.distance,
            insertionIndex: i,
            isContainer: info.isContainer
        });
    }
    stack.sort((a, b) => {
        if (a.isContainer !== b.isContainer) return a.isContainer ? 1 : -1; // 实体优先于容器
        if (a.distance !== b.distance) return a.distance - b.distance; // 近者优先
        return a.insertionIndex - b.insertionIndex; // store 顺序稳定序
    });
    return stack;
}

/** 屏幕坐标点 (clientX/clientY 语义) */
export interface ScreenPoint {
    readonly x: number;
    readonly y: number;
}

/** 同点判定容差 (px) — 与点击/拖拽阈值一致 (#166 P0) */
export const PICK_POINT_TOLERANCE_PX = 4;

/** 两屏幕点是否视为同一点 (欧氏距离 ≤ tolerance) */
export function isSamePoint(a: ScreenPoint, b: ScreenPoint, tolerance: number = PICK_POINT_TOLERANCE_PX): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y) <= tolerance;
}

/** pointerdown 到 pointermove 是否超过拖拽阈值 (未超过 = 纯点击, 不移动不重仿真) */
export function movedPastThreshold(
    down: ScreenPoint,
    current: ScreenPoint,
    threshold: number = PICK_POINT_TOLERANCE_PX
): boolean {
    return Math.hypot(current.x - down.x, current.y - down.y) > threshold;
}

/** 循环选择状态 (规格 §3.6: 用 { screenX, screenY, ids, index } 记录) */
export interface PickCycleState {
    readonly screenX: number;
    readonly screenY: number;
    readonly ids: readonly string[];
    readonly index: number;
}

export interface PickResolution {
    /** 本次选中的候选; stack 为空时 null */
    readonly picked: PickCandidate | null;
    /** 更新后的循环状态 (stack 为空时清空) */
    readonly cycle: PickCycleState | null;
}

/**
 * 解析一次点击应选中的候选 (规格 §3.4 交互细则 + §3.3 契约第 5 条粘性):
 * - 同点连续点击 (与上次点击 ≤4 px): 从**当前选中项**的下一位开始 (粘性起点,
 *   而不是跳回候选 1); 当前选中不在候选集中则回到候选 1。候选集合变化不影响该规则
 *   (每次都以新 stack + 当前 selectedId 重算, 天然重置)。
 * - 换点或首次点击: 重新从候选 1 开始。
 * - 空白点击 (stack 为空): 不选中, 循环状态清空。
 */
export function resolvePick(
    stack: readonly PickCandidate[],
    point: ScreenPoint,
    cycle: PickCycleState | null,
    selectedId: string | null
): PickResolution {
    if (stack.length === 0) return { picked: null, cycle: null };
    let index: number;
    if (cycle !== null && isSamePoint(point, { x: cycle.screenX, y: cycle.screenY })) {
        // 同点点击: 粘性起点 = 当前选中项的下一位 (通常与递增一致; 列表等外部路径改选中后仍可预期)
        const base = selectedId === null ? -1 : stack.findIndex(c => c.id === selectedId);
        index = base >= 0 ? (base + 1) % stack.length : 0;
    } else {
        // 换点 / 首次点击: 从候选 1 开始
        index = 0;
    }
    const picked = stack[index]!;
    return {
        picked,
        cycle: { screenX: point.x, screenY: point.y, ids: stack.map(c => c.id), index }
    };
}

/** 器材类型的中文可读名 (S-8: 列表与徽标使用「类型 + 序号」, 不展示内部完整 id) */
export const KIND_LABEL: Record<SourceKind, string> = {
    'point-charge': '点电荷',
    'charged-plate': '带电平板',
    'straight-wire': '载流导线',
    'circular-coil': '圆形线圈',
    'bar-magnet': '条形磁铁',
    'uniform-field-zone': '匀强磁场区'
};

/**
 * 器材的用户可读显示名, 如 `点电荷 #3`。
 * 序号取 id 末段的自增数字 (id 形如 `point-charge-3`), 删除器材后其余器材序号保持稳定。
 */
export function sourceDisplayName(placed: PlacedSource): string {
    const tail = placed.id.slice(placed.id.lastIndexOf('-') + 1);
    const num = /^\d+$/.test(tail) ? tail : '';
    return num === '' ? KIND_LABEL[placed.source.kind] : `${KIND_LABEL[placed.source.kind]} #${num}`;
}
