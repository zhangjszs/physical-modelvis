import { create } from 'zustand';
import type { SimulationState, VisibleLayers, GraphType } from '../types/visualization';
import { loadAllScenes } from '../scenes/sceneRegistry';
import { getTotalDuration, findFrameIndex } from '../utils/frameUtils';

const DEFAULT_LAYERS: VisibleLayers = {
    axes: true,
    grid: true,
    trajectory: true,
    velocityVector: true,
    accelerationVector: false,
    forceVector: false,
    energyLabels: false,
    bodyLabels: true
};

/** 根据场景 ID 返回默认选中的图表类型 */
function getDefaultGraphForScene(sceneId: string): GraphType {
    switch (sceneId) {
        case 'air-track':
            return 'x_t';
        case 'hooke-law':
            return 'x_t';
        case 'sliding-friction':
            return 'f_N';
        case 'force-composition':
            return 'F_theta';
        case 'newton-third-law':
            return 'F_t';
        default:
            return 'y_t';
    }
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    currentScene: 'projectile',
    parameters: {},
    parametersSceneId: null,
    sceneLoadVersion: 0,
    scenes: [],
    simulationResult: null,
    currentTime: 0,
    currentFrameIndex: 0,
    isPlaying: false,
    playbackSpeed: 1,
    visibleLayers: { ...DEFAULT_LAYERS },
    selectedGraph: 'y_t',
    errorMessage: null,
    theme: 'light',
    experimentData: null,

    setScene: sceneId => {
        set(s => ({
            currentScene: sceneId,
            parameters: {},
            parametersSceneId: null,
            sceneLoadVersion: s.sceneLoadVersion + 1,
            isPlaying: false,
            currentTime: 0,
            currentFrameIndex: 0,
            simulationResult: null,
            errorMessage: null,
            experimentData: null,
            selectedGraph: getDefaultGraphForScene(sceneId)
        }));
    },

    setSceneWithParameters: (sceneId, parameters) => {
        set(s => ({
            currentScene: sceneId,
            parameters: { ...parameters },
            parametersSceneId: sceneId,
            sceneLoadVersion: s.sceneLoadVersion + 1,
            isPlaying: false,
            currentTime: 0,
            currentFrameIndex: 0,
            simulationResult: null,
            errorMessage: null,
            experimentData: null,
            selectedGraph: getDefaultGraphForScene(sceneId)
        }));
    },

    // 预载全部场景配置(领域懒加载 chunk),幂等
    ensureScenesLoaded: () => {
        if (get().scenes.length > 0) return;
        loadAllScenes().then(scenes => {
            set({ scenes });
        });
    },

    ensureSceneParameters: (sceneId, defaults) => {
        set(s => {
            if (s.currentScene !== sceneId || s.parametersSceneId === sceneId) return s;
            return {
                ...s,
                parameters: { ...defaults },
                parametersSceneId: sceneId
            };
        });
    },

    setParameter: (name, value) => {
        set(s => ({ parameters: { ...s.parameters, [name]: value } }));
    },

    applyPreset: parameters => {
        set(s => ({
            parameters: { ...parameters },
            currentTime: 0,
            currentFrameIndex: 0,
            sceneLoadVersion: s.sceneLoadVersion + 1
        }));
    },

    setSimulationResult: result => {
        set({
            simulationResult: result,
            currentTime: 0,
            currentFrameIndex: 0,
            errorMessage: null,
            experimentData: null
        });
    },

    setExperimentData: data => {
        set({ experimentData: data });
    },

    setCurrentTime: t => {
        const { simulationResult } = get();
        if (!simulationResult) return;
        const trajectories = simulationResult.trajectories;
        const totalDuration = getTotalDuration(trajectories);
        const clamped = Math.max(0, Math.min(t, totalDuration));
        // 二分查找 O(log n) — 与 findFrameIndex 保持一致, 避免每帧 O(n) 线性扫描
        const idx = findFrameIndex(trajectories, clamped);
        set({ currentTime: clamped, currentFrameIndex: idx });
    },

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),

    reset: () => {
        set({ currentTime: 0, currentFrameIndex: 0, isPlaying: false });
    },

    stepForward: () => {
        const { simulationResult, currentFrameIndex } = get();
        if (!simulationResult) return;
        const points = simulationResult.trajectories[0] ?? [];
        const next = Math.min(currentFrameIndex + 1, points.length - 1);
        set({ currentFrameIndex: next, currentTime: points[next]?.t ?? 0 });
    },

    stepBackward: () => {
        const { simulationResult, currentFrameIndex } = get();
        if (!simulationResult) return;
        const points = simulationResult.trajectories[0] ?? [];
        const prev = Math.max(currentFrameIndex - 1, 0);
        set({ currentFrameIndex: prev, currentTime: points[prev]?.t ?? 0 });
    },

    setPlaybackSpeed: speed => set({ playbackSpeed: speed }),

    toggleLayer: layer => {
        set(s => ({
            visibleLayers: { ...s.visibleLayers, [layer]: !s.visibleLayers[layer] }
        }));
    },

    setSelectedGraph: graph => set({ selectedGraph: graph }),

    setErrorMessage: msg => set({ errorMessage: msg }),

    toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }))
}));
