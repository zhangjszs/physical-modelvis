import { create } from 'zustand';
import type { FieldSource, Vector3D, CompositionParticle, CompositionSimResult, ValidationResult } from 'physics-core';
import { simulateComposition, validateComposition } from 'physics-core';
import { snapVector } from '../utils/compositionCoords';

/**
 * 组合实验台状态 (L4) — 器材布置 + 粒子 + 自动重仿真。
 *
 * 重仿真时机: add / remove / 参数修改 / 粒子修改 / commit (拖拽松手)。
 * 拖拽进行中 (moveSource) **不**重仿真 — 强磁场源每步要算 96 段毕奥-萨伐尔,
 * 逐帧重算会卡顿; 拖拽中轨迹短暂滞留旧值, 松手即刷新。
 */

export type SourceKind = FieldSource['kind'];

/** 已放置的器材 — id 稳定, 供 3D 选中/拖拽与检查器定位 */
export interface PlacedSource {
    readonly id: string;
    readonly source: FieldSource;
}

/** 各类器材的新建默认参数与默认摆放高度 (物理 z, m) */
export const SOURCE_DEFAULTS: Record<SourceKind, { source: FieldSource; height: number }> = {
    'point-charge': { source: { kind: 'point-charge', charge: 2e-6, position: { x: 0, y: 0, z: 0.15 } }, height: 0.15 },
    'charged-plate': {
        source: { kind: 'charged-plate', sigma: 2e-6, center: { x: 0, y: 0, z: 0.4 }, normal: { x: 0, y: 1, z: 0 } },
        height: 0.4
    },
    'straight-wire': {
        source: { kind: 'straight-wire', current: 10, point: { x: 0, y: 0, z: 0.2 }, direction: { x: 0, y: 1, z: 0 } },
        height: 0.2
    },
    'circular-coil': {
        source: {
            kind: 'circular-coil',
            current: 5,
            turns: 20,
            radius: 0.15,
            center: { x: 0, y: 0, z: 0.15 },
            axis: { x: 0, y: 1, z: 0 }
        },
        height: 0.15
    }
};

const PARTICLE_DEFAULT: CompositionParticle = {
    charge: 5e-7,
    mass: 2e-7,
    position: { x: 0.6, y: 0, z: 0.3 },
    velocity: { x: -0.8, y: 0, z: 0 }
};

const DURATION_DEFAULT = 2;
const SAMPLE_COUNT_DEFAULT = 800;

let nextId = 1;

interface CompositionState {
    sources: PlacedSource[];
    selectedId: string | null;
    particle: CompositionParticle;
    duration: number;
    sampleCount: number;
    /** 最近一次重仿真的结果 (校验失败时保留旧结果) */
    result: CompositionSimResult | null;
    /** 校验/求解的当前问题 (null = 状态健康) */
    validationMessage: string | null;

    addSource: (kind: SourceKind, position?: Vector3D) => void;
    /** 拖拽中更新位置 (吸附后), 不触发重仿真 */
    moveSource: (id: string, position: Vector3D) => void;
    /** 拖拽结束/外部修改后重仿真 */
    commit: () => void;
    updateSourceParams: (id: string, patch: Record<string, number>) => void;
    removeSource: (id: string) => void;
    select: (id: string | null) => void;
    setParticle: (patch: Partial<CompositionParticle>) => void;
    setDuration: (duration: number) => void;
    resetLab: () => void;
}

function recompute(state: CompositionState): Partial<CompositionState> {
    const experiment = {
        sources: state.sources.map(p => p.source),
        particle: state.particle,
        duration: state.duration,
        sampleCount: state.sampleCount
    };
    const validation: ValidationResult = validateComposition(experiment);
    if (!validation.valid) {
        return { validationMessage: validation.errors.map(e => e.message).join('; ') };
    }
    try {
        const result = simulateComposition(experiment);
        return { result, validationMessage: null };
    } catch (err) {
        return { validationMessage: err instanceof Error ? err.message : String(err) };
    }
}

export const useCompositionStore = create<CompositionState>((set, get) => ({
    sources: [],
    selectedId: null,
    particle: { ...PARTICLE_DEFAULT },
    duration: DURATION_DEFAULT,
    sampleCount: SAMPLE_COUNT_DEFAULT,
    result: null,
    validationMessage: null,

    addSource: (kind, position) => {
        const def = SOURCE_DEFAULTS[kind];
        const pos = position ?? { x: -0.4 + ((nextId * 0.13) % 0.8), y: 0, z: def.height };
        const id = `${kind}-${nextId++}`;
        const placed = applyPosition(def.source, pos);
        set(s => {
            const next: Partial<CompositionState> = {
                sources: [...s.sources, { id, source: placed }],
                selectedId: id
            };
            return { ...next, ...recompute({ ...get(), ...next } as CompositionState) };
        });
    },

    moveSource: (id, position) => {
        set(s => ({
            sources: s.sources.map(p =>
                p.id === id ? { ...p, source: applyPosition(p.source, snapVector(position)) } : p
            )
        }));
    },

    commit: () => set(s => recompute(s)),

    updateSourceParams: (id, patch) => {
        set(s => {
            const next: Partial<CompositionState> = {
                sources: s.sources.map(p =>
                    p.id === id ? { ...p, source: { ...p.source, ...patch } as FieldSource } : p
                )
            };
            return { ...next, ...recompute({ ...get(), ...next } as CompositionState) };
        });
    },

    removeSource: id => {
        set(s => {
            const next: Partial<CompositionState> = {
                sources: s.sources.filter(p => p.id !== id),
                selectedId: s.selectedId === id ? null : s.selectedId
            };
            return { ...next, ...recompute({ ...get(), ...next } as CompositionState) };
        });
    },

    select: id => set({ selectedId: id }),

    setParticle: patch => {
        set(s => {
            const next: Partial<CompositionState> = { particle: { ...s.particle, ...patch } };
            return { ...next, ...recompute({ ...get(), ...next } as CompositionState) };
        });
    },

    setDuration: duration => {
        if (!Number.isFinite(duration) || duration <= 0) return;
        set(() => {
            const next: Partial<CompositionState> = { duration };
            return { ...next, ...recompute({ ...get(), ...next } as CompositionState) };
        });
    },

    resetLab: () => {
        const next: Partial<CompositionState> = {
            sources: [],
            selectedId: null,
            particle: { ...PARTICLE_DEFAULT },
            duration: DURATION_DEFAULT,
            result: null,
            validationMessage: null
        };
        set(next);
    }
}));

/** 把新位置写进场源对应的位置字段 (kind 决定字段名), 方向字段保持不变 */
function applyPosition(source: FieldSource, position: Vector3D): FieldSource {
    switch (source.kind) {
        case 'point-charge':
            return { ...source, position };
        case 'charged-plate':
            return { ...source, center: position };
        case 'straight-wire':
            return { ...source, point: position };
        case 'circular-coil':
            return { ...source, center: position };
    }
}
